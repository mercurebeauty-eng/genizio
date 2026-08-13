// Webhook Paystack — POST /api/paystack/webhook
//
// Route API TanStack Start (createFileRoute + server.handlers) : le fichier de route entre
// dans le bundle client (définition de route), mais le handler ne tourne que côté serveur.
// Les imports serveur (paystack.server — contient PAYSTACK_SECRET_KEY) sont donc en
// dynamique DANS le handler : un import statique les embarquerait côté client.
//
// Source de vérité asynchrone des paiements : Paystack relance en cas de réponse non-2xx
// (test : toutes les heures pendant 10 h ; live : 4 × 3 min puis toutes les heures pendant
// 72 h). Règles :
//   • Signature HMAC-SHA512 vérifiée contre le RAW body — 401 si invalide.
//   • Événements inconnus/inutiles → 200 (arrêter les relances).
//   • Traitement en échec → 500 (laisser Paystack rejouer).
//   • Idempotent : un paiement déjà success / un abonnement déjà actif ne sont jamais
//     re-traités (un `charge.success` de renouvellement étend la période une seule fois).
//
// Événements traités :
//   • charge.success  — sans subscription_code : paiement one-shot (payments) ;
//                       avec subscription_code : 1er paiement ou renouvellement d'abonnement.
//   • charge.failed / invoice.payment_failed — avec subscription_code : past_due (aucun
//     retry Paystack, accès conservé jusqu'à la fin de période puis coupure par résolveur).
//   • subscription.create  — synchronisation de la ligne (sub_code, customer).
//   • subscription.not_renew / subscription.disable — annulation → coupure immédiate.
//   • subscription.enable  — réactivation.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { verifyPaystackWebhookSignature } = await import("@/lib/paystack.server");

        const rawBody = await request.text();
        const signature = request.headers.get("x-paystack-signature");

        if (!verifyPaystackWebhookSignature(rawBody, signature)) {
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        let payload: { event?: string; data?: any };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: "Invalid body" }, { status: 400 });
        }

        const event = payload?.event;
        const data = payload?.data;

        try {
          if (event === "charge.success") {
            if (data?.subscription_code) await handleSubscriptionCharge(data);
            else await handleChargeSuccess(data);
          } else if (event === "charge.failed" || event === "invoice.payment_failed") {
            if (data?.subscription_code) await handleSubscriptionPaymentFailed(data);
            else await handleTransactionFailed(data);
          } else if (event === "subscription.create") {
            await handleSubscriptionCreate(data);
          } else if (event === "subscription.not_renew" || event === "subscription.disable") {
            await handleSubscriptionDisabled(data);
          } else if (event === "subscription.enable") {
            await handleSubscriptionEnabled(data);
          } else if (event === "transaction.failed") {
            await handleTransactionFailed(data);
          } else {
            // Événements inconnus (transfer.*, etc.) : 200 pour stopper les relances.
            console.log(`[paystack-webhook] Événement ignoré: ${event ?? "inconnu"}`);
          }
        } catch (err) {
          console.error("[paystack-webhook] Erreur de traitement:", err);
          return Response.json({ error: "Processing failed" }, { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});

// ── Paiements one-shot (payments table) ────────────────────────────────────────

type ChargeSuccessData = {
  reference: string;
  amount: number; // plus petite unité
  currency: string;
  paid_at?: string | null;
  status?: string;
};

async function handleChargeSuccess(data: ChargeSuccessData | undefined) {
  if (!data?.reference) return; // payload inattendu — rien à faire, Paystack n'aura pas à rejouer

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { markPaymentSuccessAndFulfill } = await import("@/lib/payment-fulfillment.server");

  const { data: payment, error: paymentErr } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("reference", data.reference)
    .maybeSingle();
  if (paymentErr) throw paymentErr;
  if (!payment) {
    console.error(`[paystack-webhook] charge.success pour référence inconnue: ${data.reference}`);
    return; // 200 : référence étrangère, pas de retries inutiles
  }

  // Idempotence : le webhook (ou la page de retour) a déjà traité cette payment.
  if (payment.status === "success") return;

  // Sécurité : le montant signé doit correspondre à celui attendu au moment de
  // l'initialisation. Une divergence = anomalie (tampering) → on n'applique rien et on
  // arrête les relances (l'incident est visible dans les logs).
  if (Math.round(data.amount / 100) !== payment.amount_xof) {
    console.error(
      `[paystack-webhook] Montant inattendu pour ${data.reference}: reçu ${data.amount}, attendu ${payment.amount_xof * 100}`,
    );
    return;
  }

  await markPaymentSuccessAndFulfill(supabaseAdmin, payment as any);
  console.log(`[paystack-webhook] Paiement ${data.reference} confirmé (${payment.amount_xof} FCFA).`);
}

async function handleTransactionFailed(data: { reference?: string } | undefined) {
  if (!data?.reference) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("reference", data.reference)
    .eq("status", "initiated"); // ne jamais écraser un success posé par l'autre chemin
  if (error) throw error;
}

// ── Abonnements famille (subscriptions table) ──────────────────────────────────

type SubscriptionChargeData = {
  reference: string;
  amount: number; // plus petite unité
  paid_at?: string | null;
  subscription_code?: string | null;
  plan?: { plan_code?: string } | string | null;
  customer?: { customer_code?: string; email?: string } | null;
};

async function findUserIdByEmail(
  supabaseAdmin: any,
  email: string | null | undefined,
): Promise<string | null> {
  if (!email) return null;
  try {
    // Pagination complète (review 2026-08-12, P2) : l'ancien listUsers page 1/100
    // ne retrouvait jamais un compte au-delà de la 100ᵉ position → l'activation
    // d'abonnement échouait silencieusement. listAllUsers itère toutes les pages.
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
  } catch {
    return null;
  }
}

// 1er paiement ou renouvellement d'abonnement. La ligne subscriptions existe déjà (posée à
// l'initialisation) : on la retrouve par notre référence (GENIZIO-SUB-…) pour le 1er
// paiement, ou par subscription_code pour les renouvellements — activateFamilySubscription
// est idempotente (pas de double extension quand webhook + page de retour se chevauchent).
async function handleSubscriptionCharge(data: SubscriptionChargeData | undefined) {
  if (!data?.subscription_code || !data?.reference) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { activateFamilySubscription } = await import("@/lib/subscriptions.functions");

  const plan = data.plan;
  const planCode = typeof plan === "object" && plan ? plan.plan_code ?? null : null;
  const userId = await findUserIdByEmail(supabaseAdmin, data.customer?.email);

  await activateFamilySubscription(supabaseAdmin, {
    userId,
    reference: data.reference,
    subscriptionCode: data.subscription_code,
    customerCode: data.customer?.customer_code ?? null,
    planCode,
    paidAt: data.paid_at ?? null,
    priceXof: Math.round(data.amount / 100),
  });
  console.log(`[paystack-webhook] Abonnement ${data.subscription_code} activé/renouvelé.`);
}

// Aucun retry Paystack sur les échecs de prélèvement : on passe en past_due, l'accès est
// conservé jusqu'à current_period_end (grâce du résolveur), puis coupé sans intervention.
async function handleSubscriptionPaymentFailed(data: { subscription_code?: string | null } | undefined) {
  if (!data?.subscription_code) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("paystack_subscription_code", data.subscription_code);
  if (error) throw error;
}

// Synchronisation : un abonnement créé via la page de gestion Paystack (sans passer par
// notre checkout) n'a pas de ligne locale — on la crée si on retrouve l'utilisateur par
// email. La période sera posée par le charge.success qui accompagne la création.
async function handleSubscriptionCreate(data: {
  subscription_code?: string | null;
  customer?: { customer_code?: string; email?: string } | null;
} | undefined) {
  if (!data?.subscription_code) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("paystack_subscription_code", data.subscription_code)
    .maybeSingle();
  if (subErr) throw subErr;
  if (existing) return; // déjà suivi

  const userId = await findUserIdByEmail(supabaseAdmin, data.customer?.email);
  if (!userId) {
    console.error(`[paystack-webhook] subscription.create sans utilisateur connu: ${data.subscription_code}`);
    return;
  }

  const { data: row, error: insErr } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (insErr) throw insErr;

  if (row) {
    // La famille a déjà une ligne (initiated/en attente) : on la rattache.
    await supabaseAdmin
      .from("subscriptions")
      .update({
        paystack_subscription_code: data.subscription_code,
        paystack_customer_code: data.customer?.customer_code ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      status: "active",
      paystack_customer_code: data.customer?.customer_code ?? null,
      paystack_subscription_code: data.subscription_code,
      started_at: new Date().toISOString(),
    });
  }
}

// Annulation (not_renew arrive immédiatement ; disable au prochain paiement) : coupure
// immédiate — le résolveur ne renvoie plus la couverture, tous les profils hors le 1er
// gratuit passent 'expired' sans aucune mutation de masse.
async function handleSubscriptionDisabled(data: { subscription_code?: string | null } | undefined) {
  if (!data?.subscription_code) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("paystack_subscription_code", data.subscription_code);
  if (error) throw error;
}

async function handleSubscriptionEnabled(data: { subscription_code?: string | null } | undefined) {
  if (!data?.subscription_code) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "active",
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("paystack_subscription_code", data.subscription_code);
  if (error) throw error;
}

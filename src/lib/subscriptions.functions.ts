// Abonnement famille (forfait Paystack) + crédits de parrainage — server functions.
//
// Décisions utilisateur (2026-08-08) :
//   • 1 abonnement Paystack par COMPTE parent : tarif unique 5 000 F/mois ×3 mois de
//     bienvenue puis 15 000 F/mois, couvre tous les enfants jusqu'au plafond de 5.
//   • Grandfathering : le plan choisi à la souscription est conservé tant que l'abonnement
//     reste actif (Paystack ne permet pas de changer de plan) — le tarif de bienvenue
//     reste acquis même après la fin de la fenêtre promo.
//   • Résiliation = coupure IMMÉDIATE de tous les profils hors le 1er gratuit : on ne
//     mute aucune période, on change le statut — le résolveur (child-access.ts) calcule
//     la couverture et fait tomber les enfants en 'expired' aussitôt.
//   • Parrainage : paiement en ligne → code → crédit de couverture FAMILLE
//     (sponsorship_credits), indépendant du prélèvement récurrent (pas de double débit).
//
// Les modules serveur (paystack.server) sont importés en dynamique (jamais côté client).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";
import { PROMO_PRICE_XOF, STANDARD_PRICE_XOF, resolveExtraSlotPrice } from "@/lib/pricing";
import { computeAccessPeriodWindow } from "@/lib/child-access";

// ── Plans famille (auto-créés chez Paystack, cachés dans paystack_plans) ───────
export const FAMILY_PLAN_KEYS = {
  promo: "family_promo",
  standard: "family_standard",
} as const;

export type FamilyPlanKey = (typeof FAMILY_PLAN_KEYS)[keyof typeof FAMILY_PLAN_KEYS];

// Les plans ont été créés dans le dashboard Paystack (2026-08-09) :
//   • « Génizio Bienvenue » (promo 5 000 F/mois ×3 mois)  → PLN_knhympcn1lpbc5z
//   • « Génizio Standard » (15 000 F/mois)               → PLN_yi4ud80p4eu7bvu
// ensurePaystackPlan retrouve ces plans par NOM exact (searchPaystackPlans), puis les met
// en cache dans paystack_plans — il ne les recrée que si le nom n'existe pas chez Paystack.
export const FAMILY_PLANS: Record<FamilyPlanKey, { name: string; priceXof: number }> = {
  family_promo: { name: "Génizio Bienvenue", priceXof: PROMO_PRICE_XOF },
  family_standard: { name: "Génizio Standard", priceXof: STANDARD_PRICE_XOF },
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  plan_code: string | null;
  price_xof: number | null;
  currency: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_reference: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Retrouve le plan Paystack (idempotent à travers les déplois) : cache local paystack_plans
 * → recherche par nom chez Paystack → création si absent. L'admin n'a RIEN à créer dans le
 * dashboard. En cas de course (deux appels simultanés), l'échec d'insert du cache est
 * avalé et le cache est relu.
 */
async function ensurePaystackPlan(
  supabaseAdmin: any,
  planKey: FamilyPlanKey,
): Promise<{ planCode: string; amountXof: number }> {
  const { searchPaystackPlans, createPaystackPlan } = await import("@/lib/paystack.server");

  const { data: cached, error: cacheErr } = await supabaseAdmin
    .from("paystack_plans")
    .select("plan_code, amount_xof")
    .eq("plan_key", planKey)
    .maybeSingle();
  if (cacheErr) throw new Error(cacheErr.message);
  if (cached) return { planCode: cached.plan_code, amountXof: cached.amount_xof };

  const plan = FAMILY_PLANS[planKey];
  const upsertCache = async (planCode: string) => {
    const { error } = await supabaseAdmin.from("paystack_plans").insert({
      plan_key: planKey,
      plan_code: planCode,
      name: plan.name,
      interval: "monthly",
      amount_xof: plan.priceXof,
      currency: "XOF",
    });
    if (error) {
      // Course entre deux appels : relire le cache plutôt que d'échouer.
      const { data: reread } = await supabaseAdmin
        .from("paystack_plans")
        .select("plan_code")
        .eq("plan_key", planKey)
        .maybeSingle();
      if (!reread) throw new Error(`Erreur lors du cache du plan: ${error.message}`);
      return reread.plan_code;
    }
    return planCode;
  };

  // Déploiements parallèles / cache vidé : le plan existe peut-être déjà chez Paystack.
  const found = await searchPaystackPlans(plan.name);
  const match = found.find((p) => p.name === plan.name && p.amountXof === plan.priceXof);
  if (match) return { planCode: await upsertCache(match.planCode), amountXof: plan.priceXof };

  const created = await createPaystackPlan({
    name: plan.name,
    amountXof: plan.priceXof,
    interval: "monthly",
    currency: "XOF",
  });
  return { planCode: await upsertCache(created.planCode), amountXof: plan.priceXof };
}

async function findSubscriptionByRefOrCode(
  supabaseAdmin: any,
  reference: string,
  subscriptionCode: string,
): Promise<SubscriptionRow | null> {
  const [byRef, byCode] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("paystack_reference", reference)
      .maybeSingle(),
    supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("paystack_subscription_code", subscriptionCode)
      .maybeSingle(),
  ]);
  if (byRef.error && byCode.error) throw new Error(byRef.error.message || byCode.error.message);
  return (byRef.data as SubscriptionRow | null) ?? (byCode.data as SubscriptionRow | null) ?? null;
}

/**
 * Active/renouvelle la ligne d'abonnement d'une famille à partir d'une charge Paystack
 * réussie (charge.success). Partagé entre le webhook et la page de retour — idempotent :
 *   • premier paiement (paystack_reference === reference) : pose les codes, période =
 *     paid_at → +1 mois ;
 *   • renouvellement (référence Paystack différente, ligne trouvée par subscription_code) :
 *     étend à partir du plus tard entre la fin de période actuelle et la date de paiement
 *     (jamais de découpe) ;
 *   • déjà active avec ce subscription_code : on complète les champs manquants, on ne
 *     prolonge pas deux fois (webhook + page de retour sur le même paiement).
 */
export async function activateFamilySubscription(
  supabaseAdmin: any,
  params: {
    userId?: string | null;
    reference: string;
    subscriptionCode: string;
    customerCode?: string | null;
    planCode?: string | null;
    paidAt?: string | null;
    priceXof?: number | null;
  },
): Promise<void> {
  const now = new Date();
  const paidAt = params.paidAt ? new Date(params.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) throw new Error(`paid_at invalide: ${params.paidAt}`);

  const sub = await findSubscriptionByRefOrCode(
    supabaseAdmin,
    params.reference,
    params.subscriptionCode,
  );

  const plusOneMonth = (from: Date) => {
    const end = new Date(from);
    end.setMonth(end.getMonth() + 1);
    return end.toISOString();
  };

  // Reçu email (2026-08-09, demande utilisateur) : fire-and-forget, jamais bloquant
  // pour la réponse de paiement. Idempotent par référence Paystack (consent_events)
  // — webhook et page de retour peuvent déclencher, un seul email part.
  const fireSubscriptionEmail = (
    userId: string | null | undefined,
    periodEnd: string | null | undefined,
  ) => {
    void (async () => {
      try {
        const { sendSubscriptionConfirmationEmail } = await import(
          "@/lib/payment-email.functions"
        );
        await sendSubscriptionConfirmationEmail(supabaseAdmin, {
          userId,
          reference: params.reference,
          priceXof: params.priceXof,
          periodEnd,
        });
      } catch (err) {
        console.error("Non-fatal: envoi de l'email d'abonnement a échoué", err);
      }
    })();
  };

  if (!sub) {
    // Abonnement créé en dehors de notre checkout (page de gestion Paystack, etc.) : on
    // recrée la ligne depuis la charge réussie si on connaît l'utilisateur.
    if (!params.userId) return;
    await supabaseAdmin.from("subscriptions").insert({
      user_id: params.userId,
      status: "active",
      plan_code: params.planCode ?? null,
      price_xof: params.priceXof ?? null,
      currency: "XOF",
      paystack_customer_code: params.customerCode ?? null,
      paystack_subscription_code: params.subscriptionCode,
      paystack_reference: params.reference,
      current_period_start: paidAt.toISOString(),
      current_period_end: plusOneMonth(paidAt),
      started_at: now.toISOString(),
    });
    fireSubscriptionEmail(params.userId, plusOneMonth(paidAt));
    return;
  }

  // Idempotence clé sur la RÉFÉRENCE Paystack, pas sur le subscription_code : un
  // renouvellement arrive avec le MÊME subscription_code mais une nouvelle référence —
  // il doit étendre la période. C'est seulement le même paiement (même référence, déjà
  // traité par le webhook ou la page de retour) qui doit être ignoré. On complète alors
  // les champs manquants (codes posés par l'autre chemin), sans prolonger deux fois.
  if (sub.status === "active" && sub.paystack_reference === params.reference) {
    const patch: Record<string, unknown> = {};
    if (!sub.paystack_customer_code && params.customerCode)
      patch.paystack_customer_code = params.customerCode;
    if (!sub.plan_code && params.planCode) patch.plan_code = params.planCode;
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ ...patch, updated_at: now.toISOString() })
        .eq("id", sub.id);
    }
    return;
  }

  const isFirstPayment = sub.paystack_reference === params.reference;

  let nextPeriodStart: string;
  let nextPeriodEnd: string;
  if (isFirstPayment) {
    nextPeriodStart = paidAt.toISOString();
    nextPeriodEnd = plusOneMonth(paidAt);
  } else {
    // Renouvellement : base = le plus tard entre la fin de période actuelle et la date de
    // paiement (une charge en retard ne découpe jamais la période déjà payée).
    const base =
      sub.current_period_end && new Date(sub.current_period_end).getTime() > paidAt.getTime()
        ? new Date(sub.current_period_end)
        : paidAt;
    nextPeriodStart = sub.current_period_start ?? paidAt.toISOString();
    nextPeriodEnd = plusOneMonth(base);
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "active",
      plan_code: params.planCode ?? sub.plan_code,
      price_xof: params.priceXof ?? sub.price_xof,
      paystack_customer_code: params.customerCode ?? sub.paystack_customer_code,
      paystack_subscription_code: params.subscriptionCode,
      current_period_start: nextPeriodStart,
      current_period_end: nextPeriodEnd,
      cancelled_at: null,
      started_at: sub.started_at ?? now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", sub.id);

  fireSubscriptionEmail(sub.user_id ?? params.userId, nextPeriodEnd);
}

// ── Statut de l'abonnement famille (page Paramètres) ───────────────────────────
export type FamilySubscriptionStatus = {
  subscription: SubscriptionRow | null;
  status: "initiated" | "active" | "past_due" | "cancelled" | "expired" | null;
  planKey: FamilyPlanKey | null;
  priceXof: number | null;
  isPromo: boolean;
  promoEndsAt: string | null;
  currentPeriodEnd: string | null;
  sponsoredUntil: string | null;
  childrenCount: number;
};

export const getFamilySubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    const rate = resolveExtraSlotPrice(userRes?.user?.created_at ?? null);

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);

    const { data: credit, error: credErr } = await supabaseAdmin
      .from("sponsorship_credits")
      .select("ends_at")
      .eq("user_id", userId)
      .order("ends_at", { ascending: false })
      .limit(1);
    if (credErr) throw new Error(credErr.message);

    const { count: childrenCount } = await supabaseAdmin
      .from("child_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    let planKey: FamilyPlanKey | null = null;
    if (sub?.price_xof) {
      planKey = sub.price_xof === PROMO_PRICE_XOF ? "family_promo" : "family_standard";
    }

    return {
      subscription: (sub as SubscriptionRow) ?? null,
      status: (sub?.status as FamilySubscriptionStatus["status"]) ?? null,
      planKey,
      priceXof: sub?.price_xof ?? null,
      isPromo: rate.isPromo,
      promoEndsAt: rate.promoEndsAt ? rate.promoEndsAt.toISOString() : null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      sponsoredUntil: credit?.[0]?.ends_at ?? null,
      childrenCount: childrenCount ?? 0,
    } satisfies FamilySubscriptionStatus;
  });

// ── Souscription (checkout) ────────────────────────────────────────────────────
const FamilySubscriptionInput = z.object({ callbackUrl: z.string().url() });

export const initializeFamilySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => FamilySubscriptionInput.parse(input))
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackSubscriptionTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) throw new Error("Utilisateur introuvable.");
    const email = userRes.user.email ?? "";
    if (!email) throw new Error("Aucun email sur le compte — impossible de souscrire.");

    // Un seul abonnement par compte.
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (existing?.status === "active" || existing?.status === "past_due") {
      throw new Error("Votre famille est déjà abonnée.");
    }

    // Grandfathering : le plan choisi à la souscription est conservé tant que l'abonnement
    // reste actif (Paystack ne change pas de plan) — le tarif de bienvenue reste acquis.
    const rate = resolveExtraSlotPrice(userRes.user.created_at);
    const planKey: FamilyPlanKey = rate.isPromo ? "family_promo" : "family_standard";
    const { planCode } = await ensurePaystackPlan(supabaseAdmin, planKey);

    const reference = createPaystackReference("SUB");
    const now = new Date().toISOString();

    if (existing) {
      // Réabonnement après annulation/expiration : réinitialisation de la ligne (l'ancien
      // subscription_code devient orphelin côté Paystack, la nouvelle souscription en crée
      // un neuf au premier paiement).
      const { error: upErr } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "initiated",
          plan_code: planCode,
          price_xof: rate.priceXof,
          paystack_reference: reference,
          paystack_subscription_code: null,
          paystack_customer_code: null,
          current_period_start: null,
          current_period_end: null,
          cancelled_at: null,
          updated_at: now,
        })
        .eq("user_id", userId);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: insErr } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        status: "initiated",
        plan_code: planCode,
        price_xof: rate.priceXof,
        currency: "XOF",
        paystack_reference: reference,
        started_at: now,
      });
      if (insErr) throw new Error(insErr.message);
    }

    const { authorizationUrl } = await initializePaystackSubscriptionTransaction({
      email,
      reference,
      planCode,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "family_subscription", plan: planKey },
    });

    return { authorizationUrl, reference, amountXof: rate.priceXof, planKey };
  });

// ── Résiliation (self-service, coupure immédiate) ──────────────────────────────
export const cancelFamilySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { disablePaystackSubscription } = await import("@/lib/paystack.server");

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);

    if (!sub || sub.status === "cancelled" || sub.status === "expired") {
      return { success: true, alreadyCancelled: true };
    }

    if (sub.paystack_subscription_code) {
      try {
        await disablePaystackSubscription(sub.paystack_subscription_code);
      } catch (err) {
        // Paystack peut répondre « déjà résilié » (annulation depuis la page de gestion) :
        // la coupure d'accès locale est ce qui compte, elle est immédiate côté résolveur.
        console.error("[subscriptions] Échec disable Paystack (poursuite):", err);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (updErr) throw new Error(updErr.message);

    return { success: true, alreadyCancelled: false };
  });

// ── Code de parrainage → crédit de couverture famille ─────────────────────────
const RedeemCodeInput = z.object({ code: z.string().min(4) });

export const redeemSponsorshipCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RedeemCodeInput.parse(input))
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: token, error: tokenErr } = await supabaseAdmin
      .from("sponsorship_tokens")
      .select("*")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (tokenErr || !token) throw new Error("Code de parrainage introuvable ou invalide.");

    if (token.is_redeemed) throw new Error("Ce code de parrainage a déjà été utilisé.");
    if (!token.payment_confirmed) {
      throw new Error(
        "Ce parrainage est en attente de confirmation de paiement par l'équipe Génizio.",
      );
    }
    if (token.campaign_id) {
      throw new Error(
        "Ce code appartient à une campagne organisation — utilisez le lien de la campagne pour inscrire votre enfant.",
      );
    }

    const months = token.months_count ?? 3;

    // Crédit de COUVERTURE FAMILLE : démarre au plus tard entre maintenant et la fin de la
    // couverture parrainage actuelle (extension sans découpe, computeAccessPeriodWindow) —
    // un code posé sur une couverture existante la prolonge, il ne la coupe jamais.
    const { data: current, error: curErr } = await supabaseAdmin
      .from("sponsorship_credits")
      .select("ends_at")
      .eq("user_id", userId)
      .order("ends_at", { ascending: false })
      .limit(1);
    if (curErr) throw new Error(curErr.message);

    const { endsAt } = computeAccessPeriodWindow(current?.[0]?.ends_at ?? null, months);

    const { error: credErr } = await supabaseAdmin.from("sponsorship_credits").insert({
      user_id: userId,
      token_id: token.id,
      months_count: months,
      ends_at: endsAt,
    });
    if (credErr) {
      throw new Error(
        "Erreur lors de l'activation du code. Le code n'a pas été consommé, réessayez.",
      );
    }

    // Marque le code utilisé APRÈS l'insert réussi (même ordre que redeemSponsorshipToken) :
    // un échec ne brûle jamais le code.
    const { error: updErr } = await supabaseAdmin
      .from("sponsorship_tokens")
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq("id", token.id);
    if (updErr) {
      console.error("[subscriptions] Token marqué utilisé en échec (crédit déjà posé):", updErr);
    }

    return { success: true, endsAt, months };
  });

// ── Vérification depuis la page de retour (paiement du 1er mois) ───────────────
const VerifySubscriptionInput = z.object({ reference: z.string().min(1) });

export const verifyFamilySubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => VerifySubscriptionInput.parse(input))
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction } = await import("@/lib/paystack.server");

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub || sub.user_id !== userId) throw new Error("Abonnement introuvable.");

    // Webhook déjà passé → succès idempotent.
    if (sub.status === "active") {
      return { paymentStatus: "success", alreadyProcessed: true };
    }
    if (sub.status === "cancelled" || sub.status === "expired") {
      return { paymentStatus: "abandoned", alreadyProcessed: true };
    }

    const verified = await verifyPaystackTransaction(data.reference);
    if (verified.status !== "success") {
      // Abandonné/échoué : on laisse la ligne 'initiated' (le webhook ne tirera jamais) —
      // le parent peut relancer la souscription, qui réinitialise la ligne.
      return { paymentStatus: verified.status, alreadyProcessed: false };
    }

    if (verified.amountXof !== sub.price_xof) {
      throw new Error("Montant payé différent du montant attendu — paiement rejeté.");
    }

    if (!verified.subscriptionCode) {
      // Le webhook charge.success (avec subscription_code) arrive dans les secondes qui
      // suivent et active la ligne — on affiche déjà le succès sans activer partiellement.
      return { paymentStatus: "success", alreadyProcessed: false, activationPending: true };
    }

    await activateFamilySubscription(supabaseAdmin, {
      userId,
      reference: data.reference,
      subscriptionCode: verified.subscriptionCode,
      customerCode: verified.customerCode,
      planCode: verified.planCode,
      paidAt: verified.paidAt,
      priceXof: sub.price_xof,
    });

    return { paymentStatus: "success", alreadyProcessed: false };
  });

// ── Admin OS : vue Abonnements (par famille) ───────────────────────────────────
export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  status: string;
  priceXof: number | null;
  planCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  startedAt: string | null;
  cancelledAt: string | null;
  sponsoredUntil: string | null;
  creditsCount: number;
};

export type SubscriptionsAdminData = {
  subscriptions: AdminSubscriptionRow[];
  mrrXof: number;
  activeCount: number;
  pastDueCount: number;
  cancelledCount: number;
  churn30dCount: number;
};

// Vue admin : chaque famille, sa ligne d'abonnement + couverture parrainage cumulée.
// MRR = somme des tarifs des familles actives/en retard (grandfathering inclus), churn 30 j =
// résiliations sur les 30 derniers jours. La couverture réelle de la famille est calculée par
// le résolveur (child-access.getFamilyCoverage) — ici c'est une lecture de gestion.
export const getSubscriptionsDataAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<SubscriptionsAdminData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");

    const { data: subs, error: subsErr } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (subsErr) throw new Error(subsErr.message);

    const { data: credits, error: credErr } = await (supabaseAdmin as any)
      .from("sponsorship_credits")
      .select("user_id, ends_at");
    if (credErr) throw new Error(credErr.message);

    const users = await listAllUsers(supabaseAdmin as any);
    const userById = new Map(users.map((u) => [u.id, u]));

    // Dernière fin de couverture parrainage par famille (une seule crédit fait foi : la plus
    // longue, getFamilyCoverage prend le max) + nombre de crédits posés.
    const sponsoredByUser = new Map<string, string | null>();
    const creditsByUser = new Map<string, number>();
    for (const c of credits ?? []) {
      creditsByUser.set(c.user_id, (creditsByUser.get(c.user_id) ?? 0) + 1);
      const current = sponsoredByUser.get(c.user_id) ?? null;
      if (!current || (c.ends_at && new Date(c.ends_at).getTime() > new Date(current).getTime())) {
        sponsoredByUser.set(c.user_id, c.ends_at ?? null);
      }
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let mrrXof = 0;
    let activeCount = 0;
    let pastDueCount = 0;
    let cancelledCount = 0;
    let churn30dCount = 0;

    const subscriptions: AdminSubscriptionRow[] = (subs ?? []).map((s: any) => {
      const user = userById.get(s.user_id);
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const priceXof = s.price_xof ?? null;
      const row: AdminSubscriptionRow = {
        id: s.id,
        userId: s.user_id,
        parentName:
          typeof meta.full_name === "string"
            ? meta.full_name
            : typeof meta.name === "string"
              ? meta.name
              : null,
        parentEmail: user?.email ?? null,
        parentPhone: typeof meta.phone === "string" ? meta.phone : (user?.phone ?? null),
        status: s.status,
        priceXof,
        planCode: s.plan_code ?? null,
        currentPeriodStart: s.current_period_start ?? null,
        currentPeriodEnd: s.current_period_end ?? null,
        startedAt: s.started_at ?? null,
        cancelledAt: s.cancelled_at ?? null,
        sponsoredUntil: sponsoredByUser.get(s.user_id) ?? null,
        creditsCount: creditsByUser.get(s.user_id) ?? 0,
      };

      if (s.status === "active" || s.status === "past_due") {
        mrrXof += priceXof ?? 0;
        if (s.status === "active") activeCount += 1;
        else pastDueCount += 1;
      } else if (s.status === "cancelled") {
        cancelledCount += 1;
        if (s.cancelled_at && new Date(s.cancelled_at) >= thirtyDaysAgo) churn30dCount += 1;
      }

      return row;
    });

    return { subscriptions, mrrXof, activeCount, pastDueCount, cancelledCount, churn30dCount };
  });

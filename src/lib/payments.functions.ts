// Paiements en ligne Paystack — server functions.
//
// Les 3 intents de l'app (commande boutique, accès mensuel enfant, Passeport) partagent la
// même mécanique : créer une ligne payments (initiated), initialiser la transaction chez
// Paystack, rediriger vers authorization_url. La confirmation arrive par 2 chemins
// idempotents : la page de retour (verifyPaymentByReference) et le webhook
// (src/routes/api/paystack/webhook.ts) — le webhook reste la source de vérité asynchrone.
//
// Les modules serveur (paystack.server, payment-fulfillment.server) sont importés en
// dynamique dans les handlers : un import statique les embarquerait dans le bundle client.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  resolveExtraSlotPrice,
  resolveSponsorshipPrice,
  PASSPORT_PRICE_XOF,
  PACK_PRICE_XOF,
} from "@/lib/pricing";
import type { PaymentMetadata, PaymentRow } from "@/lib/payment-fulfillment.server";

// callbackUrl est construit côté client (window.location.origin) et transmis ici : c'est
// l'URL de retour Paystack (aucun secret dedans), indépendante de l'hôte de déploiement.
const callbackUrlSchema = z.string().url();

async function getPaystackUserEmail(supabaseAdmin: any, userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    throw new Error("Utilisateur introuvable pour le paiement.");
  }
  return data.user.email;
}

export async function createPaystackPayment(params: {
  supabaseAdmin: any;
  userId: string | null; // null = payeur non connecté (parrainage public)
  reference: string;
  amountXof: number;
  metadata: PaymentMetadata;
}): Promise<PaymentRow> {
  const { data, error } = await params.supabaseAdmin
    .from("payments")
    .insert({
      user_id: params.userId,
      reference: params.reference,
      provider: "paystack",
      status: "initiated",
      amount_xof: params.amountXof,
      currency: "XOF",
      metadata: params.metadata,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`Erreur lors de l'enregistrement du paiement: ${error.message}`);
  }
  return data as unknown as PaymentRow;
}

// ── Commande boutique ─────────────────────────────────────────────────────────
// Miroir de createOrder (products.functions.ts) : les prix/items venus du client ne sont
// qu'un indice — ils sont recalculés depuis le catalogue avant persistance. L'ordre est
// créé pending ; le paiement le passe à confirmed (fulfillment, webhook ou page de retour).
const OrderPaymentInput = z.object({
  child_id: z.string().uuid(),
  challenge_id: z.string().uuid().nullable().optional(),
  items: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string(),
      price_xof: z.number().int().min(0),
    }),
  ),
  delivery_notes: z.string().optional().nullable(),
  callbackUrl: callbackUrlSchema,
});

export const initializeOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => OrderPaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.child_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    // Même garde que createOrder : tous les items doivent référencer un produit du
    // catalogue, dont le prix réel est recomputé (jamais celui envoyé par le client).
    const productIds = data.items.map((i) => i.id).filter((id): id is string => !!id);
    if (productIds.length !== data.items.length) {
      throw new Error("Commande invalide : un article ne référence aucun produit.");
    }
    const { data: products, error: productsErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price_xof, is_active")
      .in("id", productIds);
    if (productsErr) throw new Error(productsErr.message);

    const productById = new Map((products ?? []).map((p) => [p.id, p]));
    const items = productIds.map((id) => {
      const product = productById.get(id);
      if (!product) throw new Error("Un des produits commandés n'existe plus.");
      if (!product.is_active) {
        throw new Error(`Produit indisponible actuellement : ${product.name}`);
      }
      return { id: product.id, name: product.name, price_xof: product.price_xof };
    });
    const total_price_xof = items.reduce((sum, item) => sum + item.price_xof, 0);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        child_id: data.child_id,
        challenge_id: data.challenge_id || null,
        total_price_xof,
        items,
        delivery_notes: data.delivery_notes || null,
        status: "pending",
      })
      .select("*")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const reference = createPaystackReference("ORDER");
    await createPaystackPayment({
      supabaseAdmin,
      userId,
      reference,
      amountXof: total_price_xof,
      metadata: { type: "order", order_id: order.id, child_id: data.child_id },
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: await getPaystackUserEmail(supabaseAdmin, userId),
      amountXof: total_price_xof,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "order", order_id: order.id, child_id: data.child_id },
    });

    return { authorizationUrl, reference, amountXof: total_price_xof };
  });

// ── Accès mensuel enfant (profil supplémentaire) ──────────────────────────────
// Prix : barème du compte (5 000 F/mois promo → 15 000 F/mois standard, pricing.ts) × mois.
const ChildAccessPaymentInput = z.object({
  childId: z.string().uuid(),
  months: z.number().int().min(1).max(12),
  callbackUrl: callbackUrlSchema,
});

export const initializeChildAccessPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildAccessPaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) throw new Error("Utilisateur introuvable.");

    const rate = resolveExtraSlotPrice(userRes.user.created_at);
    const amountXof = rate.priceXof * data.months;

    const reference = createPaystackReference("ACCESS");
    await createPaystackPayment({
      supabaseAdmin,
      userId,
      reference,
      amountXof,
      metadata: { type: "child_access", child_id: data.childId, months: data.months },
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: userRes.user.email ?? "",
      amountXof,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "child_access", child_id: data.childId, months: data.months },
    });

    return { authorizationUrl, reference, amountXof, months: data.months };
  });

// ── Passeport d'Excellence ────────────────────────────────────────────────────
const PassportPaymentInput = z.object({
  childId: z.string().uuid(),
  callbackUrl: callbackUrlSchema,
});

export const initializePassportPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PassportPaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const reference = createPaystackReference("PASSPORT");
    await createPaystackPayment({
      supabaseAdmin,
      userId,
      reference,
      amountXof: PASSPORT_PRICE_XOF,
      metadata: { type: "passport", child_id: data.childId },
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: await getPaystackUserEmail(supabaseAdmin, userId),
      amountXof: PASSPORT_PRICE_XOF,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "passport", child_id: data.childId },
    });

    return { authorizationUrl, reference, amountXof: PASSPORT_PRICE_XOF };
  });

// ── Modale d'upgrade (quota atteint) ─────────────────────────────────────────
// La modale « Quota gratuit atteint » n'a pas d'enfant cible : elle finance un slot de
// capacité supplémentaire (quota_override, quota TOTAL accordé). Même barème que
// l'accès mensuel (pricing.ts × mois) — l'octroi automatise ce que l'admin fait
// aujourd'hui à la main via updateProfileQuotaAdmin après confirmation WhatsApp.
const UpgradePaymentInput = z.object({
  months: z.number().int().min(1).max(12),
  callbackUrl: callbackUrlSchema,
});

export const initializeUpgradePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpgradePaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) throw new Error("Utilisateur introuvable.");

    const rate = resolveExtraSlotPrice(userRes.user.created_at);
    const amountXof = rate.priceXof * data.months;

    const reference = createPaystackReference("UPGRADE");
    await createPaystackPayment({
      supabaseAdmin,
      userId,
      reference,
      amountXof,
      metadata: { type: "extra_slots", months: data.months },
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: userRes.user.email ?? "",
      amountXof,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "extra_slots", months: data.months },
    });

    return { authorizationUrl, reference, amountXof, months: data.months };
  });

// ── Pack Accompagnement (V4, Vague B) ──────────────────────────────────────────
// Paiement en ligne MENSUEL du pack, PAR ENFANT (décision 2) : 12 séances × 5 000 F =
// 60 000 F/mois, achat de 1 à 6 mois d'un coup. Le fulfilment crédite les séances sur
// family_coverages (source='accompaniment_pack') — le solde est consommé au fil des
// déclarations de séance (Vague C). Décision utilisateur : achat mensuel unique Paystack
// (PAS d'abonnement récurrent) — le parent rachète le mois suivant ; WhatsApp reste le
// secours manuel de la modale.
const AccompanimentPackInput = z.object({
  childId: z.string().uuid(),
  months: z.number().int().min(1).max(6),
  callbackUrl: callbackUrlSchema,
});

export const initializeAccompanimentPackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AccompanimentPackInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");

    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const amountXof = PACK_PRICE_XOF * data.months;

    const reference = createPaystackReference("PACK");
    await createPaystackPayment({
      supabaseAdmin,
      userId,
      reference,
      amountXof,
      metadata: { type: "accompaniment_pack", child_id: data.childId, months: data.months },
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: await getPaystackUserEmail(supabaseAdmin, userId),
      amountXof,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "accompaniment_pack", child_id: data.childId, months: data.months },
    });

    return { authorizationUrl, reference, amountXof, months: data.months };
  });
// Appelée par /paiement-retour après la redirection Paystack. Si le webhook est déjà
// passé (payment success), retourne tel quel (idempotent). Sinon vérifie la transaction,
// marque success et applique le bénéfice immédiatement — le webhook reste la confirmation
// de référence pour les cas où cette page n'est pas atteinte (fermeture de l'onglet, etc.).
const VerifyPaymentInput = z.object({ reference: z.string().min(1) });

export const verifyPaymentByReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => VerifyPaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction } = await import("@/lib/paystack.server");
    const { markPaymentSuccessAndFulfill } = await import("@/lib/payment-fulfillment.server");

    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (paymentErr) throw new Error(paymentErr.message);
    if (!payment) throw new Error("Paiement introuvable.");
    if (payment.user_id !== userId) throw new Error("Accès refusé à ce paiement.");

    // Déjà traité (webhook arrivé avant la redirection) → retour idempotent.
    if (payment.status === "success") {
      return {
        paymentStatus: "success",
        entitlement: (payment.metadata as PaymentMetadata | null)?.type ?? null,
        alreadyProcessed: true,
      };
    }
    if (payment.status === "failed" || payment.status === "abandoned") {
      return { paymentStatus: payment.status, entitlement: null, alreadyProcessed: true };
    }

    const verified = await verifyPaystackTransaction(data.reference);
    if (verified.status !== "success") {
      // Reflète le constat (abandoned/failed) sans écraser un éventuel success posé par le
      // webhook entre-temps — la mise à jour n'est tentée que si la payment est encore initiated.
      const mapped =
        verified.status === "failed"
          ? "failed"
          : verified.status === "abandoned"
            ? "abandoned"
            : null;
      if (mapped && payment.status === "initiated") {
        await supabaseAdmin
          .from("payments")
          .update({ status: mapped, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
      }
      return {
        paymentStatus: mapped ?? verified.status,
        entitlement: null,
        alreadyProcessed: false,
      };
    }

    if (verified.amountXof !== payment.amount_xof) {
      throw new Error("Montant payé différent du montant attendu — paiement rejeté.");
    }

    const result = await markPaymentSuccessAndFulfill(
      supabaseAdmin,
      payment as unknown as PaymentRow,
    );
    return { paymentStatus: "success", entitlement: result.entitlement, alreadyProcessed: false };
  });

// ── Parrainage en ligne (page publique /parrainage) ───────────────────────────
// Le parrain n'est PAS connecté — aucun middleware. Prix corrigé (décision 2026-08-08) :
// les 3 premiers mois sont OFFERTS, puis 15 000 F/mois (resolveSponsorshipPrice), toujours
// en XOF : c'est la devise de charge Paystack du compte. Si le prix à payer est nul (≤ 3
// mois), le code est créé immédiatement (payment_confirmed=true, aucun paiement) ; sinon
// redirection Paystack, et le webhook crée le code (payment-fulfillment, intent
// 'sponsorship') une fois la charge réussie.
const SponsorshipPaymentInput = z.object({
  sponsorName: z.string().min(2, "Nom du parrain obligatoire"),
  sponsorEmail: z.string().email("Adresse email invalide"),
  sponsorMessage: z.string().optional(),
  targetChildName: z.string().optional(),
  months: z.number().int().min(1).max(12),
  callbackUrl: callbackUrlSchema,
});

export const initializeSponsorshipPayment = createServerFn({ method: "POST" })
  .validator((input: unknown) => SponsorshipPaymentInput.parse(input))
  .handler(async ({ data }: { data: any }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { initializePaystackTransaction, createPaystackReference } =
      await import("@/lib/paystack.server");
    // createSponsorshipTokenRecord vit dans seasons.functions (module serveur lourd) —
    // import dynamique pour ne pas alourdir le bundle client de la page /parrainage.
    const { createSponsorshipTokenRecord } = await import("@/lib/seasons.functions");

    const pricing = resolveSponsorshipPrice(data.months, "XOF");

    // 3 premiers mois offerts → rien à payer : le code est actif d'office.
    if (pricing.amountPaid <= 0) {
      const token = await createSponsorshipTokenRecord(supabaseAdmin, {
        sponsorName: data.sponsorName,
        sponsorEmail: data.sponsorEmail,
        sponsorMessage: data.sponsorMessage,
        targetChildName: data.targetChildName,
        months: data.months,
        amountPaid: 0,
        currency: "XOF",
        paymentConfirmed: true,
      });
      return { authorizationUrl: null, reference: null, amountXof: 0, token };
    }

    const reference = createPaystackReference("SPONSOR");
    const sponsorshipMeta: PaymentMetadata = {
      type: "sponsorship",
      sponsor_name: data.sponsorName,
      sponsor_email: data.sponsorEmail,
      sponsor_message: data.sponsorMessage ?? null,
      target_child_name: data.targetChildName ?? null,
      months: data.months,
      currency: "XOF",
    };

    await createPaystackPayment({
      supabaseAdmin,
      userId: null,
      reference,
      amountXof: pricing.amountPaid,
      metadata: sponsorshipMeta,
    });

    const { authorizationUrl } = await initializePaystackTransaction({
      email: data.sponsorEmail,
      amountXof: pricing.amountPaid,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: { intent: "sponsorship", ...sponsorshipMeta },
    });

    return { authorizationUrl, reference, amountXof: pricing.amountPaid, token: null };
  });

// Vérification depuis la page de retour (paiement du parrain). Le webhook a peut-être déjà
// créé le code (payment success) → retour idempotent avec le token. Sinon on vérifie la
// transaction, on applique le bénéfice (création du code) et on le renvoie.
export const verifySponsorshipPayment = createServerFn({ method: "POST" })
  .validator((input: unknown) => VerifyPaymentInput.parse(input))
  .handler(async ({ data }: { data: any }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction } = await import("@/lib/paystack.server");
    const { markPaymentSuccessAndFulfill } = await import("@/lib/payment-fulfillment.server");

    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (paymentErr) throw new Error(paymentErr.message);
    if (!payment) throw new Error("Paiement introuvable.");

    const fetchToken = async () => {
      const { data: token } = await supabaseAdmin
        .from("sponsorship_tokens")
        .select("*")
        .eq("paystack_reference", data.reference)
        .maybeSingle();
      return token ?? null;
    };

    // Déjà traité (webhook arrivé avant la redirection) → retour idempotent.
    if (payment.status === "success") {
      return { paymentStatus: "success", alreadyProcessed: true, token: await fetchToken() };
    }
    if (payment.status === "failed" || payment.status === "abandoned") {
      return { paymentStatus: payment.status, alreadyProcessed: true, token: null };
    }

    const verified = await verifyPaystackTransaction(data.reference);
    if (verified.status !== "success") {
      const mapped =
        verified.status === "failed"
          ? "failed"
          : verified.status === "abandoned"
            ? "abandoned"
            : null;
      if (mapped && payment.status === "initiated") {
        await supabaseAdmin
          .from("payments")
          .update({ status: mapped, updated_at: new Date().toISOString() })
          .eq("id", payment.id);
      }
      return { paymentStatus: mapped ?? verified.status, alreadyProcessed: false, token: null };
    }

    if (Math.round(verified.amountXof) !== payment.amount_xof) {
      throw new Error("Montant payé différent du montant attendu — paiement rejeté.");
    }

    await markPaymentSuccessAndFulfill(supabaseAdmin, payment as unknown as PaymentRow);
    return { paymentStatus: "success", alreadyProcessed: false, token: await fetchToken() };
  });

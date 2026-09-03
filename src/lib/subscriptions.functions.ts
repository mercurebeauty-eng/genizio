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
import { computeAppQuota } from "@/lib/child-profile-quota";
import {
  syncFamilyCoverage,
  revokeFamilyCoverage,
  resolveCoverageState,
} from "@/lib/family-coverages";

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
 * Retrouve le plan Paystack (idempotent à travers les déploiements) :
 * 1. Variables d'environnement (PAYSTACK_PLAN_FAMILY_STANDARD / PAYSTACK_PLAN_FAMILY_PROMO)
 * 2. Cache local table paystack_plans
 * 3. Recherche par nom chez Paystack via searchPaystackPlans
 * 4. Création automatique chez Paystack si absent.
 */
async function ensurePaystackPlan(
  supabaseAdmin: any,
  planKey: FamilyPlanKey,
): Promise<{ planCode: string; amountXof: number }> {
  const plan = FAMILY_PLANS[planKey] ?? FAMILY_PLANS.family_standard;

  // 1. Priorité aux variables d'environnement Vercel / .env
  const envPlanCode =
    planKey === "family_promo"
      ? process.env.PAYSTACK_PLAN_FAMILY_PROMO || process.env.PAYSTACK_PLAN_FAMILY_STANDARD
      : process.env.PAYSTACK_PLAN_FAMILY_STANDARD || process.env.PAYSTACK_PLAN_FAMILY_PROMO;

  const upsertCache = async (planCode: string) => {
    const { error } = await supabaseAdmin.from("paystack_plans").upsert(
      {
        plan_key: planKey,
        plan_code: planCode,
        name: plan.name,
        interval: "monthly",
        amount_xof: plan.priceXof,
        currency: "XOF",
      },
      { onConflict: "plan_key" },
    );
    if (error) {
      // Course entre deux appels : relire le cache plutôt que d'échouer.
      const { data: reread } = await supabaseAdmin
        .from("paystack_plans")
        .select("plan_code")
        .eq("plan_key", planKey)
        .maybeSingle();
      if (!reread) console.warn(`Erreur lors du cache du plan: ${error.message}`);
      return reread?.plan_code ?? planCode;
    }
    return planCode;
  };

  if (envPlanCode) {
    // Si la variable d'env est fournie, on s'assure qu'elle est en cache et on la retourne directement
    await upsertCache(envPlanCode).catch(() => {});
    return { planCode: envPlanCode, amountXof: plan.priceXof };
  }

  // 2. Cache en base de données
  const { data: cached, error: cacheErr } = await supabaseAdmin
    .from("paystack_plans")
    .select("plan_code, amount_xof")
    .eq("plan_key", planKey)
    .maybeSingle();
  if (cacheErr) throw new Error(cacheErr.message);
  if (cached) return { planCode: cached.plan_code, amountXof: cached.amount_xof };

  // 3. Recherche chez Paystack ou création
  const { searchPaystackPlans, createPaystackPlan } = await import("@/lib/paystack.server");

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

// V4 (Vague A) : synchronise la ligne family_coverages source='subscription' depuis la ligne
// billing — la couverture famille app suit exactement la fenêtre déjà payée ('active' comme
// 'past_due' couvrent jusqu'à current_period_end, la grâce du résolveur). Toute mutation du
// statut/période d'abonnement passe par ici pour ne jamais laisser les deux sources diverger.
async function syncSubscriptionCoverage(supabaseAdmin: any, sub: any): Promise<void> {
  if (!sub?.user_id) return;
  const covering =
    (sub.status === "active" || sub.status === "past_due") && !!sub.current_period_end;
  if (covering) {
    await syncFamilyCoverage(supabaseAdmin, {
      userId: sub.user_id,
      source: "subscription",
      sourceRef: sub.id ?? null,
      startsAt: sub.current_period_start ?? sub.started_at ?? null,
      endsAt: sub.current_period_end,
      priceXof: sub.price_xof ?? null,
      status: "active",
    });
  } else {
    await revokeFamilyCoverage(supabaseAdmin, { userId: sub.user_id, source: "subscription" });
  }
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
    const day = end.getDate();
    end.setMonth(end.getMonth() + 1);
    // Fin de mois (review 2026-08-12, P2) : ne déborde jamais sur le mois suivant
    // (31 janv + 1 mois → fin février, pas 3 mars) — setDate(0) = dernier jour
    // du mois précédent, donc du mois cible.
    if (end.getDate() < day) end.setDate(0);
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
        const { sendSubscriptionConfirmationEmail } = await import("@/lib/payment-email.functions");
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
    // V4 (Vague A) : la couverture family_coverages suit la fenêtre posée.
    await syncFamilyCoverage(supabaseAdmin, {
      userId: params.userId,
      source: "subscription",
      startsAt: paidAt.toISOString(),
      endsAt: plusOneMonth(paidAt),
      priceXof: params.priceXof ?? null,
      status: "active",
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
    // Même paiement déjà traité : la couverture est déjà posée, mais resynchroniser est
    // gratuit et répare toute divergence (ligne posée avant la V4, etc.).
    await syncSubscriptionCoverage(supabaseAdmin, sub);
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

  // V4 (Vague A) : la couverture family_coverages suit la fenêtre étendue (renouvellement
  // ou premier paiement) — jamais de découpe, même règle que la période billing.
  await syncSubscriptionCoverage(supabaseAdmin, {
    ...sub,
    status: "active",
    current_period_start: nextPeriodStart,
    current_period_end: nextPeriodEnd,
    price_xof: params.priceXof ?? sub.price_xof,
  });

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
  /** Couverture CAMPAGNE (2026-08-14) : un enfant du compte est inscrit à une campagne
   *  active (fenêtre fixe en cours) → la famille est soutenue par l'institution, elle
   *  peut créer plusieurs profils sans abonnement. Miroir du trigger
   *  check_child_profile_quota (migration 20260814160000). */
  campaignCovered: boolean;
  childrenCount: number;
  /** Limite de CRÉATION de profils (V4, Vague A) : calculée côté serveur via computeAppQuota
   *  (child-profile-quota.ts) depuis family_coverages — miroir exact du trigger V10
   *  (migration 20260814200000). L'UI (profiles.index/manage/ProfileDialog) affiche la jauge
   *  X/N avec cette valeur, au lieu de recalculer les règles en client. */
  creationLimit: number;
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

    // Couverture CAMPAGNE (2026-08-14) : un enfant du compte inscrit à une campagne
    // active (fenêtre fixe en cours) — l'institution finance la famille, la création de
    // profils ne doit pas exiger d'abonnement. Même fenêtre que getChildAccessStatus.
    const { data: campaignEnrollments, error: campErr } = await supabaseAdmin
      .from("season_enrollments")
      .select("campaign_id, campaigns(start_date, end_date)")
      .eq("user_id", userId)
      .not("campaign_id", "is", null);
    if (campErr) throw new Error(campErr.message);

    const now = Date.now();
    const campaignCovered = ((campaignEnrollments ?? []) as any[]).some((e) => {
      const c = e.campaigns as { start_date: string | null; end_date: string | null } | null;
      if (!c?.start_date || !c?.end_date) return false;
      return new Date(c.start_date).getTime() <= now && now <= new Date(c.end_date).getTime();
    });

    const { count: childrenCount } = await supabaseAdmin
      .from("child_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // V4 (Vague A) : couverture family_coverages → limite de création (miroir trigger V10).
    // quota_override reste lu depuis app_metadata (outil ADMIN, borné 50).
    const coverage = await resolveCoverageState(supabaseAdmin as any, userId);
    const { data: educatorRes } = await (supabaseAdmin as any)
      .from("campaign_educators")
      .select("id", { count: "exact", head: true })
      .eq("educator_user_id", userId)
      .is("removed_at", null);
    const creationLimit = computeAppQuota({
      accountCreatedAt: userRes?.user?.created_at ?? null,
      quotaOverride: Number((userRes?.user?.app_metadata as any)?.quota_override ?? 0) || 0,
      hasBaseCoverage: coverage.hasBaseCoverage,
      sumPurchases: coverage.sumPurchases,
      isVouchedEducator: (educatorRes?.count ?? 0) > 0,
    });
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
      campaignCovered,
      // Champ déclaré dans le type mais omis du retour — SubscriptionCard affichait
      // « undefined profils actifs » (bug latent, corrigé 2026-08-14).
      childrenCount: childrenCount ?? 0,
      creationLimit,
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

    // V4 (Vague A) : coupure IMMÉDIATE de la couverture family_coverages — le résolveur
    // cesse de compter la ligne, tous les profils hors le 1er gratuit passent 'expired'.
    await revokeFamilyCoverage(supabaseAdmin, { userId, source: "subscription" });

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

    // Consommation atomique du code (review 2026-08-12, P2) : deux demandes concurrentes
    // (double-clic, deux onglets) lisent toutes deux is_redeemed=false — le claim
    // compare-and-swap ne laisse passer qu'une seule, l'autre reçoit « déjà utilisé »
    // AVANT de poser le crédit (jamais deux crédits sur le même code).
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("sponsorship_tokens")
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq("id", token.id)
      .eq("is_redeemed", false)
      .select("id")
      .maybeSingle();
    if (claimErr) throw new Error("Erreur lors de l'activation du code. Réessayez.");
    if (!claimed) throw new Error("Ce code de parrainage a déjà été utilisé.");

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
      // Rollback best-effort du claim : un échec ne brûle jamais le code.
      await supabaseAdmin
        .from("sponsorship_tokens")
        .update({ is_redeemed: false, redeemed_at: null })
        .eq("id", token.id)
        .eq("is_redeemed", true);
      throw new Error(
        "Erreur lors de l'activation du code. Le code n'a pas été consommé, réessayez.",
      );
    }

    // V4 (Vague A) : la couverture family_coverages source='sponsorship' suit la même fenêtre
    // (extension sans découpe) — l'écriture est idempotente (une ligne par compte+source).
    await syncFamilyCoverage(supabaseAdmin, {
      userId,
      source: "sponsorship",
      sourceRef: token.id,
      startsAt: new Date().toISOString(),
      endsAt,
      maxChildren: 5,
      status: "active",
    });

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

export type AdminAccompanimentPackRow = {
  id: string;
  userId: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  childId: string;
  childName: string;
  childAge: number | null;
  mentorEmail: string | null;
  sessions: number;
  sessionsUsed: number;
  priceXof: number | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type SubscriptionsAdminData = {
  subscriptions: AdminSubscriptionRow[];
  accompanimentPacks: AdminAccompanimentPackRow[];
  mrrXof: number;
  activeCount: number;
  pastDueCount: number;
  cancelledCount: number;
  churn30dCount: number;
  activePacksCount: number;
  totalSessionsRemaining: number;
};

// Vue admin : chaque famille, sa ligne d'abonnement + couverture parrainage cumulée + packs accompagnement par enfant.
export const getSubscriptionsDataAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<SubscriptionsAdminData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: subs, error: subsErr } = await (supabaseAdmin as any)
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (subsErr) throw new Error(subsErr.message);

    const { data: credits, error: credErr } = await (supabaseAdmin as any)
      .from("sponsorship_credits")
      .select("user_id, ends_at");
    if (credErr) throw new Error(credErr.message);

    // Packs accompagnement / mentorat par enfant (family_coverages source='accompaniment_pack')
    const { data: packs, error: packsErr } = await (supabaseAdmin as any)
      .from("family_coverages")
      .select("*")
      .eq("source", "accompaniment_pack")
      .order("created_at", { ascending: false });
    if (packsErr) throw new Error(packsErr.message);

    // Profils enfants pour enrichir les packs
    const { data: children, error: chErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age");
    if (chErr) throw new Error(chErr.message);
    const childById = new Map((children ?? []).map((c) => [c.id, c]));

    // Contacts parents via parent_profiles (Vague 1)
    const { data: contacts, error: contactsErr } = await supabaseAdmin
      .from("parent_profiles")
      .select("user_id, email, phone, display_name");
    if (contactsErr) throw new Error(contactsErr.message);
    const userById = new Map((contacts ?? []).map((u) => [u.user_id, u]));

    // Assignations mentors actives pour afficher le mentor en regard de chaque pack
    const { data: mentorAssignments } = await (supabaseAdmin as any)
      .from("mentors")
      .select("child_profile_id, mentor_user_id")
      .is("removed_at", null);
    const mentorUserByChild = new Map((mentorAssignments ?? []).map((m: any) => [m.child_profile_id, m.mentor_user_id]));

    // Dernière fin de couverture parrainage par famille
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
      const priceXof = s.price_xof ?? null;
      const row: AdminSubscriptionRow = {
        id: s.id,
        userId: s.user_id,
        parentName: user?.display_name ?? null,
        parentEmail: user?.email ?? null,
        parentPhone: user?.phone ?? null,
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

    let activePacksCount = 0;
    let totalSessionsRemaining = 0;

    const accompanimentPacks: AdminAccompanimentPackRow[] = (packs ?? []).map((p: any) => {
      const user = userById.get(p.user_id);
      const child = childById.get(p.child_id);
      const mentorUserId = mentorUserByChild.get(p.child_id);
      const mentorUser = mentorUserId ? userById.get(mentorUserId) : null;
      const sessions = p.sessions ?? 0;
      const sessionsUsed = p.sessions_used ?? 0;
      const remaining = Math.max(0, sessions - sessionsUsed);

      const isActive = p.status === "active" && (!p.ends_at || new Date(p.ends_at).getTime() > now.getTime());
      if (isActive) {
        activePacksCount += 1;
        totalSessionsRemaining += remaining;
      }

      return {
        id: p.id,
        userId: p.user_id,
        parentName: user?.display_name ?? null,
        parentEmail: user?.email ?? null,
        parentPhone: user?.phone ?? null,
        childId: p.child_id,
        childName: child?.name ?? "—",
        childAge: child?.age ?? null,
        mentorEmail: mentorUser?.email ?? null,
        sessions,
        sessionsUsed,
        priceXof: p.price_xof ?? null,
        status: p.status,
        startsAt: p.starts_at ?? null,
        endsAt: p.ends_at ?? null,
        createdAt: p.created_at,
      };
    });

    return {
      subscriptions,
      accompanimentPacks,
      mrrXof,
      activeCount,
      pastDueCount,
      cancelledCount,
      churn30dCount,
      activePacksCount,
      totalSessionsRemaining,
    };
  });

// Prolonge un Pack Accompagnement (ajoute des mois et/ou des séances financées)
export const extendAccompanimentPackAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z
      .object({
        coverageId: z.string().uuid(),
        months: z.number().int().min(1).max(12).default(1),
        addSessions: z.number().int().min(0).default(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cov, error: getErr } = await (supabaseAdmin as any)
      .from("family_coverages")
      .select("id, ends_at, sessions")
      .eq("id", data.coverageId)
      .maybeSingle();
    if (getErr || !cov) throw new Error("Pack d'accompagnement introuvable");

    const { endsAt } = computeAccessPeriodWindow(cov.ends_at ?? null, data.months);
    const newSessions = (cov.sessions ?? 0) + data.addSessions;

    const { error: updErr } = await (supabaseAdmin as any)
      .from("family_coverages")
      .update({
        ends_at: endsAt,
        sessions: newSessions,
        status: "active",
      })
      .eq("id", data.coverageId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, endsAt, sessions: newSessions };
  });

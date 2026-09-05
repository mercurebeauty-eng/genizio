// Contrôles manuels de secours — refonte de l'Admin OS (2026-08-13, décision #71).
//
// Contexte : le webhook Paystack et la page de retour sont les deux chemins normaux
// de fulfillment, mais si le webhook ne se déclenche pas (ou que la page de retour
// n'est jamais atteinte), une payment reste `initiated` sans aucun bénéfice — et
// l'admin n'avait AUCUNE vue sur la table `payments`. Ce module est l'écran de
// secours : voir les paiements, rejouer leur exécution (vérification Paystack puis
// fulfillment idempotent), ou les marquer reçus manuellement (paiements hors-ligne
// WhatsApp/Mobile Money — décision admin).
//
// Règles : requireAdmin partout, supabaseAdmin (bypass RLS), imports dynamiques de
// paystack.server / payment-fulfillment.server (jamais côté client).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import type { PaymentRow } from "@/lib/payment-fulfillment.server";

// ── 1. File des paiements ───────────────────────────────────────────────────────

const PAYMENT_INTENT_LABELS: Record<string, string> = {
  order: "Commande",
  child_access: "Accès enfant",
  passport: "Passeport",
  extra_slots: "Palier supplémentaire", // V4, décision 5 : +5 enfants par palier
  accompaniment_pack: "Pack Accompagnement",
  sponsorship: "Parrainage",
  campaign_b2b: "Campagne B2B",
};

export interface AdminPaymentRow extends PaymentRow {
  created_at: string;
  intentLabel: string;
  parentEmail: string | null;
}

const PaymentsPageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  status: z.enum(["all", "initiated"]).default("all"),
});

export interface PaginatedPaymentsResponse {
  data: AdminPaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** File des paiements paginée (Vague 4) — plus de troncature silencieuse à 100, plus
 *  de scan complet de l'annuaire : emails via parent_profiles (page uniquement). */
export const listPaymentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => PaymentsPageInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<PaginatedPaymentsResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin.from("payments").select("*", { count: "exact" });
    if (data.status === "initiated") query = query.eq("status", "initiated");
    const {
      data: payments,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range((data.page - 1) * data.pageSize, data.page * data.pageSize - 1);
    if (error) throw new Error(error.message);

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const page = Math.min(data.page, totalPages);

    const pageRows = (payments ?? []) as unknown as AdminPaymentRow[];
    const userIds = [...new Set(pageRows.map((p) => p.user_id).filter(Boolean) as string[])];
    const emailByUserId = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from("parent_profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      for (const c of contacts ?? []) emailByUserId.set(c.user_id, c.email);
    }

    return {
      data: pageRows.map((p) => ({
        ...p,
        intentLabel: PAYMENT_INTENT_LABELS[(p.metadata as any)?.type] ?? "Inconnu",
        parentEmail: p.user_id ? (emailByUserId.get(p.user_id) ?? null) : null,
      })),
      total,
      page,
      pageSize: data.pageSize,
      totalPages,
    };
  });

/** Comptage des paiements en attente (badges de la grille d'accueil). */
export const getPaymentsPendingCountAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "initiated");
    if (error) throw new Error(error.message);
    return { pendingCount: count ?? 0 };
  });

// ── 2. Rejouer / marquer reçu un paiement ───────────────────────────────────────

const RetryPaymentInput = z.object({
  paymentId: z.string().uuid(),
  mode: z.enum(["verify", "manual"]),
});

export type RetryPaymentOutcome =
  | { ok: true; entitlement: string; detail: string; pendingCount?: number }
  | { ok: false; reason: string; detail?: string };

/**
 * Secours webhook :
 *  • verify : vérifie la transaction Paystack (statut + montant) puis exécute le
 *    fulfillment (markPaymentSuccessAndFulfill, idempotent — skip si déjà success) ;
 *  • manual : exécute le fulfillment sans Paystack (paiement hors-ligne — décision
 *    admin), payment ET bénéfice écrits ensemble (finit le décalage commande/payment).
 */
export const retryPaymentFulfillmentAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => RetryPaymentInput.parse(input))
  .handler(async ({ data }): Promise<RetryPaymentOutcome> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) return { ok: false, reason: "PAYMENT_NOT_FOUND" };
    if (payment.status === "success") return { ok: false, reason: "ALREADY_SUCCESS" };

    if (data.mode === "verify") {
      const { verifyPaystackTransaction } = await import("@/lib/paystack.server");
      let verified;
      try {
        verified = await verifyPaystackTransaction(payment.reference);
      } catch {
        return {
          ok: false,
          reason: "VERIFY_FAILED",
          detail: "Transaction introuvable chez Paystack.",
        };
      }
      if (verified.status !== "success") {
        return { ok: false, reason: `TX_${verified.status.toUpperCase()}` };
      }
      if (verified.amountXof !== payment.amount_xof) {
        return {
          ok: false,
          reason: "AMOUNT_MISMATCH",
          detail: "Montant Paystack différent de la payment.",
        };
      }
    }

    const { markPaymentSuccessAndFulfill } = await import("@/lib/payment-fulfillment.server");
    try {
      const result = await markPaymentSuccessAndFulfill(
        supabaseAdmin,
        payment as unknown as PaymentRow,
      );

      // Calcul direct du nouveau nombre de paiements en attente
      const { count: pendingCount } = await supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "initiated");

      return {
        ok: true,
        entitlement: result.entitlement,
        detail: result.detail,
        pendingCount: pendingCount ?? 0,
      };
    } catch (err: any) {
      return { ok: false, reason: "FULFILLMENT_FAILED", detail: err?.message };
    }
  });

// ── 3. Abonnements famille ──────────────────────────────────────────────────────

const SubscriptionIdInput = z.object({ subscriptionId: z.string().uuid() });

/**
 * Secours du 1er paiement d'abonnement : vérifie la référence Paystack puis active
 * la ligne (activeFamilySubscription, idempotent par référence) — branche enfin la
 * logique de verifyFamilySubscriptionPayment, jusqu'ici orpheline côté admin.
 */
export const activateSubscriptionFromReferenceAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SubscriptionIdInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction } = await import("@/lib/paystack.server");
    const { activateFamilySubscription } = await import("@/lib/subscriptions.functions");

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub) return { ok: false, reason: "SUBSCRIPTION_NOT_FOUND" };
    if (sub.status === "active") return { ok: false, reason: "ALREADY_ACTIVE" };
    if (!sub.paystack_reference) return { ok: false, reason: "NO_REFERENCE" };

    const verified = await verifyPaystackTransaction(sub.paystack_reference);
    if (verified.status !== "success") {
      return { ok: false, reason: `TX_${verified.status.toUpperCase()}` };
    }
    if (verified.amountXof !== sub.price_xof) {
      return { ok: false, reason: "AMOUNT_MISMATCH" };
    }
    const subscriptionCode = verified.subscriptionCode ?? sub.paystack_subscription_code;
    if (!subscriptionCode) return { ok: false, reason: "NO_SUBSCRIPTION_CODE" };

    await activateFamilySubscription(supabaseAdmin, {
      userId: sub.user_id,
      reference: sub.paystack_reference,
      subscriptionCode,
      customerCode: verified.customerCode ?? sub.paystack_customer_code,
      planCode: verified.planCode ?? sub.plan_code,
      paidAt: verified.paidAt,
      priceXof: sub.price_xof,
    });
    return { ok: true };
  });

const ExtendSubscriptionInput = z.object({
  subscriptionId: z.string().uuid(),
  months: z.number().int().min(1).max(12),
});

/** Fenêtre d'extension pure : la base est le plus tard entre la fin courante et
 *  maintenant (jamais de découpe de période), puis +months. Testable sans base.
 *  Fin de mois clampée (review 2026-08-12, P2) : 31 janv + 1 mois → fin février,
 *  jamais de débordement JS sur le mois suivant (3 mars). */
export function computeSubscriptionExtensionWindow(
  currentEnd: string | null,
  months: number,
): { start: string; end: string } {
  const now = new Date();
  const base =
    currentEnd && new Date(currentEnd).getTime() > now.getTime() ? new Date(currentEnd) : now;
  const end = new Date(base);
  const day = end.getDate();
  end.setMonth(end.getMonth() + months);
  if (end.getDate() < day) end.setDate(0); // dernier jour du mois cible
  return { start: base.toISOString(), end: end.toISOString() };
}

/** Nombre de codes B2B créés par un paiement de campagne (pur) : montant ÷ prix
 *  unitaire, minimum 1 (un paiement même partiel crée au moins un code). */
export function campaignTokenCount(amountXof: number, pricePerTokenXof: number): number {
  return Math.max(1, Math.floor(amountXof / pricePerTokenXof));
}

/** Lot final de codes pour un paiement de campagne (pur) : le count demandé par le
 *  montant est plafonné à l'objectif restant (garde anti-dépassement). Lève une
 *  erreur si la campagne n'a pas de prix unitaire. 0 = capacité atteinte. */
export function resolveCampaignTokenLot(
  amountXof: number,
  pricePerTokenXof: number | null | undefined,
  existingCount: number,
  targetCount: number,
): number {
  if (!pricePerTokenXof || pricePerTokenXof <= 0) {
    throw new Error("Campagne sans prix unitaire (price_per_token_xof).");
  }
  const count = campaignTokenCount(amountXof, pricePerTokenXof);
  const remaining = Math.max(0, targetCount - existingCount);
  return Math.min(count, remaining);
}

/** Écart entre le lot livré et le lot payé (pur) : 0 = conforme. Un écart ≠ 0 est une
 *  anomalie (trop-perçu si négatif — capacité restante réduite entre la génération du
 *  lien et le paiement ; sur-livraison si positif — prix unitaire modifié entre-temps).
 *  Le fulfillment BLOQUE sur tout écart : jamais de plafonnement muet qui ferait perdre
 *  de l'argent à l'ONG sans aucune trace (review 2026-08-12). Un lien ancien sans
 *  token_count enregistré ne permet aucune inférence → 0. */
export function campaignLotDiscrepancy(
  requestedCount: number | null | undefined,
  deliverableCount: number,
): number {
  if (requestedCount == null) return 0;
  return deliverableCount - requestedCount;
}

/** Renouvellement manuel : extension de current_period_end (fenêtre cumulée, jamais
 *  de découpe — la base est le plus tard entre la fin courante et maintenant). */
export const extendSubscriptionPeriodAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ExtendSubscriptionInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub) return { ok: false, reason: "SUBSCRIPTION_NOT_FOUND" };

    const { start, end } = computeSubscriptionExtensionWindow(sub.current_period_end, data.months);

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: sub.current_period_start ?? start,
        current_period_end: end,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
    return { ok: true, endsAt: end };
  });

/** Résiliation manuelle par l'admin (+ désactivation du code Paystack si connu). */
export const cancelSubscriptionAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SubscriptionIdInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, paystack_subscription_code")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub) return { ok: false, reason: "SUBSCRIPTION_NOT_FOUND" };
    if (sub.status === "cancelled") return { ok: false, reason: "ALREADY_CANCELLED" };

    if (sub.paystack_subscription_code) {
      try {
        const { disablePaystackSubscription } = await import("@/lib/paystack.server");
        await disablePaystackSubscription(sub.paystack_subscription_code);
      } catch {
        // Non fatal : la résiliation locale suffit (le webhook disable finira de
        // synchroniser côté Paystack).
      }
    }

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── 4. Parrainage : création manuelle d'un token confirmé ───────────────────────

const CreateSponsorshipInput = z.object({
  sponsorName: z.string().trim().min(1).max(120),
  sponsorEmail: z.string().trim().min(1).max(200),
  months: z.number().int().min(1).max(12).default(3),
  amountXof: z.number().int().min(0).default(0),
});

/** Secours du parrainage online dont le token n'a jamais été créé (webhook manqué) :
 *  création d'un token CONFIRMÉ d'office (décision admin), prêt à être rédimé. */
export const createSponsorshipTokenAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => CreateSponsorshipInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createSponsorshipTokenRecord } = await import("@/lib/seasons.functions");

    const token = await createSponsorshipTokenRecord(supabaseAdmin, {
      sponsorName: data.sponsorName,
      sponsorEmail: data.sponsorEmail,
      months: data.months,
      amountPaid: data.amountXof,
      currency: "XOF",
      paymentConfirmed: true,
    });
    return { ok: true, code: token.code };
  });

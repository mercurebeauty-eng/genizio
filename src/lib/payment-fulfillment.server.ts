// Application des bénéfices d'un paiement Paystack réussi — partagé entre la page de
// retour (vérification immédiate via verifyPaymentByReference) et le webhook
// (confirmation asynchrone de référence). Idempotence EXACTEMENT-une-fois garantie par
// un compare-and-swap en base (status ≠ success → success), pas par un simple check
// côté appelant (TOCTOU — review 2026-08-12, P1).
//
// Intents (payments.metadata) :
//   • order        → orders.status = 'confirmed' + payment_reference
//   • child_access → insertion child_access_periods (extension, jamais de découpe)
//   • passport     → child_profiles.pdf_unlocked = true
//   • extra_slots  → +1 quota_override, quota TOTAL (modale d'upgrade, legacy)
//   • sponsorship  → création du code de parrainage (payment_confirmed=true d'office :
//                     le paiement en ligne remplace la confirmation admin WhatsApp)
//   • campaign_b2b → lot de codes B2B confirmés (lien partageable d'une campagne payée)
//
// Serveur uniquement — jamais importé côté client (même pattern que paystack.server.ts).

import { computeAccessPeriodWindow } from "@/lib/child-access";
import { isGrandfatheredAccount } from "@/lib/child-profile-quota";
import { createSponsorshipTokenRecord, getActiveSeason } from "@/lib/seasons.functions";
// Import runtime de la fonction pure (payments-admin n'importe ce module que
// dynamiquement dans ses handlers — aucun cycle d'exécution).
import { campaignLotDiscrepancy, resolveCampaignTokenLot } from "@/lib/payments-admin.functions";

export type PaymentMetadata = {
  type: "order" | "child_access" | "passport" | "extra_slots" | "sponsorship" | "campaign_b2b";
  order_id?: string;
  child_id?: string;
  months?: number;
  // sponsorship — infos du parrain stockées dans le metadata pour créer le code côté webhook.
  sponsor_name?: string;
  sponsor_email?: string;
  sponsor_message?: string;
  target_child_name?: string;
  // campaign_b2b — paiement du lien partageable d'une campagne (mode payé).
  campaign_id?: string;
  /** Nombre de codes payés par le lien (écrit à la génération du lien, décision #72). */
  token_count?: number;
  currency?: string;
};

export type PaymentRow = {
  id: string;
  user_id: string | null;
  reference: string;
  provider: string;
  status: string;
  amount_xof: number;
  currency: string;
  metadata: PaymentMetadata;
  paid_at: string | null;
};

export type FulfillmentResult = {
  entitlement: string;
  detail: string;
};

export async function applyPaystackEntitlement(
  supabaseAdmin: any,
  payment: PaymentRow,
): Promise<FulfillmentResult> {
  const metadata = payment.metadata ?? {};

  switch (metadata.type) {
    case "order": {
      if (!metadata.order_id) throw new Error("Payment 'order' sans order_id dans le metadata.");
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "confirmed",
          payment_reference: payment.reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", metadata.order_id)
        .select("id")
        .single();
      if (error) throw new Error(`Erreur lors de la confirmation de la commande: ${error.message}`);
      return { entitlement: "order", detail: `Commande confirmée (${order?.id})` };
    }

    case "child_access": {
      if (!metadata.child_id || !metadata.months || metadata.months < 1) {
        throw new Error("Payment 'child_access' sans child_id/months valides.");
      }
      // Même mécanique que extendChildAccessAdmin : lire la période la plus récente puis
      // étendre — computeAccessPeriodWindow démarre la nouvelle période au plus tard entre
      // maintenant et la fin de la période courante (aucune perte en cas de cumul).
      const { data: existing, error: getErr } = await supabaseAdmin
        .from("child_access_periods")
        .select("ends_at")
        .eq("child_id", metadata.child_id)
        .order("ends_at", { ascending: false })
        .limit(1);
      if (getErr) throw new Error(getErr.message);

      const { startsAt, endsAt } = computeAccessPeriodWindow(
        existing?.[0]?.ends_at ?? null,
        metadata.months,
      );

      const { error: insertErr } = await supabaseAdmin.from("child_access_periods").insert({
        child_id: metadata.child_id,
        starts_at: startsAt,
        ends_at: endsAt,
        source: "paystack",
        amount_xof: payment.amount_xof,
        currency: payment.currency,
        note: `Paiement en ligne (${payment.reference})`,
      });
      if (insertErr) {
        throw new Error(`Erreur lors de la prolongation d'accès: ${insertErr.message}`);
      }
      return { entitlement: "child_access", detail: `Accès étendu jusqu'au ${endsAt}` };
    }

    case "passport": {
      if (!metadata.child_id) throw new Error("Payment 'passport' sans child_id.");
      const { error } = await supabaseAdmin
        .from("child_profiles")
        .update({ pdf_unlocked: true })
        .eq("id", metadata.child_id);
      if (error) throw new Error(`Erreur lors du déblocage du passeport: ${error.message}`);
      return { entitlement: "passport", detail: `Passeport débloqué (${metadata.child_id})` };
    }

    // Modale d'upgrade (quota atteint) : la modale n'a pas d'enfant cible — elle finance un
    // slot de capacité supplémentaire. Miroir automatique de updateProfileQuotaAdmin
    // (products.functions.ts) : lecture-modification-écriture de quota_override dans
    // app_metadata, sans écraser les autres clés posées par GoTrue. Quota + unifié
    // (2026-08-14) : quota_override = quota TOTAL ; un slot payé l'élève d'un cran, en
    // partant du plancher du compte s'il n'y avait pas encore de quota +.
    case "extra_slots": {
      if (!payment.user_id) throw new Error("Payment 'extra_slots' sans user_id.");
      const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
        payment.user_id,
      );
      if (getErr || !userRes?.user) {
        throw new Error(`Utilisateur introuvable: ${getErr?.message ?? payment.user_id}`);
      }
      const floor = isGrandfatheredAccount(userRes.user.created_at) ? 5 : 1;
      const current = Number((userRes.user.app_metadata as any)?.quota_override ?? 0) || 0;
      const next = Math.min(Math.max(current, floor) + 1, 50);
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(payment.user_id, {
        app_metadata: {
          ...(userRes.user.app_metadata ?? {}),
          quota_override: next,
        },
      });
      if (updateErr) {
        throw new Error(`Erreur lors de l'octroi du slot: ${updateErr.message}`);
      }
      return { entitlement: "extra_slots", detail: `Slot de profil supplémentaire octroyé (+1 → quota ${next})` };
    }

    // Parrainage en ligne (décision 2026-08-08) : le token est créé PAR le paiement Paystack
    // (intent 'sponsorship') avec payment_confirmed = true — plus de confirmation admin
    // WhatsApp. Idempotent via paystack_reference (UNIQUE) : un paiement = un seul code.
    case "sponsorship": {
      if (!metadata.months || metadata.months < 1 || !metadata.sponsor_email) {
        throw new Error("Payment 'sponsorship' sans months/sponsor_email valides.");
      }
      const { data: existing, error: existErr } = await supabaseAdmin
        .from("sponsorship_tokens")
        .select("code")
        .eq("paystack_reference", payment.reference)
        .maybeSingle();
      if (existErr) throw new Error(existErr.message);
      if (existing) {
        return { entitlement: "sponsorship", detail: `Code de parrainage existant (${existing.code})` };
      }

      const token = await createSponsorshipTokenRecord(supabaseAdmin, {
        sponsorName: metadata.sponsor_name ?? "Parrain",
        sponsorEmail: metadata.sponsor_email,
        sponsorMessage: metadata.sponsor_message ?? null,
        targetChildName: metadata.target_child_name ?? null,
        months: metadata.months,
        amountPaid: payment.amount_xof,
        currency: metadata.currency ?? "XOF",
        paystackReference: payment.reference,
        paymentConfirmed: true,
      });
      return { entitlement: "sponsorship", detail: `Code de parrainage ${token.code}` };
    }

    // Campagne B2B payante (refonte Admin OS, 2026-08-13, décision #72) : le paiement du
    // lien partageable crée un lot de codes B2B CONFIRMÉS — count = montant payé / prix
    // unitaire. Idempotence (même pattern que le case sponsorship) : la référence Paystack
    // est portée par le PREMIER code du lot — les suivants laissent paystack_reference NULL,
    // car la colonne est UNIQUE en base (une référence partagée par N lignes violerait la
    // contrainte dès 2 codes — review 2026-08-12).
    case "campaign_b2b": {
      if (!metadata.campaign_id) throw new Error("Payment 'campaign_b2b' sans campaign_id.");
      const { data: campaign, error: campErr } = await supabaseAdmin
        .from("campaigns")
        .select("id, name, target_count, price_per_token_xof")
        .eq("id", metadata.campaign_id)
        .maybeSingle();
      if (campErr) throw new Error(campErr.message);
      if (!campaign) throw new Error("Campagne introuvable.");

      const { data: existing, error: existErr } = await supabaseAdmin
        .from("sponsorship_tokens")
        .select("code")
        .eq("paystack_reference", payment.reference)
        .maybeSingle();
      if (existErr) throw new Error(existErr.message);
      if (existing) {
        return {
          entitlement: "campaign_b2b",
          detail: `Lot B2B déjà créé pour ce paiement (code ${existing.code})`,
        };
      }

      const { count: existingCount, error: countErr } = await supabaseAdmin
        .from("sponsorship_tokens")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      if (countErr) throw new Error(countErr.message);

      const toCreate = resolveCampaignTokenLot(
        payment.amount_xof,
        campaign.price_per_token_xof,
        existingCount ?? 0,
        campaign.target_count ?? 0,
      );
      // Jamais de plafonnement silencieux : le lien a été émis pour metadata.token_count
      // codes à un prix donné. Si le lot livrable diffère du lot payé (capacité restante
      // épuisée entre la génération du lien et le paiement, prix unitaire modifié
      // entre-temps), on BLOQUE — la payment reste en attente, visible dans l'onglet
      // Paiements, et l'admin traite (remboursement, extension d'objectif, relance).
      if (campaignLotDiscrepancy(metadata.token_count, toCreate) !== 0) {
        const paidXof = campaign.price_per_token_xof * (metadata.token_count ?? toCreate);
        const deliverableXof = campaign.price_per_token_xof * toCreate;
        const remaining = Math.max(0, (campaign.target_count ?? 0) - (existingCount ?? 0));
        throw new Error(
          `Campagne « ${campaign.name} » : ${metadata.token_count ?? toCreate} code(s) payés (` +
            `${paidXof} FCFA) mais ${toCreate} délivrable(s) (${deliverableXof} FCFA, capacité ` +
            `restante ${remaining}). Anomalie à traiter manuellement — lot non créé.`
        );
      }
      if (toCreate <= 0) {
        throw new Error("Capacité de la campagne atteinte — aucun code à créer.");
      }

      const activeSeason = await getActiveSeason({ data: undefined });
      const codes = new Set<string>();
      while (codes.size < toCreate) {
        codes.add(`GENIZIO-B2B-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      }
      const tokens = Array.from(codes).map((code, i) => ({
        code,
        campaign_id: campaign.id,
        season_id: activeSeason.id,
        sponsor_name: campaign.name,
        sponsor_email: "serviceclient@genizio.com",
        amount_paid: campaign.price_per_token_xof, // prix unitaire par code (pas le total du lot)
        currency: payment.currency,
        // Seul le premier code porte la référence Paystack (idempotence + UNIQUE).
        paystack_reference: i === 0 ? payment.reference : null,
        payment_confirmed: true, // Payé via le lien partageable — confirmation par le paiement.
      }));

      const { error: insertErr } = await supabaseAdmin.from("sponsorship_tokens").insert(tokens);
      if (insertErr) throw new Error(insertErr.message);
      return {
        entitlement: "campaign_b2b",
        detail: `${toCreate} code(s) B2B créé(s) pour « ${campaign.name} »`,
      };
    }

    default:
      throw new Error(`Intent de paiement inconnu: ${String((metadata as any)?.type)}`);
  }
}

/**
 * Applique le bénéfice d'un paiement EXACTEMENT une fois. Compare-and-swap : la payment
 * est d'abord passée de tout statut non-success à 'success' (atomique en base) — seul
 * l'appelant qui remporte ce CAS applique le bénéfice. Le webhook, la page de retour et
 * le retry admin, déclenchés quasi simultanément dans le flux nominal, ne peuvent plus
 * appliquer deux fois (review 2026-08-12, P1 — l'ancien garde `status !== 'success'`
 * côté appelant était un read-check non atomique, TOCTOU). Une payment déjà success →
 * retour immédiat sans re-fulfillment ; un échec du bénéfice après le CAS est visible
 * (payment success sans bénéfice) et se répare via les outils manuels AdminOS.
 */
export async function markPaymentSuccessAndFulfill(
  supabaseAdmin: any,
  payment: PaymentRow,
): Promise<FulfillmentResult> {
  const now = new Date().toISOString();
  const { data: claimed, error } = await supabaseAdmin
    .from("payments")
    .update({ status: "success", paid_at: now, updated_at: now })
    .eq("id", payment.id)
    .neq("status", "success")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Erreur lors de la mise à jour du paiement: ${error.message}`);
  if (!claimed) {
    // Un autre chemin (webhook/page de retour/retry concurrents) a déjà consommé ce
    // paiement — bénéfice déjà appliqué, rien à refaire.
    return { entitlement: "already_fulfilled", detail: "Paiement déjà traité." };
  }

  const result = await applyPaystackEntitlement(supabaseAdmin, payment);

  // Reçu email (2026-08-09, demande utilisateur) : fire-and-forget, jamais bloquant
  // pour la réponse de paiement (webhook/page de retour). Idempotent côté serveur
  // par référence Paystack (consent_events), donc double déclenchement sûr.
  void (async () => {
    try {
      const { sendPaymentConfirmationEmail } = await import("@/lib/payment-email.functions");
      await sendPaymentConfirmationEmail(supabaseAdmin, payment);
    } catch (err) {
      console.error("Non-fatal: envoi de l'email de confirmation a échoué", err);
    }
  })();

  return result;
}

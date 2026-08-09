// Application des bénéfices d'un paiement Paystack réussi — partagé entre la page de
// retour (vérification immédiate via verifyPaymentByReference) et le webhook
// (confirmation asynchrone de référence). Les deux chemins sont idempotents : l'appelant
// garantit que payment.status n'est pas déjà 'success' avant d'invoquer ce module.
//
// Intents (payments.metadata) :
//   • order        → orders.status = 'confirmed' + payment_reference
//   • child_access → insertion child_access_periods (extension, jamais de découpe)
//   • passport     → child_profiles.pdf_unlocked = true
//   • extra_slots  → +1 extra_profile_slots (modale d'upgrade, legacy)
//   • sponsorship  → création du code de parrainage (payment_confirmed=true d'office :
//                     le paiement en ligne remplace la confirmation admin WhatsApp)
//
// Serveur uniquement — jamais importé côté client (même pattern que paystack.server.ts).

import { computeAccessPeriodWindow } from "@/lib/child-access";
import { createSponsorshipTokenRecord } from "@/lib/seasons.functions";

export type PaymentMetadata = {
  type: "order" | "child_access" | "passport" | "extra_slots" | "sponsorship";
  order_id?: string;
  child_id?: string;
  months?: number;
  // sponsorship — infos du parrain stockées dans le metadata pour créer le code côté webhook.
  sponsor_name?: string;
  sponsor_email?: string;
  sponsor_message?: string;
  target_child_name?: string;
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
    // slot de capacité supplémentaire. Miroir automatique de updateExtraProfileSlotsAdmin
    // (products.functions.ts) : lecture-modification-écriture de extra_profile_slots dans
    // app_metadata, sans écraser les autres clés posées par GoTrue.
    case "extra_slots": {
      if (!payment.user_id) throw new Error("Payment 'extra_slots' sans user_id.");
      const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
        payment.user_id,
      );
      if (getErr || !userRes?.user) {
        throw new Error(`Utilisateur introuvable: ${getErr?.message ?? payment.user_id}`);
      }
      const current = Number((userRes.user.app_metadata as any)?.extra_profile_slots ?? 0) || 0;
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(payment.user_id, {
        app_metadata: {
          ...(userRes.user.app_metadata ?? {}),
          extra_profile_slots: current + 1,
        },
      });
      if (updateErr) {
        throw new Error(`Erreur lors de l'octroi du slot: ${updateErr.message}`);
      }
      return { entitlement: "extra_slots", detail: "Slot de profil supplémentaire octroyé (+1)" };
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

    default:
      throw new Error(`Intent de paiement inconnu: ${String((metadata as any)?.type)}`);
  }
}

/**
 * Marque la payment comme success (paid_at/updated_at) PUIS applique le bénéfice.
 * Ordre volontaire : si l'application du bénéfice échoue, le webhook Paystack relancera
 * la requête (retries) et le fulfillment reprendra — une payment déjà success est
 * idempotente côté appelant (aucun re-fulfillment, le bénéfice est appliqué une fois).
 */
export async function markPaymentSuccessAndFulfill(
  supabaseAdmin: any,
  payment: PaymentRow,
): Promise<FulfillmentResult> {
  const result = await applyPaystackEntitlement(supabaseAdmin, payment);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "success", paid_at: now, updated_at: now })
    .eq("id", payment.id);
  if (error) throw new Error(`Erreur lors de la mise à jour du paiement: ${error.message}`);
  return result;
}

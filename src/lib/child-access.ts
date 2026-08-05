// Accès payant par enfant — source unique de l'état d'accès d'un profil.
//
// Modèle (2026-08-05, décisions utilisateur) :
//   • 1er profil du compte : GRATUIT (jamais expiré) — le plancher (1, ou 5 pour les
//     comptes grand-pérés créés avant 2026-08-04, cf. child-profile-quota.ts).
//   • Slots achetés AVANT le modèle mensuel (extra_profile_slots, accès vendu
//     "permanent") : grand-pérés, valables à vie.
//   • Enfants au-delà : accès MENSUEL — 5 000 FCFA/mois les 3 premiers mois du compte,
//     puis 15 000 FCFA/mois (pricing.ts). L'accès est porté par child_access_periods
//     (table), la période la plus récente fait foi.
//   • À expiration : génération de défis bloquée (gate), portfolio/acquis accessibles.
//     Doit rester cohérent avec check_child_profile_quota() (migration
//     20260805100000 : création autorisée jusqu'à plancher + extra + 1 — l'enfant
//     mensuel "en cours de première mise en paiement").

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { isGrandfatheredAccount } from "@/lib/child-profile-quota";
import { resolveExtraSlotPrice } from "@/lib/pricing";

export type ChildAccessStatus =
  | { kind: "free" } // profil du plancher gratuit — jamais expiré
  | { kind: "permanent" } // slot payant grand-péré (acheté avant le modèle mensuel)
  | { kind: "monthly"; endsAt: string; daysLeft: number } // période payée active
  | { kind: "expired"; endsAt: string | null }; // payant mais période écoulée (ou jamais payée)

// Limite de CRÉATION de profils côté UI : plancher + slots + 1 (le profil mensuel en
// cours de première mise en paiement). Miroir du trigger check_child_profile_quota.
export function computeChildCreationLimit(
  accountCreatedAt: string | null | undefined,
  extraSlots: number | null | undefined,
): number {
  const floor = isGrandfatheredAccount(accountCreatedAt) ? 5 : 1;
  return floor + (extraSlots ?? 0) + 1;
}

// Résolveur pur (testable sans base) : position 1-based de l'enfant parmi les profils
// du compte (ordre de création), plancher, slots grand-pérés, période la plus récente.
export function resolveChildAccessStatus(params: {
  position: number;
  floor: number;
  extraSlots: number;
  latestPeriod: { endsAt: string } | null;
  now?: Date;
}): ChildAccessStatus {
  const { position, floor, extraSlots, latestPeriod } = params;
  const now = params.now ?? new Date();

  if (position <= floor) return { kind: "free" };
  if (position <= floor + extraSlots) return { kind: "permanent" };
  if (!latestPeriod) return { kind: "expired", endsAt: null };

  const endsAt = new Date(latestPeriod.endsAt);
  if (Number.isNaN(endsAt.getTime())) return { kind: "expired", endsAt: latestPeriod.endsAt };
  if (endsAt.getTime() <= now.getTime()) return { kind: "expired", endsAt: latestPeriod.endsAt };

  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000);
  return { kind: "monthly", endsAt: latestPeriod.endsAt, daysLeft };
}

// Fenêtre d'une nouvelle période d'accès : démarre au plus tard entre maintenant et la fin
// de la période courante (aucune perte en cas de cumul), dure `months` mois. Partagé par
// extendChildAccessAdmin et redeemSponsorshipToken (parrainage individuel) — la fenêtre
// doit rester identique des deux côtés, c'est le cœur de la promesse "le code vaut N mois".
export function computeAccessPeriodWindow(
  currentEnd: string | null,
  months: number,
  now?: Date,
): { startsAt: string; endsAt: string } {
  // Clone du paramètre : ne jamais muter le Date de l'appelant (les tests passent une
  // référence partagée ; en production le défaut est un nouveau Date, mais rester propre
  // coûte rien et évite des surprises de date "décalée" entre deux appels).
  const start = new Date(now ? now.getTime() : Date.now());
  const currentEndDate = currentEnd ? new Date(currentEnd) : null;
  if (currentEndDate && currentEndDate.getTime() > start.getTime()) {
    start.setTime(currentEndDate.getTime());
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

// Version asynchrone côté serveur : résout l'accès réel d'un enfant depuis la base.
// `db` est un client supabase (supabaseAdmin en pratique) ; le fake-client est possible
// pour les tests (mêmes tables : child_profiles, child_access_periods, auth.users).
export async function getChildAccessStatus(
  db: {
    from: (table: string) => any;
    auth: { admin: { getUserById: (id: string) => Promise<{ data: any; error: any }> } };
  },
  userId: string,
  childId: string,
): Promise<ChildAccessStatus> {
  const { data: children, error: childrenErr } = await db
    .from("child_profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (childrenErr) throw new Error(childrenErr.message);

  const position = (children ?? []).findIndex((c: any) => c.id === childId) + 1;
  // Enfant inconnu du compte : ne pas bloquer ici (l'ownership est vérifié par chaque
  // appelant), on retourne free plutôt qu'une erreur opaque.
  if (position === 0) return { kind: "free" };

  const { data: userRes, error: userErr } = await db.auth.admin.getUserById(userId);
  if (userErr || !userRes?.user) throw new Error(`Utilisateur introuvable: ${userErr?.message ?? userId}`);

  const floor = isGrandfatheredAccount(userRes.user.created_at) ? 5 : 1;
  const extraSlots = Number((userRes.user.app_metadata as any)?.extra_profile_slots ?? 0) || 0;

  const { data: periods, error: periodsErr } = await db
    .from("child_access_periods")
    .select("ends_at")
    .eq("child_id", childId)
    .order("ends_at", { ascending: false })
    .limit(1);
  if (periodsErr) throw new Error(periodsErr.message);

  // Source B2B (2026-08-05) : un enfant inscrit à une CAMPAGNE organisation active est
  // couvert par l'org (cohorte financée, fenêtre fixe campaigns.start_date/end_date) —
  // le statut d'accès côté famille doit alors être permanent : jamais expiré, aucune
  // bannière de renouvellement (le renouvellement B2B est géré côté admin/org, pas par
  // la famille). Sans ce garde-fou, le gate mensuel bloquerait à tort la génération de
  // défis des enfants de campagne au-delà du plancher gratuit.
  const { data: enrollment, error: enrollmentErr } = await db
    .from("season_enrollments")
    .select("campaign_id, campaigns(start_date, end_date)")
    .eq("child_id", childId)
    .order("enrolled_at", { ascending: false })
    .limit(1);
  if (enrollmentErr) throw new Error(enrollmentErr.message);

  const campaign = enrollment?.[0]?.campaigns as { start_date: string | null; end_date: string | null } | null;
  if (campaign?.start_date && campaign?.end_date) {
    const nowTs = Date.now();
    if (
      new Date(campaign.start_date).getTime() <= nowTs &&
      nowTs <= new Date(campaign.end_date).getTime()
    ) {
      return { kind: "permanent" };
    }
  }

  return resolveChildAccessStatus({
    position,
    floor,
    extraSlots,
    latestPeriod: periods?.[0] ? { endsAt: periods[0].ends_at } : null,
  });
}

// Exposé au client (portfolio, page défis) : l'état d'accès de l'enfant connecté + le
// montant de renouvellement mensuel applicable à SON compte (barème famille, pricing.ts).
export const getChildAccessStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = await getChildAccessStatus(supabaseAdmin as any, context.userId, data.childId);

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const rate = resolveExtraSlotPrice(userRes?.user?.created_at ?? null);

    return { status, renewalAmountXof: rate.priceXof };
  });

// Prolonge l'accès mensuel d'un enfant de N mois (paiement WhatsApp/Mobile Money
// confirmé hors-app). Miroir de updateExtraProfileSlotsAdmin (products.functions.ts) :
// l'admin ajuste après réception du virement. La nouvelle période démarre au plus tard
// entre maintenant et la fin de la période courante (pas de chevauchement perdu).
export const extendChildAccessAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z
      .object({
        childId: z.string().uuid(),
        months: z.number().int().min(1).max(12),
        amountXof: z.number().int().min(0).default(0),
        note: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Table non typée côté client TS tant que les types n'ont pas été régénérés après la
    // migration 20260805100000 — même pattern (supabaseAdmin as any) que seasons.functions.
    const { data: existing, error: getErr } = await (supabaseAdmin as any)
      .from("child_access_periods")
      .select("ends_at")
      .eq("child_id", data.childId)
      .order("ends_at", { ascending: false })
      .limit(1);
    if (getErr) throw new Error(getErr.message);

    const { startsAt, endsAt } = computeAccessPeriodWindow(existing?.[0]?.ends_at ?? null, data.months);

    const { error: insertErr } = await (supabaseAdmin as any).from("child_access_periods").insert({
      child_id: data.childId,
      starts_at: startsAt,
      ends_at: endsAt,
      source: "admin_grant",
      amount_xof: data.amountXof,
      note: data.note ?? null,
    });
    if (insertErr) throw new Error(`Erreur lors de la prolongation d'accès: ${insertErr.message}`);

    return { success: true, childId: data.childId, endsAt };
  });

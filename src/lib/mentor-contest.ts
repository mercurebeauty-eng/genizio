// Contestation de séance (2026-08-15, backlog « Contester une séance ») — cœur
// db-paramétré, testable avec une fake DB (convention mentor-operator.ts).
//
// Le wrapper server fn (mentors.functions.ts → contestMentorSession) vérifie
// l'auth/ownership puis appelle `processSessionContest` : transition atomique
// declared → contested (le .eq("status","declared") fait foi — jamais de double
// contestation) + remboursement de la séance financée (pack/campagne). Les
// notifications, le journal et la sync du statut restent au niveau de la server fn.

/** Motifs fermés de contestation — vocabulaire stable pour le journal et l'admin. */
export const CONTEST_REASONS = {
  not_done: "Séance non réalisée",
  non_compliant: "Séance non conforme",
  not_on_time: "Horaires non respectés",
  other: "Autre",
} as const;
export type ContestReason = keyof typeof CONTEST_REASONS;

export type ContestedSession = {
  id: string;
  child_profile_id: string;
  mentor_user_id: string;
  occurred_at: string;
  funding: string;
  campaign_id: string | null;
  status: "contested";
  contested_by: string;
  contested_at: string;
  contest_reason: string | null;
};

// ── Garde « travail validé » (anti-faille parent, 2026-08-15) ────────────────
// Si le mentor a fait un travail ATTESTÉ avec l'enfant sur la période de la
// séance (défi complété avec preuve validée par l'IA, ou défi déclaratif
// complété), la séance a nécessairement eu lieu : l'enfant a déjà reçu le
// bénéfice du travail. Le parent ne peut donc PAS la contester — sinon un parent
// malveillant laisserait le mentor travailler (défi validé, points à l'enfant)
// puis contesterait la séance pour ne pas la payer.

/** Fenêtre autour de la date de la séance où un défi validé atteste le travail. */
export const CONTEST_VALIDATED_WORK_WINDOW_DAYS = 7;

export const CONTEST_BLOCKED_VALIDATED_WORK_MESSAGE =
  "Cette séance ne peut pas être contestée : un défi a été validé avec l'enfant sur la " +
  "période de cette séance (travail attesté par une preuve). Si vous constatez un " +
  "problème, contactez l'équipe Génizio.";

/**
 * Vrai si l'enfant a un défi COMPLÉTÉ et validé (preuve photo analysée par l'IA —
 * ai_observations non nul — ou défi déclaratif complété) dont la complétion tombe
 * dans ±windowDays autour de la date de la séance. C'est la preuve que le travail
 * a eu lieu : la séance est attestée, elle ne peut pas être contestée.
 */
export async function hasValidatedChildWorkNearSession(
  db: { from: (table: string) => any },
  childId: string,
  occurredAt: string,
  windowDays = CONTEST_VALIDATED_WORK_WINDOW_DAYS,
): Promise<boolean> {
  const t = new Date(occurredAt).getTime();
  const start = new Date(t - windowDays * 86_400_000).toISOString();
  const end = new Date(t + windowDays * 86_400_000).toISOString();
  const { data, error } = await db
    .from("challenges")
    .select("ai_observations, proof_mode")
    .eq("child_id", childId)
    .eq("status", "completed")
    .gte("completed_at", start)
    .lte("completed_at", end)
    .limit(20);
  if (error) {
    // Garde fermée : si on ne peut pas vérifier le travail validé, on refuse la
    // contestation plutôt que d'ouvrir la faille (l'admin reste joignable).
    throw new Error(`Impossible de vérifier le travail validé: ${error.message}`);
  }
  return (data ?? []).some(
    (c: any) => c.ai_observations != null || c.proof_mode === "declarative",
  );
}

/**
 * Rembourse la séance contestée au budget qui l'a financée (pack ou campagne) :
 * la séance n'a pas eu lieu, le créneau est rendu. Garde sessions_used > 0 —
 * jamais en dessous de zéro. Idempotent par la transition atomique de
 * `processSessionContest` (une contestation = un seul passage ici).
 */
export async function refundSessionDebit(
  db: { from: (table: string) => any },
  session: Pick<ContestedSession, "child_profile_id" | "funding" | "campaign_id">,
): Promise<void> {
  if (session.funding === "pack") {
    const { data: pack } = await db
      .from("family_coverages")
      .select("id, sessions_used")
      .eq("child_id", session.child_profile_id)
      .eq("source", "accompaniment_pack")
      .eq("status", "active")
      .maybeSingle();
    if (pack && (pack.sessions_used ?? 0) > 0) {
      await db
        .from("family_coverages")
        .update({ sessions_used: (pack.sessions_used ?? 0) - 1 })
        .eq("id", pack.id);
    }
  } else if (session.funding === "campaign" && session.campaign_id) {
    const { data: campaign } = await db
      .from("campaigns")
      .select("id, sessions_used")
      .eq("id", session.campaign_id)
      .maybeSingle();
    if (campaign && (campaign.sessions_used ?? 0) > 0) {
      await db
        .from("campaigns")
        .update({ sessions_used: (campaign.sessions_used ?? 0) - 1 })
        .eq("id", session.campaign_id);
    }
  }
}

/**
 * Transition atomique declared → contested + remboursement de la séance financée.
 * Retourne la séance contestée si la transition a été prise (sinon null — la
 * séance a déjà été traitée : confirmée, contestée, approuvée…). La garde en base
 * `.eq("status","declared")` rend la double contestation impossible, même si deux
 * onglets du parent cliquent en même temps.
 *
 * GARDE « travail validé » : si l'enfant a un défi complété + validé sur la
 * période de la séance (hasValidatedChildWorkNearSession), la séance est attestée
 * et la contestation est REFUSÉE (throw) — anti-faille parent.
 */
export async function processSessionContest(
  db: { from: (table: string) => any },
  sessionId: string,
  userId: string,
  reason: ContestReason,
  note?: string | null,
): Promise<ContestedSession | null> {
  // Pré-charge la séance pour la garde (child + date). Si introuvable, on laisse
  // la transition la refuser (null → « déjà traitée »).
  const { data: sessionRow } = await db
    .from("mentor_sessions")
    .select("id, child_profile_id, occurred_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (
    sessionRow &&
    (await hasValidatedChildWorkNearSession(
      db,
      sessionRow.child_profile_id,
      sessionRow.occurred_at,
    ))
  ) {
    throw new Error(CONTEST_BLOCKED_VALIDATED_WORK_MESSAGE);
  }

  const { data: claimed } = await db
    .from("mentor_sessions")
    .update({
      status: "contested",
      contested_by: userId,
      contested_at: new Date().toISOString(),
      contest_reason: note?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("status", "declared")
    .select(
      "id, child_profile_id, mentor_user_id, occurred_at, funding, campaign_id, status, contested_by, contested_at, contest_reason",
    )
    .maybeSingle();
  if (!claimed) return null;

  await refundSessionDebit(db, {
    child_profile_id: claimed.child_profile_id,
    funding: claimed.funding,
    campaign_id: claimed.campaign_id,
  });
  return claimed;
}

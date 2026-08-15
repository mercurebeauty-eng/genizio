// Planification des séances + ponctualité (2026-08-15) — helpers PURS.
//
// Le mentor planifie un créneau (mentor_session_slots) ; à la déclaration, la séance
// peut être liée à ce créneau (mentor_sessions.scheduled_at dénormalisé). La
// ponctualité mesure l'écart entre l'heure planifiée et l'heure déclarée de la
// séance.
//
// Fonctions pures testables sans base (même convention que mentor-score.ts) — les
// server functions chargent les lignes puis appellent ces calculs.

/** Fenêtre de tolérance « à l'heure » : ±30 min autour de l'heure planifiée. */
export const PUNCTUALITY_WINDOW_MINUTES = 30;

/** Une séance liée à un créneau est « à l'heure » si |planifié − réalisé| ≤ fenêtre. */
export function isOnTime(
  plannedAt: string,
  occurredAt: string,
  windowMinutes = PUNCTUALITY_WINDOW_MINUTES,
): boolean {
  const diffMs = Math.abs(new Date(occurredAt).getTime() - new Date(plannedAt).getTime());
  return diffMs <= windowMinutes * 60 * 1000;
}

/**
 * Score de ponctualité /100 : part des séances liées à un créneau planifié qui ont
 * été réalisées à l'heure. 0 séance planifiée → null (composante absente — le score
 * global renormalise ; la ponctualité ne pénalise jamais un mentor qui ne planifie
 * pas, elle ne le récompense que quand il planifie ET est à l'heure).
 */
export function computePunctualityScore(params: {
  /** Séances liées à un créneau planifié dans la fenêtre (scheduled_at non nul). */
  plannedSessions: number;
  /** Parmi elles, celles réalisées à l'heure (écart ≤ fenêtre). */
  onTimeSessions: number;
}): number | null {
  if (params.plannedSessions <= 0) return null;
  return Math.min(100, Math.round((params.onTimeSessions / params.plannedSessions) * 100));
}

/**
 * Ponctualité calculée directement depuis les lignes de séance d'une fenêtre —
 * une seule passe, utilisée par les appelants du score (listMentorsAdmin,
 * getMentorDashboard, computeRollingScore). Les séances sans scheduled_at (déclarées
 * sans créneau planifié) ne comptent pas.
 */
export function punctualityFromSessions(
  sessions: Array<{ occurred_at: string; scheduled_at: string | null | undefined }>,
): number | null {
  let planned = 0;
  let onTime = 0;
  for (const s of sessions) {
    if (!s.scheduled_at) continue;
    planned += 1;
    if (isOnTime(s.scheduled_at, s.occurred_at)) onTime += 1;
  }
  return computePunctualityScore({ plannedSessions: planned, onTimeSessions: onTime });
}

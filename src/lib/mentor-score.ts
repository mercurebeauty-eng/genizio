// Score de fiabilité du mentor (V2, 2026-08-14 — feedback famille intégré).
//
// Pondération décidée avec le porteur (grille V4) :
//   • 50 % tenue des séances : déclarées ÷ attendues sur la période (attendu = 12 séances
//     par mois et par enfant assigné actif, cf. PACK_SESSIONS dans pricing.ts) ;
//   • 25 % feedback famille : note moyenne (1-5) ÷ 5 ;
//   • 25 % progression : défis complétés ÷ défis totaux de ses enfants.
//
// La ponctualité (20% de la grille documentée) est REPORTÉE : elle exige la planification
// des séances, qui n'existe pas encore dans l'app — le poids est redistribué sur les
// composantes mesurables. Sans feedback encore posé, la moyenne est RENORMALISÉE sur les
// composantes disponibles (un mentor parfait sans aucune note reste à 100 — le
// feedback ne l'écrase pas d'office, il l'ajuste quand il existe).
//
// Fonction PURE (testable sans base) — les appelants (listMentorsAdmin,
// getMentorDashboard) chargent les compteurs puis appellent ce calcul.
export function computeMentorScore(params: {
  expectedSessions: number;
  declaredSessions: number;
  completedChallenges: number;
  totalChallenges: number;
  /** Note moyenne famille (1-5) sur la période ; 0 ou absente = aucun feedback encore. */
  avgFeedback?: number;
}): number {
  const sessionsScore =
    params.expectedSessions > 0
      ? Math.min(100, (params.declaredSessions / params.expectedSessions) * 100)
      : 0;
  const progressScore =
    params.totalChallenges > 0
      ? Math.min(100, (params.completedChallenges / params.totalChallenges) * 100)
      : 0;
  const hasFeedback = (params.avgFeedback ?? 0) > 0;
  const feedbackScore = hasFeedback ? Math.min(100, ((params.avgFeedback ?? 0) / 5) * 100) : 0;

  // Moyenne pondérée sur les composantes réellement mesurées (0.75 sans feedback, 1 avec).
  const weightSum = 0.5 + 0.25 + (hasFeedback ? 0.25 : 0);
  const weighted =
    0.5 * sessionsScore + 0.25 * progressScore + (hasFeedback ? 0.25 * feedbackScore : 0);
  return Math.round(weighted / weightSum);
}

// Séances attendues sur la période pour un mentor donné : 12 séances/mois/enfant
// (PACK_SESSIONS) × nombre d'enfants assignés actifs × fraction de la période écoulée
// (au premier mois partiel du pilote, le score ne pénalise pas d'office).
export function computeExpectedSessions(
  childrenCount: number,
  periodDays: number,
  elapsedDays: number,
): number {
  const fraction = periodDays > 0 ? Math.min(1, Math.max(0, elapsedDays / periodDays)) : 1;
  return Math.round(childrenCount * 12 * fraction);
}

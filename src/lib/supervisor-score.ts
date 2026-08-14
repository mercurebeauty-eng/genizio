// Score de fiabilité du superviseur (V1, 2026-08-14 — décision « score auto dès la V1 »).
//
// Pondération décidée avec le porteur : le feedback famille (note 1-5 par séance) arrive
// en V2 — en V1 le score repose sur ce qui est déjà mesurable en app :
//   • 60 % tenue des séances : déclarées ÷ attendues sur la période (attendu = 12 séances
//     par mois et par enfant assigné actif, cf. PACK_SESSIONS dans pricing.ts) ;
//   • 40 % progression : défis complétés ÷ défis totaux de ses enfants.
//
// Fonction PURE (testable sans base) — les appelants (listSupervisorsAdmin,
// getSupervisorDashboard) chargent les compteurs puis appellent ce calcul.
export function computeSupervisorScore(params: {
  expectedSessions: number;
  declaredSessions: number;
  completedChallenges: number;
  totalChallenges: number;
}): number {
  const sessionsScore =
    params.expectedSessions > 0
      ? Math.min(100, (params.declaredSessions / params.expectedSessions) * 100)
      : 0;
  const progressScore =
    params.totalChallenges > 0
      ? Math.min(100, (params.completedChallenges / params.totalChallenges) * 100)
      : 0;
  return Math.round(0.6 * sessionsScore + 0.4 * progressScore);
}

// Séances attendues sur la période pour un superviseur donné : 12 séances/mois/enfant
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

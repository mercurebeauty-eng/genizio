// Score de fiabilité du mentor (V2, 2026-08-14 — feedback famille intégré ;
// V3 2026-08-15 — ponctualité + compteur négatif de contestation).
//
// Pondération décidée avec le porteur (grille V4) :
//   • 40 % tenue des séances : séances confirmées − contestées ÷ attendues sur la
//     période (attendu = 12 séances par mois et par enfant assigné actif,
//     cf. PACK_SESSIONS dans pricing.ts) — chaque contestation retire 1 séance du
//     numérateur (compteur négatif, décision porteur 2026-08-15) ;
//   • 15 % ponctualité : séances liées à un créneau planifié réalisées à l'heure
//     (±30 min) ÷ séances planifiées — absente si le mentor ne planifie pas ;
//   • 15 % feedback famille : note moyenne (1-5) ÷ 5 ;
//   • 30 % progression : défis complétés ÷ défis totaux de ses enfants — la
//     progression, valeur recherchée, pèse plus lourd qu'avant (25 → 30).
//
// Sans ponctualité (aucun créneau planifié) ni feedback encore posé, la moyenne est
// RENORMALISÉE sur les composantes disponibles (un mentor parfait sans aucune note
// reste à 100 — le feedback ne l'écrase pas d'office, il l'ajuste quand il existe).
//
// Fonction PURE (testable sans base) — les appelants (listMentorsAdmin,
// getMentorDashboard, computeRollingScore) chargent les compteurs puis appellent ce
// calcul.
export function computeMentorScore(params: {
  expectedSessions: number;
  /** Séances CONFIRMÉES par le parent sur la période (les contestées n'en font pas partie). */
  declaredSessions: number;
  /** Séances contestées par le parent sur la période — compteur NÉGATIF (retirées du numérateur). */
  contestedSessions?: number;
  completedChallenges: number;
  totalChallenges: number;
  /** Note moyenne famille (1-5) sur la période ; 0 ou absente = aucun feedback encore. */
  avgFeedback?: number;
  /** Score de ponctualité /100 ; null ou absent = aucune séance planifiée (composante absente). */
  punctualityScore?: number | null;
}): number {
  // Tenue des séances — « compteur négatif » : chaque contestation retire 1 séance
  // confirmée du numérateur, plancher 0 (jamais négatif).
  const netSessions = Math.max(
    0,
    params.declaredSessions - (params.contestedSessions ?? 0),
  );
  const sessionsScore =
    params.expectedSessions > 0
      ? Math.min(100, (netSessions / params.expectedSessions) * 100)
      : 0;
  const progressScore =
    params.totalChallenges > 0
      ? Math.min(100, (params.completedChallenges / params.totalChallenges) * 100)
      : 0;
  const hasFeedback = (params.avgFeedback ?? 0) > 0;
  const feedbackScore = hasFeedback ? Math.min(100, ((params.avgFeedback ?? 0) / 5) * 100) : 0;
  const hasPunctuality = params.punctualityScore != null;
  const punctualityScore = hasPunctuality
    ? Math.min(100, params.punctualityScore as number)
    : 0;

  // Grille 40/15/15/30, renormalisée sur les composantes réellement mesurées
  // (0.70 sans ponctualité ni feedback, 1.00 avec les deux).
  const weightSum =
    0.4 + (hasPunctuality ? 0.15 : 0) + (hasFeedback ? 0.15 : 0) + 0.3;
  const weighted =
    0.4 * sessionsScore +
    (hasPunctuality ? 0.15 * punctualityScore : 0) +
    (hasFeedback ? 0.15 * feedbackScore : 0) +
    0.3 * progressScore;
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

// ─────────────────────────────────────────────────────────────────────────────
// Confiance Mentor (2026-08-15) — palier de confiance, statut automatique, payout.
// Helpers PURS (testables sans base) — les server functions chargent les compteurs
// puis appellent ces calculs (même convention que computeMentorScore).
//
//  • Palier de confiance : score ≥ 75 (fenêtre glissante 30 j) → « trusted » — le
//    mentor passe au partage 75/25 (75 % de la séance, soit 3 750 F au lieu de 3 500 F).
//  • Statut automatique : score < 40 → warning ; score < 25 → suspended ; au-dessus
//    des seuils → active. Le ban reste une décision humaine (jamais automatique).
//  • Payout : snapshot immuable posé À LA DÉCLARATION (palier + bonus points du
//    moment) — invariant conservé : le montant ne change jamais après coup.
//  • Points (mentor_points) : séance confirmée +1, défi complété +2, note 5/5 +1 —
//    paliers : 10 pts → badge Bronze ; 30 pts → +5 % payout ; 60 pts → badge Or +10 %.
// ─────────────────────────────────────────────────────────────────────────────

export type MentorTrustTier = "standard" | "trusted";
export type MentorAutoStatus = "active" | "warning" | "suspended";

/** Score à partir duquel un mentor passe au palier « confiance » (75 % de la séance). */
export const MENTOR_TRUSTED_SCORE_THRESHOLD = 75;
/** Part du mentor sur une séance, palier standard (historique, cf. pricing.ts). */
export const MENTOR_STANDARD_SHARE = 0.7;
/** Part du mentor sur une séance, palier confiance — le « 75/25 » décidé au chantier. */
export const MENTOR_TRUSTED_SHARE = 0.75;
/** Sous ce score, le statut passe automatiquement à warning. */
export const MENTOR_WARNING_SCORE_THRESHOLD = 40;
/** Sous ce score, le statut passe automatiquement à suspended. */
export const MENTOR_SUSPENDED_SCORE_THRESHOLD = 25;

export function computeTrustTier(score: number): MentorTrustTier {
  return score >= MENTOR_TRUSTED_SCORE_THRESHOLD ? "trusted" : "standard";
}

/** Statut cible automatique pour un score donné — jamais « banned » (décision humaine). */
export function computeMentorStatusFromScore(score: number): MentorAutoStatus {
  if (score < MENTOR_SUSPENDED_SCORE_THRESHOLD) return "suspended";
  if (score < MENTOR_WARNING_SCORE_THRESHOLD) return "warning";
  return "active";
}

/**
 * Payout d'une séance pour un mentor, à la déclaration (snapshot).
 * basePayoutXof = payout standard (70 % de la séance) ; le palier confiance le
 * multiplie par 75/70 ; le bonus points s'applique en pourcentage du résultat.
 */
export function computeMentorPayoutXof(params: {
  basePayoutXof: number;
  tier: MentorTrustTier;
  pointsBonusPct?: number;
}): number {
  const shareRatio = params.tier === "trusted"
    ? MENTOR_TRUSTED_SHARE / MENTOR_STANDARD_SHARE
    : 1;
  const withTier = Math.round(params.basePayoutXof * shareRatio);
  const bonus = params.pointsBonusPct ?? 0;
  return Math.round(withTier * (1 + bonus / 100));
}

export interface MentorPointsRewards {
  badge: "none" | "bronze" | "gold";
  payoutBonusPct: number;
  /** Points manquants pour le prochain palier de bonus payout ; null si atteint. */
  nextPayoutBonusAt: number | null;
}

export const MENTOR_POINTS_BRONZE_AT = 10;
export const MENTOR_POINTS_PAYOUT_BONUS_AT = 30;
export const MENTOR_POINTS_GOLD_AT = 60;

export function computeMentorPointsRewards(points: number): MentorPointsRewards {
  const badge =
    points >= MENTOR_POINTS_GOLD_AT ? "gold" : points >= MENTOR_POINTS_BRONZE_AT ? "bronze" : "none";
  const payoutBonusPct =
    points >= MENTOR_POINTS_GOLD_AT ? 10 : points >= MENTOR_POINTS_PAYOUT_BONUS_AT ? 5 : 0;
  const nextPayoutBonusAt =
    points < MENTOR_POINTS_PAYOUT_BONUS_AT
      ? MENTOR_POINTS_PAYOUT_BONUS_AT
      : points < MENTOR_POINTS_GOLD_AT
        ? MENTOR_POINTS_GOLD_AT
        : null;
  return { badge, payoutBonusPct, nextPayoutBonusAt };
}

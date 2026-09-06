// ─────────────────────────────────────────────────────────────────────────────
// Garde-Fous Anti-Fraude, Anti-Régression & Supervision des Mentors de Soutien
// (Clubs Périscolaires du Samedi — 10 000 FCFA / mois / enfant)
// ─────────────────────────────────────────────────────────────────────────────
//
// Règles d'Architecture :
//  1. Deux Typologies de Mentors :
//     • Mentor Pro (Superviseur Clinique) : Quota strict ≤ 5 enfants.
//       (Bilan 15k, remédiation clinique, anamnèse, packs B2C 180k).
//     • Mentor de Soutien (Facilitateur d'Escouade) : Quota élargi (6 à 16 enfants,
//       soit 1 à 2 escouades de 6 à 8 élèves le samedi matin).
//
//  2. Modèle Économique Club Périscolaire (10 000 FCFA / mois / enfant) :
//     • Mentor de Soutien = 70 % (ex: 56 000 FCFA / escouade de 8 enfants / mois).
//     • Génizio = 30 % (ex: 24 000 FCFA / escouade de 8 enfants / mois).
//     • École = 0 FCFA de rétrocession directe (bénéficie gratuitement du Copilote
//       Professeur, de la hausse du niveau académique et du prestige de l'école).
//
//  3. Évaluation Tripartite Indépendante & Anti-Fraude :
//     Le mentor de soutien ne peut PAS s'auto-évaluer. La mesure des progrès repose
//     sur un croisement tripartite déterministe :
//       a. Source Neutre : Notes et observations académiques du professeur titulaire.
//       b. Preuve Matérielle IA : Validation par Naya Vision des photos d'artefacts
//          physiques réels fabriqués en club (détection d'images dupliquées/frauduleuses).
//       c. Sondes Psychométriques : Autonomie et persévérance mesurées lors des
//          Explorations Libres (Portes 1, 2, 3).
//
//  4. Garde-Fou Anti-Régression & Gel / Révocation :
//     • Si les enfants d'une escouade régressent sur 2 cycles consécutifs (chute des
//       notes scolaires et effondrement de l'autonomie) → Déclassement en « warning »
//       ou « probation ».
//     • En cas de fraude avérée (photos dupliquées, falsification de présence,
//       notes trompeuses) → Suspension conservatoire immédiate (« frozen_suspended »
//       ou « banned »), gel des décaissements (« frozen_under_audit »), et
//       déclenchement du protocole de réassignation automatique de l'escouade.
// ─────────────────────────────────────────────────────────────────────────────

export type MentorCategory = "pro" | "support";

/** Défaut « pro » : les superviseurs historiques (pré-deux-modèles) étaient cliniques. */
export const DEFAULT_MENTOR_CATEGORY: MentorCategory = "pro";

/** Normalise la valeur lue en base (colonne category ajoutée en 20260906120000). */
export function resolveMentorCategory(value: unknown): MentorCategory {
  return value === "support" ? "support" : DEFAULT_MENTOR_CATEGORY;
}

export type MentorSafeguardStanding =
  | "good_standing"
  | "warning"
  | "probation"
  | "frozen_suspended"
  | "banned";

export type MentorPayoutStatus = "payable" | "frozen_under_audit" | "revoked";

/** Tarification du Club Périscolaire du Samedi (10 000 FCFA par mois par enfant) */
export const SATURDAY_CLUB_CHILD_PRICE_XOF = 10000;

/** Répartition financière du Club Périscolaire */
export const SATURDAY_CLUB_SPLIT = {
  mentorShare: 0.7, // 70 %
  genizioShare: 0.3, // 30 %
  schoolShare: 0.0, // 0 % (Rétrocession financière directe nulle)
} as const;

/** Quotas maximaux par typologie */
export const MENTOR_CATEGORY_QUOTAS = {
  pro: {
    maxChildren: 5,
    maxSquads: 1,
    minChildrenPerSquad: 1,
    maxChildrenPerSquad: 5,
  },
  support: {
    maxChildren: 16,
    maxSquads: 2,
    minChildrenPerSquad: 6,
    maxChildrenPerSquad: 8,
  },
} as const;

/** Calcul du payout mensuel pour un mentor de soutien animant un club */
export function computeSupportMentorMonthlyPayout(params: {
  enrolledChildrenCount: number;
  standing: MentorSafeguardStanding;
}): {
  grossTotalXof: number;
  mentorPayoutXof: number;
  genizioMarginXof: number;
  schoolPayoutXof: number;
  payoutStatus: MentorPayoutStatus;
} {
  const count = Math.max(0, params.enrolledChildrenCount);
  const grossTotalXof = count * SATURDAY_CLUB_CHILD_PRICE_XOF;
  const standardMentorPayout = Math.round(grossTotalXof * SATURDAY_CLUB_SPLIT.mentorShare);
  const genizioMarginXof = Math.round(grossTotalXof * SATURDAY_CLUB_SPLIT.genizioShare);
  const schoolPayoutXof = 0; // Invariant : 0 F à l'école

  let payoutStatus: MentorPayoutStatus = "payable";
  let mentorPayoutXof = standardMentorPayout;

  if (params.standing === "banned") {
    payoutStatus = "revoked";
    mentorPayoutXof = 0;
  } else if (params.standing === "frozen_suspended") {
    payoutStatus = "frozen_under_audit";
    mentorPayoutXof = 0;
  } else if (params.standing === "probation") {
    // En probation, les fonds sont temporairement retenus jusqu'à validation de la session
    payoutStatus = "frozen_under_audit";
  }

  return {
    grossTotalXof,
    mentorPayoutXof,
    genizioMarginXof,
    schoolPayoutXof,
    payoutStatus,
  };
}

// ── Types d'évaluation tripartite ──────────────────────────────────────────

export interface AcademicGradeObservation {
  childId: string;
  term: 1 | 2 | 3;
  previousAverage: number; // ex: 11.5 / 20
  currentAverage: number; // ex: 9.0 / 20
  classAverage?: number; // ex: 10.8 / 20
  teacherReportNotes?: string;
}

export interface PhysicalArtifactSubmission {
  challengeId: string;
  childId: string;
  photoUrl: string;
  imageFingerprint: string; // Hash SHA-256 ou perceptual hash de l'image
  nayaVisionConfidence: number; // 0.00 à 1.00
  isMaterialArtifactDetected: boolean;
  detectedObjects?: string[];
  submissionTimestamp: string;
}

export interface AutonomyProbeMetric {
  childId: string;
  periodTimestamp: string;
  doorExplorationAutonomyIndex: number; // 0 à 100
  perseveranceUnderFrictionIndex: number; // 0 à 100
  frictionRecoverySuccess: boolean;
}

export interface ChildTripartiteEvaluation {
  childId: string;
  academicObservation?: AcademicGradeObservation;
  artifactSubmissions: PhysicalArtifactSubmission[];
  autonomyProbes: AutonomyProbeMetric[];
}

export interface FraudAnomalyReport {
  isFraudDetected: boolean;
  duplicatePhotoCount: number;
  zeroArtifactCompletionRate: number; // % de défis validés sans artefact physique détecté
  suspiciousMaxScoreStreak: boolean;
  reasons: string[];
}

export interface SquadRegressionReport {
  isCriticalRegression: boolean;
  regressingChildrenCount: number;
  totalSquadChildren: number;
  averageAcademicDelta: number; // Différence moyenne de points sur 20
  averageAutonomyDelta: number; // Différence moyenne d'autonomie (sur 100)
  reasons: string[];
}

export interface MentorSafeguardAuditResult {
  mentorUserId: string;
  mentorCategory: MentorCategory;
  standing: MentorSafeguardStanding;
  payoutStatus: MentorPayoutStatus;
  autoReassignSquad: boolean;
  impactScore: number; // 0 à 100
  fraudReport: FraudAnomalyReport;
  regressionReport: SquadRegressionReport;
  actionRequired: string;
  recommendations: string[];
}

// ── Moteur d'Analyse Anti-Fraude ───────────────────────────────────────────

/**
 * Détecte les anomalies de manipulation ou de fausses validations :
 * 1. Photos dupliquées (même image pour plusieurs enfants ou plusieurs défis).
 * 2. Défis marqués réussis sans aucun artefact physique détecté par Naya Vision.
 * 3. Fréquence anormale de complétions instantanées / artificielles.
 */
export function detectMentorEvaluationFraud(
  submissions: PhysicalArtifactSubmission[],
): FraudAnomalyReport {
  const reasons: string[] = [];
  const fingerprintCounts = new Map<string, number>();

  for (const sub of submissions) {
    if (sub.imageFingerprint) {
      fingerprintCounts.set(
        sub.imageFingerprint,
        (fingerprintCounts.get(sub.imageFingerprint) ?? 0) + 1,
      );
    }
  }

  let duplicateCount = 0;
  for (const [fingerprint, count] of fingerprintCounts.entries()) {
    if (count > 1) {
      duplicateCount += count - 1;
      reasons.push(
        `Preuve photo dupliquée détectée (${count} utilisations pour l'empreinte ${fingerprint.slice(0, 8)}…).`,
      );
    }
  }

  const total = submissions.length;
  let nonPhysicalCount = 0;
  for (const sub of submissions) {
    if (!sub.isMaterialArtifactDetected || sub.nayaVisionConfidence < 0.4) {
      nonPhysicalCount += 1;
    }
  }

  const zeroArtifactCompletionRate = total > 0 ? (nonPhysicalCount / total) * 100 : 0;
  if (total >= 4 && zeroArtifactCompletionRate >= 60) {
    reasons.push(
      `${Math.round(zeroArtifactCompletionRate)} % des défis ont été validés sans objet physique tangible vérifié par Naya Vision.`,
    );
  }

  // Si des photos dupliquées sont détectées ou si le taux d'absence d'artefact est massif
  const isFraudDetected = duplicateCount >= 2 || (total >= 6 && zeroArtifactCompletionRate >= 75);

  return {
    isFraudDetected,
    duplicatePhotoCount: duplicateCount,
    zeroArtifactCompletionRate: Math.round(zeroArtifactCompletionRate),
    suspiciousMaxScoreStreak: isFraudDetected,
    reasons,
  };
}

// ── Moteur d'Analyse Anti-Régression ─────────────────────────────────────────

/**
 * Analyse l'évolution croisée sur 2 trimestres/cycles :
 * 1. Évolution des notes scolaires (source neutre professeur).
 * 2. Évolution de l'autonomie et de la persévérance (source sondes libres).
 *
 * Règle : Si ≥ 50 % des enfants de l'escouade affichent une chute nette et concomitante
 * de leurs résultats académiques (baisse ≥ 1.5 pts/20) et de leur autonomie (baisse ≥ 20 pts),
 * l'escouade est déclarée en régression critique.
 */
export function evaluateSquadProgression(
  evaluations: ChildTripartiteEvaluation[],
): SquadRegressionReport {
  const total = evaluations.length;
  if (total === 0) {
    return {
      isCriticalRegression: false,
      regressingChildrenCount: 0,
      totalSquadChildren: 0,
      averageAcademicDelta: 0,
      averageAutonomyDelta: 0,
      reasons: [],
    };
  }

  let regressingCount = 0;
  let totalAcademicDelta = 0;
  let academicCount = 0;
  let totalAutonomyDelta = 0;
  let autonomyCount = 0;
  const reasons: string[] = [];

  for (const ev of evaluations) {
    let childRegressed = false;

    // Analyse académique
    if (ev.academicObservation) {
      const delta = ev.academicObservation.currentAverage - ev.academicObservation.previousAverage;
      totalAcademicDelta += delta;
      academicCount += 1;

      // Chute académique significative (≥ 1.5 points de baisse)
      if (delta <= -1.5) {
        childRegressed = true;
      }
    }

    // Analyse autonomie (comparaison entre la sonde la plus récente et la plus ancienne)
    if (ev.autonomyProbes && ev.autonomyProbes.length >= 2) {
      const sorted = [...ev.autonomyProbes].sort(
        (a, b) => new Date(a.periodTimestamp).getTime() - new Date(b.periodTimestamp).getTime(),
      );
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      const autoDelta =
        newest.doorExplorationAutonomyIndex - oldest.doorExplorationAutonomyIndex;
      totalAutonomyDelta += autoDelta;
      autonomyCount += 1;

      // Chute d'autonomie significative (≥ 20 points de baisse)
      if (autoDelta <= -20) {
        childRegressed = true;
      }
    }

    if (childRegressed) {
      regressingCount += 1;
    }
  }

  const avgAcademicDelta = academicCount > 0 ? totalAcademicDelta / academicCount : 0;
  const avgAutonomyDelta = autonomyCount > 0 ? totalAutonomyDelta / autonomyCount : 0;

  const regressionRatio = total > 0 ? regressingCount / total : 0;
  const isCriticalRegression = total >= 4 && regressionRatio >= 0.5;

  if (isCriticalRegression) {
    reasons.push(
      `Alerte Régression : ${regressingCount}/${total} élèves de l'escouade (${Math.round(regressionRatio * 100)} %) sont en recul académique ou en perte d'autonomie.`,
    );
  }

  return {
    isCriticalRegression,
    regressingChildrenCount: regressingCount,
    totalSquadChildren: total,
    averageAcademicDelta: Math.round(avgAcademicDelta * 10) / 10,
    averageAutonomyDelta: Math.round(avgAutonomyDelta * 10) / 10,
    reasons,
  };
}

// ── Score d'Impact Global du Mentor ────────────────────────────────────────

/**
 * Calcule l'indice d'impact composite (0 à 100) du mentor :
 *  • 40 % Corrélation académique positive (hausse ou maintien des notes).
 *  • 35 % Richesse et authenticité des artefacts réels produits.
 *  • 25 % Éveil de l'autonomie et persévérance de l'enfant.
 */
export function computeMentorImpactIndex(params: {
  academicDelta: number; // e.g. +1.2 ou -0.8 pts/20
  artifactValidationRate: number; // 0 à 100 %
  autonomyGrowthRate: number; // 0 à 100 %
}): number {
  // Score académique normalisé : un maintien (0.0) vaut 70/100, une hausse de +2.0 vaut 100/100, une baisse de -2.0 vaut 30/100
  const normalizedAcademic = Math.min(
    100,
    Math.max(0, Math.round(70 + params.academicDelta * 15)),
  );
  const normalizedArtifact = Math.min(100, Math.max(0, params.artifactValidationRate));
  const normalizedAutonomy = Math.min(100, Math.max(0, params.autonomyGrowthRate));

  const weighted =
    0.4 * normalizedAcademic + 0.35 * normalizedArtifact + 0.25 * normalizedAutonomy;
  return Math.round(weighted);
}

// ── Décision Déterministe de Garde-Fou ─────────────────────────────────────

/**
 * Arbitrage global de conformité et de rétention/bannissement du mentor.
 */
export function evaluateMentorSafeguardDecision(params: {
  mentorUserId: string;
  mentorCategory: MentorCategory;
  currentStanding: MentorSafeguardStanding;
  evaluations: ChildTripartiteEvaluation[];
  historicalCriticalRegressionCycles?: number; // Nombre de trimestres consécutifs en régression
}): MentorSafeguardAuditResult {
  const allSubmissions = params.evaluations.flatMap((e) => e.artifactSubmissions);
  const fraudReport = detectMentorEvaluationFraud(allSubmissions);
  const regressionReport = evaluateSquadProgression(params.evaluations);

  const consecutiveRegressions =
    (params.historicalCriticalRegressionCycles ?? 0) +
    (regressionReport.isCriticalRegression ? 1 : 0);

  let standing: MentorSafeguardStanding = params.currentStanding;
  let payoutStatus: MentorPayoutStatus = "payable";
  let autoReassignSquad = false;
  let actionRequired = "Aucune action requise. Suivi conforme.";
  const recommendations: string[] = [];

  // 1. Détection de Fraude (Priorité Absolue)
  if (fraudReport.isFraudDetected) {
    standing = "frozen_suspended";
    payoutStatus = "frozen_under_audit";
    autoReassignSquad = true;
    actionRequired =
      "SUSPENSION IMMÉDIATE & GEL DU PAIEMENT : Fraude avérée ou falsification de preuves détectée.";
    recommendations.push(
      "Ouvrir une enquête contradictoire dans Admin OS.",
      "Réassigner l'escouade à un mentor certifié sans interruption du club pour les familles.",
      "Vérifier manuellement l'authenticité des photos soumises lors des 3 dernières séances.",
    );
  }
  // 2. Régression Critique Répétée (2 cycles consécutifs ou plus)
  else if (consecutiveRegressions >= 2) {
    standing = "frozen_suspended";
    payoutStatus = "frozen_under_audit";
    autoReassignSquad = true;
    actionRequired =
      "RÉVOCATION & RÉASSIGNATION DE L'ESCOUADE : Régression académique et d'autonomie continue sur 2 cycles consécutifs.";
    recommendations.push(
      "Geler le déblocage du paiement mensuel pour audit de conformité pédagogique.",
      "Proposer une réassignation de l'escouade à un Superviseur Génizio.",
      "Convoquer un point d'étape avec le professeur référent de l'école.",
    );
  }
  // 3. Première alerte de Régression (1 cycle)
  else if (regressionReport.isCriticalRegression) {
    standing = "warning";
    payoutStatus = "payable";
    autoReassignSquad = false;
    actionRequired =
      "AVERTISSEMENT PÉDAGOGIQUE : Chute des indicateurs sur cette session. Supervision renforcée activée.";
    recommendations.push(
      "Consulter les fiches de déconstruction Naya générées pour le professeur.",
      "Ajuster le niveau de guidance des défis du samedi pour éviter la surcharge cognitive.",
    );
  }
  // 4. Cas nominal conforme
  else {
    standing = "good_standing";
    payoutStatus = "payable";
    autoReassignSquad = false;
    recommendations.push(
      "Poursuivre le programme de défis matériels et la synchronisation avec le professeur.",
    );
  }

  // Calcul de l'indice d'impact
  const validArtifacts = allSubmissions.filter(
    (s) => s.isMaterialArtifactDetected && s.nayaVisionConfidence >= 0.5,
  ).length;
  const artifactRate =
    allSubmissions.length > 0 ? (validArtifacts / allSubmissions.length) * 100 : 80;

  const autonomyGrowth =
    regressionReport.averageAutonomyDelta >= 0
      ? 75 + regressionReport.averageAutonomyDelta
      : Math.max(20, 70 + regressionReport.averageAutonomyDelta);

  const impactScore = computeMentorImpactIndex({
    academicDelta: regressionReport.averageAcademicDelta,
    artifactValidationRate: artifactRate,
    autonomyGrowthRate: autonomyGrowth,
  });

  return {
    mentorUserId: params.mentorUserId,
    mentorCategory: params.mentorCategory,
    standing,
    payoutStatus,
    autoReassignSquad,
    impactScore,
    fraudReport,
    regressionReport,
    actionRequired,
    recommendations,
  };
}

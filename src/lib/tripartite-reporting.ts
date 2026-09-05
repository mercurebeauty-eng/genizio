// Boucle Fermée Tripartite (Phase 4) — agrégateur statistique trimestriel PUR.
//
// Croise les trois sources d'évaluation indépendantes définies par la Phase 1
// (mentor-safeguards.ts) :
//   a. Notes de classe du professeur (AcademicGradeObservation — source neutre)
//   b. Artefacts validés du club (PhysicalArtifactSubmission — empreintes et
//      confiances Naya Vision RÉELLES depuis M3.3)
//   c. Sondes d'autonomie (AutonomyProbeMetric — Explorations Libres)
//
// Règles de responsabilité :
//   • AUCUNE suspension automatique : buildTripartiteReport produit des FAITS,
//     proposeMentorDecisions produit des PROPOSITIONS — l'Admin OS tranche via
//     la file mentor_decision_proposals (confirm/dismiss tracés).
//   • Plancher de cohorte : moins de MIN_COHORT_SIZE enfants = insufficientData,
//     aucune alerte émise (une corrélation sur 3 enfants ne déclenche rien).
//   • La régression réutilise evaluateSquadProgression (seuils Phase 1 verrouillés).

import {
  computeMentorImpactIndex,
  evaluateSquadProgression,
  type AutonomyProbeMetric,
  type ChildTripartiteEvaluation,
} from "@/lib/mentor-safeguards";

/** En dessous de ce nombre d'enfants, aucun signal n'est émis. */
export const MIN_COHORT_SIZE = 5;

export type QuarterPeriod = string; // ex: "2026-T3"

export interface TripartiteAlert {
  kind: "regression" | "fraud_signal" | "low_data";
  message: string;
  /** Enfants concernés (ids) — les rapports ne nomment jamais publiquement. */
  childIds: string[];
}

export interface TripartiteCohortReport {
  period: QuarterPeriod;
  cohortSize: number;
  /** false si < MIN_COHORT_SIZE : les métriques sont affichées mais inertes. */
  sufficientData: boolean;
  /** Delta médian de notes (pts /20) entre le trimestre courant et le précédent. */
  medianAcademicDelta: number;
  /** Taux de preuves validées avec artefact matériel réel (0–100 %). */
  artifactValidationRate: number;
  /** Delta médian d'autonomie (0–100) entre première et dernière sonde. */
  medianAutonomyDelta: number;
  /** Indice d'impact composite 40/35/25 (moteur Phase 1). */
  impactIndex: number;
  perChild: Array<{
    childId: string;
    academicDelta: number | null;
    autonomyDelta: number | null;
    validatedArtifacts: number;
    totalArtifacts: number;
  }>;
  alerts: TripartiteAlert[];
}

export type MentorDecisionProposalKind =
  | "confidence_bonus"
  | "suspension_review"
  | "coach_alert";

export interface MentorDecisionProposal {
  kind: MentorDecisionProposalKind;
  /** Évidence factuelle qui justifie la proposition — jamais une note de humeur. */
  evidence: string[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(raw * 10) / 10;
}
function autonomyDelta(probes: AutonomyProbeMetric[]): number | null {
  if (probes.length < 2) return null;
  const sorted = [...probes].sort(
    (a, b) => new Date(a.periodTimestamp).getTime() - new Date(b.periodTimestamp).getTime(),
  );
  return sorted[sorted.length - 1].doorExplorationAutonomyIndex - sorted[0].doorExplorationAutonomyIndex;
}

function quarterOf(dateIso: string): number {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return -1;
  return Math.floor(d.getUTCMonth() / 3);
}

/**
 * Rapport trimestriel d'une cohorte d'enfants (une escouade, une école).
 * Seuls les artifacts/observations DANS le trimestre comptent.
 */
export function buildTripartiteReport(params: {
  period: QuarterPeriod;
  evaluations: ChildTripartiteEvaluation[];
  /** Année de référence du trimestre, ex: "2026-T3" → année 2026, trimestre 3. */
  referenceQuarter?: { year: number; quarter: number };
}): TripartiteCohortReport {
  const { period, evaluations } = params;
  const year = params.referenceQuarter?.year ?? (Number.parseInt(period.slice(0, 4), 10) || 0);
  const quarter = params.referenceQuarter?.quarter ?? (Number.parseInt(period.slice(-1), 10) || 0);

  const perChild: TripartiteCohortReport["perChild"] = [];
  const academicDeltas: number[] = [];
  const autonomyDeltas: number[] = [];
  let validatedTotal = 0;
  let artifactTotal = 0;
  const regressingChildIds: string[] = [];
  const zeroArtifactChildIds: string[] = [];

  for (const ev of evaluations) {
    // Académique : observation du trimestre vs du précédent — le filtrage
    // temporel est fait par l'appelant (requête SQL sur la période), l'agrégateur
    // reste pur et déterministe.
    let academicDelta: number | null = null;
    if (ev.academicObservation) {
      const obs = ev.academicObservation;
      academicDelta = obs.currentAverage - obs.previousAverage;
      academicDeltas.push(academicDelta);
      if (academicDelta <= -1.5) regressingChildIds.push(ev.childId);
    }

    // Artefacts DU trimestre (horodatage fiable : la preuve porte sa date).
    const inPeriodArtifacts = ev.artifactSubmissions.filter((s) => {
      const ts = new Date(s.submissionTimestamp);
      return !Number.isNaN(ts.getTime()) && ts.getUTCFullYear() === year && Math.floor(ts.getUTCMonth() / 3) + 1 === quarter;
    });
    const validated = inPeriodArtifacts.filter(
      (s) => s.isMaterialArtifactDetected && s.nayaVisionConfidence >= 0.5,
    ).length;
    validatedTotal += validated;
    artifactTotal += inPeriodArtifacts.length;
    if (inPeriodArtifacts.length >= 3 && validated === 0) zeroArtifactChildIds.push(ev.childId);

    // Autonomie.
    const aDelta = autonomyDelta(ev.autonomyProbes);
    if (aDelta !== null) {
      autonomyDeltas.push(aDelta);
      if (aDelta <= -20) regressingChildIds.push(ev.childId);
    }

    perChild.push({
      childId: ev.childId,
      academicDelta,
      autonomyDelta: aDelta,
      validatedArtifacts: validated,
      totalArtifacts: inPeriodArtifacts.length,
    });
  }

  const cohortSize = evaluations.length;
  const sufficientData = cohortSize >= MIN_COHORT_SIZE;
  const medianAcademicDelta = median(academicDeltas);
  const medianAutonomyDelta = median(autonomyDeltas);
  const artifactValidationRate =
    artifactTotal > 0 ? Math.round((validatedTotal / artifactTotal) * 100) : 80;

  const impactIndex = computeMentorImpactIndex({
    academicDelta: medianAcademicDelta,
    artifactValidationRate,
    autonomyGrowthRate: medianAutonomyDelta >= 0 ? 75 + medianAutonomyDelta : Math.max(20, 70 + medianAutonomyDelta),
  });

  const alerts: TripartiteAlert[] = [];
  if (!sufficientData) {
    alerts.push({
      kind: "low_data",
      message: `Cohorte de ${cohortSize} enfant(s) — inférieure au plancher de ${MIN_COHORT_SIZE}. Métriques indicatives, aucune action proposée.`,
      childIds: [],
    });
    return {
      period, cohortSize, sufficientData, medianAcademicDelta, artifactValidationRate,
      medianAutonomyDelta, impactIndex, perChild, alerts,
    };
  }

  // Régression critique : réutilise les seuils verrouillés du moteur Phase 1.
  const regression = evaluateSquadProgression(evaluations);
  if (regression.isCriticalRegression) {
    alerts.push({
      kind: "regression",
      message: `Régression critique : ${regression.regressingChildrenCount}/${regression.totalSquadChildren} enfants en recul académique (≥1,5 pt) ou d'autonomie (≥20 pts). Revue du mentor requise.`,
      childIds: [...new Set(regressingChildIds)],
    });
  }
  if (zeroArtifactChildIds.length >= Math.ceil(cohortSize / 2)) {
    alerts.push({
      kind: "fraud_signal",
      message: `${zeroArtifactChildIds.length}/${cohortSize} enfants sans AUCUN artefact validé sur ≥3 preuves — signal de fraude à instruire.`,
      childIds: zeroArtifactChildIds,
    });
  }

  return {
    period, cohortSize, sufficientData, medianAcademicDelta, artifactValidationRate,
    medianAutonomyDelta, impactIndex, perChild, alerts,
  };
}

/**
 * PROPOSITIONS de décision pour l'Admin OS — jamais d'exécution automatique.
 * Priorité : suspension_review (fraude/régression) > coach_alert > bonus.
 */
export function proposeMentorDecisions(report: TripartiteCohortReport): MentorDecisionProposal[] {
  if (!report.sufficientData) return [];

  const proposals: MentorDecisionProposal[] = [];
  const regressionAlert = report.alerts.find((a) => a.kind === "regression");
  const fraudAlert = report.alerts.find((a) => a.kind === "fraud_signal");

  if (fraudAlert) {
    proposals.push({
      kind: "suspension_review",
      evidence: [fraudAlert.message, `Taux d'artefacts validés : ${report.artifactValidationRate} %.`],
    });
    return proposals; // la fraude court-circuite tout le reste
  }
  if (regressionAlert) {
    proposals.push({
      kind: "coach_alert",
      evidence: [
        regressionAlert.message,
        `Delta notes médian : ${report.medianAcademicDelta} pt — delta autonomie médian : ${report.medianAutonomyDelta} pts.`,
      ],
    });
  }
  if (report.impactIndex >= 85 && report.medianAcademicDelta > 0 && report.medianAutonomyDelta >= 0) {
    proposals.push({
      kind: "confidence_bonus",
      evidence: [
        `Indice d'impact ${report.impactIndex}/100 avec progression académique (+${report.medianAcademicDelta} pt) et d'autonomie (+${report.medianAutonomyDelta} pts).`,
        "Prime de confiance candidate : réduire la fréquence d'audit du trimestre suivant.",
      ],
    });
  }
  return proposals;
}

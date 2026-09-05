export type DiagnosticCompetenceKey =
  | "resolution_ouverte"
  | "leadership_coordination"
  | "transmission_pedagogique"
  | "creativite_sous_contrainte"
  | "perseverance_sociale"
  | "reciprocite_technique";

export type DiagnosticContextQuadrant =
  | "individuel_autonome"
  | "individuel_explicatif"
  | "collectif_equipe"
  | "collectif_tutorat";

export type HypothesisStatus =
  | "formulated"
  | "testing"
  | "triangulated"
  | "contextualized"
  | "refuted";

export interface DiagnosticEvidence {
  evidenceId: string;
  context: DiagnosticContextQuadrant;
  success: boolean;
  weight: number; // 0 to 1 (e.g., 1.0 = clear demonstration, 0.5 = partial)
  observationNotes?: string;
}

export interface DiagnosticHypothesis {
  id: string;
  childId: string;
  competenceKey: DiagnosticCompetenceKey;
  confidence: number; // 0.0 to 1.0 (Bayesian belief)
  status: HypothesisStatus;
  originContext: DiagnosticContextQuadrant;
  targetDiscriminantContext: DiagnosticContextQuadrant;
  assignedRoleOrFormat?: string; // e.g., "coordinateur", "enseigner_a_naya"
  evidence: DiagnosticEvidence[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Formulate a new hypothesis based on strong signals in a specific context.
 */
export function formulateHypothesis(
  childId: string,
  competenceKey: DiagnosticCompetenceKey,
  originContext: DiagnosticContextQuadrant,
  initialConfidence: number,
  targetDiscriminantContext: DiagnosticContextQuadrant,
  assignedRoleOrFormat?: string,
): DiagnosticHypothesis {
  return {
    id: `hyp_${Math.random().toString(36).substr(2, 9)}`,
    childId,
    competenceKey,
    confidence: initialConfidence,
    status: "formulated",
    originContext,
    targetDiscriminantContext,
    assignedRoleOrFormat,
    evidence: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate expected Information Gain (IG) for a candidate context.
 * The system prioritizes contexts that exactly match the target discriminant context
 * when the hypothesis is still uncertain (testing or formulated).
 */
export function calculateInformationGain(
  hypothesis: DiagnosticHypothesis,
  candidateContext: DiagnosticContextQuadrant,
): number {
  if (
    hypothesis.status === "triangulated" ||
    hypothesis.status === "refuted" ||
    hypothesis.status === "contextualized"
  ) {
    return 0.0; // Uncertainty is already resolved
  }

  let baseIG = 0.5; // Baseline value for exploring

  // Uncertainty curve (inverted U-shape): maximum IG when confidence is around 0.5
  const uncertainty = 4 * hypothesis.confidence * (1 - hypothesis.confidence);

  if (candidateContext === hypothesis.targetDiscriminantContext) {
    baseIG = 1.0;
  } else if (hypothesis.evidence.some((e) => e.context === candidateContext && e.success)) {
    baseIG = 0.2; // Diminishing returns for repeating the same context
  }

  return baseIG * uncertainty;
}

/**
 * Bayesian update of hypothesis confidence based on new evidence.
 * P(H|E) = [ P(E|H) * P(H) ] / P(E)
 */
export function updateHypothesisWithEvidence(
  hypothesis: DiagnosticHypothesis,
  newEvidence: DiagnosticEvidence,
): DiagnosticHypothesis {
  const updatedHypothesis = {
    ...hypothesis,
    evidence: [...hypothesis.evidence, newEvidence],
    updatedAt: new Date().toISOString(),
  };

  const prior = updatedHypothesis.confidence;

  // Likelihood mapping heuristics (How likely is this evidence if the hypothesis is TRUE vs FALSE)
  let pEvidenceGivenHypothesisTrue = 0.8;
  let pEvidenceGivenHypothesisFalse = 0.2;

  if (!newEvidence.success) {
    pEvidenceGivenHypothesisTrue = 0.3; // False negative rate (fails even if capable)
    pEvidenceGivenHypothesisFalse = 0.9; // True negative rate (fails because not capable)
  }

  // Modulate likelihood by evidence weight (confidence of the observation itself)
  const modulate = (val: number, weight: number) => 0.5 + (val - 0.5) * weight;

  const adjPEvGivenHTrue = modulate(pEvidenceGivenHypothesisTrue, newEvidence.weight);
  const adjPEvGivenHFalse = modulate(pEvidenceGivenHypothesisFalse, newEvidence.weight);

  // Evidence probability (Law of total probability)
  const pEvidence = adjPEvGivenHTrue * prior + adjPEvGivenHFalse * (1 - prior);

  // Bayesian update (Posterior)
  const posterior = (adjPEvGivenHTrue * prior) / pEvidence;

  updatedHypothesis.confidence = Math.max(0.01, Math.min(0.99, posterior));

  // Status transition evaluation
  return assessTriangulationStatus(updatedHypothesis);
}

/**
 * Re-evaluates the status of the hypothesis based on accumulated evidence across quadrants.
 */
export function assessTriangulationStatus(hypothesis: DiagnosticHypothesis): DiagnosticHypothesis {
  // Extract distinct contexts where success was observed
  const successfulContexts = new Set<DiagnosticContextQuadrant>();
  const failedContexts = new Set<DiagnosticContextQuadrant>();

  hypothesis.evidence.forEach((ev) => {
    if (ev.success) {
      successfulContexts.add(ev.context);
    } else {
      failedContexts.add(ev.context);
    }
  });

  const distinctSuccessCount = successfulContexts.size;
  const hasFailures = failedContexts.size > 0;

  // High confidence & cross-context validation
  if (hypothesis.confidence >= 0.85 && distinctSuccessCount >= 2) {
    hypothesis.status = "triangulated";
  }
  // Consistently fails or high confidence of absence
  else if (hypothesis.confidence <= 0.2 && failedContexts.size >= 2) {
    hypothesis.status = "refuted";
  }
  // Succeeds in some contexts, but specifically fails in others -> contextualized
  else if (hypothesis.confidence > 0.4 && hasFailures && successfulContexts.size >= 1) {
    hypothesis.status = "contextualized";
  }
  // Gathering evidence
  else if (hypothesis.evidence.length > 0) {
    hypothesis.status = "testing";
  }

  return hypothesis;
}

/**
 * Filters and returns triangulated competencies for the portfolio view
 */
export function getTriangulatedCompetencies(hypotheses: DiagnosticHypothesis[]) {
  return hypotheses.filter((h) => h.status === "triangulated" || h.status === "contextualized");
}

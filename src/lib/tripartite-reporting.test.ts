import { describe, expect, it } from "vitest";
import {
  buildTripartiteReport,
  MIN_COHORT_SIZE,
  proposeMentorDecisions,
} from "@/lib/tripartite-reporting";
import type {
  AutonomyProbeMetric,
  ChildTripartiteEvaluation,
  PhysicalArtifactSubmission,
} from "@/lib/mentor-safeguards";

// Fabriques déterministes d'évaluations tripartites.
function artifact(ts: string, opts: { validated?: boolean; confidence?: number } = {}): PhysicalArtifactSubmission {
  return {
    challengeId: `ch-${ts}`,
    childId: "c1",
    photoUrl: "https://x/y.webp",
    imageFingerprint: `fingerprint-${ts}`,
    nayaVisionConfidence: opts.validated === false ? 0.2 : (opts.confidence ?? 0.9),
    isMaterialArtifactDetected: opts.validated !== false,
    submissionTimestamp: ts,
  };
}

function probes(values: Array<[string, number]>): AutonomyProbeMetric[] {
  return values.map(([ts, idx]) => ({
    childId: "c1",
    periodTimestamp: ts,
    doorExplorationAutonomyIndex: idx,
    perseveranceUnderFrictionIndex: idx,
    frictionRecoverySuccess: idx > 50,
  }));
}

function evaluation(
  childId: string,
  opts: {
    prev?: number;
    curr?: number;
    autonomy?: Array<[string, number]>;
    artifacts?: PhysicalArtifactSubmission[];
  } = {},
): ChildTripartiteEvaluation {
  return {
    childId,
    academicObservation:
      opts.prev !== undefined && opts.curr !== undefined
        ? {
            childId,
            term: 3,
            previousAverage: opts.prev,
            currentAverage: opts.curr,
          }
        : undefined,
    artifactSubmissions: opts.artifacts ?? [],
    autonomyProbes: (opts.autonomy ?? []).map(([ts, idx]) => ({
      childId,
      periodTimestamp: ts,
      doorExplorationAutonomyIndex: idx,
      perseveranceUnderFrictionIndex: idx,
      frictionRecoverySuccess: idx > 50,
    })),
  };
}

const Q = { year: 2026, quarter: 3 };

describe("buildTripartiteReport", () => {
  it("cohorte trop petite → sufficientData false, alerte low_data, aucune action", () => {
    const report = buildTripartiteReport({
      period: "2026-T3",
      referenceQuarter: Q,
      evaluations: [evaluation("c1", { prev: 12, curr: 5 })], // chute brutale
    });
    expect(report.cohortSize).toBe(1);
    expect(report.sufficientData).toBe(false);
    expect(report.alerts).toHaveLength(1);
    expect(report.alerts[0].kind).toBe("low_data");
    expect(proposeMentorDecisions(report)).toHaveLength(0);
    expect(MIN_COHORT_SIZE).toBe(5);
  });

  it("calcule les médianes académiques et d'autonomie sur la cohorte", () => {
    const evals = [
      evaluation("c1", { prev: 10, curr: 11.5, autonomy: [["2026-07-01", 40], ["2026-09-01", 60]] }),
      evaluation("c2", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 70]] }),
      evaluation("c3", { prev: 10, curr: 9, autonomy: [["2026-07-01", 55], ["2026-09-01", 50]] }),
      evaluation("c4", { prev: 10, curr: 11, autonomy: [["2026-07-01", 60], ["2026-09-01", 65]] }),
      evaluation("c5", { prev: 10, curr: 10.5 }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    expect(report.sufficientData).toBe(true);
    expect(report.medianAcademicDelta).toBe(1); // deltas triés : -1, 0.5, 1, 1.5, 2 → médiane 1
    expect(report.medianAutonomyDelta).toBe(12.5); // deltas triés : -5, 5, 20, 20 → médiane paire (5+20)/2
  });

  it("ne compte que les artefacts DU trimestre référencé", () => {
    const evals = [
      evaluation("c1", { artifacts: [artifact("2026-08-05"), artifact("2025-08-05", { validated: false })] }),
      evaluation("c2", { artifacts: [artifact("2026-09-01", { validated: false, confidence: 0.2 })] }),
      evaluation("c3", { artifacts: [artifact("2026-07-15")] }),
      evaluation("c4", { artifacts: [artifact("2026-08-20")] }),
      evaluation("c5", { artifacts: [] }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    // T3 2026 = juillet à septembre 2026 → artefact 2025 exclu, artefact 2026-09 conf 0.2 non validé
    expect(report.perChild[0].totalArtifacts).toBe(1);
    expect(report.perChild[0].validatedArtifacts).toBe(1);
    expect(report.perChild[1].totalArtifacts).toBe(1);
    expect(report.perChild[1].validatedArtifacts).toBe(0);
    expect(report.artifactValidationRate).toBe(Math.round((3 / 4) * 100));
  });

  it("alerte régression via les seuils verrouillés de la Phase 1 (≥50 % en recul)", () => {
    const evals = [
      evaluation("c1", { prev: 12, curr: 10, autonomy: [["2026-07-01", 70], ["2026-09-01", 40]] }),
      evaluation("c2", { prev: 12, curr: 10 }),
      evaluation("c3", { prev: 12, curr: 10 }),
      evaluation("c4", { prev: 12, curr: 12.5, autonomy: [["2026-07-01", 50], ["2026-09-01", 60]] }),
      evaluation("c5", { prev: 12, curr: 12 }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    const regression = report.alerts.find((a) => a.kind === "regression");
    expect(regression).toBeTruthy(); // c1 double recul + c2/c3 chute académique → 3/5 = 60 %
    expect(regression!.childIds).toContain("c1");
  });

  it("signal de fraude quand la moitié des enfants n'a AUCUN artefact validé sur ≥3 preuves", () => {
    const manyButNone = Array.from({ length: 3 }, (_, i) =>
      artifact(`2026-07-1${i}`, { validated: false, confidence: 0.3 }),
    );
    const evals = [
      evaluation("c1", { artifacts: manyButNone }),
      evaluation("c2", { artifacts: manyButNone }),
      evaluation("c3", { artifacts: manyButNone }),
      evaluation("c4", { artifacts: [artifact("2026-08-01")] }),
      evaluation("c5", { artifacts: [artifact("2026-08-02")] }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    const fraud = report.alerts.find((a) => a.kind === "fraud_signal");
    expect(fraud).toBeTruthy();
    expect(fraud!.childIds).toEqual(["c1", "c2", "c3"]);
  });
});

describe("proposeMentorDecisions (propositions, jamais d'exécution)", () => {
  it("fraude → suspension_review et court-circuite les autres propositions", () => {
    const manyButNone = Array.from({ length: 3 }, (_, i) => artifact(`2026-07-1${i}`, { validated: false }));
    const evals = [
      evaluation("c1", { artifacts: manyButNone, prev: 12, curr: 10 }),
      evaluation("c2", { artifacts: manyButNone, prev: 12, curr: 10 }),
      evaluation("c3", { artifacts: manyButNone, prev: 12, curr: 10 }),
      evaluation("c4", { artifacts: [artifact("2026-08-01")], prev: 12, curr: 12.5 }),
      evaluation("c5", { artifacts: [artifact("2026-08-02")], prev: 12, curr: 12 }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    const proposals = proposeMentorDecisions(report);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe("suspension_review");
    expect(proposals[0].evidence.length).toBeGreaterThan(0);
  });

  it("régression seule → coach_alert avec l'évidence chiffrée", () => {
    const evals = [
      evaluation("c1", { prev: 12, curr: 10 }),
      evaluation("c2", { prev: 12, curr: 10 }),
      evaluation("c3", { prev: 12, curr: 10 }),
      evaluation("c4", { prev: 12, curr: 12.5 }),
      evaluation("c5", { prev: 12, curr: 12.2 }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    const proposals = proposeMentorDecisions(report);
    expect(proposals.some((p) => p.kind === "coach_alert")).toBe(true);
    expect(proposals.every((p) => p.kind !== "suspension_review")).toBe(true);
  });

  it("excellence → confidence_bonus (prime de confiance candidate)", () => {
    const evals = [
      evaluation("c1", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 65]] }),
      evaluation("c2", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 65]] }),
      evaluation("c3", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 65]] }),
      evaluation("c4", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 65]] }),
      evaluation("c5", { prev: 10, curr: 12, autonomy: [["2026-07-01", 50], ["2026-09-01", 65]] }),
    ];
    const report = buildTripartiteReport({ period: "2026-T3", referenceQuarter: Q, evaluations: evals });
    expect(report.impactIndex).toBeGreaterThanOrEqual(85);
    const proposals = proposeMentorDecisions(report);
    expect(proposals.some((p) => p.kind === "confidence_bonus")).toBe(true);
  });
});

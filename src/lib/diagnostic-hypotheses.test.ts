import { describe, it, expect } from "vitest";
import {
  formulateHypothesis,
  calculateInformationGain,
  updateHypothesisWithEvidence,
  assessTriangulationStatus,
} from "./diagnostic-hypotheses";

describe("diagnostic-hypotheses", () => {
  it("formulateHypothesis crée une hypothèse avec les bons paramètres", () => {
    const hyp = formulateHypothesis(
      "child_1",
      "leadership_coordination",
      "individuel_autonome",
      0.6,
      "collectif_equipe",
      "coordinateur",
    );

    expect(hyp.childId).toBe("child_1");
    expect(hyp.status).toBe("formulated");
    expect(hyp.confidence).toBe(0.6);
    expect(hyp.targetDiscriminantContext).toBe("collectif_equipe");
    expect(hyp.assignedRoleOrFormat).toBe("coordinateur");
    expect(hyp.evidence).toHaveLength(0);
  });

  it("calculateInformationGain maximise l'IG pour le contexte discriminant", () => {
    const hyp = formulateHypothesis(
      "c1",
      "leadership_coordination",
      "individuel_autonome",
      0.5,
      "collectif_equipe",
    );

    const igTarget = calculateInformationGain(hyp, "collectif_equipe");
    const igOther = calculateInformationGain(hyp, "individuel_explicatif");

    expect(igTarget).toBeGreaterThan(igOther);
    // IG max à 0.5 de confiance pour le target context est 1.0 * (4 * 0.5 * 0.5) = 1.0
    expect(igTarget).toBeCloseTo(1.0);
  });

  it("calculateInformationGain retourne 0 si l'hypothèse est déjà résolue", () => {
    const hyp = formulateHypothesis(
      "c1",
      "leadership_coordination",
      "individuel_autonome",
      0.9,
      "collectif_equipe",
    );
    hyp.status = "triangulated";

    expect(calculateInformationGain(hyp, "collectif_equipe")).toBe(0);
  });

  it("updateHypothesisWithEvidence augmente la confiance en cas de succès", () => {
    let hyp = formulateHypothesis(
      "c1",
      "leadership_coordination",
      "individuel_autonome",
      0.5,
      "collectif_equipe",
    );

    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "ev1",
      context: "collectif_equipe",
      success: true,
      weight: 0.8,
    });

    expect(hyp.confidence).toBeGreaterThan(0.5);
    expect(hyp.status).toBe("testing");
  });

  it("updateHypothesisWithEvidence diminue la confiance en cas d'échec", () => {
    let hyp = formulateHypothesis(
      "c1",
      "leadership_coordination",
      "individuel_autonome",
      0.5,
      "collectif_equipe",
    );

    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "ev2",
      context: "collectif_equipe",
      success: false,
      weight: 0.9,
    });

    expect(hyp.confidence).toBeLessThan(0.5);
  });

  it("assessTriangulationStatus passe à triangulated si >= 2 contextes et haute confiance", () => {
    let hyp = formulateHypothesis(
      "c1",
      "transmission_pedagogique",
      "collectif_equipe",
      0.6,
      "individuel_explicatif",
    );

    // Succès en collectif (déjà origine, mais on simule la confirmation)
    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "e1",
      context: "collectif_equipe",
      success: true,
      weight: 1.0,
    });

    // Succès en explication Naya
    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "e2",
      context: "individuel_explicatif",
      success: true,
      weight: 1.0,
    });

    // Succès en tutorat
    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "e3",
      context: "collectif_tutorat",
      success: true,
      weight: 1.0,
    });

    expect(hyp.confidence).toBeGreaterThan(0.85);
    expect(hyp.status).toBe("triangulated");
  });

  it("assessTriangulationStatus passe à contextualized si succès dans un contexte et échec fort dans un autre", () => {
    let hyp = formulateHypothesis(
      "c1",
      "creativite_sous_contrainte",
      "individuel_autonome",
      0.8,
      "collectif_equipe",
    );

    // Succès en solo
    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "e1",
      context: "individuel_autonome",
      success: true,
      weight: 0.8,
    });

    // Échec sous pression collective
    hyp = updateHypothesisWithEvidence(hyp, {
      evidenceId: "e2",
      context: "collectif_equipe",
      success: false,
      weight: 0.9,
    });

    // La confiance baisse mais reste moyenne
    expect(hyp.status).toBe("contextualized");
  });
});

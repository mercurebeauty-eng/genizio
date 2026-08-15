import { describe, it, expect } from "vitest";
import { computeMentorScore, computeExpectedSessions } from "./mentor-score";

// Score de fiabilité mentor (V2, 2026-08-14) — pondération décidée avec le porteur :
// 50% tenue des séances + 25% feedback famille (1-5) + 25% progression des défis. Sans
// feedback posé, la moyenne est renormalisée sur les composantes disponibles (0.75).
describe("computeMentorScore", () => {
  it("0 séance et 0 défi : score 0", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 0,
        totalChallenges: 0,
      }),
    ).toBe(0);
  });

  it("toutes les séances tenues et tous les défis complétés, sans feedback : 100 (renormalisé)", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(100);
  });

  it("partiel sans feedback : 6/12 séances + 2/4 défis → (50×0.5 + 50×0.25)/0.75 = 50", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 6,
        completedChallenges: 2,
        totalChallenges: 4,
      }),
    ).toBe(50);
  });

  it("séances pleines mais progression nulle, sans feedback : (100×0.5)/0.75 ≈ 67", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 0,
        totalChallenges: 4,
      }),
    ).toBe(67);
  });

  it("progression pleine mais aucune séance, sans feedback : (100×0.25)/0.75 ≈ 33", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 4,
        totalChallenges: 4,
      }),
    ).toBe(33);
  });

  it("feedback 5/5 + séances pleines + progression pleine : 100", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 4,
        totalChallenges: 4,
        avgFeedback: 5,
      }),
    ).toBe(100);
  });

  it("feedback 1/5 avec le reste parfait : (50 + 25×20 + 25)/1 = 80 — la mauvaise note fait baisser", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 4,
        totalChallenges: 4,
        avgFeedback: 1,
      }),
    ).toBe(80);
  });

  it("feedback 5/5 sans séance ni progression : (0 + 25×100 + 0)/1 = 25", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 0,
        totalChallenges: 4,
        avgFeedback: 5,
      }),
    ).toBe(25);
  });

  it("séances plafonnées à 100 (déclarées > attendues) : 100 côté séances", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 20,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(100);
  });

  it("expectedSessions 0 (début de mois) : séances non pénalisantes, progression seule renormalisée", () => {
    expect(
      computeMentorScore({
        expectedSessions: 0,
        declaredSessions: 0,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(33);
  });

  it("expectedSessions 0 avec feedback 4/5 : (25×80 + 25×100)/1 = 45", () => {
    expect(
      computeMentorScore({
        expectedSessions: 0,
        declaredSessions: 0,
        completedChallenges: 5,
        totalChallenges: 5,
        avgFeedback: 4,
      }),
    ).toBe(45);
  });
});

// Séances attendues : 12/mois/enfant proratisées sur la fraction de mois écoulée —
// au premier jour du pilote le score ne pénalise pas d'office.
describe("computeExpectedSessions", () => {
  it("1 enfant, mois complet : 12 séances attendues", () => {
    expect(computeExpectedSessions(1, 30, 30)).toBe(12);
  });

  it("4 enfants, mois complet : 48 séances attendues", () => {
    expect(computeExpectedSessions(4, 30, 30)).toBe(48);
  });

  it("1 enfant, mi-mois (15/30) : 6 séances attendues", () => {
    expect(computeExpectedSessions(1, 30, 15)).toBe(6);
  });

  it("jour 1 : 0 séance attendue (pas de pénalité d'office)", () => {
    expect(computeExpectedSessions(1, 30, 1)).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { computeSupervisorScore, computeExpectedSessions } from "./supervisor-score";

// Score de fiabilité superviseur (V1) — pondération décidée avec le porteur :
// 60% tenue des séances + 40% progression des défis (feedback famille en V2).
describe("computeSupervisorScore", () => {
  it("0 séance et 0 défi : score 0", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 0,
        totalChallenges: 0,
      }),
    ).toBe(0);
  });

  it("toutes les séances tenues et tous les défis complétés : score 100", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(100);
  });

  it("partiel : 6/12 séances + 2/4 défis → 0.6×50 + 0.4×50 = 50", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 6,
        completedChallenges: 2,
        totalChallenges: 4,
      }),
    ).toBe(50);
  });

  it("séances pleines mais progression nulle : 60 (0.6×100 + 0.4×0)", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 0,
        totalChallenges: 4,
      }),
    ).toBe(60);
  });

  it("progression pleine mais aucune séance : 40 (0.6×0 + 0.4×100)", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 4,
        totalChallenges: 4,
      }),
    ).toBe(40);
  });

  it("séances plafonnées à 100 (déclarées > attendues) : 100 côté séances", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 12,
        declaredSessions: 20,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(100);
  });

  it("expectedSessions 0 (début de mois) : séances non pénalisantes, seules les défis comptent", () => {
    expect(
      computeSupervisorScore({
        expectedSessions: 0,
        declaredSessions: 0,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(40);
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

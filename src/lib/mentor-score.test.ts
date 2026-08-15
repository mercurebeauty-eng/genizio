import { describe, it, expect } from "vitest";
import {
  computeMentorScore,
  computeExpectedSessions,
  computeMentorStatusFromScore,
  computeMentorPayoutXof,
  computeMentorPointsRewards,
  computeTrustTier,
} from "./mentor-score";

// Score de fiabilité mentor (V3, 2026-08-15) — grille 40/15/15/30 décidée avec le
// porteur : 40% tenue des séances (confirmées − contestées) + 15% ponctualité
// (séances liées à un créneau planifié réalisées à l'heure ±30 min) + 15% feedback
// famille (1-5) + 30% progression des défis (la valeur recherchée, plus lourde
// qu'avant). Sans ponctualité (aucun créneau planifié) ni feedback posé, la moyenne
// est renormalisée sur les composantes disponibles (0.70 sans les deux).
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

  it("toutes les séances tenues et tous les défis complétés, sans feedback ni ponctualité : 100 (renormalisé)", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 5,
        totalChallenges: 5,
      }),
    ).toBe(100);
  });

  it("partiel sans feedback ni ponctualité : 6/12 séances + 2/4 défis → (50×0.4 + 50×0.3)/0.7 = 50", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 6,
        completedChallenges: 2,
        totalChallenges: 4,
      }),
    ).toBe(50);
  });

  it("séances pleines mais progression nulle, sans feedback : (100×0.4)/0.7 ≈ 57", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 0,
        totalChallenges: 4,
      }),
    ).toBe(57);
  });

  it("progression pleine mais aucune séance, sans feedback : (100×0.3)/0.7 ≈ 43 — la progression pèse plus qu'avant (25→30)", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 4,
        totalChallenges: 4,
      }),
    ).toBe(43);
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

  it("feedback 1/5 avec le reste parfait : (40 + 15×20 + 30)/0.85 ≈ 86 — la mauvaise note fait baisser", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 4,
        totalChallenges: 4,
        avgFeedback: 1,
      }),
    ).toBe(86);
  });

  it("feedback 5/5 sans séance ni progression : (15×100)/0.85 ≈ 18", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 0,
        completedChallenges: 0,
        totalChallenges: 4,
        avgFeedback: 5,
      }),
    ).toBe(18);
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
    ).toBe(43);
  });

  it("expectedSessions 0 avec feedback 4/5 : (15×80 + 30×100)/0.85 ≈ 49", () => {
    expect(
      computeMentorScore({
        expectedSessions: 0,
        declaredSessions: 0,
        completedChallenges: 5,
        totalChallenges: 5,
        avgFeedback: 4,
      }),
    ).toBe(49);
  });

  it("ponctualité présente (50/100) avec le reste parfait, sans feedback : (40 + 15×50 + 30)/0.85 ≈ 91", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 4,
        totalChallenges: 4,
        punctualityScore: 50,
      }),
    ).toBe(91);
  });

  it("ponctualité à 0 (créneaux planifiés jamais tenus à l'heure) : (40 + 15×0 + 30)/0.85 ≈ 82", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        completedChallenges: 4,
        totalChallenges: 4,
        punctualityScore: 0,
      }),
    ).toBe(82);
  });

  it("ponctualité absente (null) = renormalisation (comportement identique à l'absence du paramètre)", () => {
    const withNull = computeMentorScore({
      expectedSessions: 12,
      declaredSessions: 12,
      completedChallenges: 4,
      totalChallenges: 4,
      punctualityScore: null,
    });
    const without = computeMentorScore({
      expectedSessions: 12,
      declaredSessions: 12,
      completedChallenges: 4,
      totalChallenges: 4,
    });
    expect(withNull).toBe(without);
  });

  it("compteur NÉGATIF : 12 confirmées − 2 contestées = 10/12 → (40×83.33 + 30×100)/0.7 ≈ 90", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 12,
        contestedSessions: 2,
        completedChallenges: 4,
        totalChallenges: 4,
      }),
    ).toBe(90);
  });

  it("compteur NÉGATIF : plus de contestations que de confirmées → tenue plancher 0", () => {
    expect(
      computeMentorScore({
        expectedSessions: 12,
        declaredSessions: 5,
        contestedSessions: 8,
        completedChallenges: 4,
        totalChallenges: 4,
      }),
    ).toBe(43);
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

// Statut automatique (V3, Confiance Mentor) — seuils 40 (warning) / 25 (suspended),
// remontée automatique au-dessus des seuils, « banned » jamais produit par la fonction.
describe("computeMentorStatusFromScore", () => {
  it("score parfait : active", () => {
    expect(computeMentorStatusFromScore(100)).toBe("active");
  });

  it("score 40 (au seuil) : active", () => {
    expect(computeMentorStatusFromScore(40)).toBe("active");
  });

  it("score 39 (sous le seuil warning) : warning", () => {
    expect(computeMentorStatusFromScore(39)).toBe("warning");
  });

  it("score 25 (au seuil suspended) : warning", () => {
    expect(computeMentorStatusFromScore(25)).toBe("warning");
  });

  it("score 24 (sous le seuil suspended) : suspended", () => {
    expect(computeMentorStatusFromScore(24)).toBe("suspended");
  });

  it("score 0 : suspended", () => {
    expect(computeMentorStatusFromScore(0)).toBe("suspended");
  });

  it("ne produit jamais « banned » (décision humaine)", () => {
    expect(computeMentorStatusFromScore(0)).not.toBe("banned");
  });
});

// Palier de confiance (V3) — score ≥ 75 sur la fenêtre glissante 30 j.
describe("computeTrustTier", () => {
  it("score 75 : trusted (75/25 du payout)", () => {
    expect(computeTrustTier(75)).toBe("trusted");
  });

  it("score 74 : standard", () => {
    expect(computeTrustTier(74)).toBe("standard");
  });

  it("score 100 : trusted", () => {
    expect(computeTrustTier(100)).toBe("trusted");
  });
});

// Payout snapshot (V3) — 3 500 F standard (70%), 3 750 F confiance (75%), bonus points.
describe("computeMentorPayoutXof", () => {
  it("standard sans bonus : 3 500 F (70 %)", () => {
    expect(computeMentorPayoutXof({ basePayoutXof: 3500, tier: "standard" })).toBe(3500);
  });

  it("confiance sans bonus : 3 750 F (75 %)", () => {
    expect(computeMentorPayoutXof({ basePayoutXof: 3500, tier: "trusted" })).toBe(3750);
  });

  it("confiance +5 % (palier 30 pts) : 3 938 F arrondi", () => {
    expect(
      computeMentorPayoutXof({ basePayoutXof: 3500, tier: "trusted", pointsBonusPct: 5 }),
    ).toBe(3938);
  });

  it("confiance +10 % (palier 60 pts) : 4 125 F", () => {
    expect(
      computeMentorPayoutXof({ basePayoutXof: 3500, tier: "trusted", pointsBonusPct: 10 }),
    ).toBe(4125);
  });

  it("standard +5 % : 3 675 F", () => {
    expect(
      computeMentorPayoutXof({ basePayoutXof: 3500, tier: "standard", pointsBonusPct: 5 }),
    ).toBe(3675);
  });
});

// Paliers de points (V3) — 10 pts badge Bronze, 30 pts +5 % payout, 60 pts Or +10 %.
describe("computeMentorPointsRewards", () => {
  it("0 point : pas de badge, pas de bonus, prochain palier 30", () => {
    expect(computeMentorPointsRewards(0)).toEqual({
      badge: "none",
      payoutBonusPct: 0,
      nextPayoutBonusAt: 30,
    });
  });

  it("9 points : encore aucun badge", () => {
    expect(computeMentorPointsRewards(9).badge).toBe("none");
  });

  it("10 points : badge Bronze", () => {
    expect(computeMentorPointsRewards(10).badge).toBe("bronze");
  });

  it("29 points : Bronze sans bonus payout", () => {
    expect(computeMentorPointsRewards(29)).toEqual({
      badge: "bronze",
      payoutBonusPct: 0,
      nextPayoutBonusAt: 30,
    });
  });

  it("30 points : +5 % de payout, prochain palier 60", () => {
    expect(computeMentorPointsRewards(30)).toEqual({
      badge: "bronze",
      payoutBonusPct: 5,
      nextPayoutBonusAt: 60,
    });
  });

  it("59 points : +5 % toujours, prochain palier 60", () => {
    expect(computeMentorPointsRewards(59).payoutBonusPct).toBe(5);
    expect(computeMentorPointsRewards(59).nextPayoutBonusAt).toBe(60);
  });

  it("60 points : badge Or, +10 %, plus aucun palier", () => {
    expect(computeMentorPointsRewards(60)).toEqual({
      badge: "gold",
      payoutBonusPct: 10,
      nextPayoutBonusAt: null,
    });
  });
});

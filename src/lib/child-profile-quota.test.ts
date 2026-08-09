import { describe, it, expect } from "vitest";
import { computeChildProfileQuota, isGrandfatheredAccount, FREE_FLOOR_CUTOVER } from "@/lib/child-profile-quota";

// Bascule "5 gratuits pour tous" → "1 gratuit + slots payants" (2026-08-03, inverse le pivot du
// 2026-07-22). Le point le plus fragile n'est pas le plancher lui-même mais l'ancien piège :
// GREATEST(5, 2 + extra) ne bougeait pas pour un compte grand-pèré tant que 2+extra ≤ 5 — la
// forme additive retenue ici doit toujours faire au moins aussi bien.
describe("isGrandfatheredAccount", () => {
  it("grand-père un compte créé avant le cutover", () => {
    expect(isGrandfatheredAccount("2026-07-24T00:00:00.000Z")).toBe(true);
  });

  it("ne grand-père pas un compte créé après le cutover", () => {
    expect(isGrandfatheredAccount("2026-08-10T00:00:00.000Z")).toBe(false);
  });

  it("ne grand-père pas un compte sans date connue", () => {
    expect(isGrandfatheredAccount(null)).toBe(false);
    expect(isGrandfatheredAccount(undefined)).toBe(false);
  });

  it("ne grand-père pas une date illisible", () => {
    expect(isGrandfatheredAccount("pas-une-date")).toBe(false);
  });
});

describe("computeChildProfileQuota", () => {
  it("un compte grand-pèré sans extra reste à 5", () => {
    expect(computeChildProfileQuota({ accountCreatedAt: "2026-07-01T00:00:00.000Z", extraSlots: 0 })).toBe(5);
  });

  it("un compte neuf sans extra n'a droit qu'à 1", () => {
    expect(computeChildProfileQuota({ accountCreatedAt: "2026-08-10T00:00:00.000Z", extraSlots: 0 })).toBe(1);
  });

  it("un compte neuf avec 2 slots achetés monte à 3", () => {
    expect(computeChildProfileQuota({ accountCreatedAt: "2026-08-10T00:00:00.000Z", extraSlots: 2 })).toBe(3);
  });

  // Décision utilisateur (2026-08-08) : le plafond de 5 enfants par compte est VOULU — un
  // compte grand-pèré qui achète des slots reste plafonné à 5 (miroir du LEAST(quota, 5) du
  // trigger check_child_profile_quota, migration 20260809120000). Au-delà de 5 → nouveau
  // compte. La couverture famille (abonnement/parrainage) octroie exactement 5, pas plus.
  it("un compte grand-pèré qui achète des slots reste plafonné à 5 (le plafond de 5 est voulu)", () => {
    expect(computeChildProfileQuota({ accountCreatedAt: "2026-07-01T00:00:00.000Z", extraSlots: 1 })).toBe(5);
    expect(computeChildProfileQuota({ accountCreatedAt: "2026-07-01T00:00:00.000Z", extraSlots: 3 })).toBe(5);
  });

  it("le cutover exact est bien exclu du côté grand-père (>= cutover = nouvelle règle)", () => {
    expect(isGrandfatheredAccount(FREE_FLOOR_CUTOVER)).toBe(false);
  });
});

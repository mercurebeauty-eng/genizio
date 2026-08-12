import { describe, it, expect } from "vitest";
import { isGrandfatheredAccount, FREE_FLOOR_CUTOVER } from "@/lib/child-profile-quota";

// Bascule "5 gratuits pour tous" → "1 gratuit + slots payants" (2026-08-03, inverse le pivot du
// 2026-07-22). La formule de création vit dans child-access.ts (computeChildCreationLimit,
// source unique, miroir du trigger check_child_profile_quota) ; ce fichier ne porte que les
// constantes partagées et le test du cutover.
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

  it("le cutover exact est bien exclu du côté grand-père (>= cutover = nouvelle règle)", () => {
    expect(isGrandfatheredAccount(FREE_FLOOR_CUTOVER)).toBe(false);
  });
});

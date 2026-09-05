import { describe, it, expect } from "vitest";

// Logique pure de vérification et d'expiration des délégations éducatives
export function isDelegationValid(delegation: { status: string; valid_until: string }): boolean {
  if (delegation.status !== "active") return false;
  return new Date(delegation.valid_until).getTime() > Date.now();
}

export function computeDelegationRoleBadge(role: string): string {
  switch (role) {
    case "teacher":
      return "Enseignant";
    case "counselor":
      return "Conseiller d'Orientation";
    case "psychologist":
      return "Psychologue";
    default:
      return "Partenaire Éducatif";
  }
}

describe("Délégations éducatives (Règles métier)", () => {
  it("une délégation active et non expirée est valide", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    expect(isDelegationValid({ status: "active", valid_until: futureDate })).toBe(true);
  });

  it("une délégation révoquée est immédiatement invalide même si date future", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    expect(isDelegationValid({ status: "revoked", valid_until: futureDate })).toBe(false);
  });

  it("une délégation dont la date est passée est invalide", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    expect(isDelegationValid({ status: "active", valid_until: pastDate })).toBe(false);
  });

  it("formate correctement les badges de rôles professionnels", () => {
    expect(computeDelegationRoleBadge("teacher")).toBe("Enseignant");
    expect(computeDelegationRoleBadge("counselor")).toBe("Conseiller d'Orientation");
    expect(computeDelegationRoleBadge("psychologist")).toBe("Psychologue");
    expect(computeDelegationRoleBadge("unknown")).toBe("Partenaire Éducatif");
  });
});

import { describe, it, expect } from "vitest";
import { canActAsChildActor } from "./child-actor";

// canActAsChildActor (décision #81) : pur prédicat « qui peut agir sur cet
// enfant » — parent propriétaire, ou mentor assigné actif non banni/suspendu.

describe("canActAsChildActor (pur, acteur enfant)", () => {
  it("parent propriétaire → owner (même sans aucune assignation mentor)", () => {
    expect(
      canActAsChildActor({ isOwner: true, hasActiveAssignment: false, mentorStatus: null }),
    ).toBe("owner");
  });

  it("ni propriétaire ni assigné → refus (null)", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: false, mentorStatus: null }),
    ).toBeNull();
  });

  it("mentor assigné actif (profil absent = actif) → mentor", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: true, mentorStatus: null }),
    ).toBe("mentor");
  });

  it("mentor assigné avec statut warning → mentor (averti reste acteur)", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: true, mentorStatus: "warning" }),
    ).toBe("mentor");
  });

  it("mentor assigné mais suspendu → refus", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: true, mentorStatus: "suspended" }),
    ).toBeNull();
  });

  it("mentor assigné mais banni → refus (décision humaine irréversible)", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: true, mentorStatus: "banned" }),
    ).toBeNull();
  });

  it("mentor retiré (plus d'assignation active) → refus même si statut sain", () => {
    expect(
      canActAsChildActor({ isOwner: false, hasActiveAssignment: false, mentorStatus: "active" }),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  ATELIER_KEYS,
  assignNaturalRoles,
  checkSquadQuorum,
  computeSessionPayoutXof,
  evaluateSessionFraud,
  getAtelierForDate,
  SATURDAY_ATELIERS,
  WORKSHOP_TIMELINE,
} from "@/lib/saturday-clubs";
import {
  MENTOR_CATEGORY_QUOTAS,
  SATURDAY_CLUB_CHILD_PRICE_XOF,
  SATURDAY_CLUB_SPLIT,
} from "@/lib/mentor-safeguards";

describe("Catalogue des ateliers", () => {
  it("4 ateliers complets, tous zéro écran et à matériel local", () => {
    expect(ATELIER_KEYS).toHaveLength(4);
    for (const key of ATELIER_KEYS) {
      const a = SATURDAY_ATELIERS[key];
      expect(a.materials.length).toBeGreaterThan(0);
      expect(a.briefTemplate.length).toBeGreaterThan(20);
      expect(a.visionExpectation.length).toBeGreaterThan(10);
      // Zéro écran : aucun atelier ne demande d'écran/tablette/ordinateur.
      const text = `${a.label} ${a.briefTemplate} ${a.materials.join(" ")}`.toLowerCase();
      for (const forbidden of ["écran", "ecran", "tablette", "ordinateur", "téléphone", "telephone"]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });
});

describe("getAtelierForDate (rotation anti-répétition)", () => {
  it("déterministe : même escouade + même date → même atelier", () => {
    const a = getAtelierForDate("squad-1", "2026-09-12");
    const b = getAtelierForDate("squad-1", "2026-09-12");
    expect(a).toBe(b);
  });

  it("le même atelier ne revient pas deux semaines de suite (shift forcé)", () => {
    const week1 = getAtelierForDate("squad-1", "2026-09-05");
    const week2 = getAtelierForDate("squad-1", "2026-09-12", week1);
    expect(week2).not.toBe(week1);
  });

  it("escouades différentes peuvent avoir des ateliers variés (couverture)", () => {
    const keys = new Set(
      Array.from({ length: 12 }, (_, i) => getAtelierForDate(`squad-${i}`, "2026-09-12")),
    );
    expect(keys.size).toBeGreaterThanOrEqual(2);
  });
});

describe("assignNaturalRoles (rotation équitable)", () => {
  it("assigne exactement les 4 rôles distincts aux 4 premiers membres", () => {
    const roles = assignNaturalRoles(["c1", "c2", "c3", "c4"], "2026-W37");
    expect(Object.values(roles).sort()).toEqual(["batisseur", "capitaine", "ideateur", "mediateur"]);
  });

  it("déterministe à seed égal, varie avec la semaine", () => {
    const a = assignNaturalRoles(["c1", "c2", "c3", "c4"], "2026-W37");
    const b = assignNaturalRoles(["c1", "c2", "c3", "c4"], "2026-W37");
    expect(a).toEqual(b);
    const c = assignNaturalRoles(["c1", "c2", "c3", "c4"], "2026-W38");
    expect(c).not.toEqual(a);
  });

  it("rotation : un enfant Capitaine n'est pas Capitaine la semaine suivante", () => {
    const ids = ["c1", "c2", "c3", "c4"];
    const week1 = assignNaturalRoles(ids, "2026-W37");
    const captain = Object.entries(week1).find(([, r]) => r === "capitaine")![0];
    const week2 = assignNaturalRoles(ids, "2026-W38", {
      [captain]: [week1[captain]],
    });
    expect(week2[captain]).not.toBe("capitaine");
  });

  it("au-delà de 4 membres, les extras n'ont pas de rôle (escouade 6–8)", () => {
    const ids = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
    const roles = assignNaturalRoles(ids, "2026-W37");
    expect(Object.keys(roles)).toHaveLength(4);
    expect(Object.values(roles).filter((r) => r === "capitaine")).toHaveLength(1);
  });
});

describe("WORKSHOP_TIMELINE", () => {
  it("somme à 90 minutes (10+40+30+10)", () => {
    const total = WORKSHOP_TIMELINE.reduce((acc, p) => acc + p.minutes, 0);
    expect(total).toBe(90);
    expect(WORKSHOP_TIMELINE.map((p) => p.phase)).toEqual([
      "Échauffement",
      "Conception",
      "Test",
      "Restitution orale",
    ]);
  });
});

describe("checkSquadQuorum", () => {
  it("support : 6 à 8 présents requis", () => {
    expect(checkSquadQuorum({ category: "support", presentCount: 5 }).ok).toBe(false);
    expect(checkSquadQuorum({ category: "support", presentCount: 6 }).ok).toBe(true);
    expect(checkSquadQuorum({ category: "support", presentCount: 8 }).ok).toBe(true);
    expect(checkSquadQuorum({ category: "support", presentCount: 9 }).ok).toBe(false);
    expect(checkSquadQuorum({ category: "support", presentCount: 5 }).reason).toContain("Quorum");
  });

  it("pro : 1 à 5 présents", () => {
    expect(checkSquadQuorum({ category: "pro", presentCount: 1 }).ok).toBe(true);
    expect(checkSquadQuorum({ category: "pro", presentCount: 6 }).ok).toBe(false);
  });

  it("cohérent avec les quotas du moteur Phase 1", () => {
    expect(MENTOR_CATEGORY_QUOTAS.support.minChildrenPerSquad).toBe(6);
    expect(MENTOR_CATEGORY_QUOTAS.support.maxChildrenPerSquad).toBe(8);
  });
});

describe("computeSessionPayoutXof", () => {
  it("70 % du prix par enfant présent (escouade de 8 → 56 000 F)", () => {
    const res = computeSessionPayoutXof({ presentCount: 8, category: "support", standing: "good_standing" });
    expect(res.amountXof).toBe(56000);
    expect(res.payable).toBe(true);
    // Invariant croisé avec le moteur Phase 1 :
    expect(res.amountXof).toBe(
      Math.round(8 * SATURDAY_CLUB_CHILD_PRICE_XOF * SATURDAY_CLUB_SPLIT.mentorShare),
    );
  });

  it("proratisation aux présents (6 présents sur escouade)", () => {
    const res = computeSessionPayoutXof({ presentCount: 6, category: "support", standing: "good_standing" });
    expect(res.amountXof).toBe(42000);
  });

  it("plafonné au maximum d'escouade (pas de sur-paiement)", () => {
    const res = computeSessionPayoutXof({ presentCount: 12, category: "support", standing: "good_standing" });
    expect(res.amountXof).toBe(56000);
  });

  it("gelé en suspension/probation-ban", () => {
    for (const standing of ["banned", "frozen_suspended"] as const) {
      const res = computeSessionPayoutXof({ presentCount: 8, category: "support", standing });
      expect(res.payable).toBe(false);
      expect(res.amountXof).toBe(0);
      expect(res.reason).toBeTruthy();
    }
    // probation : payable (le gel applicatif passe par computeSupportMentorMonthlyPayout)
    const probation = computeSessionPayoutXof({ presentCount: 8, category: "support", standing: "probation" });
    expect(probation.payable).toBe(true);
  });
});

describe("evaluateSessionFraud", () => {
  const cleanVision = { materialArtifactDetected: true, confidence: 0.9, screenContentDetected: false };

  it("REJET : capture d'écran détectée (zéro écran)", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: null,
      hammingGlobal: null,
      vision: { ...cleanVision, screenContentDetected: true },
      presentCount: 8,
    });
    expect(res.decision).toBe("reject");
    expect(res.reasons[0]).toContain("Capture d'écran");
  });

  it("REJET : doublon CERTAIN de la preuve du même mentor", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: 2,
      hammingGlobal: null,
      vision: cleanVision,
      presentCount: 8,
    });
    expect(res.decision).toBe("reject");
  });

  it("REJET : aucun artefact matériel avec confiance vision élevée", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: null,
      hammingGlobal: null,
      vision: { materialArtifactDetected: false, confidence: 0.85, screenContentDetected: false },
      presentCount: 8,
    });
    expect(res.decision).toBe("reject");
  });

  it("FLAG : doublon suspect (5–8 bits) même si la vision est propre", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: 6,
      hammingGlobal: null,
      vision: cleanVision,
      presentCount: 8,
    });
    expect(res.decision).toBe("flag");
    expect(res.reasons[0]).toContain("revue");
  });

  it("FLAG : confiance vision faible", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: null,
      hammingGlobal: null,
      vision: { materialArtifactDetected: true, confidence: 0.35, screenContentDetected: false },
      presentCount: 8,
    });
    expect(res.decision).toBe("flag");
  });

  it("VALIDATE : séance conforme, preuve neuve, artefact réel détecté", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: 27,
      hammingGlobal: 31,
      vision: cleanVision,
      presentCount: 7,
    });
    expect(res.decision).toBe("validate");
    expect(res.reasons).toHaveLength(0);
  });

  it("VALIDATE : vision indisponible (panne IA) et empreinte lointaine", () => {
    const res = evaluateSessionFraud({
      hammingSameMentor: 40,
      hammingGlobal: 44,
      vision: null,
      presentCount: 8,
    });
    expect(res.decision).toBe("validate");
  });
});

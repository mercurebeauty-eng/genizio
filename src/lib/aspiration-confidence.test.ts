import { describe, it, expect } from "vitest";
import {
  ASPIRATION_CONFIRM_THRESHOLD,
  ASPIRATION_MIN_TRIALS,
  ASPIRATION_REFUTE_THRESHOLD,
  resolveAspirationHypotheses,
} from "@/lib/aspiration-confidence";
import { findAspirationBridge } from "@/lib/aspiration-map";

// Aspirations = hypothèses testées par l'expérience (2026-08-12, analyse §10-16) —
// mêmes seuils que les intérêts (fenêtre 8 essais, engagement net 0.65/0.35).

const DECLARED = [{ label: "Menuiserie", type: "metier", source: "enfant" as const }];

// signaux fabriqués : 8 défis complétés dans le domaine Artisanat (mappé par le pont menuiserie)
const completedInArtisanat = (n: number) =>
  Array.from({ length: n }, () => ({ domain: "Artisanat", target_intelligences: ["artisanale"] }));

describe("resolveAspirationHypotheses", () => {
  it("aucun essai → untested (même avec une déclaration)", () => {
    const res = resolveAspirationHypotheses({ aspirations: DECLARED });
    expect(res.byLabel["Menuiserie"].status).toBe("untested");
    expect(res.untestedLabels).toContain("Menuiserie");
  });

  it("moins de 8 essais → untested malgré un bon engagement", () => {
    const res = resolveAspirationHypotheses({
      aspirations: DECLARED,
      completed: completedInArtisanat(5),
    });
    expect(res.byLabel["Menuiserie"].status).toBe("untested");
  });

  it("8 complétions sur 8 → confirmed (engagement 1.0)", () => {
    const res = resolveAspirationHypotheses({
      aspirations: DECLARED,
      completed: completedInArtisanat(8),
    });
    expect(res.byLabel["Menuiserie"].status).toBe("confirmed");
    expect(res.confirmedLabels).toContain("Menuiserie");
  });

  it("6 abandons sur 8 → refuted (engagement net 0)", () => {
    const abandoned = Array.from({ length: 6 }, () => ({ domain: "Artisanat" }));
    const res = resolveAspirationHypotheses({
      aspirations: DECLARED,
      completed: completedInArtisanat(2),
      abandoned,
    });
    const h = res.byLabel["Menuiserie"];
    expect(h.status).toBe("refuted");
    expect(h.engagement).toBe(0);
  });

  it("engagement intermédiaire (6 complétions / 2 abandons = 0.5) → exploring", () => {
    const res = resolveAspirationHypotheses({
      aspirations: DECLARED,
      completed: completedInArtisanat(6),
      abandoned: completedInArtisanat(2),
    });
    const h = res.byLabel["Menuiserie"];
    expect(h.status).toBe("exploring");
    expect(h.engagement).toBeCloseTo(0.5);
    expect(res.exploringLabels).toContain("Menuiserie");
  });

  it("le marqueur aspiration_label compte comme essai direct, même hors domaines mappés", () => {
    const res = resolveAspirationHypotheses({
      aspirations: DECLARED,
      completed: Array.from({ length: 8 }, () => ({
        domain: "Sciences & Ingénierie",
        aspiration_label: "Menuiserie",
      })),
    });
    expect(res.byLabel["Menuiserie"].status).toBe("confirmed");
  });

  it("source : 'enfant' conservée, absence de source → parent (rétrocompat chantier 1)", () => {
    const res = resolveAspirationHypotheses({
      aspirations: [
        { label: "Menuiserie", type: "metier", source: "enfant" },
        { label: "Mécanique", type: "metier" },
      ],
    });
    expect(res.byLabel["Menuiserie"].source).toBe("enfant");
    expect(res.byLabel["Mécanique"].source).toBe("parent");
  });

  it("aspiration sans pont mappé (générique) : seuls les marqueurs directs comptent", () => {
    const res = resolveAspirationHypotheses({
      aspirations: [{ label: "Astronaute", type: "metier" }],
      completed: completedInArtisanat(8), // ne touche pas le pont générique (aucun domaine mappé)
    });
    expect(res.byLabel["Astronaute"].status).toBe("untested");
  });

  it("aucune aspiration déclarée → résultat vide sans crash", () => {
    const res = resolveAspirationHypotheses({});
    expect(Object.keys(res.byLabel)).toHaveLength(0);
  });

  it("seuils exportés cohérents avec les intérêts", () => {
    expect(ASPIRATION_MIN_TRIALS).toBe(8);
    expect(ASPIRATION_CONFIRM_THRESHOLD).toBe(0.65);
    expect(ASPIRATION_REFUTE_THRESHOLD).toBe(0.35);
  });
});

describe("avis GPT Codex — P2 clé Gardner canonique (spatial)", () => {
  it('le pont Menuiserie compte un défi validé avec target_intelligences ["spatial"]', () => {
    const res = resolveAspirationHypotheses({
      aspirations: [{ label: "Menuiserie", type: "metier" }],
      completed: [
        { domain: "Artisanat", target_intelligences: ["spatial"], aspiration_label: null },
      ],
      abandoned: [],
    });
    expect(res.byLabel["Menuiserie"].completions).toBe(1);
  });

  it("les bridges art/mécanique/informatique/couture portent la clé spatial (pas spatiale)", () => {
    for (const label of ["Art", "Mécanique", "Informatique", "Couture"]) {
      const bridge = findAspirationBridge(label);
      expect(bridge.talentKeys).toContain("spatial");
      expect(bridge.talentKeys).not.toContain("spatiale");
    }
  });
});

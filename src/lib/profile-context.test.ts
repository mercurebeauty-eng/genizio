import { describe, it, expect } from "vitest";
import { formatChildProfileContext, SCHOOL_LEVELS } from "@/lib/profile-context";

// Profil multidimensionnel (2026-08-12) — le contexte déclaré est un point de
// départ doux : l'expérience réelle prime, l'aspiration reste une hypothèse.

describe("formatChildProfileContext", () => {
  it("profil vide → chaîne vide (aucun bruit dans les prompts)", () => {
    expect(formatChildProfileContext({})).toBe("");
    expect(formatChildProfileContext({ school_level: null, languages: [], ability_profile: {}, aspirations: [] })).toBe("");
  });

  it("niveau scolaire et langues", () => {
    const out = formatChildProfileContext({ school_level: "cm2", languages: ["français", "wolof"] });
    expect(out).toContain("CM2");
    expect(out).toContain("français, wolof");
  });

  it("facilités et difficultés séparées, labels humains", () => {
    const out = formatChildProfileContext({
      ability_profile: { langage: "facile", concentration: "difficulte", memoire: "neutre" },
    });
    expect(out).toContain("Facilités déclarées par le parent : Langage & expression");
    expect(out).toContain("Difficultés déclarées par le parent : Concentration");
    expect(out).not.toContain("Mémoire");
  });

  it("une difficulté est un axe d'entraînement, jamais une étiquette", () => {
    const out = formatChildProfileContext({ ability_profile: { logique: "difficulte" } });
    expect(out).toContain("axes d'entraînement");
    expect(out).toContain("JAMAIS des étiquettes");
  });

  it("l'aspiration déclarée est présentée comme une hypothèse à explorer, pas un verdict", () => {
    const out = formatChildProfileContext({ aspirations: [{ label: "Menuiserie", type: "metier" }] });
    expect(out).toContain("Menuiserie");
    expect(out).toContain("HYPOTHÈSE À EXPLORER");
  });

  it("contexte de parcours : entrer dans son monde avant le nôtre", () => {
    const out = formatChildProfileContext({ life_context: ["parcours_rue"] });
    expect(out).toContain("A vécu dans la rue");
    expect(out).toContain("entre dans son monde");
  });

  it("rapport à l'école", () => {
    const out = formatChildProfileContext({ school_relation: "conflit" });
    expect(out).toContain("En conflit avec l'école");
  });

  it("vocabulaire : tous les niveaux scolaires ont un label", () => {
    for (const key of ["prescolaire", "cp1", "cm2", "troisieme", "terminale", "non_scolarise"]) {
      expect(SCHOOL_LEVELS[key]).toBeTruthy();
    }
  });
});

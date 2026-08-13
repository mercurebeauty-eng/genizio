import { describe, it, expect } from "vitest";
import {
  biasLabelsByDeclaredDifficulties,
  difficultyTalentTargets,
  rankByDeclaredDifficulties,
} from "@/lib/difficulty-map";
import { shouldAskAspirations } from "@/lib/profile-context";

// §8 (2026-08-12) : une difficulté n'est pas compensée, elle est ENTRAÎNÉE — les
// difficultés déclarées biaisent doucement (jamais durement) le ciblage des défis.

describe("difficultyTalentTargets", () => {
  it("mappe les difficultés déclarées sur les clés Gardner", () => {
    expect(difficultyTalentTargets({ langage: "difficulte" })).toEqual(["linguistique"]);
    expect(difficultyTalentTargets({ motricite: "difficulte" })).toEqual(["corporelle"]);
  });

  it("ignore les axes neutres et les facilités", () => {
    expect(difficultyTalentTargets({ langage: "facile", memoire: "neutre" })).toEqual([]);
  });

  it("déduplique les clés partagées (ex. deux axes → logico_mathematique)", () => {
    const targets = difficultyTalentTargets({ logique: "difficulte", memoire: "difficulte" });
    expect(targets.filter((t) => t === "logico_mathematique")).toHaveLength(1);
  });
});

describe("rankByDeclaredDifficulties", () => {
  it("fait passer la faiblesse ciblée en tête, ordre stable pour le reste", () => {
    const candidates = [{ key: "linguistique" }, { key: "spatiale" }, { key: "corporelle" }];
    const ranked = rankByDeclaredDifficulties(candidates, { motricite: "difficulte" });
    expect(ranked[0].key).toBe("corporelle");
    expect(ranked.slice(1).map((c) => c.key)).toEqual(["linguistique", "spatiale"]);
  });

  it("aucune difficulté déclarée → ordre inchangé", () => {
    const candidates = [{ key: "a" }, { key: "b" }];
    expect(rankByDeclaredDifficulties(candidates, {})).toEqual(candidates);
    expect(rankByDeclaredDifficulties(candidates, null)).toEqual(candidates);
  });
});

describe("biasLabelsByDeclaredDifficulties", () => {
  it("réordonne les libellés (sortie getLeastExploredTalentLabels, préfixés emoji)", () => {
    const labels = ["🪵 Artisanale", "🏃 Corporelle", "📐 Spatiale"];
    const biased = biasLabelsByDeclaredDifficulties(labels, { motricite: "difficulte" });
    expect(biased[0]).toBe("🏃 Corporelle");
    expect(biased.slice(1)).toEqual(["🪵 Artisanale", "📐 Spatiale"]);
  });
});

describe("shouldAskAspirations", () => {
  it("contexte vulnérable (parcours rue, précarité, famille éloignée) → oui", () => {
    expect(shouldAskAspirations({ life_context: ["parcours_rue"] })).toBe(true);
    expect(shouldAskAspirations({ life_context: ["environnement_precaire"] })).toBe(true);
    expect(shouldAskAspirations({ life_context: ["famille_eloignee"] })).toBe(true);
  });

  it("rapport à l'école conflictuel ou non scolarisé → oui", () => {
    expect(shouldAskAspirations({ school_relation: "conflit" })).toBe(true);
    expect(shouldAskAspirations({ school_relation: "non_scolarise" })).toBe(true);
  });

  it("profil standard sans contexte → non (pas besoin de choix d'aspiration)", () => {
    expect(shouldAskAspirations({})).toBe(false);
    expect(shouldAskAspirations({ life_context: [], school_relation: "apprecie" })).toBe(false);
  });

  it("des aspirations existent déjà → visible quoi qu'il arrive (on ne cache jamais des données)", () => {
    expect(shouldAskAspirations({ existingAspirations: [{ label: "Menuiserie", type: "metier" }] })).toBe(true);
    expect(shouldAskAspirations({ life_context: [], existingAspirations: [{ label: "Danse", type: "exploration" }] })).toBe(true);
  });

  it("besoins spécifiques seuls → non (pas dans la liste vulnérable du choix d'aspiration)", () => {
    expect(shouldAskAspirations({ life_context: ["besoins_specifiques"] })).toBe(false);
  });
});

describe("avis GPT Codex — P2 « Perception spatiale » → clé canonique spatial", () => {
  it("la difficulté Perception spatiale cible bien la clé spatial (pas spatiale)", () => {
    expect(difficultyTalentTargets({ perception_spatiale: "difficulte" })).toEqual(["spatial"]);
  });

  it("rankByDeclaredDifficulties reconnaît un candidat spatial", () => {
    const candidates = [{ key: "linguistique" }, { key: "spatial" }, { key: "corporelle" }];
    const ranked = rankByDeclaredDifficulties(candidates, { perception_spatiale: "difficulte" });
    expect(ranked[0].key).toBe("spatial");
    expect(ranked.slice(1).map((c) => c.key)).toEqual(["linguistique", "corporelle"]);
  });
});

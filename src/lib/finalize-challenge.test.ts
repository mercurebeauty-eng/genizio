import { describe, it, expect } from "vitest";
import { finalizeChallenge } from "@/lib/challenges.functions";

// Couvre le gating de trait_subform (V1 du chantier "sous-formes de talent", 2026-07-22,
// cf. genizio-decisions #40) : ne jamais faire confiance à la seule auto-discipline du modèle
// pour restreindre le champ à corporelle + aux 5 valeurs connues, même philosophie que
// resolveTargetIntelligences/resolveProofMode déjà en place dans finalizeChallenge.
describe("finalizeChallenge — trait_subform", () => {
  const base = {
    title: "Défi test",
    description: "desc",
    steps: ["Étape 1"],
    materials: [] as string[],
  };

  it("garde une sous-forme valide quand corporelle fait partie des intelligences", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["corporelle"], trait_subform: "explosivite" },
      10
    );
    expect(result.trait_subform).toBe("explosivite");
    expect(result.target_intelligences).toEqual(["corporelle"]);
  });

  it("rejette une sous-forme si corporelle n'est pas dans les intelligences résolues", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["creative"], trait_subform: "explosivite" },
      10
    );
    expect(result.trait_subform).toBeNull();
  });

  it("rejette une valeur de sous-forme inconnue même avec corporelle présent", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["corporelle"], trait_subform: "vitesse-de-la-lumiere" },
      10
    );
    expect(result.trait_subform).toBeNull();
  });

  it("renvoie null quand aucune sous-forme n'est fournie", () => {
    const result = finalizeChallenge({ ...base, intelligences: ["corporelle"] }, 10);
    expect(result.trait_subform).toBeNull();
  });

  it("rejette une sous-forme si intelligences est absent", () => {
    const result = finalizeChallenge({ ...base, trait_subform: "endurance" }, 10);
    expect(result.trait_subform).toBeNull();
    expect(result.target_intelligences).toEqual([]);
  });
});

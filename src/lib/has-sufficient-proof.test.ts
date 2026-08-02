import { describe, it, expect } from "vitest";
import { hasSufficientProof } from "@/lib/challenges.functions";

// Étape 1 du chantier "preuve visuelle obligatoire" (brainstorm produit, 2026-08-02) :
// jusqu'ici, validateChallengeProof notait un commentaire texte seul exactement comme
// une photo (mêmes XP/badges/points, aucune distinction) — cette fonction est le seul
// point qui décide désormais si une soumission a le droit d'être notée. Les défis
// proof_mode="declarative" ne passent jamais par ici (ils utilisent
// submitDeclarativeProof), donc aucun cas particulier à couvrir pour eux.
describe("hasSufficientProof", () => {
  it("refuse une soumission sans image", () => {
    expect(hasSufficientProof(undefined)).toBe(false);
  });

  it("refuse une chaîne vide (cas théorique d'un appel direct à l'API sans fichier)", () => {
    expect(hasSufficientProof("")).toBe(false);
  });

  it("accepte une image présente", () => {
    expect(hasSufficientProof("aGVsbG8=")).toBe(true);
  });
});

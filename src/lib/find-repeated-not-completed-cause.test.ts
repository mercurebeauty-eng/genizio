import { describe, it, expect } from "vitest";
import { findRepeatedNotCompletedCause } from "@/lib/hypotheses.functions";

// Étape 3 du chantier "preuve visuelle obligatoire / statut non réussi" (brainstorm
// produit, 2026-08-02) : un seul commentaire classé ne doit jamais suffire à conclure
// quoi que ce soit — il faut 4 défis non réussis consécutifs du même domaine, avec la
// même cause classée par l'IA, avant que ça compte comme un vrai motif (décision
// utilisateur explicite, même seuil que l'écart âge/référentiel existant).
describe("findRepeatedNotCompletedCause", () => {
  const entry = (domain: string, cause: string, title = "Défi") => ({ domain, cause, title });

  it("ne détecte rien avec seulement 3 occurrences de la même cause", () => {
    const result = findRepeatedNotCompletedCause(
      [entry("Logique", "CONCEPTUAL_GAP"), entry("Logique", "CONCEPTUAL_GAP"), entry("Logique", "CONCEPTUAL_GAP")],
      new Set()
    );
    expect(result).toBeNull();
  });

  it("détecte un motif à la 4e occurrence consécutive de la même cause", () => {
    const result = findRepeatedNotCompletedCause(
      [
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
      ],
      new Set()
    );
    expect(result).toEqual({
      domain: "Logique",
      cause: "CONCEPTUAL_GAP",
      evidence: [
        { cause: "CONCEPTUAL_GAP", title: "Défi" },
        { cause: "CONCEPTUAL_GAP", title: "Défi" },
        { cause: "CONCEPTUAL_GAP", title: "Défi" },
        { cause: "CONCEPTUAL_GAP", title: "Défi" },
      ],
    });
  });

  it("ne détecte rien si les causes sont mélangées, même à 4 occurrences", () => {
    const result = findRepeatedNotCompletedCause(
      [
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "LACK_OF_ENGAGEMENT"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
      ],
      new Set()
    );
    expect(result).toBeNull();
  });

  it("ignore un domaine qui a déjà un cycle ouvert", () => {
    const result = findRepeatedNotCompletedCause(
      [
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
      ],
      new Set(["Logique"])
    );
    expect(result).toBeNull();
  });

  it("ignore les entrées sans cause classée (classification IA non aboutie)", () => {
    const result = findRepeatedNotCompletedCause(
      [
        entry("Logique", "CONCEPTUAL_GAP"),
        { domain: "Logique", cause: null, title: "Défi" },
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
      ],
      new Set()
    );
    expect(result).toBeNull();
  });

  it("ne mélange pas deux domaines différents", () => {
    const result = findRepeatedNotCompletedCause(
      [
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Sciences", "CONCEPTUAL_GAP"),
        entry("Logique", "CONCEPTUAL_GAP"),
        entry("Sciences", "CONCEPTUAL_GAP"),
      ],
      new Set()
    );
    expect(result).toBeNull();
  });
});

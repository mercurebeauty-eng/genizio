import { describe, it, expect } from "vitest";
import {
  evaluateFailureSequence,
  isSequenceConcludable,
  buildFailureNarrative,
} from "@/lib/failure-sequence.functions";
import { semanticRubricFor } from "@/lib/naya-verifier.functions";

// Chantier 5 — boucle de réévaluation complète (analyse §36) : comparaison des
// tentatives, identification du facteur, garde-fou « personne n'est nul » (§35) et
// narration parent qualitative — 0 chiffre, jamais de verdict.

describe("evaluateFailureSequence — comparaison des tentatives (§36)", () => {
  it("identifie la modalité gagnante quand une tentative réussit (facteur trouvé)", () => {
    const verdict = evaluateFailureSequence([
      { presentationMode: "manipulation", status: "not_completed" },
      { presentationMode: "histoire", status: "completed" },
    ]);
    expect(verdict).toEqual({ status: "MODALITY_FOUND", modality: "histoire" });
  });

  it("reste « encore à explorer » quand tout échoue avec ≥ 2 modalités testées", () => {
    const verdict = evaluateFailureSequence([
      { presentationMode: "manipulation", status: "not_completed" },
      { presentationMode: "demonstration", status: "not_completed" },
      { presentationMode: "situation_concrete", status: "not_completed" },
    ]);
    expect(verdict).toEqual({ status: "STILL_EXPLORING", testedModes: 3 });
  });

  it("garde-fou §35 : pas de conclusion avec une seule modalité testée", () => {
    expect(
      evaluateFailureSequence([{ presentationMode: "manipulation", status: "not_completed" }])
    ).toBeNull();
  });

  it("garde-fou §35 : pas de conclusion sans modalité renseignée", () => {
    expect(
      evaluateFailureSequence([
        { presentationMode: null, status: "not_completed" },
        { presentationMode: null, status: "not_completed" },
      ])
    ).toBeNull();
  });

  it("une seule réussite suffit même si elle est la première tentative (séquence positive)", () => {
    const verdict = evaluateFailureSequence([
      { presentationMode: "manipulation", status: "completed" },
    ]);
    expect(verdict).toEqual({ status: "MODALITY_FOUND", modality: "manipulation" });
  });

  it("isSequenceConcludable reflète le garde-fou", () => {
    expect(isSequenceConcludable([{ presentationMode: "manipulation", status: "not_completed" }])).toBe(false);
    expect(
      isSequenceConcludable([
        { presentationMode: "manipulation", status: "not_completed" },
        { presentationMode: "histoire", status: "not_completed" },
      ])
    ).toBe(true);
  });
});

describe("buildFailureNarrative — qualitative, jamais de verdict", () => {
  it("nomme la modalité gagnante par son libellé humain (0 chiffre)", () => {
    const text = buildFailureNarrative({ status: "MODALITY_FOUND", modality: "histoire" }, "Fanta");
    expect(text).toContain("Fanta a réussi ce défi");
    expect(text).toContain("par une histoire");
    expect(text).toContain("Naya garde cette manière en mémoire");
  });

  it("« encore à explorer » : jamais « il ne peut pas », jamais de chiffres", () => {
    const text = buildFailureNarrative({ status: "STILL_EXPLORING", testedModes: 3 }, "Moussa");
    expect(text).toContain("plusieurs manières différentes");
    expect(text).toContain("continue d'observer");
    expect(text).not.toMatch(/ne peut pas|nul|échec|raté|essai/i);
    expect(text).not.toMatch(/\d/);
  });
});

describe("Le Loup — rubrique de la séquence d'échec (§36)", () => {
  it("verrouille zéro verdict, garde-fou §35 et zéro chiffre", () => {
    const rubric = semanticRubricFor("failure_sequence");
    expect(rubric).toContain("sequence-zero-verdict");
    expect(rubric).toContain("sequence-garde-fou-35");
    expect(rubric).toContain("sequence-zero-chiffre");
  });
});

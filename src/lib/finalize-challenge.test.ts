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
      10,
    );
    expect(result.trait_subform).toBe("explosivite");
    expect(result.target_intelligences).toEqual(["corporelle"]);
  });

  it("rejette une sous-forme si corporelle n'est pas dans les intelligences résolues", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["creative"], trait_subform: "explosivite" },
      10,
    );
    expect(result.trait_subform).toBeNull();
  });

  it("rejette une valeur de sous-forme inconnue même avec corporelle présent", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["corporelle"], trait_subform: "vitesse-de-la-lumiere" },
      10,
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

  // Étendu aux 9 domaines le 2026-07-22 (même jour que le pilote corporelle) : même garde-fou,
  // vérifié sur un second domaine pour prouver que ce n'est pas un cas spécial câblé en dur.
  // Note : la clé Gardner est "spatial" (VALID_TALENT_KEYS), pas "spatiale" (qui est la valeur
  // utilisée par ACADEMIC_DOMAINS, un namespace différent) — piège trouvé en écrivant ce test.
  it("garde une sous-forme valide pour un domaine non-corporelle (spatial)", () => {
    const result = finalizeChallenge(
      { ...base, intelligences: ["spatial"], trait_subform: "orientation" },
      10,
    );
    expect(result.trait_subform).toBe("orientation");
  });

  it("rejette une sous-forme empruntée à un autre domaine que celui choisi", () => {
    // "orientation" appartient à spatial, pas à sociale — même si "sociale" est bien
    // une intelligence valide et présente, cette sous-forme ne lui appartient pas.
    const result = finalizeChallenge(
      { ...base, intelligences: ["sociale"], trait_subform: "orientation" },
      10,
    );
    expect(result.trait_subform).toBeNull();
  });
});

// Défis-projets + autonomie progressive (2026-08-12, analyse §27-28) : les filets
// déterministes resolveKind/resolveGuidanceLevel bornent ce que l'IA propose.
describe("resolveKind / resolveGuidanceLevel — filets déterministes", () => {
  const base = {
    title: "Défi test",
    description: "desc",
    steps: ["Étape 1"],
    materials: [] as string[],
  };

  it("kind absent → micro (défaut sûr)", () => {
    const result = finalizeChallenge(base, 10);
    expect(result.kind).toBe("micro");
  });

  it("projet refusé si moins de 3 étapes (anti-hallucination)", () => {
    const result = finalizeChallenge({ ...base, kind: "projet" }, 10);
    expect(result.kind).toBe("micro");
  });

  it("projet accepté si l'IA le demande ET ≥ 3 étapes", () => {
    const result = finalizeChallenge(
      { ...base, steps: ["Étape 1", "Étape 2", "Étape 3"], kind: "projet" },
      10,
    );
    expect(result.kind).toBe("projet");
  });

  it("guidance_level borné 1-5", () => {
    expect(finalizeChallenge({ ...base, guidance_level: 9 }, 10).guidance_level).toBe(5);
    expect(finalizeChallenge({ ...base, guidance_level: 0 }, 10).guidance_level).toBe(1);
    expect(finalizeChallenge({ ...base, guidance_level: 3 }, 10).guidance_level).toBe(3);
    expect(finalizeChallenge(base, 10).guidance_level).toBe(3);
  });

  it("retrait progressif : 1 cran de moins tous les 4 défis complétés dans le domaine (§28)", () => {
    expect(
      finalizeChallenge({ ...base, guidance_level: 4 }, 10, { completedInDomain: 4 })
        .guidance_level,
    ).toBe(3);
    expect(
      finalizeChallenge({ ...base, guidance_level: 4 }, 10, { completedInDomain: 8 })
        .guidance_level,
    ).toBe(2);
    expect(
      finalizeChallenge({ ...base, guidance_level: 1 }, 10, { completedInDomain: 12 })
        .guidance_level,
    ).toBe(1);
    expect(finalizeChallenge({ ...base, guidance_level: 3 }, 10).guidance_level).toBe(3);
  });
});

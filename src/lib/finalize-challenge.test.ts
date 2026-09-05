import { describe, it, expect } from "vitest";
import {
  finalizeChallenge,
  frenchGradeLevelForAge,
  getSecretTitle,
} from "@/lib/challenges.functions";

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

describe("frenchGradeLevelForAge & academic_grade_level fallback", () => {
  it("mappe correctement les âges 6 à 18+ vers les classes scolaires françaises", () => {
    expect(frenchGradeLevelForAge(null)).toBeNull();
    expect(frenchGradeLevelForAge(undefined)).toBeNull();
    expect(frenchGradeLevelForAge(5)).toBeNull();
    expect(frenchGradeLevelForAge(6)).toBe("CP");
    expect(frenchGradeLevelForAge(7)).toBe("CE1");
    expect(frenchGradeLevelForAge(8)).toBe("CE2");
    expect(frenchGradeLevelForAge(9)).toBe("CM1");
    expect(frenchGradeLevelForAge(10)).toBe("CM2");
    expect(frenchGradeLevelForAge(11)).toBe("6eme");
    expect(frenchGradeLevelForAge(12)).toBe("5eme");
    expect(frenchGradeLevelForAge(13)).toBe("4eme");
    expect(frenchGradeLevelForAge(14)).toBe("3eme");
    expect(frenchGradeLevelForAge(15)).toBe("2nde");
    expect(frenchGradeLevelForAge(16)).toBe("1ere");
    expect(frenchGradeLevelForAge(17)).toBe("Terminale");
    expect(frenchGradeLevelForAge(18)).toBe("Superieur");
    expect(frenchGradeLevelForAge(20)).toBe("Superieur");
  });

  it("utilise academic_grade_level si déjà fourni explicitement", () => {
    const result = finalizeChallenge(
      {
        title: "Test défi",
        description: "desc",
        steps: ["Étape 1"],
        materials: [],
        academic_domain: "sciences",
        academic_level_age: 13,
        academic_grade_level: "3eme",
      },
      10,
    );
    expect(result.academic_grade_level).toBe("3eme");
  });

  it("retombe automatiquement sur frenchGradeLevelForAge(academic_level_age) si academic_grade_level est omis", () => {
    const result = finalizeChallenge(
      {
        title: "Test défi",
        description: "desc",
        steps: ["Étape 1"],
        materials: [],
        academic_domain: "sciences",
        academic_level_age: 13,
      },
      10,
    );
    expect(result.academic_grade_level).toBe("4eme");
  });

  it("reste null si ni academic_grade_level ni academic_level_age ne sont fournis", () => {
    const result = finalizeChallenge(
      {
        title: "Test défi",
        description: "desc",
        steps: ["Étape 1"],
        materials: [],
      },
      10,
    );
    expect(result.academic_grade_level).toBeNull();
  });
});

describe("getSecretTitle — contextualisation par domaine et intelligences", () => {
  it("adapte l'accroche et le titre pour le langage / rhétorique", () => {
    const title1 = getSecretTitle({ academicDomain: "langage" });
    expect(title1.kicker).toBe("L'Avantage d'Auteur de Naya");
    expect(title1.title).toBe("Le Secret Rhétorique & d'Écriture");

    const title2 = getSecretTitle({ domain: "Expression & Langage", intelligences: ["linguistique"] });
    expect(title2.kicker).toBe("L'Avantage d'Auteur de Naya");
  });

  it("adapte pour les mathématiques et la logique", () => {
    const title = getSecretTitle({ academicDomain: "mathematiques", domain: "Logique" });
    expect(title.kicker).toBe("L'Avantage Analytique de Naya");
    expect(title.title).toBe("Le Secret Mathématique & Logique");
  });

  it("adapte pour l'entrepreneuriat et la stratégie", () => {
    const title = getSecretTitle({ academicDomain: "entrepreneuriale", domain: "Commerce & Stratégie" });
    expect(title.kicker).toBe("L'Avantage Stratégique de Naya");
    expect(title.title).toBe("La Règle d'Or Économique & Décision");
  });

  it("adapte pour l'artisanat et l'ingénierie", () => {
    const title = getSecretTitle({ academicDomain: "artisanale", domain: "Bricolage & Architecture" });
    expect(title.kicker).toBe("L'Avantage Concepteur de Naya");
    expect(title.title).toBe("Le Secret d'Ingénierie & d'Atelier");
  });

  it("adapte pour l'intelligence sociale, débat et citoyenneté", () => {
    const title = getSecretTitle({ academicDomain: "sociale", intelligences: ["interpersonnelle"] });
    expect(title.kicker).toBe("L'Avantage Citoyen de Naya");
    expect(title.title).toBe("Le Secret d'Influence & d'Intelligence Sociale");
  });

  it("adapte pour le sport, le corps et la motricité", () => {
    const title = getSecretTitle({ academicDomain: "corporelle", intelligences: ["kinesthésique"] });
    expect(title.kicker).toBe("L'Avantage Pratique de Naya");
    expect(title.title).toBe("Le Secret Biomécanique & Maîtrise du Geste");
  });

  it("adapte pour les arts visuels et le dessin", () => {
    const title = getSecretTitle({ academicDomain: "spatiale", domain: "Art & Création" });
    expect(title.kicker).toBe("L'Avantage Visuel de Naya");
    expect(title.title).toBe("Le Secret de Composition & Perspective");
  });

  it("adapte pour la nature et le vivant", () => {
    const title = getSecretTitle({ domain: "Nature & Écologie", intelligences: ["naturaliste"] });
    expect(title.kicker).toBe("L'Avantage Naturaliste de Naya");
    expect(title.title).toBe("Le Secret Écologique & du Vivant");
  });

  it("adapte pour l'histoire-géographie et le territoire", () => {
    const title = getSecretTitle({ academicSubject: "histoire_geo" });
    expect(title.kicker).toBe("L'Avantage Citoyen & Explorateur de Naya");
    expect(title.title).toBe("Le Secret d'Enquête Historique & Territoire");
  });

  it("retombe sur le secret scientifique par défaut", () => {
    const title = getSecretTitle({ academicDomain: "sciences", domain: "Sciences & Univers" });
    expect(title.kicker).toBe("L'Avantage Secret de Naya");
    expect(title.title).toBe("Le Savoir Scientifique Caché");
  });
});

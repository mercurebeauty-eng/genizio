import { describe, it, expect } from "vitest";
import {
  normalizeCountryKey,
  localMaterialsForCountry,
  buildContextualizationInstruction,
} from "@/lib/contextualization";
import {
  buildChallengePrompt,
  buildSingleChallengePrompt,
  INTELLIGENCES_FIELD_INSTRUCTION,
} from "@/lib/naya-prompts";

// Chantier 6 — double contextualisation local → global (analyse §30-31) + interdisciplinarité
// assumée (§32) : le défi part des matériaux et réalités locaux du pays, puis escalier vers
// outils technologiques et standards internationaux — jamais d'enfermement dans
// l'environnement immédiat. Mapping 100 % déterministe (0 IA).

describe("normalizeCountryKey — normalisation tolérante", () => {
  it("gère casse, accents et apostrophes (Côte d'Ivoire)", () => {
    expect(normalizeCountryKey("Côte d'Ivoire")).toBe("cote ivoire");
    expect(normalizeCountryKey("CÔTE D'IVOIRE")).toBe("cote ivoire");
  });

  it("retire qualificatifs et articles (République démocratique du Congo → congo)", () => {
    expect(normalizeCountryKey("République démocratique du Congo")).toBe("congo");
    expect(normalizeCountryKey("RD Congo")).toBe("congo");
  });

  it("préserve les noms composés (Burkina Faso)", () => {
    expect(normalizeCountryKey("Burkina Faso")).toBe("burkina faso");
  });
});

describe("localMaterialsForCountry — mapping pays → matériaux locaux (0 IA)", () => {
  it("Côte d'Ivoire : bois local, bambou, cacao — pas le fallback générique", () => {
    const materials = localMaterialsForCountry("Côte d'Ivoire");
    expect(materials).toContain("bois local (iroko, sipo)");
    expect(materials).toContain("coques de cacao");
    expect(materials).not.toEqual([
      "bambou",
      "bois local",
      "carton",
      "textile",
      "argile",
      "matériaux recyclés",
    ]);
  });

  it("Sénégal avec accent, Congo qualifié, pays inconnu et absence", () => {
    expect(localMaterialsForCountry("Sénégal")).toContain("coquillages");
    expect(localMaterialsForCountry("République démocratique du Congo")).toContain("raphia");
    expect(localMaterialsForCountry("Mauritanie")).toEqual([
      "bambou",
      "bois local",
      "carton",
      "textile",
      "argile",
      "matériaux recyclés",
    ]);
    expect(localMaterialsForCountry(null)).toEqual([
      "bambou",
      "bois local",
      "carton",
      "textile",
      "argile",
      "matériaux recyclés",
    ]);
  });
});

describe("buildContextualizationInstruction — escalier local → global", () => {
  it("nomme les matériaux du pays et interdit l'enfermement", () => {
    const instruction = buildContextualizationInstruction("Abidjan, Côte d'Ivoire");
    expect(instruction).toContain("bois local (iroko, sipo)");
    expect(instruction).toContain("ESCALIER");
    expect(instruction).toContain("Ne JAMAIS enfermer l'enfant dans son environnement immédiat");
    expect(instruction).toContain("le local est le point de départ, jamais le plafond");
  });

  it("reste fonctionnel sans pays (repli générique, jamais de vide)", () => {
    const instruction = buildContextualizationInstruction("non précisé");
    expect(instruction).toContain("bambou");
    expect(instruction).toContain("standard international");
  });
});

describe("injection dans les prompts — les défis générés portent la double contextualisation", () => {
  const baseInput = {
    count: 2,
    childName: "Awa",
    childAge: 9,
    location: "Abidjan, Côte d'Ivoire",
    interestsPayload: "Aime mesurer et comparer.",
    talentsJson: '{"logico_mathematique": 3}',
    completedSummary: "",
    progressionInstruction: "PROGRESSION MESURÉE : aucune mesure.",
    leastExplored: ["langage"],
    domainsText: "mathematiques, sciences",
    ignoredDomains: [],
    existingTitles: [],
    timePressureNote: "- Durée : honnête.",
    profileContextNote: "",
  };

  it("le prompt bulk ancre sur les matériaux du pays et l'escalier", () => {
    const p = buildChallengePrompt(baseInput);
    expect(p).toContain("bois local (iroko, sipo)");
    expect(p).toContain("Ne JAMAIS enfermer l'enfant dans son environnement immédiat");
    expect(p).toContain("standard international");
  });

  it("le prompt single porte aussi la contextualisation dans son contexte immédiat", () => {
    const p = buildSingleChallengePrompt({
      childName: "Awa",
      childAge: 9,
      profileLocation: "Dakar, Sénégal",
      interestsPayload: "x",
      talentsJson: "{}",
      completedSummary: "",
      progressionInstruction: "",
      existingTitles: [],
      timeAvailable: "15 min",
      immediateLocation: "Maison",
      domainInstruction: "- Domaine : sciences.",
      materialScopeInstruction: "- Matériel maison.",
      homeMaterialsUseLine: "",
      homeMaterialsLine: "",
      timePressureNote: "",
      profileContextNote: "",
    });
    expect(p).toContain("coquillages");
    expect(p).toContain("jamais le plafond");
  });

  it("l'interdisciplinarité projet est explicitement demandée (§32)", () => {
    expect(INTELLIGENCES_FIELD_INSTRUCTION).toContain("2 clés COMPLÉMENTAIRES");
    expect(INTELLIGENCES_FIELD_INSTRUCTION).toContain("l'interdisciplinarité est assumée");
    expect(INTELLIGENCES_FIELD_INSTRUCTION).toContain('kind "projet"');
  });
});

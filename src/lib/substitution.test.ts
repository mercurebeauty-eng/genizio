import { describe, it, expect } from "vitest";
import { buildSubstitutionPrompt, GENIZIO_PRINCIPLES } from "@/lib/naya-prompts";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";

// Mission de substitution (décision 2026-09-05) : un matériau de défi introuvable
// devient une mission d'ingénieur — identifier la FONCTION du matériau, chasser 3
// substituts, les tester sur un critère mesuré, conclure. La constitution de Naya
// n'interdit plus le matériau non garanti : au plus UN « matériau de conquête » par
// défi, dont l'absence déclenche cette mission.

describe("buildSubstitutionPrompt — la contrainte devient la mission", () => {
  const baseInput = {
    childName: "Awa",
    childAge: 9,
    location: "Abidjan, Côte d'Ivoire",
    originalTitle: "Le pont en bambou",
    originalDomain: "Ingénierie",
    originalObjective: "Construire un pont qui supporte 1 kg sur 30 cm.",
    originalMaterials: ["bambou", "ficelle"],
    missingMaterial: "bambou" as string | null,
    interestsPayload: "Aime construire.",
    talentsJson: '{"artisanale": 3}',
    timePressureNote: "- Durée : honnête.",
    existingTitles: ["Le pont en bambou"],
  };

  it("structure la mission en 4 temps : fonction, chasse, test mesuré, verdict", () => {
    const p = buildSubstitutionPrompt(baseInput);
    expect(p).toContain("IDENTIFIER");
    expect(p).toContain("CHERCHER");
    expect(p).toContain("TESTER");
    expect(p).toContain("CONCLURE");
    expect(p).toContain("on remplace une FONCTION, jamais un objet");
    expect(p).toContain("critère mesurable");
  });

  it("nomme le matériau manquant et exige la chasse SANS donner les réponses", () => {
    const p = buildSubstitutionPrompt(baseInput);
    expect(p).toContain("« bambou »");
    expect(p).toContain("ne liste jamais les substituts dans la description ou les étapes");
    expect(p).toContain("trouver LUI-MÊME au moins 3 substituts");
  });

  it("sans matériau précisé, bascule sur les matériaux du défi (jamais de vide)", () => {
    const p = buildSubstitutionPrompt({ ...baseInput, missingMaterial: null });
    expect(p).toContain("matériaux signalés introuvables : bambou, ficelle");
  });

  it("préserve l'objectif pédagogique d'origine et l'ancrage de l'enfant", () => {
    const p = buildSubstitutionPrompt(baseInput);
    expect(p).toContain("Construire un pont qui supporte 1 kg sur 30 cm.");
    expect(p).toContain("Aime construire.");
    expect(p).toContain("Abidjan, Côte d'Ivoire");
  });

  it("jamais de mention d'échec — l'enfant reçoit une mission fraîche", () => {
    const p = buildSubstitutionPrompt(baseInput);
    expect(p).toContain("Ne mentionne JAMAIS un échec, un abandon ou un défi « raté »");
  });

  it("porte les rubriques partagées de la constitution (même contrat que les autres générateurs)", () => {
    const p = buildSubstitutionPrompt(baseInput);
    expect(p).toContain('Pour "steps" (3 à 6 étapes)');
    expect(p).toContain("PRINCIPES DE GÉNÉRATION GÉNIZIO");
    expect(p).toContain("Réponds EXCLUSIVEMENT avec un objet JSON strict");
    expect(p).toContain('"kind": "micro"');
  });
});

describe("constitution — matériau de conquête (décision 2026-09-05)", () => {
  it("lève l'interdiction générale : au plus UN matériau non garanti, jamais coûteux", () => {
    expect(GENIZIO_PRINCIPLES).toContain("MATÉRIAU DE CONQUÊTE");
    expect(GENIZIO_PRINCIPLES).toContain("au plus UN matériau non garanti");
    expect(GENIZIO_PRINCIPLES).toContain("Jamais deux matériaux non garantis");
    // Le cœur du défi reste protégé : l'interdiction vise le CŒUR, plus le général.
    expect(GENIZIO_PRINCIPLES).toContain("CŒUR exige un matériel inaccessible ou coûteux");
    expect(GENIZIO_PRINCIPLES).not.toContain(
      "défi irréalisable concrètement, matériel inaccessible",
    );
  });
});

describe("formatPedagogicalIntention — mission de substitution", () => {
  it("traduit le rôle substitution en transformation positive (jamais un échec)", () => {
    const label = formatPedagogicalIntention({ challenge_role: "substitution" });
    expect(label).toContain("mission d'ingénieur");
    expect(label).toContain("substituts");
    expect(label?.toLowerCase()).not.toContain("échec");
    expect(label?.toLowerCase()).not.toContain("raté");
  });
});

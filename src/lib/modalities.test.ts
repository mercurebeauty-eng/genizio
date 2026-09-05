import { describe, it, expect } from "vitest";
import {
  PRESENTATION_MODES,
  resolveNextModality,
  canReformulate,
  resolveReformulationRoot,
  summarizeModalityAttempts,
  MAX_MODALITY_ATTEMPTS,
  type PresentationMode,
} from "@/lib/modalities.functions";
import { buildReformulationPrompt } from "@/lib/naya-prompts";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";
import { semanticRubricFor } from "@/lib/naya-verifier.functions";

// Chantier 3 — boucle de réévaluation des modalités d'apprentissage (analyse §22-26, §35) :
// un échec n'est jamais un verdict ; jusqu'à MAX_MODALITY_ATTEMPTS modalités testées avant
// toute conclusion. Le vocabulaire des modalités est fermé (contrat base + prompt).

describe("resolveNextModality — priorité par cause, borne et non-répétition", () => {
  it("METHOD_MISMATCH commence par la manipulation (contourner le scolaire)", () => {
    expect(resolveNextModality("METHOD_MISMATCH", [])).toBe("manipulation");
  });

  it("ne répète jamais une modalité déjà essayée", () => {
    expect(resolveNextModality("METHOD_MISMATCH", ["manipulation"])).toBe("demonstration");
    expect(resolveNextModality("METHOD_MISMATCH", ["manipulation", "demonstration"])).toBe(
      "situation_concrete",
    );
  });

  it("retourne null quand tout le socle de la cause a été essayé (fin de boucle)", () => {
    expect(
      resolveNextModality("METHOD_MISMATCH", [
        "manipulation",
        "demonstration",
        "situation_concrete",
      ]),
    ).toBeNull();
  });

  it("PERFORMANCE_ANXIETY privilégie histoire/conversation (sans pression)", () => {
    expect(resolveNextModality("PERFORMANCE_ANXIETY", [])).toBe("histoire");
    expect(resolveNextModality("PERFORMANCE_ANXIETY", ["histoire"])).toBe("conversation");
  });

  it("LACK_OF_ENGAGEMENT privilégie un projet (finalité immédiate)", () => {
    expect(resolveNextModality("LACK_OF_ENGAGEMENT", [])).toBe("projet");
  });

  it("CONCEPTUAL_GAP privilégie l'analogie puis la manipulation", () => {
    expect(resolveNextModality("CONCEPTUAL_GAP", [])).toBe("analogie");
    expect(resolveNextModality("CONCEPTUAL_GAP", ["analogie"])).toBe("manipulation");
  });

  it("cause absente ou inconnue → socle par défaut, jamais d'erreur", () => {
    expect(resolveNextModality(null, [])).toBe("image");
    expect(resolveNextModality("CAUSE_INCONNUE", [])).toBe("image");
    expect(resolveNextModality(undefined, ["image"])).toBe("histoire");
  });
});

describe("canReformulate — quelles causes ouvrent la boucle", () => {
  it("accepte les causes accommodables (la présentation peut être en cause)", () => {
    for (const cause of [
      "METHOD_MISMATCH",
      "PERFORMANCE_ANXIETY",
      "LACK_OF_ENGAGEMENT",
      "CONCEPTUAL_GAP",
    ]) {
      expect(canReformulate(cause)).toBe(true);
    }
  });

  it("refuse OTHER, les causes absentes et les inconnues", () => {
    expect(canReformulate("OTHER")).toBe(false);
    expect(canReformulate(null)).toBe(false);
    expect(canReformulate(undefined)).toBe(false);
    expect(canReformulate("N'IMPORTE_QUOI")).toBe(false);
  });
});

describe("resolveReformulationRoot — filiation par la racine (colonne reformulation_of)", () => {
  it("ancre la chaîne sur l'original quand le défi échoué est lui-même une reformulation", () => {
    expect(
      resolveReformulationRoot({ reformulation_of: "abc-123" }, "def-456"),
    ).toBe("abc-123");
  });

  it("le défi échoué EST l'original (pas de filiation) → il devient la racine", () => {
    expect(resolveReformulationRoot({ reformulation_of: null }, "def-456")).toBe("def-456");
    expect(resolveReformulationRoot(undefined, "def-456")).toBe("def-456");
  });
});

describe("summarizeModalityAttempts — comptage déterministe des tentatives", () => {
  it("compte total, en cours, réussies, échouées et les modalités essayées", () => {
    const summary = summarizeModalityAttempts([
      { presentationMode: "manipulation", status: "not_completed" },
      { presentationMode: "demonstration", status: "completed" },
      { presentationMode: "histoire", status: "todo" },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.pending).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.triedModes).toEqual(["manipulation", "demonstration", "histoire"]);
  });

  it("ignore les tentatives sans modalité lisible", () => {
    const summary = summarizeModalityAttempts([{ presentationMode: null, status: "completed" }]);
    expect(summary.total).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(summary.triedModes).toEqual([]);
  });

  it("le plafond de la boucle est bien 3", () => {
    expect(MAX_MODALITY_ATTEMPTS).toBe(3);
  });
});

describe("buildReformulationPrompt — même objectif, modalité imposée, défi frais", () => {
  const input = {
    childName: "Fanta",
    childAge: 9,
    location: "Abidjan, Côte d'Ivoire",
    originalTitle: "Les parts du gâteau",
    originalDomain: "Mathématiques",
    originalObjective: "Comprendre les fractions en partageant un gâteau.",
    presentationMode: "manipulation" as PresentationMode,
    interestsPayload: "Aime cuisiner.",
    talentsJson: '{"logico_mathematique": 2}',
    timePressureNote: "- Durée : donne une durée estimée honnête.",
    existingTitles: ["Les parts du gâteau"],
  };

  it("garde l'objectif pédagogique original et l'injecte tel quel", () => {
    const p = buildReformulationPrompt(input);
    expect(p).toContain("Comprendre les fractions en partageant un gâteau.");
    expect(p).toContain("MÊME objectif pédagogique");
    expect(p).toContain("jamais plus difficile");
  });

  it("impose la modalité avec sa sémantique (manipulation = gestes concrets)", () => {
    const p = buildReformulationPrompt(input);
    expect(p).toContain('"presentation_mode": "manipulation"');
    expect(p).toContain("l'enfant fait avec ses mains");
    expect(p).toContain("La modalité n'est pas décorative");
  });

  it("exige un défi frais : jamais de mention de l'échec précédent", () => {
    const p = buildReformulationPrompt(input);
    expect(p).toContain("un défi frais et stimulant");
    expect(p).toContain("Ne mentionne JAMAIS que ce défi est un second essai");
  });

  it("force kind micro et un guidage de soutien dans le JSON de sortie", () => {
    const p = buildReformulationPrompt(input);
    expect(p).toContain('"kind": "micro"');
    expect(p).toContain('"guidance_level": 4');
    expect(p).toContain('"domain": "Mathématiques"');
  });
});

describe("formatPedagogicalIntention — traduction parent de la reformulation", () => {
  it("traduit la filiation en phrase qualitative (jamais de chiffres ni d'échec)", () => {
    const text = formatPedagogicalIntention({
      reformulation_of: "abc",
      presentation_mode: "histoire",
    });
    expect(text).toContain("par une histoire cette fois");
    expect(text).not.toContain("échec");
    expect(text).not.toContain("raté");
  });

  it("traduit les autres intentions machine et masque un résidu JSON non reconnu", () => {
    expect(
      formatPedagogicalIntention({ challenge_role: "discriminant", target_cause: "METHOD_MISMATCH" }),
    ).toBeTruthy();
    expect(formatPedagogicalIntention({ pedagogical_context: '{"quelque_chose": 1}' })).toBeNull();
  });
});

describe("Le Loup — rubrique sémantique de la reformulation", () => {
  it("audite même objectif, modalité respectée et défi frais", () => {
    const rubric = semanticRubricFor("reformulation");
    expect(rubric).toContain("reformulation-meme-objectif");
    expect(rubric).toContain("reformulation-modalite");
    expect(rubric).toContain("reformulation-fraiche");
  });
});

describe("PRESENTATION_MODES — vocabulaire fermé partagé", () => {
  it("expose exactement les 9 modalités du contrat base", () => {
    expect(PRESENTATION_MODES).toEqual([
      "texte",
      "image",
      "demonstration",
      "manipulation",
      "histoire",
      "analogie",
      "conversation",
      "projet",
      "situation_concrete",
    ]);
  });
});

describe("chaîne de reformulation — accumulation des tentatives sur la racine (P0 review 2026-08-12)", () => {
  it("la 2e reformulation voit la 1re : modalité différente, attempt 2", () => {
    const attempts = [{ presentationMode: "manipulation" as const, status: "not_completed" }];
    const summary = summarizeModalityAttempts(attempts);
    expect(summary.total).toBe(1);
    expect(resolveNextModality("METHOD_MISMATCH", summary.triedModes)).toBe("demonstration");
    expect(summary.total + 1).toBe(2); // modality_attempt écrit sur la nouvelle reformulation
  });

  it("3 tentatives échouées → boucle bornée (MAX_MODALITY_ATTEMPTS) et plus de modalité", () => {
    const attempts = [
      { presentationMode: "manipulation" as const, status: "not_completed" },
      { presentationMode: "demonstration" as const, status: "not_completed" },
      { presentationMode: "situation_concrete" as const, status: "not_completed" },
    ];
    const summary = summarizeModalityAttempts(attempts);
    expect(summary.total).toBe(3);
    expect(summary.total >= MAX_MODALITY_ATTEMPTS).toBe(true);
    expect(resolveNextModality("METHOD_MISMATCH", summary.triedModes)).toBeNull();
  });

  it("une tentative en cours gèle la boucle (REFORMULATION_PENDING)", () => {
    const attempts = [
      { presentationMode: "manipulation" as const, status: "todo" },
      { presentationMode: "demonstration" as const, status: "not_completed" },
    ];
    const summary = summarizeModalityAttempts(attempts);
    expect(summary.pending).toBe(1);
  });
});

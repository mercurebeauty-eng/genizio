import { describe, it, expect } from "vitest";
import {
  DISCOVERY_SOURCES,
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_DOMAINS,
  DISCOVERY_DOMAIN_LABELS,
  DISCOVERY_DIFFICULTIES,
  DISCOVERY_AUTONOMY_LEVELS,
  DISCOVERY_AUTONOMY_LABELS,
  DISCOVERY_OUTCOMES,
  DISCOVERY_OUTCOME_LABELS,
  CreateDiscoveryTraceSchema,
  GetDiscoveryTracesSchema,
  AddMentorFeedbackSchema,
} from "@/lib/discovery.functions";
import { buildDiscoveryAnalysisPrompt } from "@/lib/naya-prompts";

describe("Espace Découverte — Vocabulaires & Constantes", () => {
  it("contient les 5 sources d'exploration réparties en 2 pôles", () => {
    expect(DISCOVERY_SOURCES).toEqual([
      "self_chosen",
      "found_external",
      "open_sandbox",
      "fablab_marathon",
      "projet_collectif",
    ]);
    expect(DISCOVERY_SOURCE_LABELS.self_chosen.label).toBe("Je choisis");
    expect(DISCOVERY_SOURCE_LABELS.found_external.label).toBe("Je trouve");
    expect(DISCOVERY_SOURCE_LABELS.open_sandbox.label).toBe("Je tente");
    expect(DISCOVERY_SOURCE_LABELS.fablab_marathon.label).toBe("Fab Lab");
    expect(DISCOVERY_SOURCE_LABELS.projet_collectif.label).toBe("Projet d'équipe");

    expect(DISCOVERY_SOURCE_LABELS.self_chosen.pole).toBe("individual");
    expect(DISCOVERY_SOURCE_LABELS.found_external.pole).toBe("individual");
    expect(DISCOVERY_SOURCE_LABELS.open_sandbox.pole).toBe("individual");
    expect(DISCOVERY_SOURCE_LABELS.fablab_marathon.pole).toBe("collective");
    expect(DISCOVERY_SOURCE_LABELS.projet_collectif.pole).toBe("collective");
  });

  it("définit les domaines avec leurs libellés", () => {
    expect(DISCOVERY_DOMAINS.length).toBeGreaterThanOrEqual(8);
    for (const domain of DISCOVERY_DOMAINS) {
      expect(DISCOVERY_DOMAIN_LABELS[domain]).toBeDefined();
      expect(typeof DISCOVERY_DOMAIN_LABELS[domain]).toBe("string");
    }
  });

  it("définit les niveaux d'autonomie et les statuts de résultat", () => {
    expect(DISCOVERY_AUTONOMY_LEVELS).toEqual(["totalement_seul", "peu_d_aide", "accompagne"]);
    expect(DISCOVERY_AUTONOMY_LABELS.totalement_seul).toBe("Totalement autonome");

    expect(DISCOVERY_OUTCOMES).toEqual([
      "fonctionnel",
      "partiel",
      "en_cours",
      "echec_enrichissant",
    ]);
    expect(DISCOVERY_OUTCOME_LABELS.fonctionnel.tone).toBe("success");
    expect(DISCOVERY_OUTCOME_LABELS.echec_enrichissant.tone).toBe("warning");
  });
});

describe("Espace Découverte — Schémas de Validation Zod", () => {
  const validUUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("valide une création de trace complète", () => {
    const validData = {
      childId: validUUID,
      sourceType: "self_chosen" as const,
      title: "Construction d'un petit pont en bâtonnets",
      description: "J'ai voulu fabriquer un pont capable de supporter 3 petites voitures.",
      domain: "construction",
      perceivedDifficulty: "eleve" as const,
      attemptsCount: 4,
      durationMinutes: 80,
      autonomyLevel: "totalement_seul" as const,
      helpContext: "Aucune aide demandée",
      strategyUsed: "Expérimentation successive et renforcement des piliers",
      outcomeStatus: "fonctionnel" as const,
      proofImageUrl: "https://example.com/pont.jpg",
      nayaDialogue: [
        {
          question: "Qu'as-tu fait aujourd'hui ?",
          answer: "Un pont suspendu avec des ficelles et bâtonnets.",
        },
        { question: "Où as-tu bloqué ?", answer: "Au début le milieu s'effondrait sous le poids." },
      ],
    };

    const parsed = CreateDiscoveryTraceSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("rejette les titres trop courts ou descriptions vides", () => {
    const invalidData = {
      childId: validUUID,
      sourceType: "self_chosen" as const,
      title: "A",
      description: "",
      domain: "maths",
      outcomeStatus: "fonctionnel" as const,
    };

    const parsed = CreateDiscoveryTraceSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it("valide l'ajout de feedback mentor", () => {
    const validFeedback = {
      traceId: validUUID,
      notes:
        "Excellente initiative observée lors de notre échange. Amadou a démontré une belle persévérance.",
    };
    expect(AddMentorFeedbackSchema.safeParse(validFeedback).success).toBe(true);

    const invalidFeedback = {
      traceId: "not-a-uuid",
      notes: "",
    };
    expect(AddMentorFeedbackSchema.safeParse(invalidFeedback).success).toBe(false);
  });
});

describe("Espace Découverte — Prompt Naya", () => {
  it("génère un prompt complet incluant les verbatims et métriques", () => {
    const prompt = buildDiscoveryAnalysisPrompt({
      childName: "Aminata",
      childAge: 10,
      talentsJson: JSON.stringify({ logique: 6, creativite: 8 }),
      trace: {
        sourceType: "self_chosen",
        title: "Calcul mental inversé",
        description: "Elle a inventé un jeu pour retrouver des nombres mystères.",
        domain: "maths",
        perceivedDifficulty: "moyen",
        attemptsCount: 2,
        durationMinutes: 45,
        autonomyLevel: "totalement_seul",
        outcomeStatus: "fonctionnel",
        dialogue: [
          {
            question: "Pourquoi as-tu choisi ce jeu ?",
            answer: "Parce que je voulais battre mon frère.",
          },
        ],
      },
    });

    expect(prompt).toContain("Aminata");
    expect(prompt).toContain("Calcul mental inversé");
    expect(prompt).toContain("self_chosen");
    expect(prompt).toContain("anomalie positive");
    expect(prompt).toContain("initiative_score");
    expect(prompt).toContain("perseverance_score");
  });
});

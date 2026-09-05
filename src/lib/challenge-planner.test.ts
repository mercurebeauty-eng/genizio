import { describe, it, expect } from "vitest";
import { planChallengeMissions, determineGuidanceLevel } from "./challenge-planner";
import { buildChildDevelopmentState } from "./context-engine";

describe("Challenge Mission Planner — planChallengeMissions", () => {
  it("priorise la question de l'enfant en mission 1", () => {
    const state = buildChildDevelopmentState({
      child: { id: "1", name: "Ibrahim", age: 9 },
      latestChildQuestion: "Comment fabriquer une pile avec des citrons ?",
    });

    const missions = planChallengeMissions(state, 4);
    expect(missions).toHaveLength(4);
    expect(missions[0].intent).toBe("child_question_action");
    expect(missions[0].actionHook).toBe("Comment fabriquer une pile avec des citrons ?");
  });

  it("programme une mission collective_peak_solo pour un pic non consolidé", () => {
    const state = buildChildDevelopmentState({
      child: { id: "2", name: "Aïcha", age: 10 },
      progressionTargets: [
        {
          domain: "Architecture",
          lastLevelAge: 8,
          targetLevelAge: 11,
          hasUnconsolidatedCollectivePeak: true,
        },
      ],
    });

    const missions = planChallengeMissions(state, 4);
    const peakMission = missions.find((m) => m.intent === "collective_peak_solo");
    expect(peakMission).toBeDefined();
    expect(peakMission?.targetDomain).toBe("Architecture");
    expect(peakMission?.format).toBe("constructive_project");
  });

  it("intègre une vérification d'hypothèse active et une progression ZPD", () => {
    const state = buildChildDevelopmentState({
      child: { id: "3", name: "Moussa", age: 11 },
      aspirationHypotheses: {
        byLabel: {
          Électricité: {
            label: "Électricité",
            status: "exploring",
            engagement: 0.5,
            bridge: {
              talentKeys: ["logico_mathematique", "artisanale"],
              domains: ["Sciences"],
              skillsHint: ["câbler"],
              worldAnchor: "Atelier",
            },
          } as any,
        },
      } as any,
      progressionTargets: [
        {
          domain: "Tech & IA",
          lastLevelAge: 10,
          targetLevelAge: 12,
          hasUnconsolidatedCollectivePeak: false,
        },
      ],
    });

    const missions = planChallengeMissions(state, 4);
    expect(missions.some((m) => m.intent === "hypothesis_verification")).toBe(true);
    expect(missions.some((m) => m.intent === "zpd_progression")).toBe(true);
  });

  it("évite les domaines ignorés ou en fatigue", () => {
    const state = buildChildDevelopmentState({
      child: { id: "4", name: "Salif", age: 7 },
      staleChallenges: [{ domain: "Sport" }, { domain: "Sport" }],
    });

    const missions = planChallengeMissions(state, 4);
    for (const m of missions) {
      expect(m.targetDomain).not.toBe("Sport");
    }
  });
});

describe("Challenge Mission Planner — planSingleChallengeMission", () => {
  it("respecte le domaine forcé par le parent et cible la ZPD si elle existe", async () => {
    const { planSingleChallengeMission } = await import("./challenge-planner");
    const state = buildChildDevelopmentState({
      child: { id: "5", name: "Aminata", age: 8 },
      progressionTargets: [
        {
          domain: "Sciences",
          lastLevelAge: 7,
          targetLevelAge: 9,
        },
      ],
    });

    const mission = planSingleChallengeMission(state, { forcedDomain: "Sciences" });
    expect(mission.targetDomain).toBe("Sciences");
    expect(mission.intent).toBe("zpd_progression");
    expect(mission.format).toBeDefined();
    expect(["spark_micro", "investigation", "constructive_project"]).toContain(mission.format);
  });

  it("intègre les matériaux maison spécifiques fournis par le parent", async () => {
    const { planSingleChallengeMission } = await import("./challenge-planner");
    const state = buildChildDevelopmentState({
      child: { id: "6", name: "Ousmane", age: 10 },
    });

    const mission = planSingleChallengeMission(state, {
      forcedDomain: "Artisanat & DIY",
      homeMaterials: "bouteille en plastique, scotch, ficelle",
    });

    expect(mission.targetDomain).toBe("Artisanat & DIY");
    expect(mission.actionHook).toBe("bouteille en plastique, scotch, ficelle");
    expect(mission.pedagogicalBrief).toContain("bouteille en plastique");
  });
});

describe("Pipeline E2E — Context Engine -> Planner -> Layered Prompt -> Schema Parsing", () => {
  it("valide l'intégration complète de bout en bout", async () => {
    const { buildChildDevelopmentState } = await import("./context-engine");
    const { planChallengeMissions } = await import("./challenge-planner");
    const { buildLayeredChallengePrompt } = await import("./naya-prompts");
    const { ChallengeSchema } = await import("./challenges.functions");

    // 1. Synthèse de l'état
    const state = buildChildDevelopmentState({
      child: {
        id: "child-e2e-1",
        name: "Ibrahim",
        age: 9,
        city: "Abidjan",
        country: "Côte d'Ivoire",
        talents: { artisanale: 4, logico_mathematique: 3, creative: 1 },
        interests: ["construction", "robotique"],
      },
      completedChallenges: [
        {
          id: "c-1",
          title: "Circuit en papier",
          domain: "Tech & IA",
          ai_observations: "Excellente curiosité sur les connexions électriques.",
        },
      ],
      progressionTargets: [
        {
          domain: "Tech & IA",
          lastLevelAge: 9,
          targetLevelAge: 11,
          hasUnconsolidatedCollectivePeak: true,
        },
      ],
      activeHypotheses: [
        {
          id: "h-1",
          type: "aspiration",
          statement: "Affinité forte pour la mécatronique",
          confidence: 0.85,
          status: "exploring",
          targetDomain: "Tech & IA",
        },
      ],
      latestChildQuestion: "Comment une pile fait bouger un petit moteur ?",
      existingTitles: ["Circuit en papier"],
    });

    // 2. Planification des missions
    const missions = planChallengeMissions(state, 4);
    expect(missions).toHaveLength(4);
    expect(missions[0].intent).toBe("child_question_action");
    expect(missions[1].intent).toBe("collective_peak_solo");

    // 3. Prompt multicouche
    const prompt = buildLayeredChallengePrompt(state, missions);
    expect(prompt).toContain("COUCHE 1 — PRINCIPES PÉDAGOGIQUES");
    expect(prompt).toContain("COUCHE 2 — ÉTAT DE COMPRÉHENSION DE L'ENFANT");
    expect(prompt).toContain("COUCHE 3 — FEUILLE DE ROUTE DES MISSIONS PÉDAGOGIQUES DU JOUR");
    expect(prompt).toContain("COUCHE 4 — CONTRAT D'EXÉCUTION & ANCRAGE TERRAIN");
    expect(prompt).toContain("COUCHE 5 — FORMAT DE SORTIE STRICT (JSON)");

    // 4. Mock LLM Response format Couche 5
    const mockChallenge = {
      domain: "Tech & IA",
      title: "Le mini-ventilateur à moteur",
      description: "Fabrique un petit ventilateur avec une pile et un bouchon.",
      duration: "25 min",
      steps: ["Dénuder les fils", "Fixer l'hélice", "Tester la rotation"],
      materials: ["Pile 1.5V", "Petit moteur", "Bouchon", "Carton"],
      material_tags: ["pile", "moteur", "carton"],
      pedagogical_context: "Vérifier la compréhension de la boucle électrique en autonomie.",
      intelligences: ["artisanale", "logico_mathematique"],
      trait_subform: "bricolage",
      requires_supervision: false,
      supervision_warning: null,
      difficulty: "moyen",
      proof_mode: "photo",
      academic_domain: "sciences",
      academic_level_age: 11,
      academic_reference_note: "Électricité élémentaire",
      academic_secret: "Le courant électrique génère un champ magnétique qui fait tourner l'axe.",
      kind: "micro",
      guidance_level: 3,
    };

    // 5. Validation par ChallengeSchema
    const parsed = ChallengeSchema.parse(mockChallenge);
    expect(parsed.title).toBe("Le mini-ventilateur à moteur");
    expect(parsed.academic_level_age).toBe(11);
    expect(parsed.academic_domain).toBe("sciences");
    expect(parsed.proof_mode).toBe("photo");
  });

  describe("determineGuidanceLevel & guidanceLevel déterministe", () => {
    it("calcule un étayage élevé (4-5) pour les jeunes enfants", () => {
      expect(determineGuidanceLevel({ age: 6 })).toBe(5);
      expect(determineGuidanceLevel({ age: 6, completedInDomain: 3 })).toBe(4);
      expect(determineGuidanceLevel({ age: 7, format: "spark_micro" })).toBe(5);
    });

    it("calcule un étayage jalonné (3) pour la tranche d'âge intermédiaire 8-11 ans", () => {
      expect(determineGuidanceLevel({ age: 9 })).toBe(3);
      expect(determineGuidanceLevel({ age: 10, format: "constructive_project" })).toBe(2);
      expect(determineGuidanceLevel({ age: 9, completedInDomain: 6 })).toBe(1);
    });

    it("calcule une autonomie forte (1-2) pour les grands ou après expérience", () => {
      expect(determineGuidanceLevel({ age: 14 })).toBe(2);
      expect(determineGuidanceLevel({ age: 14, completedInDomain: 3 })).toBe(1);
    });

    it("injecte guidanceLevel dans chaque mission de planChallengeMissions", () => {
      const state = buildChildDevelopmentState({
        child: { id: "1", name: "Ibrahim", age: 12 },
        latestChildQuestion: "Comment pousse une plante ?",
      });

      const missions = planChallengeMissions(state, 4);
      for (const m of missions) {
        expect(m.guidanceLevel).toBeDefined();
        expect(m.guidanceLevel).toBeGreaterThanOrEqual(1);
        expect(m.guidanceLevel).toBeLessThanOrEqual(5);
      }
    });

    it("ajuste guidanceLevel dans planSingleChallengeMission selon l'historique de domaine", async () => {
      const { planSingleChallengeMission } = await import("./challenge-planner");
      const state = buildChildDevelopmentState({
        child: { id: "2", name: "Aïcha", age: 7 },
        completedChallenges: [
          { id: "c1", title: "Défi 1", domain: "Sciences" },
          { id: "c2", title: "Défi 2", domain: "Sciences" },
          { id: "c3", title: "Défi 3", domain: "Sciences" },
        ],
      });

      const mission = planSingleChallengeMission(state, { forcedDomain: "Sciences" });
      expect(mission.guidanceLevel).toBe(4); // 5 - 1 (3 défis complétés) = 4
    });
  });
});

import { describe, it, expect } from "vitest";
import { planChallengeMissions } from "./challenge-planner";
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

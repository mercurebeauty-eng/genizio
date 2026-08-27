import { describe, it, expect } from "vitest";
import {
  computeParticipantEvidence,
  evaluateTeamSynergy,
  computeRolePlasticity,
  formatCollectiveInsightForNaya,
  type CollectiveProjectTrace,
  type CollectiveParticipantContribution
} from "./collective-capability";

describe("collective-capability engine", () => {
  const baseProject: CollectiveProjectTrace = {
    projectId: "proj-1",
    domain: "sciences",
    targetLevelAge: 10,
    outcomeStatus: "completed",
    occurredAt: "2026-08-27T12:00:00Z",
    hasProofImage: true,
  };

  describe("computeParticipantEvidence", () => {
    it("should compute proportional demonstrated level for a 'pilier'", () => {
      const contrib: CollectiveParticipantContribution = {
        childId: "child-1",
        role: "conception",
        implication: "pilier", // alpha = 0.85
        supervisorTags: []
      };
      
      const evidence = computeParticipantEvidence(baseProject, contrib, 6);
      
      // 6 + 0.85 * (10 - 6) = 6 + 3.4 = 9.4
      expect(evidence.demonstratedLevelAge).toBe(9.4);
      expect(evidence.autonomyWeight).toBe(0.8); // Base boosted by pilier
      expect(evidence.perseveranceWeight).toBe(0.5);
      expect(evidence.metacognitiveWeight).toBe(0.5); // Derived from collabScore
      expect(evidence.proofWeight).toBe(1.0);
    });

    it("should lower demonstrated level for an 'observateur'", () => {
      const contrib: CollectiveParticipantContribution = {
        childId: "child-1",
        role: "fabrication",
        implication: "observateur", // alpha = 0.15
        supervisorTags: []
      };
      
      const evidence = computeParticipantEvidence(baseProject, contrib, 6);
      
      // 6 + 0.15 * 4 = 6.6
      expect(evidence.demonstratedLevelAge).toBe(6.6);
      expect(evidence.autonomyWeight).toBe(0.5); // Base
    });

    it("should attribute alpha=0 demonstrated level if participation is 'present_passive' or 'absent'", () => {
      const passiveContrib: CollectiveParticipantContribution = {
        childId: "child-1",
        role: "fabrication",
        implication: "pilier", // Même s'il était listé comme pilier
        participationStatus: "present_passive",
        supervisorTags: []
      };
      
      const evidence = computeParticipantEvidence(baseProject, passiveContrib, 6);
      
      // demonstratedLevelAge reste le niveau stable (6), aucune appropriation indue du projet (10)
      expect(evidence.demonstratedLevelAge).toBe(6);
    });

    it("should process supervisor positive/negative tags", () => {
      const contrib: CollectiveParticipantContribution = {
        childId: "child-1",
        role: "programmation",
        implication: "contributeur_actif",
        supervisorTags: [
          { tag: "+Initiative", impact: "positive", dimension: "autonomie" },
          { tag: "+Aide Pair", impact: "positive", dimension: "collaboration" },
          { tag: "-Décrochage", impact: "negative", dimension: "perseverance" }
        ]
      };
      
      const evidence = computeParticipantEvidence(baseProject, contrib, 8);
      // 8 + 0.60 * 2 = 9.2
      expect(evidence.demonstratedLevelAge).toBe(9.2);
      
      // autonomie: 0.5 + 0.2 = 0.7
      expect(evidence.autonomyWeight).toBe(0.7);
      // collab (metacognitiveWeight): 0.5 + 0.2 = 0.7
      expect(evidence.metacognitiveWeight).toBe(0.7);
      // perseverance: 0.5 - 0.2 = 0.3
      expect(evidence.perseveranceWeight).toBe(0.3);
    });

    it("should not decrease demonstrated level if project level is below stable level", () => {
      // Child stable is 12, project is 8.
      const projectBelow: CollectiveProjectTrace = { ...baseProject, targetLevelAge: 8 };
      const contrib: CollectiveParticipantContribution = {
        childId: "child-1", role: "conception", implication: "pilier", supervisorTags: []
      };
      const evidence = computeParticipantEvidence(projectBelow, contrib, 12);
      // It should just return targetLevelAge as minimum demonstrated
      expect(evidence.demonstratedLevelAge).toBe(8);
    });
  });

  describe("evaluateTeamSynergy", () => {
    it("should return 1.0 for a team of 1", () => {
      expect(evaluateTeamSynergy([{ childId: "1", role: "conception", implication: "pilier", supervisorTags: [] }])).toBe(1.0);
    });

    it("should return high synergy for diverse roles", () => {
      const team: CollectiveParticipantContribution[] = [
        { childId: "1", role: "conception", implication: "pilier", supervisorTags: [] },
        { childId: "2", role: "programmation", implication: "contributeur_actif", supervisorTags: [] },
        { childId: "3", role: "coordination", implication: "contributeur_actif", supervisorTags: [] },
        { childId: "4", role: "fabrication", implication: "apprenti", supervisorTags: [] },
      ];
      // 4 distinct roles for 4 people -> maximum entropy
      expect(evaluateTeamSynergy(team)).toBe(1.0);
    });

    it("should return lower synergy if everyone does the same role", () => {
      const team: CollectiveParticipantContribution[] = [
        { childId: "1", role: "programmation", implication: "contributeur_actif", supervisorTags: [] },
        { childId: "2", role: "programmation", implication: "contributeur_actif", supervisorTags: [] },
        { childId: "3", role: "programmation", implication: "contributeur_actif", supervisorTags: [] },
      ];
      // 1 role for 3 people -> 0 entropy
      expect(evaluateTeamSynergy(team)).toBe(0.0);
    });
  });

  describe("computeRolePlasticity", () => {
    it("should return 0.5 for insufficient history", () => {
      expect(computeRolePlasticity(["conception"])).toBe(0.5);
    });

    it("should return 0 for a child stuck in one role", () => {
      expect(computeRolePlasticity(["programmation", "programmation", "programmation"])).toBe(0);
    });

    it("should return 1.0 for a highly versatile child", () => {
      // Tested on 4 different roles
      expect(computeRolePlasticity(["conception", "programmation", "fabrication", "coordination"])).toBe(1.0);
    });
  });

  describe("formatCollectiveInsightForNaya", () => {
    it("should output text when demonstrated level is well above stable", () => {
      const text = formatCollectiveInsightForNaya("robotique", 9.4, 6);
      expect(text).toContain("L'enfant a récemment démontré un potentiel latent en robotique");
      expect(text).toContain("niveau exploré : ~9 ans");
      expect(text).toContain("estimé à 6 ans");
    });

    it("should return empty if demonstrated level is equal to stable", () => {
      const text = formatCollectiveInsightForNaya("robotique", 6, 6);
      expect(text).toBe("");
    });
  });
});

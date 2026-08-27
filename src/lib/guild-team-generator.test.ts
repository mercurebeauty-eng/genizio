import { describe, it, expect } from "vitest";
import { 
  getPrimaryTalent, 
  analyzeGuildComplementarity, 
  buildGuildCollectiveChallengePrompt 
} from "./guild-team-generator";

describe("guild-team-generator", () => {
  describe("getPrimaryTalent", () => {
    it("retourne la clé du talent le plus élevé", () => {
      const talents = {
        logico_mathematique: 80,
        spatial: 60,
        sociale: 95
      };
      expect(getPrimaryTalent(talents)).toBe("sociale");
    });
  });

  describe("analyzeGuildComplementarity", () => {
    it("calcule correctement le score de synergie pour une équipe diversifiée", () => {
      const members = [
        { id: "1", name: "Alice", talents: { logico_mathematique: 90, spatial: 20 } },
        { id: "2", name: "Bob", talents: { spatial: 90, logico_mathematique: 20 } },
        { id: "3", name: "Charlie", talents: { sociale: 90, spatial: 20 } }
      ];

      const analysis = analyzeGuildComplementarity("batisseurs", members);
      expect(analysis.members).toHaveLength(3);
      expect(analysis.members[0].primaryTalentKey).toBe("logico_mathematique");
      expect(analysis.synergyScore).toBe(1.0); // 3 talents primaires différents pour 3 membres
      expect(analysis.missingTalents).toContain("creative");
    });

    it("détecte une faible synergie (profils clonés)", () => {
      const members = [
        { id: "1", name: "Alice", talents: { spatial: 90 } },
        { id: "2", name: "Bob", talents: { spatial: 85 } }
      ];

      const analysis = analyzeGuildComplementarity("batisseurs", members);
      expect(analysis.synergyScore).toBe(0.5); // 1 talent unique / 2 membres = 0.5
    });
  });

  describe("buildGuildCollectiveChallengePrompt", () => {
    it("génère un prompt formaté avec les rôles", () => {
      const analysis = {
        guildKey: "inventeurs",
        members: [
          { id: "1", name: "Léo", talents: {}, primaryTalentKey: "logico_mathematique" },
          { id: "2", name: "Mia", talents: {}, primaryTalentKey: "corporelle" }
        ],
        missingTalents: [],
        synergyScore: 1.0
      };

      const prompt = buildGuildCollectiveChallengePrompt(analysis);
      expect(prompt).toContain("Inventeurs");
      expect(prompt).toContain("Léo (Atout principal : 🧠 Logique)");
      expect(prompt).toContain("Mia (Atout principal : 🏃 Corporelle)");
      expect(prompt).toContain("Interdépendance Positive");
    });
  });
});

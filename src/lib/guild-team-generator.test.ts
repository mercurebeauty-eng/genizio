import { describe, it, expect } from "vitest";
import {
  getPrimaryTalent,
  analyzeGuildComplementarity,
  buildGuildCollectiveChallengePrompt,
  analyzeEscouadeCompatibility,
  rankSquadCandidates,
  buildHackathonTeams,
  type MobilizationAwareTeamMember,
} from "./guild-team-generator";
import type { MobilizationConditionHypothesis } from "./mobilization-conditions";

describe("guild-team-generator", () => {
  describe("getPrimaryTalent", () => {
    it("retourne la clé du talent le plus élevé", () => {
      const talents = {
        logico_mathematique: 80,
        spatial: 60,
        sociale: 95,
      };
      expect(getPrimaryTalent(talents)).toBe("sociale");
    });
  });

  describe("analyzeGuildComplementarity", () => {
    it("calcule correctement le score de synergie pour une équipe diversifiée", () => {
      const members: Array<{ id: string; name: string; talents: Record<string, number> }> = [
        { id: "1", name: "Alice", talents: { logico_mathematique: 90, spatial: 20 } },
        { id: "2", name: "Bob", talents: { spatial: 90, logico_mathematique: 20 } },
        { id: "3", name: "Charlie", talents: { sociale: 90, spatial: 20 } },
      ];

      const analysis = analyzeGuildComplementarity("batisseurs", members);
      expect(analysis.members).toHaveLength(3);
      expect(analysis.members[0].primaryTalentKey).toBe("logico_mathematique");
      expect(analysis.synergyScore).toBe(1.0); // 3 talents primaires différents pour 3 membres
      expect(analysis.missingTalents).toContain("creative");
    });

    it("détecte une faible synergie (profils clonés)", () => {
      const members: Array<{ id: string; name: string; talents: Record<string, number> }> = [
        { id: "1", name: "Alice", talents: { spatial: 90 } },
        { id: "2", name: "Bob", talents: { spatial: 85 } },
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
          { id: "2", name: "Mia", talents: {}, primaryTalentKey: "corporelle" },
        ],
        missingTalents: [],
        synergyScore: 1.0,
      };

      const prompt = buildGuildCollectiveChallengePrompt(analysis);
      expect(prompt).toContain("Inventeurs");
      expect(prompt).toContain("Léo (Atout principal : 🧠 Logique)");
      expect(prompt).toContain("Mia (Atout principal : 🏃 Corporelle)");
      expect(prompt).toContain("Interdépendance Positive");
    });
  });
});

describe("analyzeEscouadeCompatibility", () => {
  it("retourne 1.0 s'il n'y a aucun conflit", () => {
    const members: MobilizationAwareTeamMember[] = [
      { id: "1", name: "A", talents: {}, primaryTalentKey: "logique", mobilizationInsights: [] },
    ];
    const report = analyzeEscouadeCompatibility(members, 3, "explicit_structured");
    expect(report.compatibilityScore).toBe(1.0);
    expect(report.warnings).toHaveLength(0);
  });

  it("détecte un conflit de taille de groupe", () => {
    const members: MobilizationAwareTeamMember[] = [
      {
        id: "1",
        name: "A",
        talents: {},
        primaryTalentKey: "logique",
        mobilizationInsights: [
          {
            factor: "group_size",
            optimalContext: "small_group",
            observedTendency: "",
            confidence: 1,
            parentInsightText: "",
            mentorActionableTip: "",
            supportingExperiencesCount: 2,
          },
        ],
      },
    ];
    const report = analyzeEscouadeCompatibility(members, 5, "explicit_structured");
    expect(report.compatibilityScore).toBe(0.0);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0].factor).toBe("group_size");
  });
});

describe("rankSquadCandidates", () => {
  it("priorise les relations connues si peer_familiarity l'exige", () => {
    const candidates: MobilizationAwareTeamMember[] = [
      { id: "c1", name: "Unknown", talents: {}, primaryTalentKey: "logique" },
      { id: "c2", name: "Known", talents: {}, primaryTalentKey: "logique" },
    ];

    const childMob: MobilizationConditionHypothesis[] = [
      {
        factor: "peer_familiarity",
        optimalContext: "peers_familiar",
        observedTendency: "",
        confidence: 1,
        parentInsightText: "",
        mentorActionableTip: "",
        supportingExperiencesCount: 2,
      },
    ];

    const ranked = rankSquadCandidates(childMob, candidates, ["c2"], "synergique");
    expect(ranked[0].id).toBe("c2");
  });
});

describe("buildHackathonTeams (Phase 4 — événements collectifs)", () => {
  const mkMember = (id: string, primaryTalentKey: string, score = 80) => ({
    id,
    name: `Enfant ${id}`,
    talents: { [primaryTalentKey]: score },
    primaryTalentKey,
  });

  const bassin = [
    mkMember("c1", "logico_mathematique"),
    mkMember("c2", "logico_mathematique"),
    mkMember("c3", "logico_mathematique"),
    mkMember("c4", "spatial"),
    mkMember("c5", "spatial"),
    mkMember("c6", "linguistique"),
    mkMember("c7", "corporelle"),
    mkMember("c8", "artisanale"),
    mkMember("c9", "creative"),
    mkMember("c10", "sociale"),
    mkMember("c11", "emotionnelle"),
    mkMember("c12", "entrepreneuriale"),
  ];

  it("produit des équipes de la taille demandée, sans doublon ni oubli", () => {
    const teams = buildHackathonTeams(bassin, { teamSize: 4, seed: 7 });
    expect(teams).toHaveLength(3); // 12 / 4
    const all = teams.flatMap((t) => t.members.map((m) => m.id)).sort();
    expect(all).toEqual(bassin.map((m) => m.id).sort());
    for (const t of teams) expect(t.members).toHaveLength(4);
  });

  it("déterministe à seed égal, différent à seed différent", () => {
    const a = buildHackathonTeams(bassin, { teamSize: 4, seed: 7 });
    const b = buildHackathonTeams(bassin, { teamSize: 4, seed: 7 });
    const c = buildHackathonTeams(bassin, { teamSize: 4, seed: 8 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("évite les groupes d'élites : les équipes ne peuvent pas toutes drainer le même talent rare", () => {
    // 3 logiciens, 9 autres : avec 3 équipes de 4, un seul logicien par équipe max
    const teams = buildHackathonTeams(bassin, { teamSize: 4, seed: 3 });
    for (const team of teams) {
      const logicos = team.members.filter((m) => m.primaryTalentKey === "logico_mathematique");
      expect(logicos.length).toBeLessThanOrEqual(1);
    }
  });

  it("diversité d'école : deux écoles séparées restent mélangées dans chaque équipe", () => {
    const schoolByMember: Record<string, string> = {};
    for (const m of bassin) schoolByMember[m.id] = Number(m.id.slice(1)) <= 6 ? "ecole-A" : "ecole-B";
    const teams = buildHackathonTeams(bassin, { teamSize: 4, seed: 5, schoolByMember });
    const mixed = teams.filter((t) => {
      const schools = new Set(t.members.map((m) => schoolByMember[m.id]));
      return schools.size === 2;
    });
    expect(mixed.length).toBeGreaterThanOrEqual(2);
  });

  it("rejette une taille d'équipe invalide", () => {
    expect(() => buildHackathonTeams(bassin, { teamSize: 1 })).toThrow();
    expect(() => buildHackathonTeams(bassin, { teamSize: 13 })).toThrow();
  });

  it("bassin non divisible : le reste est laissé hors équipe (jamais d'équipe tronquée)", () => {
    const teams = buildHackathonTeams(bassin.slice(0, 10), { teamSize: 4, seed: 9 });
    expect(teams).toHaveLength(2);
    expect(teams.every((t) => t.members.length === 4)).toBe(true);
    const picked = teams.flatMap((t) => t.members.map((m) => m.id));
    expect(new Set(picked).size).toBe(8);
  });
});

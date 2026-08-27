import { describe, it, expect } from "vitest";
import {
  analyzeMobilizationConditions,
  type MobilizationExperienceTrace,
} from "./mobilization-conditions";

describe("Analyse des Conditions de Mobilisation Pédagogique", () => {
  it("renvoie un tableau vide s'il y a moins de 2 expériences avec conditions", () => {
    const traces: MobilizationExperienceTrace[] = [
      {
        participationStatus: "active_participant",
        environmentalConditions: {
          groupSize: 3,
          roleClarity: "explicit_structured",
          peerFamiliarity: "peers_familiar",
          timePressure: "relaxed",
        },
      },
    ];

    expect(analyzeMobilizationConditions(traces)).toEqual([]);
  });

  it("détecte une préférence pour les petits groupes quand l'engagement chute en grand groupe", () => {
    const traces: MobilizationExperienceTrace[] = [
      {
        participationStatus: "active_participant",
        environmentalConditions: {
          groupSize: 3,
          roleClarity: "explicit_structured",
          peerFamiliarity: "peers_familiar",
          timePressure: "relaxed",
        },
      },
      {
        participationStatus: "active_participant",
        environmentalConditions: {
          groupSize: 4,
          roleClarity: "open_autonomous",
          peerFamiliarity: "peers_mixed",
          timePressure: "relaxed",
        },
      },
      {
        participationStatus: "present_passive",
        environmentalConditions: {
          groupSize: 8,
          roleClarity: "open_autonomous",
          peerFamiliarity: "peers_new",
          timePressure: "relaxed",
        },
      },
      {
        participationStatus: "present_passive",
        environmentalConditions: {
          groupSize: 10,
          roleClarity: "explicit_structured",
          peerFamiliarity: "peers_new",
          timePressure: "relaxed",
        },
      },
    ];

    const hypotheses = analyzeMobilizationConditions(traces);
    expect(hypotheses.length).toBeGreaterThan(0);

    const groupSizeHyp = hypotheses.find((h) => h.factor === "group_size");
    expect(groupSizeHyp).toBeDefined();
    expect(groupSizeHyp?.optimalContext).toContain("Escouades restreintes");
    expect(groupSizeHyp?.parentInsightText).toContain("petit comité");
  });

  it("détecte le besoin de cadrage de rôle (role_clarity)", () => {
    const traces: MobilizationExperienceTrace[] = [
      {
        participationStatus: "active_participant",
        environmentalConditions: {
          groupSize: 4,
          roleClarity: "explicit_structured",
          peerFamiliarity: "peers_mixed",
          timePressure: "relaxed",
        },
      },
      {
        participationStatus: "present_passive",
        environmentalConditions: {
          groupSize: 4,
          roleClarity: "open_autonomous",
          peerFamiliarity: "peers_mixed",
          timePressure: "relaxed",
        },
      },
    ];

    const hypotheses = analyzeMobilizationConditions(traces);
    const roleHyp = hypotheses.find((h) => h.factor === "role_clarity");
    expect(roleHyp).toBeDefined();
    expect(roleHyp?.optimalContext).toContain("responsabilités explicites");
  });
});

import { describe, it, expect } from "vitest";
import { extractLongitudinalExperiences } from "./longitudinal-evidence";

describe("longitudinal-evidence", () => {
  const mockTraces = [
    {
      id: "trace-1",
      title: "Robotique Mars",
      domain: "sciences",
      source_type: "projet_collectif",
      created_at: "2026-08-20T10:00:00Z",
      proof_image_url: "https://example.com/robot.jpg",
      ai_behavioral_analysis: {
        role: "programmation",
        implication: "contributeur_actif",
        supervisorTags: [
          { tag: "+Initiative", impact: "positive", dimension: "autonomie" },
          { tag: "+Entraide", impact: "positive", dimension: "collaboration" },
        ]
      }
    },
    {
      id: "trace-2",
      title: "Exploration libre",
      domain: "nature",
      source_type: "open_sandbox", // Doit être ignoré
      created_at: "2026-08-22T10:00:00Z"
    },
    {
      id: "trace-3",
      title: "FabLab Eco",
      domain: "sciences",
      source_type: "fablab_marathon",
      created_at: "2026-08-25T10:00:00Z",
      ai_behavioral_analysis: {
        role: "coordination",
        implication: "pilier",
        supervisorTags: [
          { tag: "+Entraide", impact: "positive", dimension: "collaboration" },
          { tag: "+Médiation", impact: "positive", dimension: "collaboration" },
        ]
      }
    }
  ];

  it("should extract only collective traces", () => {
    const graph = extractLongitudinalExperiences(mockTraces, []);
    expect(graph.experiences.length).toBe(2);
    expect(graph.experiences.map(e => e.id)).toEqual(["trace-3", "trace-1"]); // Trié chronologiquement décroissant
  });

  it("should aggregate behavioral tags correctly", () => {
    const graph = extractLongitudinalExperiences(mockTraces, []);
    expect(graph.behavioralSummary.totalProjects).toBe(2);
    expect(graph.behavioralSummary.distinctDomains).toBe(1); // "sciences" (2 fois)
    
    const tags = graph.behavioralSummary.tagsFrequency;
    expect(tags["+Entraide"].count).toBe(2);
    expect(tags["+Initiative"].count).toBe(1);
    expect(tags["+Médiation"].count).toBe(1);
  });

  it("should calculate role summary correctly", () => {
    const graph = extractLongitudinalExperiences(mockTraces, []);
    
    // Rôles: "programmation", "coordination"
    expect(graph.roleSummary.rolesFrequency["programmation"]).toBe(1);
    expect(graph.roleSummary.rolesFrequency["coordination"]).toBe(1);
    
    // mostFrequentRole may be either when counts are equal, but plasticité should reflect variety
    expect(graph.roleSummary.plasticityScore).toBeGreaterThan(0);
  });

  it("should handle empty traces", () => {
    const graph = extractLongitudinalExperiences([], []);
    expect(graph.experiences.length).toBe(0);
    expect(graph.behavioralSummary.totalProjects).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { buildChildDevelopmentState } from "./context-engine";

describe("Context Engine — buildChildDevelopmentState", () => {
  it("synthétise correctement un profil minimal avec repli par défaut", () => {
    const state = buildChildDevelopmentState({
      child: {
        id: "c-1",
        name: "Amadou",
        age: 8,
      },
    });

    expect(state.identity.childId).toBe("c-1");
    expect(state.identity.name).toBe("Amadou");
    expect(state.identity.age).toBe(8);
    expect(state.identity.location).toBe("non précisé");
    expect(state.capabilities.stableDomains).toEqual([]);
    expect(state.capabilities.ignoredOrFatiguedDomains).toEqual([]);
    expect(state.operationalContext.localMaterials.length).toBeGreaterThan(0);
    expect(state.activeHypotheses).toEqual([]);
  });

  it("agrège les domaines stables (>= 2 complétions) et ignore les domaines fatigués (>= 2 stale)", () => {
    const state = buildChildDevelopmentState({
      child: {
        id: "c-2",
        name: "Fatou",
        age: 10,
        city: "Dakar",
        country: "Sénégal",
        talents: { logico_mathematique: 75, spatial: 40, creative: 20 },
      },
      completedChallenges: [
        { id: "1", title: "Défi 1", domain: "Sciences" },
        { id: "2", title: "Défi 2", domain: "Sciences" },
        { id: "3", title: "Défi 3", domain: "Arts" },
      ],
      staleChallenges: [{ domain: "Sport" }, { domain: "Sport" }, { domain: "Musique" }],
    });

    expect(state.identity.location).toBe("Dakar, Sénégal");
    expect(state.capabilities.stableDomains).toContain("Sciences");
    expect(state.capabilities.stableDomains).not.toContain("Arts");
    expect(state.capabilities.ignoredOrFatiguedDomains).toContain("Sport");
    expect(state.capabilities.ignoredOrFatiguedDomains).not.toContain("Musique");
  });

  it("génère des hypothèses actives pour les aspirations, le profil d'apprentissage et les pics de groupe", () => {
    const state = buildChildDevelopmentState({
      child: {
        id: "c-3",
        name: "Koffi",
        age: 11,
        learning_profile: {
          learning_mode: ["pratique", "imagination"],
          collab_preference: "duo",
        },
      },
      aspirationHypotheses: {
        byLabel: {
          Menuiserie: {
            label: "Menuiserie",
            source: "enfant",
            status: "exploring",
            engagement: 0.6,
            bridge: {
              talentKeys: ["artisanale", "spatial"],
              domains: ["Artisanat"],
              skillsHint: ["mesurer", "découper"],
              worldAnchor: "Atelier",
            },
          } as any,
        },
      } as any,
      progressionTargets: [
        {
          domain: "Architecture",
          lastLevelAge: 9,
          targetLevelAge: 12,
          hasUnconsolidatedCollectivePeak: true,
        },
      ],
      latestChildQuestion: "Pourquoi le ciel change de couleur au coucher du soleil ?",
    });

    expect(state.activeHypotheses.some((h) => h.type === "aspiration_job")).toBe(true);
    expect(state.activeHypotheses.some((h) => h.type === "learning_mode")).toBe(true);
    expect(state.activeHypotheses.some((h) => h.type === "collective_posture")).toBe(true);
    expect(
      state.activeHypotheses.some(
        (h) => h.type === "progression" && h.targetDomain === "Architecture",
      ),
    ).toBe(true);
    expect(state.operationalContext.latestChildQuestion).toBe(
      "Pourquoi le ciel change de couleur au coucher du soleil ?",
    );
  });
});

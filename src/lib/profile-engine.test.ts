import { describe, it, expect, vi } from "vitest";
import {
  determinePedagogicalFormat,
  ingestChallengeObservations,
  type ObservationCandidate,
} from "./profile-engine";

describe("Profile Engine", () => {
  describe("determinePedagogicalFormat", () => {
    it("attribue spark_micro par défaut ou pour un domaine vierge (Pratique vers Théorie)", () => {
      const format = determinePedagogicalFormat({
        domainCompletedCount: 0,
      });
      expect(format).toBe("spark_micro");
    });

    it("attribue investigation quand l'enfant a déjà validé une première étape ou explore une hypothèse", () => {
      const format = determinePedagogicalFormat({
        domainCompletedCount: 1,
        activeHypothesisStatus: "exploring",
      });
      expect(format).toBe("investigation");
    });

    it("attribue constructive_project quand l'enfant a un pic collectif ou 3+ réalisations", () => {
      const format = determinePedagogicalFormat({
        domainCompletedCount: 3,
      });
      expect(format).toBe("constructive_project");

      const formatPeak = determinePedagogicalFormat({
        domainCompletedCount: 0,
        hasUnconsolidatedPeak: true,
      });
      expect(formatPeak).toBe("constructive_project");
    });

    it("respecte la suggestion explicite d'une observation candidate récente", () => {
      const observations: ObservationCandidate[] = [
        {
          signal: "autonomie_technique",
          behavioralEvidence: "A câblé le circuit sans aide",
          pedagogicalInsight: "Prêt pour un projet d'ingénierie",
          suggestedNextFormat: "constructive_project",
        },
      ];
      const format = determinePedagogicalFormat({
        domainCompletedCount: 0,
        recentObservations: observations,
      });
      expect(format).toBe("constructive_project");
    });
  });

  describe("ingestChallengeObservations", () => {
    it("insère les observations dans observation_events sans lever d'erreur", async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockDb = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      } as any;

      const observations: ObservationCandidate[] = [
        {
          signal: "curiosite_inductive",
          behavioralEvidence: "A noté les ombres à 3 heures d'intervalle",
          pedagogicalInsight: "Comprend la géométrie solaire par la manipulation",
          internationalBenchmark: "at_grade",
        },
      ];

      const result = await ingestChallengeObservations({
        db: mockDb,
        childId: "child-123",
        challengeId: "challenge-456",
        userId: "user-789",
        observations,
        challengeContext: {
          title: "Le bâton et l'ombre",
          domain: "Sciences",
          academic_domain: "sciences",
          academic_level_age: 9,
        },
      });

      expect(result.ingestedCount).toBe(1);
      expect(mockDb.from).toHaveBeenCalledWith("observation_events");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: "child-123",
          type: "CANDIDATE_OBSERVATIONS",
          source: "profile_engine",
        }),
      );
    });

    it("gère gracieusement une liste vide d'observations", async () => {
      const mockDb = {} as any;
      const result = await ingestChallengeObservations({
        db: mockDb,
        childId: "child-123",
        challengeId: "challenge-456",
        userId: "user-789",
        observations: [],
        challengeContext: {
          title: "Test",
          domain: "Sciences",
        },
      });

      expect(result.ingestedCount).toBe(0);
    });
  });
});

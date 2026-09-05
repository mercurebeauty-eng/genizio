import { describe, it, expect } from "vitest";
import {
  calibrateDomainCapability,
  computeEvidenceWeight,
  mapDiscoveryDifficultyToLevelAge,
  type ObservationEvidence,
  sampleTargetLevelForChallenge,
  formatDynamicCapabilityInstruction,
} from "./dynamic-capability";

describe("dynamic-capability engine", () => {
  const baseDate = new Date("2026-08-27T10:00:00Z");
  const childAge = 8;

  function d(offsetMinutes: number) {
    return new Date(baseDate.getTime() + offsetMinutes * 60000).toISOString();
  }

  describe("computeEvidenceWeight", () => {
    it("should return 1.0 for a perfect autonomous success", () => {
      const ev: ObservationEvidence = {
        source: "discovery_trace",
        domain: "sciences",
        demonstratedLevelAge: 10,
        autonomyWeight: 1.0,
        perseveranceWeight: 1.0,
        metacognitiveWeight: 1.0,
        proofWeight: 1.0,
        outcomeStatus: "functional",
        occurredAt: d(0),
      };
      expect(computeEvidenceWeight(ev)).toBe(1.0);
    });

    it("should return 0.0 for a blocked or failed attempt", () => {
      const ev: ObservationEvidence = {
        source: "challenge",
        domain: "sciences",
        demonstratedLevelAge: 10,
        autonomyWeight: 1.0,
        perseveranceWeight: 1.0,
        metacognitiveWeight: 1.0,
        proofWeight: 1.0,
        outcomeStatus: "failed",
        occurredAt: d(0),
      };
      expect(computeEvidenceWeight(ev)).toBe(0.0);
    });

    it("should penalize low autonomy and missing proof", () => {
      const ev: ObservationEvidence = {
        source: "discovery_trace",
        domain: "sciences",
        demonstratedLevelAge: 10,
        autonomyWeight: 0.4, // guide pas a pas
        perseveranceWeight: 0.7,
        metacognitiveWeight: 0.6,
        proofWeight: 0.7, // no photo
        outcomeStatus: "functional",
        occurredAt: d(0),
      };
      // 0.4 * 0.7 * 0.6 * 0.7 = 0.1176
      expect(computeEvidenceWeight(ev)).toBeCloseTo(0.1176, 3);
    });
  });

  describe("mapDiscoveryDifficultyToLevelAge", () => {
    it("should correctly offset age", () => {
      expect(mapDiscoveryDifficultyToLevelAge("facile", 8)).toBe(7);
      expect(mapDiscoveryDifficultyToLevelAge("moyen", 8)).toBe(8);
      expect(mapDiscoveryDifficultyToLevelAge("difficile", 8)).toBe(10);
      expect(mapDiscoveryDifficultyToLevelAge("eleve", 8)).toBe(11);
    });
  });

  describe("calibrateDomainCapability", () => {
    it("should fall back to childAge when no evidence", () => {
      const state = calibrateDomainCapability(childAge, "sciences", []);
      expect(state.stableLevelAge).toBe(8);
      expect(state.exploratoryLevelAge).toBe(8);
      expect(state.peakLevelAge).toBe(8);
      expect(state.evidenceCount).toBe(0);
    });

    it("should raise peak and explore on a strong positive anomaly (robotics project)", () => {
      const evidences: ObservationEvidence[] = [
        {
          source: "discovery_trace",
          domain: "sciences",
          demonstratedLevelAge: 11, // Difficile/Eleve pour un 8 ans
          autonomyWeight: 0.9,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 0.9,
          proofWeight: 1.0, // Photo validated
          outcomeStatus: "functional",
          occurredAt: d(0),
        },
      ];
      const state = calibrateDomainCapability(childAge, "sciences", evidences);

      // w = 0.9 * 1.0 * 0.9 * 1.0 = 0.81
      // stable = 8 (hasn't been consolidated yet, just 1 success)
      // explore push = 0.81 * (11 - 8) = 0.81 * 3 = 2.43
      // explore = 8 + 2.43 = 10.43 -> rounded to 10
      // peak = 11

      expect(state.stableLevelAge).toBe(8);
      expect(state.exploratoryLevelAge).toBe(10);
      expect(state.peakLevelAge).toBe(11);
    });

    it("should not raise explore level much on a weak positive anomaly (youtube tutorial copied)", () => {
      const evidences: ObservationEvidence[] = [
        {
          source: "discovery_trace",
          domain: "sciences",
          demonstratedLevelAge: 11,
          autonomyWeight: 0.3, // copy-paste
          perseveranceWeight: 0.5,
          metacognitiveWeight: 0.5,
          proofWeight: 0.7,
          outcomeStatus: "functional",
          occurredAt: d(0),
        },
      ];
      const state = calibrateDomainCapability(childAge, "sciences", evidences);

      // w = 0.3 * 0.5 * 0.5 * 0.7 = 0.0525 (low signal)
      // w is < 0.5 so it shouldn't trigger the "montée opportuniste" at all!

      expect(state.stableLevelAge).toBe(8);
      expect(state.exploratoryLevelAge).toBe(8);
      expect(state.peakLevelAge).toBe(8); // Did not register as credible peak
    });

    it("should consolidate stable level after 2 strong successes", () => {
      const evidences: ObservationEvidence[] = [
        {
          source: "challenge",
          domain: "sciences",
          demonstratedLevelAge: 9,
          autonomyWeight: 1.0,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 1.0,
          proofWeight: 1.0,
          outcomeStatus: "completed",
          occurredAt: d(1),
        },
        {
          source: "challenge",
          domain: "sciences",
          demonstratedLevelAge: 9,
          autonomyWeight: 1.0,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 1.0,
          proofWeight: 1.0,
          outcomeStatus: "completed",
          occurredAt: d(2),
        },
      ];

      const state = calibrateDomainCapability(childAge, "sciences", evidences);
      expect(state.stableLevelAge).toBe(9); // Consolidated!
      expect(state.exploratoryLevelAge).toBe(9);
      expect(state.peakLevelAge).toBe(9);
    });

    it("should amortize decay on repeated failures (inertial recalibration)", () => {
      // First, get an exploratory level of 10
      const evidences: ObservationEvidence[] = [
        {
          // Boom, peak at 12, strong evidence
          source: "discovery_trace",
          domain: "sciences",
          demonstratedLevelAge: 12,
          autonomyWeight: 0.9,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 0.9,
          proofWeight: 1.0,
          outcomeStatus: "functional",
          occurredAt: d(1),
        },
        // explore is now around 8 + 0.81*(4) = 11.24 -> 11

        // Then we fail at 11
        {
          source: "challenge",
          domain: "sciences",
          demonstratedLevelAge: 11,
          autonomyWeight: 1.0,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 1.0,
          proofWeight: 1.0,
          outcomeStatus: "failed",
          occurredAt: d(2),
        },
        // We fail again at 11 -> explore decays to 10.5
        {
          source: "challenge",
          domain: "sciences",
          demonstratedLevelAge: 11,
          autonomyWeight: 1.0,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 1.0,
          proofWeight: 1.0,
          outcomeStatus: "failed",
          occurredAt: d(3),
        },
        // We fail at 10.5 -> explore decays to 10
        {
          source: "challenge",
          domain: "sciences",
          demonstratedLevelAge: 10.5,
          autonomyWeight: 1.0,
          perseveranceWeight: 1.0,
          metacognitiveWeight: 1.0,
          proofWeight: 1.0,
          outcomeStatus: "failed",
          occurredAt: d(4),
        },
      ];

      const state = calibrateDomainCapability(childAge, "sciences", evidences);
      expect(state.peakLevelAge).toBe(12);
      expect(state.stableLevelAge).toBe(8); // Never consolidated higher
      expect(state.exploratoryLevelAge).toBe(10); // Amortized down from 11
    });

    it("should obey READY_FOR_MORE hypothesis", () => {
      const state = calibrateDomainCapability(childAge, "sciences", [], "READY_FOR_MORE");
      // Even with 0 evidence, READY_FOR_MORE forces ZPD open by +1
      expect(state.stableLevelAge).toBe(8);
      expect(state.exploratoryLevelAge).toBe(9);
    });
  });

  describe("sampleTargetLevelForChallenge", () => {
    const cap = {
      domain: "sciences",
      stableLevelAge: 5,
      exploratoryLevelAge: 7,
      peakLevelAge: 9,
      confidence: 1,
      evidenceCount: 10,
    };

    it("should return stable or stable+1 for < 0.70", () => {
      expect(sampleTargetLevelForChallenge(cap, 0.1).targetLevelAge).toBe(6); // stable+1 inside 0.35
      expect(sampleTargetLevelForChallenge(cap, 0.5).targetLevelAge).toBe(5); // stable inside 0.70
    });

    it("should return explore for < 0.95", () => {
      expect(sampleTargetLevelForChallenge(cap, 0.8).targetLevelAge).toBe(7);
    });

    it("should return peak for >= 0.95", () => {
      expect(sampleTargetLevelForChallenge(cap, 0.96).targetLevelAge).toBe(9);
    });
  });

  describe("formatDynamicCapabilityInstruction", () => {
    it("should format string properly for AI prompt", () => {
      const caps = [
        {
          domain: "mathematiques",
          stableLevelAge: 8,
          exploratoryLevelAge: 10,
          peakLevelAge: 12,
          confidence: 1,
          evidenceCount: 5,
        },
      ];
      const text = formatDynamicCapabilityInstruction(caps);
      expect(text).toContain("ZONE PROXIMALE DE DÉVELOPPEMENT");
      expect(text).toContain("mathématiques : socle de maîtrise à 8 ans");
      expect(text).toContain("cible d'exploration (ZPD) ouverte jusqu'à 10 ans");
      expect(text).toContain("niveau 12 ans");
    });
  });
});

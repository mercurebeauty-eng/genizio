import { describe, it, expect } from "vitest";
import {
  calculateNayaCosts,
  calculateNayaConversionRate,
  calculateNayaTelemetry,
  NAYA_PRICING,
} from "./naya-telemetry";

describe("Naya Telemetry & Pricing Functions", () => {
  describe("NAYA_PRICING constants", () => {
    it("has the exact required pricing rates and USD-to-XOF conversion factor", () => {
      expect(NAYA_PRICING.HAIKU_INPUT_PER_M).toBe(0.25);
      expect(NAYA_PRICING.HAIKU_OUTPUT_PER_M).toBe(1.25);
      expect(NAYA_PRICING.SONNET_INPUT_PER_M).toBe(3.0);
      expect(NAYA_PRICING.SONNET_OUTPUT_PER_M).toBe(15.0);
      expect(NAYA_PRICING.USD_TO_XOF_RATE).toBe(600);
    });
  });

  describe("calculateNayaCosts", () => {
    it("returns zero costs for null, undefined or empty input", () => {
      expect(calculateNayaCosts(null)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateNayaCosts(undefined)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateNayaCosts({})).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("accurately calculates costs for Haiku token usage", () => {
      // 1M input ($0.25) + 1M output ($1.25) = $1.50 -> 900 FCFA
      const result = calculateNayaCosts({
        haikuInputTokens: 1_000_000,
        haikuOutputTokens: 1_000_000,
      });

      expect(result.costUsd).toBe(1.5);
      expect(result.costXof).toBe(900);
    });

    it("accurately calculates costs for Sonnet token usage", () => {
      // 1M input ($3.00) + 1M output ($15.00) = $18.00 -> 10,800 FCFA
      const result = calculateNayaCosts({
        sonnetInputTokens: 1_000_000,
        sonnetOutputTokens: 1_000_000,
      });

      expect(result.costUsd).toBe(18.0);
      expect(result.costXof).toBe(10800);
    });

    it("accurately calculates combined Haiku and Sonnet token costs", () => {
      // Haiku: 500k input ($0.125) + 200k output ($0.25) = $0.375
      // Sonnet: 100k input ($0.30) + 50k output ($0.75) = $1.05
      // Total USD = $1.425 -> costXof = 1.425 * 600 = 855 FCFA
      const result = calculateNayaCosts({
        haikuInputTokens: 500_000,
        haikuOutputTokens: 200_000,
        sonnetInputTokens: 100_000,
        sonnetOutputTokens: 50_000,
      });

      expect(result.costUsd).toBe(1.425);
      expect(result.costXof).toBe(855);
    });

    it("handles negative token values or NaN by treating them as 0", () => {
      const result = calculateNayaCosts({
        haikuInputTokens: -5000,
        haikuOutputTokens: NaN,
        sonnetInputTokens: 1_000_000,
        sonnetOutputTokens: -100,
      });

      // Only 1M Sonnet input tokens = $3.00 -> 1800 FCFA
      expect(result.costUsd).toBe(3.0);
      expect(result.costXof).toBe(1800);
    });
  });

  describe("calculateNayaConversionRate", () => {
    it("returns 0 when generatedCount is 0, negative, or invalid", () => {
      expect(calculateNayaConversionRate(0, 5)).toBe(0);
      expect(calculateNayaConversionRate(-10, 5)).toBe(0);
      expect(calculateNayaConversionRate(NaN, 5)).toBe(0);
      expect(calculateNayaConversionRate(10, NaN)).toBe(0);
    });

    it("calculates exact rounded conversion rates", () => {
      expect(calculateNayaConversionRate(10, 5)).toBe(50);
      expect(calculateNayaConversionRate(10, 10)).toBe(100);
      expect(calculateNayaConversionRate(3, 1)).toBe(33.3);
      expect(calculateNayaConversionRate(10, 0)).toBe(0);
    });

    it("clamps conversion rate to 100% maximum if completed exceeds generated", () => {
      expect(calculateNayaConversionRate(10, 15)).toBe(100);
      expect(calculateNayaConversionRate(5, 20)).toBe(100);
    });

    it("clamps conversion rate to 0% minimum if completed is negative", () => {
      expect(calculateNayaConversionRate(10, -5)).toBe(0);
    });
  });

  describe("calculateNayaTelemetry", () => {
    it("aggregates zero counts gracefully into valid structured telemetry data", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 0,
        challengesStarted: 0,
        challengesCompleted: 0,
        hypothesesCycles: 0,
        recommendationsCount: 0,
      });

      expect(telemetry.totalApiCalls).toBe(0);
      expect(telemetry.totalTokens).toBe(0);
      expect(telemetry.totalCostUsd).toBe(0);
      expect(telemetry.totalCostXof).toBe(0);
      expect(telemetry.conversionRatePct).toBe(0);
      expect(telemetry.featureBreakdown).toHaveLength(3);
      expect(telemetry.modelBreakdown).toHaveLength(2);
      expect(telemetry.funnel).toEqual({
        generated: 0,
        started: 0,
        completed: 0,
        conversionRatePct: 0,
      });
    });

    it("aggregates real counts and computes correct tokens, costs, breakdown, and funnel", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 100,
        challengesStarted: 80,
        challengesCompleted: 50,
        photoProofCompleted: 20,
        hypothesesCycles: 10,
        recommendationsCount: 15,
      });

      expect(telemetry.totalApiCalls).toBe(100 + 20 + 10 + 15); // 145 calls
      expect(telemetry.conversionRatePct).toBe(50); // 50 / 100 = 50%

      // Feature breakdown check
      const defisFeature = telemetry.featureBreakdown.find((f) => f.feature === "Défis");
      expect(defisFeature).toBeDefined();
      expect(defisFeature?.callsCount).toBe(120);
      expect(defisFeature?.modelUsed).toBe("Haiku + Sonnet");

      const hypFeature = telemetry.featureBreakdown.find((f) => f.feature === "Hypothèses");
      expect(hypFeature?.modelUsed).toBe("Sonnet");

      const recFeature = telemetry.featureBreakdown.find((f) => f.feature === "Recommandations");
      expect(recFeature?.modelUsed).toBe("Haiku");

      // Model breakdown check
      const haikuModel = telemetry.modelBreakdown.find((m) => m.model === "Claude 3.5 Haiku");
      const sonnetModel = telemetry.modelBreakdown.find((m) => m.model === "Claude 3.5 Sonnet");

      expect(haikuModel).toBeDefined();
      expect(sonnetModel).toBeDefined();

      expect(telemetry.totalTokens).toBe(haikuModel!.totalTokens + sonnetModel!.totalTokens);
      expect(telemetry.projection.projectedCallsMonthly).toBe(telemetry.totalApiCalls * 4);
    });
  });
});

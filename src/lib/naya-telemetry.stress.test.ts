import { describe, it, expect } from "vitest";
import {
  calculateNayaCosts,
  calculateNayaConversionRate,
  calculateNayaTelemetry,
  NAYA_PRICING,
} from "./naya-telemetry";

describe("Naya Telemetry Stress & Edge Case Suite", () => {
  describe("Category 1: Zero Token & Zero Activity Scenarios", () => {
    it("handles all-zero token usage objects in calculateNayaCosts", () => {
      const result = calculateNayaCosts({
        haikuInputTokens: 0,
        haikuOutputTokens: 0,
        sonnetInputTokens: 0,
        sonnetOutputTokens: 0,
      });
      expect(result).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles null, undefined, empty object, and partial zero inputs in calculateNayaCosts", () => {
      expect(calculateNayaCosts(null)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateNayaCosts(undefined)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateNayaCosts({})).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateNayaCosts({ haikuInputTokens: 0 })).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles 0 generated vs 0 completed challenges conversion rate handling without NaN/Inf", () => {
      const rate = calculateNayaConversionRate(0, 0);
      expect(rate).toBe(0);
      expect(Number.isNaN(rate)).toBe(false);
      expect(Number.isFinite(rate)).toBe(true);
    });

    it("handles zero raw activity telemetry calculations without NaN or invalid arrays", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 0,
        challengesStarted: 0,
        challengesCompleted: 0,
        photoProofCompleted: 0,
        hypothesesCycles: 0,
        recommendationsCount: 0,
      });

      expect(telemetry.totalApiCalls).toBe(0);
      expect(telemetry.totalTokens).toBe(0);
      expect(telemetry.totalCostUsd).toBe(0);
      expect(telemetry.totalCostXof).toBe(0);
      expect(telemetry.conversionRatePct).toBe(0);
      expect(telemetry.tokenUsage).toEqual({
        haikuInputTokens: 0,
        haikuOutputTokens: 0,
        sonnetInputTokens: 0,
        sonnetOutputTokens: 0,
      });
      expect(telemetry.projection).toEqual({
        projectedCallsMonthly: 0,
        projectedCostUsdMonthly: 0,
        projectedCostXofMonthly: 0,
      });

      // Model shares when totalTokens is 0 should be 0
      telemetry.modelBreakdown.forEach((model) => {
        expect(model.sharePercentage).toBe(0);
      });
    });
  });

  describe("Category 2: Large Token Volumes (100M+ to 1B+ tokens)", () => {
    it("calculates accurate costs for 100M Haiku tokens", () => {
      // 100M input = 100 * $0.25 = $25
      // 100M output = 100 * $1.25 = $125
      // Total = $150 USD -> 150 * 600 = 90,000 FCFA
      const result = calculateNayaCosts({
        haikuInputTokens: 100_000_000,
        haikuOutputTokens: 100_000_000,
      });

      expect(result.costUsd).toBe(150);
      expect(result.costXof).toBe(90000);
    });

    it("calculates accurate costs for 100M Sonnet tokens", () => {
      // 100M input = 100 * $3.00 = $300
      // 100M output = 100 * $15.00 = $1500
      // Total = $1800 USD -> 1800 * 600 = 1,080,000 FCFA
      const result = calculateNayaCosts({
        sonnetInputTokens: 100_000_000,
        sonnetOutputTokens: 100_000_000,
      });

      expect(result.costUsd).toBe(1800);
      expect(result.costXof).toBe(1080000);
    });

    it("handles extreme token scale (1 Billion tokens per model)", () => {
      // Haiku 1B input ($250) + 1B output ($1250) = $1500
      // Sonnet 1B input ($3000) + 1B output ($15000) = $18000
      // Total USD = $19,500 -> 19500 * 600 = 11,700,000 FCFA
      const result = calculateNayaCosts({
        haikuInputTokens: 1_000_000_000,
        haikuOutputTokens: 1_000_000_000,
        sonnetInputTokens: 1_000_000_000,
        sonnetOutputTokens: 1_000_000_000,
      });

      expect(result.costUsd).toBe(19500);
      expect(result.costXof).toBe(11700000);
      expect(Number.isSafeInteger(result.costXof)).toBe(true);
    });

    it("handles massive enterprise scale telemetry calculations (1M API calls, 2B+ tokens)", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 500_000, // 500k Haiku calls (600M in, 400M out = 1B tokens)
        challengesStarted: 400_000,
        challengesCompleted: 250_000,
        photoProofCompleted: 200_000, // 200k Sonnet calls (300M in, 60M out = 360M tokens)
        hypothesesCycles: 100_000, // 100k Sonnet calls (250M in, 60M out = 310M tokens)
        recommendationsCount: 200_000, // 200k Haiku calls (200M in, 100M out = 300M tokens)
      });

      // Total API calls = 500k + 200k + 100k + 200k = 1,000,000 calls
      expect(telemetry.totalApiCalls).toBe(1_000_000);

      // Conversion rate = 250,000 / 500,000 = 50%
      expect(telemetry.conversionRatePct).toBe(50);

      // Model percentage shares should sum to 100%
      const totalShare = telemetry.modelBreakdown.reduce((sum, m) => sum + m.sharePercentage, 0);
      expect(totalShare).toBe(100);

      // Verify projected monthly totals (4x multiplier)
      expect(telemetry.projection.projectedCallsMonthly).toBe(4_000_000);
      expect(telemetry.projection.projectedCostUsdMonthly).toBe(
        Math.round(telemetry.totalCostUsd * 4 * 10000) / 10000
      );
      expect(telemetry.projection.projectedCostXofMonthly).toBe(telemetry.totalCostXof * 4);
    });
  });

  describe("Category 3: Negative Token Counts, NaN Values & Non-Numeric Inputs", () => {
    it("clamps negative token counts to 0 in calculateNayaCosts", () => {
      const result = calculateNayaCosts({
        haikuInputTokens: -100_000,
        haikuOutputTokens: -50_000,
        sonnetInputTokens: -1_000_000,
        sonnetOutputTokens: -500,
      });
      expect(result).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles NaN token values gracefully as 0 in calculateNayaCosts", () => {
      const result = calculateNayaCosts({
        haikuInputTokens: NaN,
        haikuOutputTokens: NaN,
        sonnetInputTokens: 1_000_000, // $3.00
        sonnetOutputTokens: NaN,
      });

      expect(result.costUsd).toBe(3.0);
      expect(result.costXof).toBe(1800);
    });

    it("handles non-numeric inputs (strings, booleans, objects, arrays) in calculateNayaCosts", () => {
      const result = calculateNayaCosts({
        haikuInputTokens: "1000000" as any,
        haikuOutputTokens: true as any,
        sonnetInputTokens: {} as any,
        sonnetOutputTokens: [100] as any,
      });
      expect(result).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles Infinity and -Infinity inputs in calculateNayaCosts without throwing", () => {
      const resultPos = calculateNayaCosts({
        haikuInputTokens: Infinity,
      });
      // Test behavior for Infinity - check if it returns finite number or handles it
      expect(typeof resultPos.costUsd).toBe("number");
      expect(typeof resultPos.costXof).toBe("number");

      const resultNeg = calculateNayaCosts({
        haikuInputTokens: -Infinity,
      });
      expect(resultNeg).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles negative, NaN, and invalid inputs in calculateNayaConversionRate", () => {
      expect(calculateNayaConversionRate(-10, 5)).toBe(0);
      expect(calculateNayaConversionRate(10, -5)).toBe(0);
      expect(calculateNayaConversionRate(-10, -10)).toBe(0);
      expect(calculateNayaConversionRate(NaN, 5)).toBe(0);
      expect(calculateNayaConversionRate(10, NaN)).toBe(0);
      expect(calculateNayaConversionRate(NaN, NaN)).toBe(0);
    });

    it("handles non-numeric type inputs in calculateNayaConversionRate", () => {
      expect(calculateNayaConversionRate("10" as any, 5 as any)).toBe(0);
      expect(calculateNayaConversionRate(10 as any, "5" as any)).toBe(0);
      expect(calculateNayaConversionRate(null as any, undefined as any)).toBe(0);
      expect(calculateNayaConversionRate(true as any, false as any)).toBe(0);
      expect(calculateNayaConversionRate({} as any, [] as any)).toBe(0);
    });

    it("handles negative raw count inputs in calculateNayaTelemetry by clamping to 0", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: -100,
        challengesStarted: -50,
        challengesCompleted: -20,
        photoProofCompleted: -10,
        hypothesesCycles: -5,
        recommendationsCount: -15,
      });

      expect(telemetry.totalApiCalls).toBe(0);
      expect(telemetry.totalTokens).toBe(0);
      expect(telemetry.totalCostUsd).toBe(0);
      expect(telemetry.totalCostXof).toBe(0);
      expect(telemetry.conversionRatePct).toBe(0);
    });

    it("handles NaN raw count inputs in calculateNayaTelemetry", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: NaN,
        challengesStarted: NaN,
        challengesCompleted: NaN,
        photoProofCompleted: NaN,
        hypothesesCycles: NaN,
        recommendationsCount: NaN,
      });

      expect(telemetry.totalApiCalls).toBe(0);
      expect(telemetry.totalTokens).toBe(0);
      expect(telemetry.totalCostUsd).toBe(0);
      expect(telemetry.totalCostXof).toBe(0);
      expect(telemetry.conversionRatePct).toBe(0);
    });

    it("evaluates non-numeric string values in raw input for calculateNayaTelemetry", () => {
      // Valid numeric string "100" is coerced to number 100 by Math.max
      const telemetryNumericStr = calculateNayaTelemetry({
        challengesGenerated: "100" as any,
        challengesStarted: "80" as any,
        challengesCompleted: "50" as any,
        hypothesesCycles: "10" as any,
        recommendationsCount: "15" as any,
      });

      expect(telemetryNumericStr.totalApiCalls).toBe(125);
      expect(telemetryNumericStr.conversionRatePct).toBe(50);

      // Non-parseable string "abc" evaluates Math.max(0, "abc") to NaN
      const telemetryInvalidStr = calculateNayaTelemetry({
        challengesGenerated: "abc" as any,
        challengesStarted: 0,
        challengesCompleted: 0,
        hypothesesCycles: 0,
        recommendationsCount: 0,
      });

      expect(Number.isNaN(telemetryInvalidStr.totalApiCalls)).toBe(true);
      expect(telemetryInvalidStr.conversionRatePct).toBe(0);
    });

    it("handles Infinity inputs in calculateNayaCosts", () => {
      const resultPos = calculateNayaCosts({
        haikuInputTokens: Infinity,
      });
      expect(resultPos.costUsd).toBe(Infinity);
      expect(resultPos.costXof).toBe(Infinity);

      const resultNeg = calculateNayaCosts({
        haikuInputTokens: -Infinity,
      });
      expect(resultNeg).toEqual({ costUsd: 0, costXof: 0 });
    });
  });

  describe("Category 4: Conversion Rate Edge Cases & Clamping", () => {
    it("returns 0% when generated is 0 regardless of completed count", () => {
      expect(calculateNayaConversionRate(0, 0)).toBe(0);
      expect(calculateNayaConversionRate(0, 10)).toBe(0);
      expect(calculateNayaConversionRate(0, 100)).toBe(0);
    });

    it("returns 0% when completed is 0 and generated > 0", () => {
      expect(calculateNayaConversionRate(100, 0)).toBe(0);
      expect(calculateNayaConversionRate(1, 0)).toBe(0);
    });

    it("clamps maximum conversion rate to 100% when completed > generated", () => {
      expect(calculateNayaConversionRate(10, 20)).toBe(100);
      expect(calculateNayaConversionRate(1, 100)).toBe(100);
    });

    it("correctly rounds conversion rate to 1 decimal place", () => {
      expect(calculateNayaConversionRate(3, 1)).toBe(33.3); // 33.3333...
      expect(calculateNayaConversionRate(7, 2)).toBe(28.6); // 28.5714...
      expect(calculateNayaConversionRate(3, 2)).toBe(66.7); // 66.6666...
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateDeepSeekChatCost,
  calculateDeepSeekReasonerCost,
  calculateVisionSonnetCost,
  calculateNayaConversionRate,
  calculateNayaTelemetry,
} from "./naya-telemetry";

describe("Naya Telemetry Stress & Edge Case Suite", () => {
  describe("Category 1: Zero Token & Zero Activity Scenarios", () => {
    it("handles all-zero token usage in each cost function", () => {
      expect(calculateDeepSeekChatCost(0, 0)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateDeepSeekReasonerCost(0, 0)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateVisionSonnetCost(0, 0)).toEqual({ costUsd: 0, costXof: 0 });
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
        deepseekChatInputTokens: 0,
        deepseekChatOutputTokens: 0,
        deepseekReasonerInputTokens: 0,
        deepseekReasonerOutputTokens: 0,
        visionSonnetInputTokens: 0,
        visionSonnetOutputTokens: 0,
        // Copilote Professeur (GLM) — champ ajouté au contrat, à zéro sans usage.
        glmFlashInputTokens: 0,
        glmFlashOutputTokens: 0,
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
    it("calculates accurate costs for 100M DeepSeek Chat tokens", () => {
      // Taux pondérés 70 % creux / 30 % pointe (barème 2026-08-16) :
      // 100M input = 100 * $0.286 = $28.6
      // 100M output = 100 * $0.858 = $85.8
      // Total = $114.4 USD -> 114.4 * 600 = 68,640 FCFA
      const result = calculateDeepSeekChatCost(100_000_000, 100_000_000);
      expect(result.costUsd).toBeCloseTo(114.4, 6);
      expect(result.costXof).toBe(68640);
    });

    it("calculates accurate costs for 100M vision Sonnet tokens", () => {
      // 100M input = 100 * $3.00 = $300
      // 100M output = 100 * $15.00 = $1500
      // Total = $1800 USD -> 1800 * 600 = 1,080,000 FCFA
      const result = calculateVisionSonnetCost(100_000_000, 100_000_000);
      expect(result.costUsd).toBe(1800);
      expect(result.costXof).toBe(1080000);
    });

    it("handles extreme token scale (1 Billion tokens per model)", () => {
      const chat = calculateDeepSeekChatCost(1_000_000_000, 1_000_000_000);
      const reasoner = calculateDeepSeekReasonerCost(1_000_000_000, 1_000_000_000);
      const vision = calculateVisionSonnetCost(1_000_000_000, 1_000_000_000);

      expect(Number.isSafeInteger(chat.costXof)).toBe(true);
      expect(Number.isSafeInteger(reasoner.costXof)).toBe(true);
      expect(Number.isSafeInteger(vision.costXof)).toBe(true);
      expect(vision.costUsd).toBe(18000); // 1000 * $3 + 1000 * $15
    });

    it("handles massive enterprise scale telemetry calculations (1M API calls, 2B+ tokens)", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 500_000, // 500k DeepSeek Chat calls
        challengesStarted: 400_000,
        challengesCompleted: 250_000,
        photoProofCompleted: 200_000, // 200k Sonnet vision calls
        hypothesesCycles: 100_000, // 100k DeepSeek Reasoner calls
        recommendationsCount: 200_000, // 200k DeepSeek Chat calls
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
        Math.round(telemetry.totalCostUsd * 4 * 10000) / 10000,
      );
      expect(telemetry.projection.projectedCostXofMonthly).toBe(telemetry.totalCostXof * 4);
    });
  });

  describe("Category 3: Negative Token Counts, NaN Values & Non-Numeric Inputs", () => {
    it("clamps negative token counts to 0", () => {
      expect(calculateDeepSeekChatCost(-100_000, -50_000)).toEqual({ costUsd: 0, costXof: 0 });
      expect(calculateVisionSonnetCost(-1_000_000, -500)).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles NaN token values gracefully as 0", () => {
      const result = calculateVisionSonnetCost(1_000_000, NaN);
      expect(result.costUsd).toBe(3.0);
      expect(result.costXof).toBe(1800);
    });

    it("handles non-numeric inputs (strings, booleans, objects, arrays)", () => {
      const result = calculateDeepSeekChatCost("1000000" as any, true as any);
      expect(result).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("handles Infinity and -Infinity inputs without throwing", () => {
      const resultPos = calculateDeepSeekChatCost(Infinity, 0);
      expect(typeof resultPos.costUsd).toBe("number");
      expect(typeof resultPos.costXof).toBe("number");

      const resultNeg = calculateDeepSeekChatCost(-Infinity, 0);
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

    it("handles Infinity inputs consistently", () => {
      const resultPos = calculateDeepSeekChatCost(Infinity, 0);
      expect(resultPos.costUsd).toBe(0);
      expect(resultPos.costXof).toBe(0);

      const resultNeg = calculateDeepSeekChatCost(-Infinity, 0);
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

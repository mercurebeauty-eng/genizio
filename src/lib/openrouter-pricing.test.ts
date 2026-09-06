import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCustomTokenCost,
  calculateNayaTelemetry,
  NAYA_PRICING,
} from "./naya-telemetry";
import {
  BASELINE_OPENROUTER_PRICING,
  getLiveOpenRouterPricing,
} from "./openrouter-pricing.server";
import { getChallengeModelOptions } from "./admin-os.functions";
import type { LiveOpenRouterPricing } from "./openrouter-pricing.types";

describe("OpenRouter Live Pricing System", () => {
  describe("BASELINE_OPENROUTER_PRICING", () => {
    it("has valid, positive rates for all supported AI models", () => {
      expect(BASELINE_OPENROUTER_PRICING.deepseekChat.inputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.deepseekChat.outputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.deepseekReasoner.inputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.deepseekReasoner.outputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.glmFlash.inputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.glmFlash.outputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.qwenFlash.inputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.qwenFlash.outputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.visionSonnet.inputPerM).toBeGreaterThan(0);
      expect(BASELINE_OPENROUTER_PRICING.visionSonnet.outputPerM).toBeGreaterThan(0);
    });

    it("has real OpenRouter model identifiers", () => {
      expect(BASELINE_OPENROUTER_PRICING.deepseekChat.modelId).toBe("deepseek/deepseek-v4-flash");
      expect(BASELINE_OPENROUTER_PRICING.deepseekReasoner.modelId).toBe("deepseek/deepseek-v4-pro");
      expect(["z-ai/glm-5.3-flash", "z-ai/glm-4.7-flash"]).toContain(BASELINE_OPENROUTER_PRICING.glmFlash.modelId);
      expect(["qwen/qwen3.8-flash", "qwen/qwen3-30b-a3b-instruct-2507"]).toContain(BASELINE_OPENROUTER_PRICING.qwenFlash.modelId);
      expect(BASELINE_OPENROUTER_PRICING.visionSonnet.modelId).toBe("anthropic/claude-sonnet-5");
    });
  });

  describe("calculateCustomTokenCost", () => {
    it("computes accurate cost based on custom per-1M token rates", () => {
      // 1,000,000 input at $0.05 + 1,000,000 output at $0.15 = $0.20 -> 120 XOF
      const res = calculateCustomTokenCost(1_000_000, 1_000_000, 0.05, 0.15);
      expect(res.costUsd).toBe(0.2);
      expect(res.costXof).toBe(120);
    });

    it("clamps negative or non-finite inputs to 0", () => {
      const res = calculateCustomTokenCost(-500, NaN, 0.05, 0.15);
      expect(res.costUsd).toBe(0);
      expect(res.costXof).toBe(0);
    });
  });

  describe("calculateNayaTelemetry with livePricing", () => {
    const mockLivePricing: LiveOpenRouterPricing = {
      deepseekChat: { inputPerM: 0.1, outputPerM: 0.2, modelId: "test/chat", name: "Chat" },
      deepseekReasoner: { inputPerM: 0.5, outputPerM: 1.0, modelId: "test/reasoner", name: "Reasoner" },
      glmFlash: { inputPerM: 0.06, outputPerM: 0.4, modelId: "test/glm", name: "GLM" },
      qwenFlash: { inputPerM: 0.048, outputPerM: 0.192, modelId: "test/qwen", name: "Qwen" },
      visionSonnet: { inputPerM: 2.0, outputPerM: 10.0, modelId: "test/sonnet", name: "Sonnet" },
      isLive: true,
      source: "openrouter_api",
      fetchedAt: "2026-09-06T12:00:00.000Z",
    };

    it("uses live pricing rates for cost calculations when provided", () => {
      const telemetry = calculateNayaTelemetry(
        {
          challengesGenerated: 10,
          challengesStarted: 5,
          challengesCompleted: 3,
          hypothesesCycles: 2,
          recommendationsCount: 4,
        },
        mockLivePricing,
      );

      expect(telemetry.livePricing).toEqual(mockLivePricing);
      expect(telemetry.totalCostUsd).toBeGreaterThan(0);
      expect(telemetry.totalCostXof).toBe(Math.round(telemetry.totalCostUsd * NAYA_PRICING.USD_TO_XOF_RATE));
    });

    it("routes challenge pricing to GLM when activeChallengeModel is glm-5.3-flash", () => {
      const telemetry = calculateNayaTelemetry(
        {
          challengesGenerated: 10,
          challengesStarted: 5,
          challengesCompleted: 3,
          hypothesesCycles: 0,
          recommendationsCount: 0,
          activeChallengeModel: "glm-5.3-flash",
        },
        mockLivePricing,
      );

      const defis = telemetry.featureBreakdown.find((f) => f.feature === "Défis");
      expect(defis?.modelUsed).toBe("GLM 5.3 Flash");
      // 10 * 1200 = 12,000 input at 0.06/M = $0.00072
      // 10 * 800 = 8,000 output at 0.4/M = $0.0032
      // total = 0.00392 -> rounded to 0.0039
      expect(defis?.costUsd).toBeCloseTo(0.0039, 4);
    });

    it("routes challenge pricing to Qwen when activeChallengeModel is qwen3.8-flash", () => {
      const telemetry = calculateNayaTelemetry(
        {
          challengesGenerated: 10,
          challengesStarted: 5,
          challengesCompleted: 3,
          hypothesesCycles: 0,
          recommendationsCount: 0,
          activeChallengeModel: "qwen3.8-flash",
        },
        mockLivePricing,
      );

      const defis = telemetry.featureBreakdown.find((f) => f.feature === "Défis");
      expect(defis?.modelUsed).toBe("Qwen 3.8 Flash");
      // 10 * 1200 = 12,000 input at 0.048/M = $0.000576
      // 10 * 800 = 8,000 output at 0.192/M = $0.001536
      // total = 0.002112 -> rounded to 0.0021
      expect(defis?.costUsd).toBeCloseTo(0.0021, 4);
    });
  });

  describe("getChallengeModelOptions", () => {
    it("populates rates dynamically from livePricing when available", () => {
      const livePricing: LiveOpenRouterPricing = {
        ...BASELINE_OPENROUTER_PRICING,
        deepseekChat: { inputPerM: 0.075, outputPerM: 0.15, modelId: "test", name: "test" },
      };

      const options = getChallengeModelOptions(livePricing);
      const ds = options.find((o) => o.id === "deepseek-v4-flash");
      expect(ds?.inputPricePerM).toBe(0.075);
      expect(ds?.outputPricePerM).toBe(0.15);
    });

    it("falls back to baseline OpenRouter rates when livePricing is null", () => {
      const options = getChallengeModelOptions(null);
      const ds = options.find((o) => o.id === "deepseek-v4-flash");
      expect(ds?.inputPricePerM).toBe(BASELINE_OPENROUTER_PRICING.deepseekChat.inputPerM);
      expect(ds?.outputPricePerM).toBe(BASELINE_OPENROUTER_PRICING.deepseekChat.outputPerM);
    });
  });

  describe("getLiveOpenRouterPricing server helper", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("parses live OpenRouter API response successfully", async () => {
      const fakeApiResponse = {
        data: [
          {
            id: "deepseek/deepseek-v4-flash",
            name: "DeepSeek V4 Flash",
            pricing: { prompt: "0.0000000808", completion: "0.0000001616" },
          },
          {
            id: "deepseek/deepseek-v4-pro",
            name: "DeepSeek V4 Pro",
            pricing: { prompt: "0.0000006876", completion: "0.0000013753" },
          },
          {
            id: "z-ai/glm-4.7-flash",
            name: "GLM 4.7 Flash",
            pricing: { prompt: "0.00000006", completion: "0.0000004" },
          },
          {
            id: "qwen/qwen3-30b-a3b-instruct-2507",
            name: "Qwen 3 30B",
            pricing: { prompt: "0.0000000481", completion: "0.000000193" },
          },
          {
            id: "anthropic/claude-sonnet-5",
            name: "Claude Sonnet 5",
            pricing: { prompt: "0.000002", completion: "0.00001" },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeApiResponse,
      } as any);

      const pricing = await getLiveOpenRouterPricing(true);
      expect(pricing.isLive).toBe(true);
      expect(pricing.source).toBe("openrouter_api");
      expect(pricing.deepseekChat.inputPerM).toBe(0.0808);
      expect(pricing.deepseekChat.outputPerM).toBe(0.1616);
      expect(pricing.glmFlash.inputPerM).toBe(0.06);
      expect(pricing.glmFlash.outputPerM).toBe(0.4);
      expect(pricing.qwenFlash.inputPerM).toBe(0.0481);
      expect(pricing.qwenFlash.outputPerM).toBe(0.193);
    });

    it("falls back gracefully to cached or baseline pricing on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

      const pricing = await getLiveOpenRouterPricing(true);
      expect(pricing).toBeDefined();
      expect(pricing.deepseekChat.inputPerM).toBeGreaterThan(0);
    });
  });
});

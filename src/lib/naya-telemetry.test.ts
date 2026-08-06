import { describe, it, expect } from "vitest";
import {
  calculateDeepSeekChatCost,
  calculateDeepSeekReasonerCost,
  calculateVisionSonnetCost,
  calculateNayaConversionRate,
  calculateNayaTelemetry,
  calculateNayaWolfTelemetry,
  NAYA_PRICING,
} from "./naya-telemetry";

describe("Naya Telemetry & Pricing Functions", () => {
  describe("NAYA_PRICING constants", () => {
    it("has the exact required pricing rates and USD-to-XOF conversion factor", () => {
      expect(NAYA_PRICING.DEEPSEEK_CHAT_INPUT_PER_M).toBe(0.14);
      expect(NAYA_PRICING.DEEPSEEK_CHAT_OUTPUT_PER_M).toBe(0.28);
      expect(NAYA_PRICING.DEEPSEEK_REASONER_INPUT_PER_M).toBe(0.435);
      expect(NAYA_PRICING.DEEPSEEK_REASONER_OUTPUT_PER_M).toBe(0.87);
      expect(NAYA_PRICING.SONNET_INPUT_PER_M).toBe(3.0);
      expect(NAYA_PRICING.SONNET_OUTPUT_PER_M).toBe(15.0);
      expect(NAYA_PRICING.USD_TO_XOF_RATE).toBe(600);
    });
  });

  describe("calculateDeepSeekChatCost", () => {
    it("returns zero costs for zero tokens", () => {
      expect(calculateDeepSeekChatCost(0, 0)).toEqual({ costUsd: 0, costXof: 0 });
    });

    it("accurately calculates costs for DeepSeek Chat token usage", () => {
      // 1M input ($0.14) + 1M output ($0.28) = $0.42 -> 252 FCFA
      const result = calculateDeepSeekChatCost(1_000_000, 1_000_000);
      expect(result.costUsd).toBe(0.42);
      expect(result.costXof).toBe(252);
    });

    it("clamps negative or NaN token values to 0", () => {
      expect(calculateDeepSeekChatCost(-100_000, NaN)).toEqual({ costUsd: 0, costXof: 0 });
    });
  });

  describe("calculateDeepSeekReasonerCost", () => {
    it("accurately calculates costs for DeepSeek Reasoner token usage", () => {
      // Depuis la décision du 2026-07-22, ce poste tourne sur deepseek-v4-pro —
      // 1M input ($0.435) + 1M output ($0.87) = $1.305 -> 783 FCFA
      const result = calculateDeepSeekReasonerCost(1_000_000, 1_000_000);
      expect(result.costUsd).toBe(1.305);
      expect(result.costXof).toBe(783);
    });
  });

  describe("calculateVisionSonnetCost", () => {
    it("accurately calculates costs for Claude Sonnet 5 vision token usage", () => {
      // 1M input ($3.00) + 1M output ($15.00) = $18.00 -> 10,800 FCFA
      const result = calculateVisionSonnetCost(1_000_000, 1_000_000);
      expect(result.costUsd).toBe(18.0);
      expect(result.costXof).toBe(10800);
    });

    it("clamps negative token values to 0", () => {
      expect(calculateVisionSonnetCost(-1_000_000, -500)).toEqual({ costUsd: 0, costXof: 0 });
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
      expect(telemetry.modelBreakdown).toHaveLength(3);
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
      expect(defisFeature?.modelUsed).toBe("DeepSeek Chat + Sonnet (vision)");

      const hypFeature = telemetry.featureBreakdown.find((f) => f.feature === "Hypothèses");
      expect(hypFeature?.modelUsed).toBe("DeepSeek Reasoner");

      const recFeature = telemetry.featureBreakdown.find((f) => f.feature === "Recommandations");
      expect(recFeature?.modelUsed).toBe("DeepSeek Chat");

      // Model breakdown check
      const chatModel = telemetry.modelBreakdown.find((m) => m.model === "DeepSeek Chat");
      const reasonerModel = telemetry.modelBreakdown.find((m) => m.model === "DeepSeek Reasoner");
      const visionModel = telemetry.modelBreakdown.find((m) => m.model === "Claude Sonnet 5 (Vision)");

      expect(chatModel).toBeDefined();
      expect(reasonerModel).toBeDefined();
      expect(visionModel).toBeDefined();

      expect(telemetry.totalTokens).toBe(
        chatModel!.totalTokens + reasonerModel!.totalTokens + visionModel!.totalTokens
      );
      expect(telemetry.projection.projectedCallsMonthly).toBe(telemetry.totalApiCalls * 4);
    });
  });
});

// ============================================================================
// « Le Loup » — télémétrie du Loup (chantier 4, C4.1) : conformité, recadrage,
// coût propre de la vérification sémantique. Fonction pure.
// ============================================================================

describe("calculateNayaWolfTelemetry", () => {
  it("calcule les taux de conformité et le recadrage sur un échantillon d'audits", () => {
    const audits = [
      { kind: "challenge_single", verdict: "conforme", violations: null, semantic_checked: false, regenerated: false },
      { kind: "challenge_single", verdict: "mineur", violations: [{ rule: "challenge.no_markdown", severity: "mineur" }], semantic_checked: true, regenerated: false },
      { kind: "challenge_bulk", verdict: "majeur", violations: [{ rule: "challenge.intelligences_valid", severity: "majeur" }], semantic_checked: true, regenerated: true },
      { kind: "challenge_bulk", verdict: "majeur", violations: [{ rule: "challenge.intelligences_valid", severity: "majeur" }], semantic_checked: true, regenerated: false },
    ];
    const wolf = calculateNayaWolfTelemetry(audits as any);
    expect(wolf.totalAudits).toBe(4);
    expect(wolf.conformityRatePct).toBe(25); // 1/4
    expect(wolf.minorRatePct).toBe(25);
    expect(wolf.majorRatePct).toBe(50);
    expect(wolf.semanticChecked).toBe(3);
    expect(wolf.semanticCheckedRatePct).toBe(75);
    expect(wolf.regenerated).toBe(1);
    expect(wolf.recadrageRatePct).toBe(25);
    expect(wolf.totalViolations).toBe(3);
  });

  it("classe les top violations par fréquence décroissante", () => {
    const audits = [
      { kind: "k", verdict: "majeur", violations: [{ rule: "a" }, { rule: "b" }, { rule: "b" }, { rule: "b" }], semantic_checked: null, regenerated: null },
      { kind: "k", verdict: "mineur", violations: [{ rule: "a" }], semantic_checked: null, regenerated: null },
    ];
    const wolf = calculateNayaWolfTelemetry(audits as any);
    expect(wolf.topViolations[0]).toEqual({ rule: "b", count: 3 });
    expect(wolf.topViolations[1]).toEqual({ rule: "a", count: 2 });
  });

  it("ventile par type de génération avec les compteurs majeurs", () => {
    const audits = [
      { kind: "homework", verdict: "majeur", violations: [{ rule: "r" }], semantic_checked: null, regenerated: null },
      { kind: "homework", verdict: "conforme", violations: null, semantic_checked: null, regenerated: null },
      { kind: "narrative", verdict: "majeur", violations: [{ rule: "r" }], semantic_checked: null, regenerated: null },
    ];
    const wolf = calculateNayaWolfTelemetry(audits as any);
    expect(wolf.byKind["homework"]).toEqual({ total: 2, majeur: 1 });
    expect(wolf.byKind["narrative"]).toEqual({ total: 1, majeur: 1 });
  });

  it("estime le coût propre du Loup à partir des seules vérifications sémantiques", () => {
    const audits = [
      { kind: "k", verdict: "conforme", violations: null, semantic_checked: true, regenerated: false },
      { kind: "k", verdict: "conforme", violations: null, semantic_checked: true, regenerated: false },
      { kind: "k", verdict: "conforme", violations: null, semantic_checked: false, regenerated: false },
    ];
    const wolf = calculateNayaWolfTelemetry(audits as any);
    // 2 vérifications sémantiques × (2500 tokens entrée @0.14/M + 800 sortie @0.28/M)
    const perCall = calculateDeepSeekChatCost(2500, 800).costUsd;
    expect(wolf.loupCostUsd).toBeCloseTo(perCall * 2, 6);
  });

  it("retourne un état vide sûr sans audit", () => {
    const wolf = calculateNayaWolfTelemetry([]);
    expect(wolf.totalAudits).toBe(0);
    expect(wolf.conformityRatePct).toBe(0);
    expect(wolf.topViolations).toEqual([]);
    expect(wolf.loupCostUsd).toBe(0);
  });
});

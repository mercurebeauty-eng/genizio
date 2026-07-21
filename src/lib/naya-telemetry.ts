export const NAYA_PRICING = {
  HAIKU_INPUT_PER_M: 0.25,
  HAIKU_OUTPUT_PER_M: 1.25,
  SONNET_INPUT_PER_M: 3.00,
  SONNET_OUTPUT_PER_M: 15.00,
  USD_TO_XOF_RATE: 600,
} as const;

export interface NayaTokenUsage {
  haikuInputTokens: number;
  haikuOutputTokens: number;
  sonnetInputTokens: number;
  sonnetOutputTokens: number;
}

export interface NayaCostResult {
  costUsd: number;
  costXof: number;
}

export interface FeatureBreakdown {
  feature: "Défis" | "Hypothèses" | "Recommandations";
  callsCount: number;
  modelUsed: "Haiku" | "Sonnet" | "Haiku + Sonnet";
  estimatedTokens: number;
  costUsd: number;
  costXof: number;
}

export interface ModelUsageBreakdown {
  model: "Claude 3.5 Haiku" | "Claude 3.5 Sonnet";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  costXof: number;
  sharePercentage: number;
}

export interface ConversionFunnel {
  generated: number;
  started: number;
  completed: number;
  conversionRatePct: number;
}

export interface MonthlyProjection {
  projectedCallsMonthly: number;
  projectedCostUsdMonthly: number;
  projectedCostXofMonthly: number;
}

export interface NayaTelemetryResponse {
  totalApiCalls: number;
  totalTokens: number;
  tokenUsage: NayaTokenUsage;
  totalCostUsd: number;
  totalCostXof: number;
  conversionRatePct: number;
  featureBreakdown: FeatureBreakdown[];
  modelBreakdown: ModelUsageBreakdown[];
  funnel: ConversionFunnel;
  projection: MonthlyProjection;
}

/**
 * Calculates estimated USD and XOF costs for Anthropic Claude (Haiku & Sonnet) usage.
 * Pricing:
 * - Haiku 3.5: $0.25/1M input, $1.25/1M output
 * - Sonnet 3.5: $3.00/1M input, $15.00/1M output
 * - USD to XOF rate: 600 FCFA
 */
export function calculateNayaCosts(usage?: Partial<NayaTokenUsage> | null): NayaCostResult {
  if (!usage) return { costUsd: 0, costXof: 0 };

  const haikuInput = Math.max(0, typeof usage.haikuInputTokens === "number" && !Number.isNaN(usage.haikuInputTokens) ? usage.haikuInputTokens : 0);
  const haikuOutput = Math.max(0, typeof usage.haikuOutputTokens === "number" && !Number.isNaN(usage.haikuOutputTokens) ? usage.haikuOutputTokens : 0);
  const sonnetInput = Math.max(0, typeof usage.sonnetInputTokens === "number" && !Number.isNaN(usage.sonnetInputTokens) ? usage.sonnetInputTokens : 0);
  const sonnetOutput = Math.max(0, typeof usage.sonnetOutputTokens === "number" && !Number.isNaN(usage.sonnetOutputTokens) ? usage.sonnetOutputTokens : 0);

  const haikuCost =
    (haikuInput / 1_000_000) * NAYA_PRICING.HAIKU_INPUT_PER_M +
    (haikuOutput / 1_000_000) * NAYA_PRICING.HAIKU_OUTPUT_PER_M;

  const sonnetCost =
    (sonnetInput / 1_000_000) * NAYA_PRICING.SONNET_INPUT_PER_M +
    (sonnetOutput / 1_000_000) * NAYA_PRICING.SONNET_OUTPUT_PER_M;

  const totalUsd = haikuCost + sonnetCost;
  const costUsd = Math.round(totalUsd * 10000) / 10000;
  const costXof = Math.round(totalUsd * NAYA_PRICING.USD_TO_XOF_RATE);

  return { costUsd, costXof };
}

/**
 * Calculates challenge conversion rate percentage: (completed / generated) * 100.
 * Clamped strictly to 0% – 100%.
 */
export function calculateNayaConversionRate(generatedCount: number, completedCount: number): number {
  if (
    typeof generatedCount !== "number" ||
    typeof completedCount !== "number" ||
    Number.isNaN(generatedCount) ||
    Number.isNaN(completedCount) ||
    generatedCount <= 0
  ) {
    return 0;
  }

  const validCompleted = Math.max(0, completedCount);
  const rawPercentage = (validCompleted / generatedCount) * 100;
  const clamped = Math.max(0, Math.min(100, rawPercentage));
  return Math.round(clamped * 10) / 10;
}

/**
 * Aggregates raw system counts into full Naya AI telemetry metrics:
 * - Feature breakdown (Défis, Hypothèses, Recommandations)
 * - Model breakdown (Haiku vs Sonnet token distribution & cost shares)
 * - Conversion funnel
 * - Monthly projections
 */
export function calculateNayaTelemetry(raw: {
  challengesGenerated: number;
  challengesStarted: number;
  challengesCompleted: number;
  photoProofCompleted?: number;
  hypothesesCycles: number;
  recommendationsCount: number;
}): NayaTelemetryResponse {
  const genCount = Math.max(0, raw.challengesGenerated || 0);
  const startCount = Math.max(0, raw.challengesStarted || 0);
  const compCount = Math.max(0, raw.challengesCompleted || 0);
  const photoProofCount = Math.max(0, raw.photoProofCompleted || 0);
  const hypCount = Math.max(0, raw.hypothesesCycles || 0);
  const recCount = Math.max(0, raw.recommendationsCount || 0);

  // Token multipliers per API call
  // Défis text generation (Haiku): 1,200 input, 800 output per challenge generated
  const defisHaikuInput = genCount * 1200;
  const defisHaikuOutput = genCount * 800;

  // Photo proof validation (Sonnet): 1,500 input, 300 output per photo proof completed
  const defisSonnetInput = photoProofCount * 1500;
  const defisSonnetOutput = photoProofCount * 300;

  // Hypotheses cycles (Sonnet): 2,500 input, 600 output per cycle
  const hypSonnetInput = hypCount * 2500;
  const hypSonnetOutput = hypCount * 600;

  // Recommandations syntheses (Haiku): 1,000 input, 500 output per synthesis
  const recHaikuInput = recCount * 1000;
  const recHaikuOutput = recCount * 500;

  const tokenUsage: NayaTokenUsage = {
    haikuInputTokens: defisHaikuInput + recHaikuInput,
    haikuOutputTokens: defisHaikuOutput + recHaikuOutput,
    sonnetInputTokens: defisSonnetInput + hypSonnetInput,
    sonnetOutputTokens: defisSonnetOutput + hypSonnetOutput,
  };

  const totalHaikuTokens =
    tokenUsage.haikuInputTokens + tokenUsage.haikuOutputTokens;
  const totalSonnetTokens =
    tokenUsage.sonnetInputTokens + tokenUsage.sonnetOutputTokens;
  const totalTokens = totalHaikuTokens + totalSonnetTokens;

  const haikuCosts = calculateNayaCosts({
    haikuInputTokens: tokenUsage.haikuInputTokens,
    haikuOutputTokens: tokenUsage.haikuOutputTokens,
  });

  const sonnetCosts = calculateNayaCosts({
    sonnetInputTokens: tokenUsage.sonnetInputTokens,
    sonnetOutputTokens: tokenUsage.sonnetOutputTokens,
  });

  const totalCosts = calculateNayaCosts(tokenUsage);

  const defisCosts = calculateNayaCosts({
    haikuInputTokens: defisHaikuInput,
    haikuOutputTokens: defisHaikuOutput,
    sonnetInputTokens: defisSonnetInput,
    sonnetOutputTokens: defisSonnetOutput,
  });

  const hypCosts = calculateNayaCosts({
    sonnetInputTokens: hypSonnetInput,
    sonnetOutputTokens: hypSonnetOutput,
  });

  const recCosts = calculateNayaCosts({
    haikuInputTokens: recHaikuInput,
    haikuOutputTokens: recHaikuOutput,
  });

  const totalApiCalls = genCount + photoProofCount + hypCount + recCount;
  const conversionRatePct = calculateNayaConversionRate(genCount, compCount);

  const featureBreakdown: FeatureBreakdown[] = [
    {
      feature: "Défis",
      callsCount: genCount + photoProofCount,
      modelUsed: photoProofCount > 0 ? "Haiku + Sonnet" : "Haiku",
      estimatedTokens: defisHaikuInput + defisHaikuOutput + defisSonnetInput + defisSonnetOutput,
      costUsd: defisCosts.costUsd,
      costXof: defisCosts.costXof,
    },
    {
      feature: "Hypothèses",
      callsCount: hypCount,
      modelUsed: "Sonnet",
      estimatedTokens: hypSonnetInput + hypSonnetOutput,
      costUsd: hypCosts.costUsd,
      costXof: hypCosts.costXof,
    },
    {
      feature: "Recommandations",
      callsCount: recCount,
      modelUsed: "Haiku",
      estimatedTokens: recHaikuInput + recHaikuOutput,
      costUsd: recCosts.costUsd,
      costXof: recCosts.costXof,
    },
  ];

  const modelBreakdown: ModelUsageBreakdown[] = [
    {
      model: "Claude 3.5 Haiku",
      inputTokens: tokenUsage.haikuInputTokens,
      outputTokens: tokenUsage.haikuOutputTokens,
      totalTokens: totalHaikuTokens,
      costUsd: haikuCosts.costUsd,
      costXof: haikuCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalHaikuTokens / totalTokens) * 100) : 0,
    },
    {
      model: "Claude 3.5 Sonnet",
      inputTokens: tokenUsage.sonnetInputTokens,
      outputTokens: tokenUsage.sonnetOutputTokens,
      totalTokens: totalSonnetTokens,
      costUsd: sonnetCosts.costUsd,
      costXof: sonnetCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalSonnetTokens / totalTokens) * 100) : 0,
    },
  ];

  const funnel: ConversionFunnel = {
    generated: genCount,
    started: startCount,
    completed: compCount,
    conversionRatePct,
  };

  // Monthly projections based on a 4x multiplier on current baseline activity
  const projectedCallsMonthly = totalApiCalls * 4;
  const projectedCostUsdMonthly = Math.round(totalCosts.costUsd * 4 * 10000) / 10000;
  const projectedCostXofMonthly = Math.round(totalCosts.costXof * 4);

  return {
    totalApiCalls,
    totalTokens,
    tokenUsage,
    totalCostUsd: totalCosts.costUsd,
    totalCostXof: totalCosts.costXof,
    conversionRatePct,
    featureBreakdown,
    modelBreakdown,
    funnel,
    projection: {
      projectedCallsMonthly,
      projectedCostUsdMonthly,
      projectedCostXofMonthly,
    },
  };
}

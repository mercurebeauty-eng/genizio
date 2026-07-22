// Tarifs indicatifs (2026-07-21) — DeepSeek Chat/Reasoner à vérifier contre la
// page de tarification officielle DeepSeek au moment de la lecture (leurs prix
// changent régulièrement) ; Sonnet reste au tarif Anthropic publié. Ce module
// reste un ESTIMATEUR de coût (formules ci-dessous), jamais une facturation
// réelle mesurée sur des logs d'appels.
export const NAYA_PRICING = {
  DEEPSEEK_CHAT_INPUT_PER_M: 0.28,
  DEEPSEEK_CHAT_OUTPUT_PER_M: 0.42,
  DEEPSEEK_REASONER_INPUT_PER_M: 0.55,
  DEEPSEEK_REASONER_OUTPUT_PER_M: 2.19,
  SONNET_INPUT_PER_M: 3.00,
  SONNET_OUTPUT_PER_M: 15.00,
  USD_TO_XOF_RATE: 600,
} as const;

export interface NayaTokenUsage {
  // Défis + Recommandations (texte général) — DeepSeek Chat depuis le 2026-07-21
  // (remplace Claude Haiku 4.5). Noms de champs conservés ("deepseek*" au lieu
  // de "haiku*") pour que la lecture reste immédiate sans dépendre du git blame.
  deepseekChatInputTokens: number;
  deepseekChatOutputTokens: number;
  // Hypothèses (raisonnement bayésien NAYA) — DeepSeek Reasoner depuis le
  // 2026-07-21 (remplace Claude Sonnet 5, decision #27 "quand le système doit
  // vraiment réfléchir" — le rôle reste premium, seul le fournisseur change).
  deepseekReasonerInputTokens: number;
  deepseekReasonerOutputTokens: number;
  // Validation de preuve photo (vision) — reste Claude Sonnet 5, DeepSeek n'a
  // pas de vision. Seul cas où Anthropic est encore appelé.
  visionSonnetInputTokens: number;
  visionSonnetOutputTokens: number;
}

export interface NayaCostResult {
  costUsd: number;
  costXof: number;
}

export interface FeatureBreakdown {
  feature: "Défis" | "Hypothèses" | "Recommandations";
  callsCount: number;
  modelUsed: "DeepSeek Chat" | "DeepSeek Chat + Sonnet (vision)" | "DeepSeek Reasoner";
  estimatedTokens: number;
  costUsd: number;
  costXof: number;
}

export interface ModelUsageBreakdown {
  model: "DeepSeek Chat" | "DeepSeek Reasoner" | "Claude Sonnet 5 (Vision)";
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

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function toSafeTokenCount(val: any): number {
  if (typeof val !== "number" || Number.isNaN(val)) return 0;
  if (val <= 0 || !Number.isFinite(val)) return 0;
  return val;
}

/** Coût DeepSeek Chat (défis + recommandations) pour une paire input/output de tokens. */
export function calculateDeepSeekChatCost(inputTokens: number, outputTokens: number): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.DEEPSEEK_CHAT_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.DEEPSEEK_CHAT_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût DeepSeek Reasoner (hypothèses) pour une paire input/output de tokens. */
export function calculateDeepSeekReasonerCost(inputTokens: number, outputTokens: number): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.DEEPSEEK_REASONER_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.DEEPSEEK_REASONER_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût Claude Sonnet 5 (vision — preuve photo) pour une paire input/output de tokens. */
export function calculateVisionSonnetCost(inputTokens: number, outputTokens: number): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.SONNET_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.SONNET_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
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
 * - Model breakdown (DeepSeek Chat / DeepSeek Reasoner / Claude Sonnet 5 Vision)
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

  // Token multipliers per API call (mêmes ordres de grandeur qu'avant le
  // passage à DeepSeek — seul le fournisseur/tarif change, pas le volume estimé)
  // Défis text generation (DeepSeek Chat): 1,200 input, 800 output per challenge generated
  const defisChatInput = genCount * 1200;
  const defisChatOutput = genCount * 800;

  // Photo proof validation (Claude Sonnet 5, vision) : 1,500 input, 300 output
  const defisVisionInput = photoProofCount * 1500;
  const defisVisionOutput = photoProofCount * 300;

  // Hypotheses cycles (DeepSeek Reasoner) : 2,500 input, 600 output per cycle
  const hypReasonerInput = hypCount * 2500;
  const hypReasonerOutput = hypCount * 600;

  // Recommandations syntheses (DeepSeek Chat) : 1,000 input, 500 output per synthesis
  const recChatInput = recCount * 1000;
  const recChatOutput = recCount * 500;

  const tokenUsage: NayaTokenUsage = {
    deepseekChatInputTokens: defisChatInput + recChatInput,
    deepseekChatOutputTokens: defisChatOutput + recChatOutput,
    deepseekReasonerInputTokens: hypReasonerInput,
    deepseekReasonerOutputTokens: hypReasonerOutput,
    visionSonnetInputTokens: defisVisionInput,
    visionSonnetOutputTokens: defisVisionOutput,
  };

  const totalChatTokens = tokenUsage.deepseekChatInputTokens + tokenUsage.deepseekChatOutputTokens;
  const totalReasonerTokens = tokenUsage.deepseekReasonerInputTokens + tokenUsage.deepseekReasonerOutputTokens;
  const totalVisionTokens = tokenUsage.visionSonnetInputTokens + tokenUsage.visionSonnetOutputTokens;
  const totalTokens = totalChatTokens + totalReasonerTokens + totalVisionTokens;

  const chatCosts = calculateDeepSeekChatCost(tokenUsage.deepseekChatInputTokens, tokenUsage.deepseekChatOutputTokens);
  const reasonerCosts = calculateDeepSeekReasonerCost(tokenUsage.deepseekReasonerInputTokens, tokenUsage.deepseekReasonerOutputTokens);
  const visionCosts = calculateVisionSonnetCost(tokenUsage.visionSonnetInputTokens, tokenUsage.visionSonnetOutputTokens);

  const totalCostUsd = round4(chatCosts.costUsd + reasonerCosts.costUsd + visionCosts.costUsd);
  const totalCostXof = chatCosts.costXof + reasonerCosts.costXof + visionCosts.costXof;

  const defisChatCosts = calculateDeepSeekChatCost(defisChatInput, defisChatOutput);
  const defisVisionCosts = calculateVisionSonnetCost(defisVisionInput, defisVisionOutput);
  const defisCostUsd = round4(defisChatCosts.costUsd + defisVisionCosts.costUsd);
  const defisCostXof = defisChatCosts.costXof + defisVisionCosts.costXof;

  const hypCosts = calculateDeepSeekReasonerCost(hypReasonerInput, hypReasonerOutput);
  const recCosts = calculateDeepSeekChatCost(recChatInput, recChatOutput);

  const totalApiCalls = genCount + photoProofCount + hypCount + recCount;
  const conversionRatePct = calculateNayaConversionRate(genCount, compCount);

  const featureBreakdown: FeatureBreakdown[] = [
    {
      feature: "Défis",
      callsCount: genCount + photoProofCount,
      modelUsed: photoProofCount > 0 ? "DeepSeek Chat + Sonnet (vision)" : "DeepSeek Chat",
      estimatedTokens: defisChatInput + defisChatOutput + defisVisionInput + defisVisionOutput,
      costUsd: defisCostUsd,
      costXof: defisCostXof,
    },
    {
      feature: "Hypothèses",
      callsCount: hypCount,
      modelUsed: "DeepSeek Reasoner",
      estimatedTokens: hypReasonerInput + hypReasonerOutput,
      costUsd: hypCosts.costUsd,
      costXof: hypCosts.costXof,
    },
    {
      feature: "Recommandations",
      callsCount: recCount,
      modelUsed: "DeepSeek Chat",
      estimatedTokens: recChatInput + recChatOutput,
      costUsd: recCosts.costUsd,
      costXof: recCosts.costXof,
    },
  ];

  const modelBreakdown: ModelUsageBreakdown[] = [
    {
      model: "DeepSeek Chat",
      inputTokens: tokenUsage.deepseekChatInputTokens,
      outputTokens: tokenUsage.deepseekChatOutputTokens,
      totalTokens: totalChatTokens,
      costUsd: chatCosts.costUsd,
      costXof: chatCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalChatTokens / totalTokens) * 100) : 0,
    },
    {
      model: "DeepSeek Reasoner",
      inputTokens: tokenUsage.deepseekReasonerInputTokens,
      outputTokens: tokenUsage.deepseekReasonerOutputTokens,
      totalTokens: totalReasonerTokens,
      costUsd: reasonerCosts.costUsd,
      costXof: reasonerCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalReasonerTokens / totalTokens) * 100) : 0,
    },
    {
      model: "Claude Sonnet 5 (Vision)",
      inputTokens: tokenUsage.visionSonnetInputTokens,
      outputTokens: tokenUsage.visionSonnetOutputTokens,
      totalTokens: totalVisionTokens,
      costUsd: visionCosts.costUsd,
      costXof: visionCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalVisionTokens / totalTokens) * 100) : 0,
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
  const projectedCostUsdMonthly = round4(totalCostUsd * 4);
  const projectedCostXofMonthly = Math.round(totalCostXof * 4);

  return {
    totalApiCalls,
    totalTokens,
    tokenUsage,
    totalCostUsd,
    totalCostXof,
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

// Tarifs indicatifs (vérifiés 2026-08-15 sur api-docs.deepseek.com) — les modèles
// actuels DeepSeek sont deepseek-v4-flash et deepseek-v4-pro (les alias
// deepseek-chat/deepseek-reasoner sont dépréciés depuis le 2026-07-24). Sonnet
// reste au tarif Anthropic publié. Ce module reste un ESTIMATEUR de coût (formules
// ci-dessous), jamais une facturation réelle mesurée sur des logs d'appels.
//
// Décision produit du 2026-07-22 (cf. callDeepSeekText dans
// challenges.functions.ts) : deepseek-v4-flash (rapide/économique) porte les défis
// et interactions utilisateur ; deepseek-v4-pro, le modèle le plus avancé de
// DeepSeek, porte le raisonnement bayésien NAYA (volume faible, rôle premium) —
// d'où des tarifs distincts, plus élevés pour ce second poste.
//
// Mode réflexion (thinking) : activé par défaut chez DeepSeek v4, réglable via
// `{"thinking": {"type": "enabled/disabled"}}` + reasoning_effort (low/high/max).
// NAYA le désactive sur v4-flash et l'active en effort élevé sur v4-pro. Le mode
// réflexion n'a PAS de tarif séparé (mêmes taux ; ses tokens de raisonnement sont
// facturés comme tokens de sortie) — non modélisés ici.
//
// ── Barème creux/plein (2026-08-16 16:00 UTC) ───────────────────────────────
// Les taux promotionnels actuels (flash 0.14/0.28, pro 0.435/0.87, tarif "cache
// miss") sont remplacés par un barème creux/plein nettement plus élevé :
//   • pointe : flash 0.44/1.32, pro 1.32/3.96 (cache miss)
//   • creux : flash 0.22/0.66, pro 0.66/1.98 (cache miss, = moitié de la pointe)
//   • heures de pointe (UTC) : 01:00-04:00 et 06:00-10:00 — tout le reste est creux.
// L'estimateur utilise les TAUX PONDÉRÉS 70 % creux / 30 % pointe (part creuse =
// 17 h/24 h, usage famille concentré hors de cette fenêtre nocturne/matinale).
// L'admin affiche aussi le coût plafond (100 % en pointe) et, à l'inverse, les
// taux cache hit restent non modélisés (cache miss conservateur).
export const NAYA_PRICING = {
  DEEPSEEK_PEAK: {
    FLASH_INPUT_PER_M: 0.44,
    FLASH_OUTPUT_PER_M: 1.32,
    PRO_INPUT_PER_M: 1.32,
    PRO_OUTPUT_PER_M: 3.96,
  },
  DEEPSEEK_OFF_PEAK: {
    FLASH_INPUT_PER_M: 0.22,
    FLASH_OUTPUT_PER_M: 0.66,
    PRO_INPUT_PER_M: 0.66,
    PRO_OUTPUT_PER_M: 1.98,
  },
  // Taux pondérés 70 % creux / 30 % pointe — utilisés par défaut par l'estimateur.
  // flash : 0.7×0.22 + 0.3×0.44 = 0.286 / 0.7×0.66 + 0.3×1.32 = 0.858
  // pro   : 0.7×0.66 + 0.3×1.32 = 0.858 / 0.7×1.98 + 0.3×3.96 = 2.574
  DEFAULT_OFF_PEAK_SHARE: 0.7,
  SONNET_INPUT_PER_M: 3.0,
  SONNET_OUTPUT_PER_M: 15.0,
  // GLM 5.3 Flash (Copilote Professeur, passerelle glm.server.ts, endpoint B AI
  // OpenAI-compatible). Barème à recalibrer sur la grille B AI publique au moment
  // de la mise en production — valeurs conservatrices bas coût, sans creux/plein.
  GLM_FLASH_INPUT_PER_M: 0.11,
  GLM_FLASH_OUTPUT_PER_M: 0.44,
  // Qwen 3.8 Flash (api.b.ai / DashScope) — modèle rapide et économique
  QWEN_FLASH_INPUT_PER_M: 0.05,
  QWEN_FLASH_OUTPUT_PER_M: 0.15,
  USD_TO_XOF_RATE: 600,
  // « Le Loup » (chantiers 2-4, Naya 3.0) : la vérification sémantique tourne sur
  // le modèle économique par défaut (deepseek-v4-flash, via callClaude) et son
  // coût est borné par NAYA_VERIFY_MAX_TOKENS (garde-fou ~800, cf. naya-verifier).
  // Volume estimé par appel : prompt + sortie à vérifier (tronquée) ≈ 2 500 tokens
  // d'entrée, 800 de sortie — chiffres d'ordre de grandeur, pas de la facturation.
  LOUP_SEMANTIC_INPUT_PER_CALL: 2500,
  LOUP_SEMANTIC_OUTPUT_PER_CALL: 800,
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
  // Copilote Professeur (fiches de préparation) — GLM 5.3 Flash via glm.server.ts.
  // Tokens RÉELS remontés par l'API (usage), pas des multiplicateurs estimés.
  glmFlashInputTokens: number;
  glmFlashOutputTokens: number;
  // Qwen 3.8 Flash (génération de défis alternative via qwen.server.ts).
  qwenFlashInputTokens: number;
  qwenFlashOutputTokens: number;
}

export interface NayaCostResult {
  costUsd: number;
  costXof: number;
}

export interface FeatureBreakdown {
  feature: "Défis" | "Hypothèses" | "Recommandations" | "Copilote Professeur";
  /** Noms d'affichage alignés sur les modèles API réels (alias dépréciés depuis le 2026-07-24). */
  modelUsed:
    | "DeepSeek V4 Flash"
    | "DeepSeek V4 Flash + Sonnet (vision)"
    | "DeepSeek V4 Pro"
    | "GLM 5.3 Flash"
    | "Qwen 3.8 Flash";
  callsCount: number;
  estimatedTokens: number;
  costUsd: number;
  costXof: number;
}

export interface ModelUsageBreakdown {
  model:
    | "DeepSeek V4 Flash"
    | "DeepSeek V4 Pro"
    | "Claude Sonnet 5 (Vision)"
    | "GLM 5.3 Flash"
    | "Qwen 3.8 Flash";
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
  /** Coût total si 100 % des appels tombaient en heures de pointe — plafond du
   *  barème creux/plein DeepSeek (visible dans l'admin pour cadrer l'estimation). */
  peakCeilingCostUsd: number;
  peakCeilingCostXof: number;
  conversionRatePct: number;
  featureBreakdown: FeatureBreakdown[];
  modelBreakdown: ModelUsageBreakdown[];
  funnel: ConversionFunnel;
  projection: MonthlyProjection;
  /** Télémétrie du Loup (chantiers 2-4) — conformité, recadrage, coût propre. */
  wolf: WolfTelemetry;
}

// ── Télémétrie « Le Loup » (chantier 4, C4.1) ───────────────────────────────

/** Une ligne d'audit telle que produite par verifyAndLog (generation_audits). */
export interface WolfAuditSample {
  kind: string;
  verdict: string | null;
  violations: Array<{ rule?: string; severity?: string }> | null;
  semantic_checked: boolean | null;
  regenerated: boolean | null;
}

export interface WolfTelemetry {
  totalAudits: number;
  byVerdict: Record<string, number>;
  conformityRatePct: number;
  minorRatePct: number;
  majorRatePct: number;
  semanticChecked: number;
  semanticCheckedRatePct: number;
  regenerated: number;
  /** Taux de recadrage : audits régénérés / audits totaux (enforce actif). */
  recadrageRatePct: number;
  totalViolations: number;
  avgViolationsPerAudit: number;
  topViolations: Array<{ rule: string; count: number }>;
  byKind: Record<string, { total: number; majeur: number }>;
  /** Coût propre du Loup (couche sémantique échantillonnée uniquement). */
  loupCostUsd: number;
  loupCostXof: number;
}

const LOUP_SEMANTIC_COST_PER_CALL = calculateDeepSeekChatCost(
  NAYA_PRICING.LOUP_SEMANTIC_INPUT_PER_CALL,
  NAYA_PRICING.LOUP_SEMANTIC_OUTPUT_PER_CALL,
);

/**
 * Télémétrie du Loup : conformité globale des générations, taux de recadrage,
 * top violations récurrentes (alimente le chantier 3) et coût propre de la
 * vérification sémantique. Fonction pure — les appels la nourrissent depuis
 * `getNayaTelemetryAdmin` avec les lignes non traitées de generation_audits.
 */
export function calculateNayaWolfTelemetry(audits: WolfAuditSample[]): WolfTelemetry {
  const totalAudits = audits.length;
  const byVerdict: Record<string, number> = {};
  const byKind: Record<string, { total: number; majeur: number }> = {};
  const violationCounts = new Map<string, number>();
  let totalViolations = 0;
  let semanticChecked = 0;
  let regenerated = 0;

  for (const audit of audits) {
    const verdict = audit.verdict ?? "inconnu";
    byVerdict[verdict] = (byVerdict[verdict] ?? 0) + 1;

    const kindStats = byKind[audit.kind] ?? { total: 0, majeur: 0 };
    kindStats.total += 1;
    if (verdict === "majeur") kindStats.majeur += 1;
    byKind[audit.kind] = kindStats;

    if (audit.semantic_checked) semanticChecked += 1;
    if (audit.regenerated) regenerated += 1;

    if (Array.isArray(audit.violations)) {
      for (const v of audit.violations) {
        if (!v || typeof v.rule !== "string") continue;
        totalViolations += 1;
        violationCounts.set(v.rule, (violationCounts.get(v.rule) ?? 0) + 1);
      }
    }
  }

  const pct = (n: number): number =>
    totalAudits > 0 ? Math.round((n / totalAudits) * 1000) / 10 : 0;

  const topViolations = [...violationCounts.entries()]
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const loupCostUsd = round4(LOUP_SEMANTIC_COST_PER_CALL.costUsd * semanticChecked);
  const loupCostXof = Math.round(LOUP_SEMANTIC_COST_PER_CALL.costXof * semanticChecked);

  return {
    totalAudits,
    byVerdict,
    conformityRatePct: pct(byVerdict["conforme"] ?? 0),
    minorRatePct: pct(byVerdict["mineur"] ?? 0),
    majorRatePct: pct(byVerdict["majeur"] ?? 0),
    semanticChecked,
    semanticCheckedRatePct: pct(semanticChecked),
    regenerated,
    recadrageRatePct: pct(regenerated),
    totalViolations,
    avgViolationsPerAudit:
      totalAudits > 0 ? Math.round((totalViolations / totalAudits) * 100) / 100 : 0,
    topViolations,
    byKind,
    loupCostUsd,
    loupCostXof,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function toSafeTokenCount(val: any): number {
  if (typeof val !== "number" || Number.isNaN(val)) return 0;
  if (val <= 0 || !Number.isFinite(val)) return 0;
  return val;
}

function clampShare(share: number): number {
  if (typeof share !== "number" || Number.isNaN(share)) return NAYA_PRICING.DEFAULT_OFF_PEAK_SHARE;
  return Math.max(0, Math.min(1, share));
}

/**
 * Heure de pointe DeepSeek (barème creux/plein, effectif 2026-08-16 16:00 UTC) :
 * 01:00-04:00 et 06:00-10:00 UTC — tout le reste est en heure creuse (−50 %).
 */
export function isDeepSeekPeakHour(now: Date): boolean {
  const h = now.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

/**
 * Coût deepseek-v4-flash (défis + recommandations) pour une paire input/output de
 * tokens. `offPeakSharePct` (défaut 70 %) pondère les taux creux/plein : 1 = tout
 * en creux, 0 = tout en pointe (plafond).
 */
export function calculateDeepSeekChatCost(
  inputTokens: number,
  outputTokens: number,
  offPeakSharePct: number = NAYA_PRICING.DEFAULT_OFF_PEAK_SHARE,
): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const share = clampShare(offPeakSharePct);
  const inputRate =
    share * NAYA_PRICING.DEEPSEEK_OFF_PEAK.FLASH_INPUT_PER_M +
    (1 - share) * NAYA_PRICING.DEEPSEEK_PEAK.FLASH_INPUT_PER_M;
  const outputRate =
    share * NAYA_PRICING.DEEPSEEK_OFF_PEAK.FLASH_OUTPUT_PER_M +
    (1 - share) * NAYA_PRICING.DEEPSEEK_PEAK.FLASH_OUTPUT_PER_M;
  const usd = (input / 1_000_000) * inputRate + (output / 1_000_000) * outputRate;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût deepseek-v4-pro (hypothèses) pour une paire input/output de tokens (même pondération). */
export function calculateDeepSeekReasonerCost(
  inputTokens: number,
  outputTokens: number,
  offPeakSharePct: number = NAYA_PRICING.DEFAULT_OFF_PEAK_SHARE,
): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const share = clampShare(offPeakSharePct);
  const inputRate =
    share * NAYA_PRICING.DEEPSEEK_OFF_PEAK.PRO_INPUT_PER_M +
    (1 - share) * NAYA_PRICING.DEEPSEEK_PEAK.PRO_INPUT_PER_M;
  const outputRate =
    share * NAYA_PRICING.DEEPSEEK_OFF_PEAK.PRO_OUTPUT_PER_M +
    (1 - share) * NAYA_PRICING.DEEPSEEK_PEAK.PRO_OUTPUT_PER_M;
  const usd = (input / 1_000_000) * inputRate + (output / 1_000_000) * outputRate;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût Claude Sonnet 5 (vision — preuve photo) pour une paire input/output de tokens. */
export function calculateVisionSonnetCost(
  inputTokens: number,
  outputTokens: number,
): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.SONNET_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.SONNET_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût GLM 5.3 Flash (Copilote Professeur) pour une paire input/output de tokens. */
export function calculateGlmFlashCost(inputTokens: number, outputTokens: number): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.GLM_FLASH_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.GLM_FLASH_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/** Coût Qwen 3.8 Flash pour une paire input/output de tokens. */
export function calculateQwenFlashCost(inputTokens: number, outputTokens: number): NayaCostResult {
  const input = toSafeTokenCount(inputTokens);
  const output = toSafeTokenCount(outputTokens);
  const usd =
    (input / 1_000_000) * NAYA_PRICING.QWEN_FLASH_INPUT_PER_M +
    (output / 1_000_000) * NAYA_PRICING.QWEN_FLASH_OUTPUT_PER_M;
  return { costUsd: round4(usd), costXof: Math.round(usd * NAYA_PRICING.USD_TO_XOF_RATE) };
}

/**
 * Calculates challenge conversion rate percentage: (completed / generated) * 100.
 * Clamped strictly to 0% – 100%.
 */
export function calculateNayaConversionRate(
  generatedCount: number,
  completedCount: number,
): number {
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
 * - Model breakdown (DeepSeek V4 Flash / DeepSeek V4 Pro / Claude Sonnet 5 Vision)
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
  /** Copilote Professeur : tokens GLM RÉELS remontés de generation_audits /
   * ai_feature_usage (agrégés par l'appelant), pas un multiplicateur estimé. */
  glmFlashTokens?: { input: number; output: number; calls?: number };
  /** Défis / Qwen : tokens Qwen RÉELS remontés si qwen3.8-flash a été sélectionné. */
  qwenFlashTokens?: { input: number; output: number; calls?: number };
}): NayaTelemetryResponse {
  const genCount = Math.max(0, raw.challengesGenerated || 0);
  const startCount = Math.max(0, raw.challengesStarted || 0);
  const compCount = Math.max(0, raw.challengesCompleted || 0);
  const photoProofCount = Math.max(0, raw.photoProofCompleted || 0);
  const hypCount = Math.max(0, raw.hypothesesCycles || 0);
  const recCount = Math.max(0, raw.recommendationsCount || 0);

  // Token multipliers per API call (mêmes ordres de grandeur qu'avant le
  // passage à DeepSeek — seul le fournisseur/tarif change, pas le volume estimé)
  // Défis text generation (deepseek-v4-flash): 1,200 input, 800 output per challenge generated
  const defisChatInput = genCount * 1200;
  const defisChatOutput = genCount * 800;

  // Photo proof validation (Claude Sonnet 5, vision) : 1,500 input, 300 output
  const defisVisionInput = photoProofCount * 1500;
  const defisVisionOutput = photoProofCount * 300;

  // Hypotheses cycles (deepseek-v4-pro) : 2,500 input, 600 output per cycle
  const hypReasonerInput = hypCount * 2500;
  const hypReasonerOutput = hypCount * 600;

  // Recommandations syntheses (deepseek-v4-flash) : 1,000 input, 500 output per synthesis
  const recChatInput = recCount * 1000;
  const recChatOutput = recCount * 500;

  const tokenUsage: NayaTokenUsage = {
    deepseekChatInputTokens: defisChatInput + recChatInput,
    deepseekChatOutputTokens: defisChatOutput + recChatOutput,
    deepseekReasonerInputTokens: hypReasonerInput,
    deepseekReasonerOutputTokens: hypReasonerOutput,
    visionSonnetInputTokens: defisVisionInput,
    visionSonnetOutputTokens: defisVisionOutput,
    glmFlashInputTokens: Math.max(0, raw.glmFlashTokens?.input ?? 0),
    glmFlashOutputTokens: Math.max(0, raw.glmFlashTokens?.output ?? 0),
    qwenFlashInputTokens: Math.max(0, raw.qwenFlashTokens?.input ?? 0),
    qwenFlashOutputTokens: Math.max(0, raw.qwenFlashTokens?.output ?? 0),
  };

  const totalChatTokens = tokenUsage.deepseekChatInputTokens + tokenUsage.deepseekChatOutputTokens;
  const totalReasonerTokens =
    tokenUsage.deepseekReasonerInputTokens + tokenUsage.deepseekReasonerOutputTokens;
  const totalVisionTokens =
    tokenUsage.visionSonnetInputTokens + tokenUsage.visionSonnetOutputTokens;
  const totalGlmTokens = tokenUsage.glmFlashInputTokens + tokenUsage.glmFlashOutputTokens;
  const totalQwenTokens = tokenUsage.qwenFlashInputTokens + tokenUsage.qwenFlashOutputTokens;
  const totalTokens =
    totalChatTokens + totalReasonerTokens + totalVisionTokens + totalGlmTokens + totalQwenTokens;

  const chatCosts = calculateDeepSeekChatCost(
    tokenUsage.deepseekChatInputTokens,
    tokenUsage.deepseekChatOutputTokens,
  );
  const reasonerCosts = calculateDeepSeekReasonerCost(
    tokenUsage.deepseekReasonerInputTokens,
    tokenUsage.deepseekReasonerOutputTokens,
  );
  const visionCosts = calculateVisionSonnetCost(
    tokenUsage.visionSonnetInputTokens,
    tokenUsage.visionSonnetOutputTokens,
  );
  const glmCosts = calculateGlmFlashCost(
    tokenUsage.glmFlashInputTokens,
    tokenUsage.glmFlashOutputTokens,
  );
  const qwenCosts = calculateQwenFlashCost(
    tokenUsage.qwenFlashInputTokens,
    tokenUsage.qwenFlashOutputTokens,
  );

  const totalCostUsd = round4(
    chatCosts.costUsd +
      reasonerCosts.costUsd +
      visionCosts.costUsd +
      glmCosts.costUsd +
      qwenCosts.costUsd,
  );
  const totalCostXof =
    chatCosts.costXof +
    reasonerCosts.costXof +
    visionCosts.costXof +
    glmCosts.costXof +
    qwenCosts.costXof;

  // Plafond du barème creux/plein : tous les appels DeepSeek facturés en pointe
  // (offPeakSharePct = 0). La vision Sonnet est inchangée (pas de creux/plein).
  const peakChatCosts = calculateDeepSeekChatCost(
    tokenUsage.deepseekChatInputTokens,
    tokenUsage.deepseekChatOutputTokens,
    0,
  );
  const peakReasonerCosts = calculateDeepSeekReasonerCost(
    tokenUsage.deepseekReasonerInputTokens,
    tokenUsage.deepseekReasonerOutputTokens,
    0,
  );
  const peakCeilingCostUsd = round4(
    peakChatCosts.costUsd + peakReasonerCosts.costUsd + visionCosts.costUsd,
  );
  const peakCeilingCostXof =
    peakChatCosts.costXof + peakReasonerCosts.costXof + visionCosts.costXof;

  const defisChatCosts = calculateDeepSeekChatCost(defisChatInput, defisChatOutput);
  const defisVisionCosts = calculateVisionSonnetCost(defisVisionInput, defisVisionOutput);
  const defisCostUsd = round4(defisChatCosts.costUsd + defisVisionCosts.costUsd);
  const defisCostXof = defisChatCosts.costXof + defisVisionCosts.costXof;

  const hypCosts = calculateDeepSeekReasonerCost(hypReasonerInput, hypReasonerOutput);
  const recCosts = calculateDeepSeekChatCost(recChatInput, recChatOutput);

  const glmFlashCalls = Math.max(0, raw.glmFlashTokens?.calls ?? 0);
  const totalApiCalls = genCount + photoProofCount + hypCount + recCount + glmFlashCalls;
  const conversionRatePct = calculateNayaConversionRate(genCount, compCount);

  const featureBreakdown: FeatureBreakdown[] = [
    {
      feature: "Défis",
      callsCount: genCount + photoProofCount,
      modelUsed: photoProofCount > 0 ? "DeepSeek V4 Flash + Sonnet (vision)" : "DeepSeek V4 Flash",
      estimatedTokens: defisChatInput + defisChatOutput + defisVisionInput + defisVisionOutput,
      costUsd: defisCostUsd,
      costXof: defisCostXof,
    },
    {
      feature: "Hypothèses",
      callsCount: hypCount,
      modelUsed: "DeepSeek V4 Pro",
      estimatedTokens: hypReasonerInput + hypReasonerOutput,
      costUsd: hypCosts.costUsd,
      costXof: hypCosts.costXof,
    },
    {
      feature: "Recommandations",
      callsCount: recCount,
      modelUsed: "DeepSeek V4 Flash",
      estimatedTokens: recChatInput + recChatOutput,
      costUsd: recCosts.costUsd,
      costXof: recCosts.costXof,
    },
    {
      feature: "Copilote Professeur" as const,
      callsCount: glmFlashCalls,
      modelUsed: "GLM 5.3 Flash" as const,
      estimatedTokens: totalGlmTokens,
      costUsd: glmCosts.costUsd,
      costXof: glmCosts.costXof,
    },
  ];

  const modelBreakdown: ModelUsageBreakdown[] = [
    {
      model: "DeepSeek V4 Flash",
      inputTokens: tokenUsage.deepseekChatInputTokens,
      outputTokens: tokenUsage.deepseekChatOutputTokens,
      totalTokens: totalChatTokens,
      costUsd: chatCosts.costUsd,
      costXof: chatCosts.costXof,
      sharePercentage: totalTokens > 0 ? Math.round((totalChatTokens / totalTokens) * 100) : 0,
    },
    {
      model: "DeepSeek V4 Pro",
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
    {
      model: "GLM 5.3 Flash" as const,
      inputTokens: tokenUsage.glmFlashInputTokens,
      outputTokens: tokenUsage.glmFlashOutputTokens,
      totalTokens: totalGlmTokens,
      costUsd: glmCosts.costUsd,
      costXof: glmCosts.costXof,
      sharePercentage:
        totalTokens > 0 ? Math.round((totalGlmTokens / totalTokens) * 100) : 0,
    },
    {
      model: "Qwen 3.8 Flash" as const,
      inputTokens: tokenUsage.qwenFlashInputTokens,
      outputTokens: tokenUsage.qwenFlashOutputTokens,
      totalTokens: totalQwenTokens,
      costUsd: qwenCosts.costUsd,
      costXof: qwenCosts.costXof,
      sharePercentage:
        totalTokens > 0 ? Math.round((totalQwenTokens / totalTokens) * 100) : 0,
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
    peakCeilingCostUsd,
    peakCeilingCostXof,
    conversionRatePct,
    featureBreakdown,
    modelBreakdown,
    funnel,
    projection: {
      projectedCallsMonthly,
      projectedCostUsdMonthly,
      projectedCostXofMonthly,
    },
    // Remplacé par getNayaTelemetryAdmin avec les audits réels (C4.1) — ici
    // l'état vide garantit que le type reste satisfait hors endpoint admin.
    wolf: calculateNayaWolfTelemetry([]),
  };
}

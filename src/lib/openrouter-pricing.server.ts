// Module serveur : Synchronisation temps réel des tarifs OpenRouter (API publique)
// Permet de calculer les coûts réels et dynamiques des modèles IA sans approximations en dur.

import type { ModelPricingRate, LiveOpenRouterPricing } from "./openrouter-pricing.types";
export type { ModelPricingRate, LiveOpenRouterPricing };

// Valeurs de repli exactes issues du dernier relevé OpenRouter
export const BASELINE_OPENROUTER_PRICING: LiveOpenRouterPricing = {
  deepseekChat: {
    inputPerM: 0.0808,
    outputPerM: 0.1616,
    modelId: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
  },
  deepseekReasoner: {
    inputPerM: 0.6876,
    outputPerM: 1.3753,
    modelId: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
  },
  glmFlash: {
    inputPerM: 0.075,
    outputPerM: 0.25,
    modelId: "z-ai/glm-5.3-flash",
    name: "GLM 5.3 Flash",
  },
  qwenFlash: {
    inputPerM: 0.0481,
    outputPerM: 0.193,
    modelId: "qwen/qwen3.8-flash",
    name: "Qwen 3.8 Flash",
  },
  visionSonnet: {
    inputPerM: 2.0,
    outputPerM: 10.0,
    modelId: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
  },
  isLive: false,
  source: "baseline_fallback",
  fetchedAt: new Date().toISOString(),
};

// Cache en mémoire avec TTL de 15 minutes
let cachedPricing: LiveOpenRouterPricing | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

interface OpenRouterRawModel {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

/**
 * Récupère les tarifs réels et en direct depuis l'API officielle OpenRouter.
 * Si l'appel réussit, le résultat est mis en cache (TTL 15 min).
 * Si l'appel échoue (coupure réseau, timeout), retombe sur le cache ou les valeurs de référence.
 */
export async function getLiveOpenRouterPricing(forceRefresh = false): Promise<LiveOpenRouterPricing> {
  const now = Date.now();
  if (!forceRefresh && cachedPricing && now - cacheTimestamp < CACHE_TTL_MS) {
    return {
      ...cachedPricing,
      source: "cached",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "Genizio-AdminOS/2.0",
    };
    if (process.env.OPENROUTER_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[openrouter-pricing] Échec HTTP ${res.status}, utilisation du cache/repli.`);
      const fallback = cachedPricing
        ? { ...cachedPricing, isLive: false, source: "cached" as const }
        : { ...BASELINE_OPENROUTER_PRICING, isLive: false, source: "baseline_fallback" as const };
      cachedPricing = fallback;
      cacheTimestamp = now;
      return fallback;
    }

    const json = (await res.json()) as { data?: OpenRouterRawModel[] };
    const rawList = Array.isArray(json?.data) ? json.data : [];

    const findModel = (candidateIds: string[]): ModelPricingRate | null => {
      for (const id of candidateIds) {
        const found = rawList.find((m) => m.id === id);
        if (found && found.pricing?.prompt && found.pricing?.completion) {
          const promptRate = Number.parseFloat(found.pricing.prompt);
          const completionRate = Number.parseFloat(found.pricing.completion);
          if (Number.isFinite(promptRate) && Number.isFinite(completionRate)) {
            return {
              inputPerM: Math.round(promptRate * 1_000_000 * 10000) / 10000,
              outputPerM: Math.round(completionRate * 1_000_000 * 10000) / 10000,
              modelId: found.id,
              name: found.name || id,
            };
          }
        }
      }
      return null;
    };

    // Recherche par priorité d'identifiants sur OpenRouter
    const deepseekChat =
      findModel([
        "deepseek/deepseek-v4-flash",
        "deepseek/deepseek-v4-flash-0731",
        "deepseek/deepseek-v4-flash-latest",
        "deepseek/deepseek-chat",
      ]) ?? BASELINE_OPENROUTER_PRICING.deepseekChat;

    const deepseekReasoner =
      findModel([
        "deepseek/deepseek-v4-pro",
        "deepseek/deepseek-v4-pro-0813",
        "deepseek/deepseek-reasoner",
        "deepseek/deepseek-r1",
      ]) ?? BASELINE_OPENROUTER_PRICING.deepseekReasoner;

    const glmFlash =
      findModel([
        "z-ai/glm-5.3-flash",
        "z-ai/glm-4.7-flash",
        "z-ai/glm-5",
        "z-ai/glm-4.5-air",
      ]) ?? BASELINE_OPENROUTER_PRICING.glmFlash;

    const qwenFlash =
      findModel([
        "qwen/qwen3.8-flash",
        "qwen/qwen3-30b-a3b-instruct-2507",
        "qwen/qwen3.6-flash",
        "qwen/qwen3.5-flash-02-23",
        "qwen/qwen3-coder-flash",
        "qwen/qwen-2.5-72b-instruct",
      ]) ?? BASELINE_OPENROUTER_PRICING.qwenFlash;

    const visionSonnet =
      findModel([
        "anthropic/claude-sonnet-5",
        "anthropic/claude-sonnet-4.6",
        "anthropic/claude-3.5-sonnet",
      ]) ?? BASELINE_OPENROUTER_PRICING.visionSonnet;

    const liveResult: LiveOpenRouterPricing = {
      deepseekChat,
      deepseekReasoner,
      glmFlash,
      qwenFlash,
      visionSonnet,
      isLive: true,
      source: "openrouter_api",
      fetchedAt: new Date().toISOString(),
    };

    cachedPricing = liveResult;
    cacheTimestamp = now;

    return liveResult;
  } catch (err: any) {
    console.error("[openrouter-pricing] Erreur lors de la récupération OpenRouter:", err?.message || err);
    const fallback = cachedPricing
      ? { ...cachedPricing, isLive: false, source: "cached" as const }
      : {
          ...BASELINE_OPENROUTER_PRICING,
          isLive: false,
          source: "baseline_fallback" as const,
          fetchedAt: new Date().toISOString(),
        };
    cachedPricing = fallback;
    cacheTimestamp = now;
    return fallback;
  }
}

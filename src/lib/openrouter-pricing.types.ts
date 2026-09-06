// Types partagés pour la synchronisation et le calcul des tarifs OpenRouter
// Ces types sont utilisables côté serveur comme côté client (Admin OS, télémétrie, UI).

export interface ModelPricingRate {
  inputPerM: number;
  outputPerM: number;
  modelId: string;
  name: string;
}

export interface LiveOpenRouterPricing {
  deepseekChat: ModelPricingRate;
  deepseekReasoner: ModelPricingRate;
  glmFlash: ModelPricingRate;
  qwenFlash: ModelPricingRate;
  visionSonnet: ModelPricingRate;
  isLive: boolean;
  source: "openrouter_api" | "cached" | "baseline_fallback";
  fetchedAt: string;
}

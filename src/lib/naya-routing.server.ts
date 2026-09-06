// Gestion du routage dynamique des modèles IA pour Naya (Admin OS).
// Permet de basculer la génération de défis entre DeepSeek V4 Flash, GLM 5.3 Flash
// et Qwen 3.8 Flash, avec persistance en base et fallback transparent de résilience.

import { callGLM } from "./glm.server";
import { callQwen } from "./qwen.server";
import { NAYA_SYSTEM_PROMPT, NAYA_SYSTEM_PROMPT_JSON } from "./naya-prompts";

export type ChallengeModelId = "deepseek-v4-flash" | "glm-5.3-flash" | "qwen3.8-flash";

export interface ChallengeModelOption {
  id: ChallengeModelId;
  label: string;
  provider: string;
  description: string;
  inputPricePerM: number;
  outputPricePerM: number;
  color: string;
}

export const CHALLENGE_MODEL_OPTIONS: ChallengeModelOption[] = [
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    description: "Modèle historique économique et rapide",
    inputPricePerM: 0.14,
    outputPricePerM: 0.28,
    color: "sky",
  },
  {
    id: "glm-5.3-flash",
    label: "GLM 5.3 Flash",
    provider: "GMICLoud / Zhipu (api.b.ai)",
    description: "Haute réactivité & multimodalité",
    inputPricePerM: 0.075,
    outputPricePerM: 0.25,
    color: "emerald",
  },
  {
    id: "qwen3.8-flash",
    label: "Qwen 3.8 Flash",
    provider: "api.b.ai / Alibaba",
    description: "Précision de raisonnement & vitesse d'exécution",
    inputPricePerM: 0.05,
    outputPricePerM: 0.15,
    color: "purple",
  },
];

export interface NayaModelRoutingSettings {
  challengeModel: ChallengeModelId;
  fallbackEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULT_SETTINGS: NayaModelRoutingSettings = {
  challengeModel: "deepseek-v4-flash",
  fallbackEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

// Cache en mémoire avec TTL 60 secondes pour éviter une lecture SQL à chaque défi
let cachedSettings: NayaModelRoutingSettings | null = null;
let cacheExpiresAt = 0;

export function invalidateNayaModelRoutingCache(): void {
  cachedSettings = null;
  cacheExpiresAt = 0;
}

/**
 * Récupère les paramètres de routage actifs depuis app_settings ou admin_naya_settings (ou cache).
 */
export async function getNayaModelRoutingSettings(
  db?: any,
): Promise<NayaModelRoutingSettings> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }

  let client = db;
  if (!client) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    } catch {
      return cachedSettings || DEFAULT_SETTINGS;
    }
  }

  // 1. Essai de lecture depuis la table générique app_settings (recommandée, sans migration)
  try {
    const { data: appData, error: appError } = await client
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "naya_model_routing")
      .maybeSingle();

    if (!appError && appData?.value) {
      const val = appData.value as any;
      const settings: NayaModelRoutingSettings = {
        challengeModel: (val.challenge_model as ChallengeModelId) || "deepseek-v4-flash",
        fallbackEnabled: val.fallback_enabled ?? true,
        updatedAt: (appData.updated_at as string) ?? null,
        updatedBy: (val.updated_by as string) ?? null,
      };
      cachedSettings = settings;
      cacheExpiresAt = now + 60_000;
      return settings;
    }
  } catch {
    // app_settings pas encore prête, repli sur admin_naya_settings
  }

  // 2. Repli sur admin_naya_settings si déjà migrée
  try {
    const { data, error } = await client
      .from("admin_naya_settings")
      .select("challenge_model, fallback_enabled, updated_at, updated_by")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) {
      const settings: NayaModelRoutingSettings = {
        challengeModel: (data.challenge_model as ChallengeModelId) || "deepseek-v4-flash",
        fallbackEnabled: data.fallback_enabled ?? true,
        updatedAt: data.updated_at ?? null,
        updatedBy: data.updated_by ?? null,
      };
      cachedSettings = settings;
      cacheExpiresAt = now + 60_000;
      return settings;
    }
  } catch {
    // table absente du schéma cache
  }

  return cachedSettings || DEFAULT_SETTINGS;
}

/**
 * Met à jour le modèle de défi actif dans app_settings et admin_naya_settings.
 * En cas d'indisponibilité temporaire des tables SQL (schema cache PostgREST),
 * le réglage est appliqué immédiatement en mémoire sans bloquer l'administrateur.
 */
export async function updateNayaModelRoutingSettings(
  db: any,
  params: { challengeModel: ChallengeModelId; fallbackEnabled?: boolean },
  updatedBy?: string,
): Promise<NayaModelRoutingSettings> {
  const fallback = params.fallbackEnabled ?? true;
  const nowIso = new Date().toISOString();

  const newSettings: NayaModelRoutingSettings = {
    challengeModel: params.challengeModel,
    fallbackEnabled: fallback,
    updatedAt: nowIso,
    updatedBy: updatedBy ?? null,
  };

  // 1. Tenter l'écriture dans app_settings (table générique présente dans types.ts)
  let persisted = false;
  try {
    const { error: appError } = await db
      .from("app_settings")
      .upsert(
        {
          key: "naya_model_routing",
          value: {
            challenge_model: params.challengeModel,
            fallback_enabled: fallback,
            updated_by: updatedBy ?? null,
          },
          updated_at: nowIso,
        },
        { onConflict: "key" },
      );

    if (!appError) {
      persisted = true;
    }
  } catch {
    // app_settings non disponible
  }

  // 2. Tenter également d'écrire dans admin_naya_settings (si table migrée)
  try {
    const { error: nayaError } = await db
      .from("admin_naya_settings")
      .upsert({
        id: "default",
        challenge_model: params.challengeModel,
        fallback_enabled: fallback,
        updated_at: nowIso,
        updated_by: updatedBy ?? null,
      });

    if (!nayaError) {
      persisted = true;
    }
  } catch {
    // admin_naya_settings non disponible
  }

  if (!persisted) {
    console.warn(
      "[Naya Routing] Persistance SQL différée (tables non trouvées dans le schema cache). Réglage appliqué en mémoire immédiate.",
    );
  }

  // Toujours mettre à jour le cache mémoire pour effet immédiat (valide 24h si pas de DB)
  cachedSettings = newSettings;
  cacheExpiresAt = Date.now() + (persisted ? 60_000 : 24 * 3600 * 1000);
  return newSettings;
}

export interface DispatchChallengeTextParams {
  prompt: string;
  jsonMode: boolean;
  maxOutputTokens: number;
  maxRetries: number;
  callDeepSeekFn: (
    prompt: string,
    jsonMode: boolean,
    maxOutputTokens: number,
    maxRetries: number,
    model: string,
  ) => Promise<string>;
}

/**
 * Routeur résilient pour la génération de texte/défis :
 * Appelle le modèle sélectionné dans admin_naya_settings et bascule automatiquement
 * sur un modèle de secours si le modèle principal échoue (ex: 429 ou clé manquante).
 */
export async function dispatchChallengeTextGeneration(
  params: DispatchChallengeTextParams,
): Promise<{ text: string; modelUsed: ChallengeModelId }> {
  const settings = await getNayaModelRoutingSettings();
  const selectedModel = settings.challengeModel;
  const systemPrompt = params.jsonMode ? NAYA_SYSTEM_PROMPT_JSON : NAYA_SYSTEM_PROMPT;

  // 1. Essai avec le modèle sélectionné
  try {
    if (selectedModel === "qwen3.8-flash") {
      const qwenRes = await callQwen(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.prompt },
        ],
        {
          jsonMode: params.jsonMode,
          maxTokens: params.maxOutputTokens,
          maxRetries: params.maxRetries,
        },
      );
      return { text: qwenRes.text, modelUsed: "qwen3.8-flash" };
    }

    if (selectedModel === "glm-5.3-flash") {
      const glmRes = await callGLM(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.prompt },
        ],
        {
          jsonMode: params.jsonMode,
          maxTokens: params.maxOutputTokens,
          maxRetries: params.maxRetries,
        },
      );
      return { text: glmRes.text, modelUsed: "glm-5.3-flash" };
    }

    // Par défaut : DeepSeek
    const text = await params.callDeepSeekFn(
      params.prompt,
      params.jsonMode,
      params.maxOutputTokens,
      params.maxRetries,
      "deepseek-chat",
    );
    return { text, modelUsed: "deepseek-v4-flash" };
  } catch (primaryErr: any) {
    if (!settings.fallbackEnabled) {
      throw primaryErr;
    }

    console.warn(
      `[Naya Routing] Échec du modèle principal ${selectedModel} (${primaryErr.message}). Déclenchement du fallback de résilience...`,
    );

    // 2. Cascade de fallback de résilience sur les autres moteurs IA
    const fallbackCandidates: ChallengeModelId[] =
      selectedModel === "deepseek-v4-flash"
        ? ["glm-5.3-flash", "qwen3.8-flash"]
        : selectedModel === "glm-5.3-flash"
        ? ["deepseek-v4-flash", "qwen3.8-flash"]
        : ["deepseek-v4-flash", "glm-5.3-flash"];

    for (const fallbackModel of fallbackCandidates) {
      try {
        if (fallbackModel === "deepseek-v4-flash") {
          const fallbackText = await params.callDeepSeekFn(
            params.prompt,
            params.jsonMode,
            params.maxOutputTokens,
            params.maxRetries,
            "deepseek-chat",
          );
          return { text: fallbackText, modelUsed: "deepseek-v4-flash" };
        }
        if (fallbackModel === "glm-5.3-flash") {
          const glmRes = await callGLM(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: params.prompt },
            ],
            {
              jsonMode: params.jsonMode,
              maxTokens: params.maxOutputTokens,
              maxRetries: 2,
            },
          );
          return { text: glmRes.text, modelUsed: "glm-5.3-flash" };
        }
        if (fallbackModel === "qwen3.8-flash") {
          const qwenRes = await callQwen(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: params.prompt },
            ],
            {
              jsonMode: params.jsonMode,
              maxTokens: params.maxOutputTokens,
              maxRetries: 2,
            },
          );
          return { text: qwenRes.text, modelUsed: "qwen3.8-flash" };
        }
      } catch (fallbackErr: any) {
        console.error(
          `[Naya Routing] Fallback ${fallbackModel} a également échoué:`,
          fallbackErr?.message || fallbackErr,
        );
      }
    }

    // Si tous les fallbacks échouent, lever l'erreur d'origine
    throw primaryErr;
  }
}

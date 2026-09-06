// Passerelle Qwen 3.8 Flash — adaptateur OpenAI-compatible (api.b.ai/v1/chat/completions).
// Miroir strict de callDeepSeekText et callGLM : même timeout (45 s), même backoff
// exponentiel, même sémantique d'erreur (429 → quota utilisateur, 5xx → transient
// retenté, 4xx → fatal).
//
// Sécurité : la clé vit UNIQUEMENT côté serveur (process.env.QWEN_API_KEY / DASHSCOPE_API_KEY / GLM_API_KEY) — ce
// module ne doit jamais être importé depuis le code client.

const QWEN_BASE_URL_DEFAULT = "https://api.b.ai/v1";
const QWEN_MODEL_DEFAULT = "qwen3.8-flash";

export interface QwenMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenCallOptions {
  /** Force un JSON brut en réponse (response_format json_object + garde system). */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  /** Surcharge ponctuelle du modèle (défaut : QWEN_MODEL env ou qwen3.8-flash). */
  model?: string;
}

export interface QwenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface QwenResult {
  text: string;
  usage: QwenUsage;
  /** Modèle réellement répondu par l'API. */
  respondedModel?: string;
}

/** Dépendances injectables pour les tests (défaut : réseau réel). */
export interface QwenDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class QwenMissingKeyError extends Error {
  constructor() {
    super("Clé API Qwen non configurée dans .env (QWEN_API_KEY ou GLM_API_KEY)");
    this.name = "QwenMissingKeyError";
  }
}

export function qwenConfig() {
  const apiKey =
    process.env.QWEN_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.GLM_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.ZHIPUAI_API_KEY ||
    process.env.BAI_API_KEY;
  const baseUrl = (process.env.QWEN_BASE_URL || QWEN_BASE_URL_DEFAULT).replace(/\/$/, "");
  const model = process.env.QWEN_MODEL || QWEN_MODEL_DEFAULT;
  return { apiKey, baseUrl, model };
}

interface QwenApiResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null; reasoning_content?: string | null };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string };
}

/**
 * Appel Qwen 3.8 Flash (OpenAI-compatible) pour la génération de texte et défis.
 * Ne streame pas : attend une réponse JSON complète. Retourne le texte ET les tokens d'usage.
 */
export async function callQwen(
  messages: QwenMessage[],
  opts: QwenCallOptions = {},
  deps: QwenDeps = {},
): Promise<QwenResult> {
  const { apiKey, baseUrl, model } = qwenConfig();
  if (!apiKey) throw new QwenMissingKeyError();

  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const maxRetries = opts.maxRetries ?? 3;
  const maxTokens = opts.maxTokens ?? 4000;
  const requestedModel = opts.model ?? model;

  let attempt = 0;
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await doFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: requestedModel,
          max_tokens: maxTokens,
          messages,
          temperature: opts.temperature ?? 0.6,
          ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Qwen API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error(
            "Quota IA Qwen momentanément épuisé (429). Veuillez patienter une minute avant de réessayer.",
          );
        }
        if (response.status >= 500) {
          throw new Error(`Erreur Qwen API (${response.status})`); // transient -> retry
        }
        throw new Error(`Erreur Qwen API (${response.status}) - Fatal`);
      }

      const json = (await response.json()) as QwenApiResponse;
      if (json.error) {
        throw new Error(
          `Erreur Qwen API : ${json.error.message ?? JSON.stringify(json.error)} - Fatal`,
        );
      }

      if (json.model && json.model !== requestedModel) {
        console.warn(`Qwen model drift: demandé ${requestedModel}, répondu ${json.model}`);
      }

      const choice = json.choices?.[0];
      let textContent: string = choice?.message?.content ?? "";
      if (!textContent && choice?.message?.reasoning_content) {
        textContent = choice.message.reasoning_content;
      }

      if (opts.jsonMode && textContent) {
        textContent = textContent.trim();
        if (textContent.startsWith("```")) {
          textContent = textContent
            .replace(/^```[a-z]*\n/, "")
            .replace(/\n```$/, "")
            .trim();
        }
      }

      if (!textContent) {
        console.error("Qwen empty choice response:", JSON.stringify(json));
        throw new Error(
          `Réponse Qwen vide (finish_reason: ${choice?.finish_reason || "inconnu"})`,
        );
      }

      clearTimeout(timeoutId);
      return {
        text: textContent,
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
        },
        respondedModel: json.model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isFatal =
        (err.message && (err.message.includes("Fatal") || err.message.includes("429"))) ||
        err instanceof QwenMissingKeyError;
      if (attempt >= maxRetries || isFatal) {
        throw err;
      }

      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      console.log(`Retrying Qwen API in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw new Error("Erreur Qwen API après plusieurs tentatives.");
}

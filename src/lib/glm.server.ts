// Passerelle GLM 5.3 Flash — adaptateur OpenAI-compatible (api.b.ai/v1/chat/completions).
// Porte le Copilote Professeur (fiches de préparation multimodales) ; la vision de
// validation de preuves reste sur Claude Sonnet 5 via callClaude (challenges.functions).
//
// Miroir volontaire de callDeepSeekText : mêmes timeout (45 s), même backoff
// exponentiel, même sémantique d'erreur (429 → quota utilisateur, 5xx → transient
// retenté, 4xx → fatal). Isolé dans son module (au lieu de grossir
// challenges.functions.ts, déjà à 4 500+ lignes) pour rester injectable en tests
// (fetch + sleep fournis) et réutilisable par d'autres features que le copilote.
//
// Sécurité : la clé vit UNIQUEMENT côté serveur (process.env.GLM_API_KEY) — ce
// module ne doit jamais être importé depuis le code client.

const GLM_BASE_URL_DEFAULT = "https://api.b.ai/v1";
const GLM_MODEL_DEFAULT = "glm-5.3-flash";

/** Partie de contenu multimodal (format OpenAI chat/completions). */
export type GlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface GlmMessage {
  role: "system" | "user" | "assistant";
  content: string | GlmContentPart[];
}

export interface GlmCallOptions {
  /** Force un JSON brut en réponse (response_format json_object + garde system). */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  /** Surcharge ponctuelle du modèle (défaut : GLM_MODEL env ou glm-5.3-flash). */
  model?: string;
}

export interface GlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GlmResult {
  text: string;
  usage: GlmUsage;
  /** Modèle réellement répondu par l'API — tolérance de dérive côté ops. */
  respondedModel?: string;
}

/** Dépendances injectables pour les tests (défaut : réseau réel). */
export interface GlmDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Levée quand l'API rejette une requête contenant des images (4xx hors 429) :
 * l'appelant intercepte pour basculer sur le chemin vision Claude (callClaude)
 * au lieu d'échouer — le copilote doit toujours produire une fiche.
 */
export class GlmVisionUnsupportedError extends Error {
  constructor(readonly status: number, detail: string) {
    super(`GLM n'a pas traité l'image (HTTP ${status}) : ${detail}`);
    this.name = "GlmVisionUnsupportedError";
  }
}

export class GlmMissingKeyError extends Error {
  constructor() {
    super("Clé API GLM non configurée dans .env (GLM_API_KEY)");
    this.name = "GlmMissingKeyError";
  }
}

function glmConfig() {
  const apiKey =
    process.env.GLM_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.ZHIPUAI_API_KEY ||
    process.env.BIGMODEL_API_KEY;
  const baseUrl = (process.env.GLM_BASE_URL || GLM_BASE_URL_DEFAULT).replace(/\/$/, "");
  const model = process.env.GLM_MODEL || GLM_MODEL_DEFAULT;
  return { apiKey, baseUrl, model };
}

interface GlmApiResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null; reasoning_content?: string | null };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string };
}

/**
 * Appel GLM 5.3 Flash (OpenAI-compatible), texte et multimodal (images en
 * content-parts `image_url` data URL). Ne streame pas : le copilote attend un
 * JSON complet. Retourne le texte ET les tokens d'usage réels pour la télémétrie.
 */
export async function callGLM(
  messages: GlmMessage[],
  opts: GlmCallOptions = {},
  deps: GlmDeps = {},
): Promise<GlmResult> {
  const { apiKey, baseUrl, model } = glmConfig();
  if (!apiKey) throw new GlmMissingKeyError();

  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const maxRetries = opts.maxRetries ?? 3;
  const maxTokens = opts.maxTokens ?? 4000;
  const requestedModel = opts.model ?? model;
  const hasImage = messages.some(
    (m) => typeof m.content !== "string" && m.content.some((p) => p.type === "image_url"),
  );

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
        console.error(`GLM API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error(
            "Quota IA momentanément épuisé (429). Veuillez patienter une minute avant de réessayer.",
          );
        }
        if (hasImage && response.status >= 400 && response.status < 500) {
          // 4xx avec image : l'endpoint refuse probablement les content-parts
          // multimodales — fatal et typé, l'appelant bascule sur Claude vision.
          throw new GlmVisionUnsupportedError(response.status, errorText.slice(0, 300));
        }
        if (response.status >= 500) {
          throw new Error(`Erreur GLM API (${response.status})`); // transient -> retry
        }
        throw new Error(`Erreur GLM API (${response.status}) - Fatal`);
      }

      const json = (await response.json()) as GlmApiResponse;
      if (json.error) {
        // Certains proxies OpenAI-compatibles répondent 200 avec un corps d'erreur
        // (content policy, auth…) — déterministes, donc pas de retry : fatal.
        throw new Error(
          `Erreur GLM API : ${json.error.message ?? JSON.stringify(json.error)} - Fatal`,
        );
      }

      if (json.model && json.model !== requestedModel) {
        // Dérive de modèle côté endpoint (routing/proxy) : on logue sans casser.
        console.warn(`GLM model drift: demandé ${requestedModel}, répondu ${json.model}`);
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
        console.error("GLM empty choice response:", JSON.stringify(json));
        throw new Error(
          `Réponse GLM vide (finish_reason: ${choice?.finish_reason || "inconnu"})`,
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
        (err.message && err.message.includes("Fatal")) ||
        err instanceof GlmVisionUnsupportedError ||
        err instanceof GlmMissingKeyError;
      if (attempt >= maxRetries || isFatal) {
        throw err;
      }

      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      console.log(`Retrying GLM API in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw new Error("Erreur GLM API après plusieurs tentatives.");
}

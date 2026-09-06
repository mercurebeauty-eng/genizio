import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callGLM, GlmMissingKeyError, GlmVisionUnsupportedError } from "./glm.server";
import { callQwen, QwenMissingKeyError } from "./qwen.server";
import { callClaude, callDeepSeekText, callAnthropicVision } from "./challenges.functions";
import { dispatchChallengeTextGeneration, getNayaModelRoutingSettings, updateNayaModelRoutingSettings } from "./naya-routing.server";
import { getLiveOpenRouterPricing } from "./openrouter-pricing.server";
import { computeAiProviderStatus } from "./admin-os.functions";
import { calculateNayaTelemetry, NAYA_PRICING } from "./naya-telemetry";

describe("Certification Complète — Passerelles IA & Télémétrie Génizio", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("R1. Passerelle GLM 5.3 Flash (api.b.ai/v1/chat/completions)", () => {
    it("communique correctement avec api.b.ai et parse la réponse JSON (200)", async () => {
      process.env.GLM_API_KEY = "test-glm-key";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: "glm-5.3-flash",
          choices: [
            {
              message: { content: '{"challenge": "Fabriquer un sablier", "domain": "Artisanat"}' },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 80 },
        }),
      });

      const res = await callGLM(
        [{ role: "user", content: "Créer un défi" }],
        { jsonMode: true },
        { fetch: mockFetch as any },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.b.ai/v1/chat/completions");
      expect(init.headers["Authorization"]).toBe("Bearer test-glm-key");
      expect(init.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(init.body);
      expect(body.model).toBe("glm-5.3-flash");
      expect(body.response_format).toEqual({ type: "json_object" });

      expect(res.text).toBe('{"challenge": "Fabriquer un sablier", "domain": "Artisanat"}');
      expect(res.usage.inputTokens).toBe(120);
      expect(res.usage.outputTokens).toBe(80);
    });

    it("autorise l'authentification GLM via la clé partagée QWEN_API_KEY ou BAI_API_KEY", async () => {
      delete process.env.GLM_API_KEY;
      process.env.QWEN_API_KEY = "shared-bai-key-via-qwen";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "OK" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      const res = await callGLM([{ role: "user", content: "Ping" }], {}, { fetch: mockFetch as any });
      expect(res.text).toBe("OK");
      expect(mockFetch.mock.calls[0][1].headers["Authorization"]).toBe("Bearer shared-bai-key-via-qwen");
    });

    it("gère l'erreur 429 quota utilisateur avec message clair", async () => {
      process.env.GLM_API_KEY = "test-key";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      await expect(
        callGLM([{ role: "user", content: "Test" }], { maxRetries: 1 }, { fetch: mockFetch as any }),
      ).rejects.toThrow("Quota IA momentanément épuisé (429)");
    });

    it("réessaie avec backoff sur erreur 5xx transient puis réussit", async () => {
      process.env.GLM_API_KEY = "test-key";
      let calls = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        calls++;
        if (calls === 1) {
          return { ok: false, status: 503, text: async () => "Service Unavailable" };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "Succès après retry" } }],
            usage: { prompt_tokens: 50, completion_tokens: 25 },
          }),
        };
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const res = await callGLM(
        [{ role: "user", content: "Test" }],
        { maxRetries: 3 },
        { fetch: mockFetch as any, sleep: mockSleep },
      );

      expect(calls).toBe(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
      expect(res.text).toBe("Succès après retry");
    });

    it("interrompt immédiatement sans retry sur erreur 4xx fatale", async () => {
      process.env.GLM_API_KEY = "test-key";
      let calls = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        calls++;
        return { ok: false, status: 401, text: async () => "Unauthorized invalid key" };
      });

      await expect(
        callGLM([{ role: "user", content: "Test" }], { maxRetries: 3 }, { fetch: mockFetch as any }),
      ).rejects.toThrow("Fatal");
      expect(calls).toBe(1);
    });
  });

  describe("R1. Passerelle Qwen 3.8 Flash (api.b.ai/v1/chat/completions)", () => {
    it("communique correctement avec api.b.ai et parse la réponse JSON (200)", async () => {
      process.env.QWEN_API_KEY = "test-qwen-key";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: "qwen3.8-flash",
          choices: [
            {
              message: { content: '{"mission": "Observer 3 insectes", "subject": "Sciences"}' },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 90, completion_tokens: 45 },
        }),
      });

      const res = await callQwen(
        [{ role: "user", content: "Défi nature" }],
        { jsonMode: true },
        { fetch: mockFetch as any },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.b.ai/v1/chat/completions");
      expect(init.headers["Authorization"]).toBe("Bearer test-qwen-key");

      const body = JSON.parse(init.body);
      expect(body.model).toBe("qwen3.8-flash");
      expect(res.text).toBe('{"mission": "Observer 3 insectes", "subject": "Sciences"}');
      expect(res.usage.inputTokens).toBe(90);
      expect(res.usage.outputTokens).toBe(45);
    });

    it("autorise l'authentification Qwen via la clé partagée GLM_API_KEY", async () => {
      delete process.env.QWEN_API_KEY;
      process.env.GLM_API_KEY = "shared-bai-key-via-glm";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "OK Qwen" } }],
          usage: { prompt_tokens: 15, completion_tokens: 10 },
        }),
      });

      const res = await callQwen([{ role: "user", content: "Ping" }], {}, { fetch: mockFetch as any });
      expect(res.text).toBe("OK Qwen");
      expect(mockFetch.mock.calls[0][1].headers["Authorization"]).toBe("Bearer shared-bai-key-via-glm");
    });

    it("interrompt immédiatement sans retry sur erreur 429 quota épuisé", async () => {
      process.env.QWEN_API_KEY = "test-qwen-key";
      let calls = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        calls++;
        return { ok: false, status: 429, text: async () => "Rate limit reached" };
      });

      await expect(
        callQwen([{ role: "user", content: "Test" }], { maxRetries: 3 }, { fetch: mockFetch as any }),
      ).rejects.toThrow("Quota IA Qwen momentanément épuisé (429)");
      expect(calls).toBe(1);
    });

    it("réessaie avec backoff sur erreur 5xx transient puis réussit", async () => {
      process.env.QWEN_API_KEY = "test-qwen-key";
      let calls = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        calls++;
        if (calls === 1) return { ok: false, status: 502, text: async () => "Bad Gateway" };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "Succès après 502" } }],
            usage: { prompt_tokens: 30, completion_tokens: 15 },
          }),
        };
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const res = await callQwen(
        [{ role: "user", content: "Test" }],
        { maxRetries: 3 },
        { fetch: mockFetch as any, sleep: mockSleep },
      );
      expect(calls).toBe(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
      expect(res.text).toBe("Succès après 502");
    });

    it("interrompt immédiatement sans retry sur erreur 4xx fatale", async () => {
      process.env.QWEN_API_KEY = "test-qwen-key";
      let calls = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        calls++;
        return { ok: false, status: 403, text: async () => "Forbidden" };
      });

      await expect(
        callQwen([{ role: "user", content: "Test" }], { maxRetries: 3 }, { fetch: mockFetch as any }),
      ).rejects.toThrow("Fatal");
      expect(calls).toBe(1);
    });
  });

  describe("R1. Passerelle DeepSeek (api.deepseek.com/chat/completions) & Claude Vision", () => {
    it("utilise deepseek-v4-flash pour le texte standard et deepseek-v4-pro avec thinking pour le raisonnement", async () => {
      process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

      const requestedModels: string[] = [];
      const requestedThinkings: any[] = [];

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init: any) => {
        if (url.toString().includes("api.deepseek.com")) {
          const body = JSON.parse(init.body);
          requestedModels.push(body.model);
          requestedThinkings.push(body.thinking);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: '{"result": "ok"}' } }],
            }),
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      // Appel standard pour les défis (via callClaude sans override de modèle)
      // On force le routage sur deepseek-v4-flash
      const textRes = await callClaude("Prompt défi", true);
      expect(textRes).toBe('{"result": "ok"}');
      expect(requestedModels[0]).toBe("deepseek-v4-flash");
      expect(requestedThinkings[0]).toEqual({ type: "disabled" });

      // Appel de raisonnement bayésien (modelOverride: deepseek-reasoner)
      const reasonerRes = await callClaude("Prompt hypothèse", true, undefined, 4000, 3, undefined, "deepseek-reasoner");
      expect(reasonerRes).toBe('{"result": "ok"}');
      expect(requestedModels[1]).toBe("deepseek-v4-pro");
      expect(requestedThinkings[1]).toEqual({ type: "enabled", reasoning_effort: "high" });
    });

    it("route systématiquement sur Claude Sonnet 5 quand une image est présente", async () => {
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      let calledUrl = "";
      let sentModel = "";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init: any) => {
        calledUrl = url.toString();
        const body = JSON.parse(init.body);
        sentModel = body.model;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            content: [
              { type: "thinking", thinking: "Analyse de la photo..." },
              { type: "text", text: '{"validated": true, "reason": "Preuve conforme"}' },
            ],
          }),
        } as any;
      });

      const res = await callClaude(
        "Vérifier cette photo",
        true,
        undefined,
        4000,
        3,
        { base64: "aW1hZ2VkYXRh", mediaType: "image/jpeg" },
      );

      expect(calledUrl).toBe("https://api.anthropic.com/v1/messages");
      expect(sentModel).toBe("claude-sonnet-5");
      expect(res).toBe('{"validated": true, "reason": "Preuve conforme"}');
    });

    it("callDeepSeekText: gère strictement 429 quota (fatal immédiat), 5xx retry et 4xx fatal", async () => {
      process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

      // Cas 429 quota : interruption immédiate sans boucle de retry inutile
      let calls429 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
        calls429++;
        return { ok: false, status: 429, text: async () => "Rate limit exceeded" } as any;
      });

      await expect(callDeepSeekText("Prompt", false, 1000, 3, "deepseek-chat")).rejects.toThrow("Quota DeepSeek atteint (429)");
      expect(calls429).toBe(1);

      // Cas 5xx : retry avec succès
      let calls500 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        calls500++;
        if (calls500 === 1) return { ok: false, status: 503, text: async () => "Service Unavailable" } as any;
        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: "OK après 503" } }] }),
        } as any;
      });

      const res500 = await callDeepSeekText("Prompt", false, 1000, 3, "deepseek-chat");
      expect(calls500).toBe(2);
      expect(res500).toBe("OK après 503");

      // Cas 4xx : fatal immédiat
      let calls401 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
        calls401++;
        return { ok: false, status: 401, text: async () => "Unauthorized" } as any;
      });

      await expect(callDeepSeekText("Prompt", false, 1000, 3, "deepseek-chat")).rejects.toThrow("Fatal");
      expect(calls401).toBe(1);
    });

    it("callAnthropicVision: gère strictement 429 quota (fatal immédiat), 5xx retry et 4xx fatal", async () => {
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      // Cas 429 quota : interruption immédiate
      let calls429 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
        calls429++;
        return { ok: false, status: 429, text: async () => "Quota Anthropic exceeded" } as any;
      });

      await expect(
        callAnthropicVision("Regarde", false, undefined, { base64: "dGVzdA==", mediaType: "image/jpeg" }, 1000, 3, "claude-sonnet-5")
      ).rejects.toThrow("Quota Anthropic atteint (429)");
      expect(calls429).toBe(1);

      // Cas 5xx : retry avec succès
      let calls500 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        calls500++;
        if (calls500 === 1) return { ok: false, status: 500, text: async () => "Internal Server Error" } as any;
        return {
          ok: true,
          status: 200,
          json: async () => ({ content: [{ type: "text", text: "Vision ok après retry" }] }),
        } as any;
      });

      const res500 = await callAnthropicVision("Regarde", false, undefined, { base64: "dGVzdA==", mediaType: "image/jpeg" }, 1000, 3, "claude-sonnet-5");
      expect(calls500).toBe(2);
      expect(res500).toBe("Vision ok après retry");

      // Cas 4xx : fatal immédiat
      let calls400 = 0;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
        calls400++;
        return { ok: false, status: 400, text: async () => "Bad request" } as any;
      });

      await expect(
        callAnthropicVision("Regarde", false, undefined, { base64: "dGVzdA==", mediaType: "image/jpeg" }, 1000, 3, "claude-sonnet-5")
      ).rejects.toThrow("Fatal");
      expect(calls400).toBe(1);
    });
  });

  describe("R1. Résilience & Fallback Transparent", () => {
    it("bascule automatiquement sur DeepSeek si le modèle principal Qwen échoue", async () => {
      process.env.DEEPSEEK_API_KEY = "ds-key";
      process.env.QWEN_API_KEY = "qwen-key";

      // Simuler Qwen qui timeout ou lève une erreur
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (url.toString().includes("api.b.ai")) {
          throw new Error("Timeout 45s dépassé");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: '{"fallback": true}' } }],
          }),
        } as any;
      });

      // Configurer le modèle actif sur qwen3.8-flash avec fallback activé
      const mockDb = {
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { challenge_model: "qwen3.8-flash", fallback_enabled: true } }) }) }),
          upsert: async () => ({ error: null }),
        }),
      };
      await updateNayaModelRoutingSettings(mockDb, { challengeModel: "qwen3.8-flash", fallbackEnabled: true });

      const mockDeepSeek = vi.fn().mockResolvedValue('{"fallback": "deepseek-success"}');

      const res = await dispatchChallengeTextGeneration({
        prompt: "Défi test",
        jsonMode: true,
        maxOutputTokens: 1000,
        maxRetries: 1,
        callDeepSeekFn: mockDeepSeek,
      });

      expect(mockDeepSeek).toHaveBeenCalledTimes(1);
      expect(res.text).toBe('{"fallback": "deepseek-success"}');
      expect(res.modelUsed).toBe("deepseek-v4-flash");
    });

    it("cascade vers le 2ème modèle de secours si le 1er secours échoue également (Qwen -> DeepSeek échoue -> GLM réussit)", async () => {
      process.env.DEEPSEEK_API_KEY = "ds-key";
      process.env.QWEN_API_KEY = "qwen-key";
      process.env.GLM_API_KEY = "glm-key";

      // Simuler Qwen (primaire) qui échoue, puis GLM (secours cascade) qui réussit
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any, init: any) => {
        if (url.toString().includes("api.b.ai")) {
          const body = JSON.parse(init?.body || "{}");
          if (body.model === "qwen3.8-flash") {
            throw new Error("Qwen 503 Provider Outage");
          }
          if (body.model === "glm-5.3-flash") {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                choices: [{ message: { content: '{"cascade": "glm-saved-the-day"}' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 },
              }),
            } as any;
          }
        }
        return { ok: false, status: 500 } as any;
      });

      const mockDb = {
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { challenge_model: "qwen3.8-flash", fallback_enabled: true } }) }) }),
          upsert: async () => ({ error: null }),
        }),
      };
      await updateNayaModelRoutingSettings(mockDb, { challengeModel: "qwen3.8-flash", fallbackEnabled: true });

      // Simuler DeepSeek (1er fallback) qui échoue également
      const mockFailingDeepSeek = vi.fn().mockRejectedValue(new Error("DeepSeek 503 Outage"));

      const res = await dispatchChallengeTextGeneration({
        prompt: "Défi test",
        jsonMode: true,
        maxOutputTokens: 1000,
        maxRetries: 1,
        callDeepSeekFn: mockFailingDeepSeek,
      });

      expect(mockFailingDeepSeek).toHaveBeenCalledTimes(1);
      expect(res.text).toBe('{"cascade": "glm-saved-the-day"}');
      expect(res.modelUsed).toBe("glm-5.3-flash");
    });
  });

  describe("R2. Tarification en Direct OpenRouter & Télémétrie", () => {
    it("interroge l'API OpenRouter et extrait avec succès les taux des 5 modèles", async () => {
      const mockOpenRouterResponse = {
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
            id: "z-ai/glm-5.3-flash",
            name: "GLM 5.3 Flash",
            pricing: { prompt: "0.000000075", completion: "0.00000025" },
          },
          {
            id: "qwen/qwen3.8-flash",
            name: "Qwen 3.8 Flash",
            pricing: { prompt: "0.00000015", completion: "0.00000047" },
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
        json: async () => mockOpenRouterResponse,
      } as any);

      const liveRates = await getLiveOpenRouterPricing(true);
      expect(liveRates.isLive).toBe(true);
      expect(liveRates.source).toBe("openrouter_api");

      expect(liveRates.deepseekChat.inputPerM).toBe(0.0808);
      expect(liveRates.deepseekChat.outputPerM).toBe(0.1616);

      expect(liveRates.deepseekReasoner.inputPerM).toBe(0.6876);
      expect(liveRates.deepseekReasoner.outputPerM).toBe(1.3753);

      expect(liveRates.glmFlash.inputPerM).toBe(0.075);
      expect(liveRates.glmFlash.outputPerM).toBe(0.25);

      expect(liveRates.qwenFlash.inputPerM).toBe(0.15);
      expect(liveRates.qwenFlash.outputPerM).toBe(0.47);

      expect(liveRates.visionSonnet.inputPerM).toBe(2.0);
      expect(liveRates.visionSonnet.outputPerM).toBe(10.0);
    });

    it("respecte la mise en cache de 15 minutes sans re-fetch inutile", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as any);

      // 1er appel forcé
      await getLiveOpenRouterPricing(true);
      const callCountAfterFirst = fetchSpy.mock.calls.length;

      // 2ème appel sans forceRefresh -> doit utiliser le cache mémoire
      const cached = await getLiveOpenRouterPricing(false);
      expect(fetchSpy.mock.calls.length).toBe(callCountAfterFirst);
      expect(cached.source).toBe("cached");
    });

    it("résiste à une coupure réseau OpenRouter sans bloquer les requêtes suivantes en boucle", async () => {
      // 1er appel échoue (panne OpenRouter / timeout 6s)
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EHOSTUNREACH OpenRouter down"));

      const fallbackRates = await getLiveOpenRouterPricing(true);
      expect(fallbackRates).toBeDefined();
      expect(fallbackRates.isLive).toBe(false);
      expect(fallbackRates.glmFlash.inputPerM).toBe(0.075);
      expect(fallbackRates.qwenFlash.inputPerM).toBe(0.0481);
      const callsAfterFailure = fetchSpy.mock.calls.length;

      // 2ème appel (non forcé) pendant la coupure : DOIT utiliser le repli en cache et NE PAS relancer de fetch qui pendrait 6 secondes
      const cachedRates = await getLiveOpenRouterPricing(false);
      expect(fetchSpy.mock.calls.length).toBe(callsAfterFailure);
      expect(cachedRates.isLive).toBe(false);
      expect(cachedRates.source).toBe("cached");
    });

    it("calcule dynamiquement et exactement les coûts et conversions FCFA selon le moteur actif", () => {
      const mockLive = {
        deepseekChat: { inputPerM: 0.1, outputPerM: 0.2, modelId: "ds", name: "DS" },
        deepseekReasoner: { inputPerM: 0.8, outputPerM: 1.6, modelId: "dspro", name: "DS Pro" },
        glmFlash: { inputPerM: 0.05, outputPerM: 0.15, modelId: "glm", name: "GLM" },
        qwenFlash: { inputPerM: 0.04, outputPerM: 0.12, modelId: "qwen", name: "Qwen" },
        visionSonnet: { inputPerM: 3.0, outputPerM: 15.0, modelId: "sonnet", name: "Sonnet" },
        isLive: true,
        source: "openrouter_api" as const,
        fetchedAt: new Date().toISOString(),
      };

      // 1. Avec GLM comme moteur de défis
      const glmTelemetry = calculateNayaTelemetry(
        {
          challengesGenerated: 100, // 100 * 1200 in, 100 * 800 out
          challengesStarted: 80,
          challengesCompleted: 50,
          hypothesesCycles: 10,
          recommendationsCount: 20,
          activeChallengeModel: "glm-5.3-flash",
          glmFlashTokens: { input: 10000, output: 5000, calls: 5 }, // Copilote Prof
        },
        mockLive,
      );

      // Les tokens défis doivent aller à GLM
      expect(glmTelemetry.tokenUsage.glmFlashInputTokens).toBe(100 * 1200 + 10000);
      expect(glmTelemetry.tokenUsage.glmFlashOutputTokens).toBe(100 * 800 + 5000);
      expect(glmTelemetry.tokenUsage.deepseekChatInputTokens).toBe(20 * 1000); // seulement recommandations

      const defisFeature = glmTelemetry.featureBreakdown.find((f) => f.feature === "Défis");
      expect(defisFeature?.modelUsed).toBe("GLM 5.3 Flash");
      expect(defisFeature?.costUsd).toBeGreaterThan(0);
      expect(defisFeature?.costXof).toBe(Math.round(defisFeature!.costUsd * 600));

      const copiloteFeature = glmTelemetry.featureBreakdown.find((f) => f.feature === "Copilote Professeur");
      expect(copiloteFeature?.modelUsed).toBe("GLM 5.3 Flash");
      expect(copiloteFeature?.callsCount).toBe(5);

      // La somme des coûts par fonctionnalité doit être rigoureusement égale au coût total
      const sumFeatureUsd = glmTelemetry.featureBreakdown.reduce((acc, f) => acc + f.costUsd, 0);
      expect(glmTelemetry.totalCostUsd).toBeCloseTo(sumFeatureUsd, 3);
      expect(glmTelemetry.totalCostXof).toBe(Math.round(glmTelemetry.totalCostUsd * 600));
    });
  });

  describe("R2. Statut des Fournisseurs d'IA (getAiProviderStatusAdmin)", () => {
    it("détecte correctement la passerelle partagée api.b.ai pour GLM et Qwen", async () => {
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GLM_API_KEY;
      delete process.env.QWEN_API_KEY;

      // Cas 1 : Seulement GLM_API_KEY est configurée -> GLM et Qwen sont tous les deux marqués prêts (clé partagée)
      process.env.GLM_API_KEY = "key-glm";
      const status1 = computeAiProviderStatus();
      expect(status1.glmConfigured).toBe(true);
      expect(status1.qwenConfigured).toBe(true);
      expect(status1.deepseekConfigured).toBe(false);

      // Cas 2 : Seulement QWEN_API_KEY est configurée -> GLM et Qwen sont tous les deux prêts
      delete process.env.GLM_API_KEY;
      process.env.QWEN_API_KEY = "key-qwen";
      const status2 = computeAiProviderStatus();
      expect(status2.glmConfigured).toBe(true);
      expect(status2.qwenConfigured).toBe(true);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callGLM,
  GlmMissingKeyError,
  GlmVisionUnsupportedError,
  type GlmDeps,
} from "@/lib/glm.server";

// La passerelle ne doit jamais partir sur le réseau en tests : fetch + sleep
// injectés. Ces tests verrouillent le contrat OpenAI-compatible (corps de
// requête, usage, modes d'erreur, backoff) avant que le copilote s'y appuie.

// Fabriques (et non instances) de Response : un objet Response ne se lit qu'une
// fois — retenir la même instance à travers deux retries ferait échouer le
// second .json()/.text() sur « Body has already been read ».
function makeDeps(
  factories: Array<() => Response>,
): { deps: GlmDeps; fetchMock: ReturnType<typeof vi.fn>; sleepSpy: ReturnType<typeof vi.fn> } {
  let i = 0;
  const fetchMock = vi.fn(async () => {
    const factory = factories[Math.min(i, factories.length - 1)];
    i += 1;
    return factory();
  });
  const sleepSpy = vi.fn(async () => {});
  return { deps: { fetch: fetchMock as unknown as typeof fetch, sleep: sleepSpy }, fetchMock, sleepSpy };
}

const okResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200 });

const chatResponse = (text: string, usage?: { prompt_tokens: number; completion_tokens: number }) =>
  okResponse({
    model: "glm-5.3-flash",
    choices: [{ message: { content: text }, finish_reason: "stop" }],
    usage,
  });

describe("callGLM", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, GLM_API_KEY: "test-key" };
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("envoie le corps OpenAI-compatible attendu et retourne texte + usage", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("glm-5.3-flash");
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe("system");
      expect(body.max_tokens).toBe(1500);
      expect(body.temperature).toBeCloseTo(0.6);
      expect(body.response_format).toBeUndefined();
      return chatResponse("Bonjour !", { prompt_tokens: 120, completion_tokens: 45 });
    });

    const res = await callGLM(
      [
        { role: "system", content: "Tu es un assistant." },
        { role: "user", content: "Bonjour" },
      ],
      { maxTokens: 1500 },
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(res.text).toBe("Bonjour !");
    expect(res.usage).toEqual({ inputTokens: 120, outputTokens: 45 });
    expect(res.respondedModel).toBe("glm-5.3-flash");
  });

  it("jsonMode ajoute response_format json_object et nettoie les fences", async () => {
    let sawResponseFormat = false;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sawResponseFormat = body.response_format?.type === "json_object";
      return chatResponse('```json\n{"a": 1}\n```');
    });

    const res = await callGLM(
      [{ role: "user", content: "Donne du JSON" }],
      { jsonMode: true },
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(sawResponseFormat).toBe(true);
    expect(res.text).toBe('{"a": 1}');
  });

  it("envoie les images en content-parts image_url (data URL)", async () => {
    let sawImagePart = false;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const parts = body.messages[0].content;
      sawImagePart =
        Array.isArray(parts) &&
        parts.some((p: any) => p.type === "image_url" && p.image_url.url.startsWith("data:"));
      return chatResponse("{}");
    });

    await callGLM(
      [
        {
          role: "user",
          content: [
            { type: "text", text: "Décris cette image" },
            { type: "image_url", image_url: { url: "data:image/webp;base64,AAAA" } },
          ],
        },
      ],
      {},
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(sawImagePart).toBe(true);
  });

  it("429 persistant retente puis lève l'erreur quota utilisateur (convention DeepSeek)", async () => {
    const { deps, sleepSpy } = makeDeps([
      () => new Response("rate limited", { status: 429 }),
      () => new Response("rate limited", { status: 429 }),
      () => new Response("rate limited", { status: 429 }),
    ]);

    await expect(
      callGLM([{ role: "user", content: "salut" }], {}, deps),
    ).rejects.toThrow(/Quota IA momentanément épuisé \(429\)/);
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  it("429 suivi d'un succès : le backoff débloque l'appel", async () => {
    const { deps } = makeDeps([
      () => new Response("rate limited", { status: 429 }),
      () => chatResponse("succès après backoff"),
    ]);

    const res = await callGLM([{ role: "user", content: "salut" }], {}, deps);
    expect(res.text).toBe("succès après backoff");
  });

  it("5xx retente avec backoff puis réussit", async () => {
    const { deps, sleepSpy } = makeDeps([
      () => new Response("boom", { status: 503 }),
      () => new Response("boom", { status: 503 }),
      () => chatResponse("succès après retries"),
    ]);

    const res = await callGLM([{ role: "user", content: "salut" }], {}, deps);

    expect(res.text).toBe("succès après retries");
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  it("4xx sans image est fatal (pas de retry)", async () => {
    const { deps } = makeDeps([() => new Response("bad request", { status: 400 })]);

    await expect(
      callGLM([{ role: "user", content: "salut" }], {}, deps),
    ).rejects.toThrow(/Fatal/);
  });

  it("4xx AVEC image lève GlmVisionUnsupportedError (fatal, typé pour le fallback Claude)", async () => {
    const { deps, sleepSpy } = makeDeps([
      () => new Response(JSON.stringify({ error: { message: "unsupported content part" } }), { status: 400 }),
    ]);
    const multimodal = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "Analyse" },
          { type: "image_url" as const, image_url: { url: "data:image/webp;base64,AAAA" } },
        ],
      },
    ];

    await expect(callGLM(multimodal, {}, deps)).rejects.toBeInstanceOf(GlmVisionUnsupportedError);
    expect(sleepSpy).not.toHaveBeenCalled();
  });

  it("clé manquante lève GlmMissingKeyError sans appel réseau", async () => {
    const fetchMock = vi.fn();
    const previousKey = process.env.GLM_API_KEY;
    delete process.env.GLM_API_KEY;
    try {
      await expect(
        callGLM([{ role: "user", content: "salut" }], {}, {
          fetch: fetchMock as unknown as typeof fetch,
          sleep: async () => {},
        }),
      ).rejects.toBeInstanceOf(GlmMissingKeyError);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.GLM_API_KEY = previousKey;
    }
  });

  it("respecte maxRetries=1 (échec immédiat sur 5xx)", async () => {
    const { deps } = makeDeps([() => new Response("boom", { status: 502 })]);

    await expect(
      callGLM([{ role: "user", content: "salut" }], { maxRetries: 1 }, deps),
    ).rejects.toThrow(/Erreur GLM API \(502\)/);
  });

  it("tolère une dérive de modèle répondu (warn, pas d'exception)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { deps } = makeDeps([
      () =>
        okResponse({
          model: "glm-5.3-air",
          choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
    ]);

    const res = await callGLM([{ role: "user", content: "salut" }], {}, deps);

    expect(res.text).toBe("ok");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("model drift"));
    warnSpy.mockRestore();
  });

  it("gère un corps 200 avec error embarqué : fatal, sans retry (proxies OpenAI-compatibles)", async () => {
    const { deps, sleepSpy } = makeDeps([
      () => okResponse({ error: { message: "content policy", type: "invalid_request_error" } }),
    ]);

    await expect(
      callGLM([{ role: "user", content: "salut" }], {}, deps),
    ).rejects.toThrow(/content policy/);
    expect(sleepSpy).not.toHaveBeenCalled();
  });
});

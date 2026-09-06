import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callQwen,
  QwenMissingKeyError,
  type QwenDeps,
} from "@/lib/qwen.server";

function makeDeps(
  factories: Array<() => Response>,
): { deps: QwenDeps; fetchMock: ReturnType<typeof vi.fn>; sleepSpy: ReturnType<typeof vi.fn> } {
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
    model: "qwen3.8-flash",
    choices: [{ message: { content: text }, finish_reason: "stop" }],
    usage,
  });

describe("callQwen", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, QWEN_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("envoie le corps OpenAI-compatible attendu et retourne texte + usage", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("qwen3.8-flash");
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe("system");
      expect(body.max_tokens).toBe(1500);
      expect(body.temperature).toBeCloseTo(0.6);
      expect(body.response_format).toBeUndefined();
      return chatResponse("Défi généré avec succès !", { prompt_tokens: 150, completion_tokens: 60 });
    });

    const res = await callQwen(
      [
        { role: "system", content: "Tu es Naya." },
        { role: "user", content: "Génère un défi." },
      ],
      { maxTokens: 1500 },
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(res.text).toBe("Défi généré avec succès !");
    expect(res.usage).toEqual({ inputTokens: 150, outputTokens: 60 });
    expect(res.respondedModel).toBe("qwen3.8-flash");
  });

  it("utilise GLM_API_KEY en repli si QWEN_API_KEY n'est pas spécifiée (même compte api.b.ai)", async () => {
    delete process.env.QWEN_API_KEY;
    process.env.GLM_API_KEY = "glm-shared-key";

    let authHeader = "";
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      authHeader = (init?.headers as any)?.Authorization || "";
      return chatResponse("Ok");
    });

    const res = await callQwen(
      [{ role: "user", content: "Test" }],
      {},
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(authHeader).toBe("Bearer glm-shared-key");
    expect(res.text).toBe("Ok");
  });

  it("jsonMode ajoute response_format json_object et nettoie les fences", async () => {
    let sawResponseFormat = false;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sawResponseFormat = body.response_format?.type === "json_object";
      return chatResponse('```json\n{"title": "Défi Robot", "xp": 25}\n```');
    });

    const res = await callQwen(
      [{ role: "user", content: "Donne du JSON" }],
      { jsonMode: true },
      { fetch: fetchMock as unknown as typeof fetch, sleep: async () => {} },
    );

    expect(sawResponseFormat).toBe(true);
    expect(res.text).toBe('{"title": "Défi Robot", "xp": 25}');
  });

  it("lève QwenMissingKeyError si aucune clé n'est fournie", async () => {
    delete process.env.QWEN_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.GLM_API_KEY;
    delete process.env.ZHIPU_API_KEY;
    delete process.env.ZHIPUAI_API_KEY;
    delete process.env.BAI_API_KEY;

    await expect(
      callQwen([{ role: "user", content: "Test" }], {}, { sleep: async () => {} }),
    ).rejects.toBeInstanceOf(QwenMissingKeyError);
  });

  it("retente sur erreur 500 (transient) avec exponential backoff", async () => {
    const { deps, fetchMock, sleepSpy } = makeDeps([
      () => new Response("Internal Server Error", { status: 500 }),
      () => chatResponse("Rétabli !"),
    ]);

    const res = await callQwen(
      [{ role: "user", content: "Test retry" }],
      { maxRetries: 3 },
      deps,
    );

    expect(res.text).toBe("Rétabli !");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });
});

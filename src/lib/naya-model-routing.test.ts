import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dispatchChallengeTextGeneration,
  getNayaModelRoutingSettings,
  invalidateNayaModelRoutingCache,
  updateNayaModelRoutingSettings,
} from "@/lib/naya-routing.server";
import * as qwenModule from "@/lib/qwen.server";
import * as glmModule from "@/lib/glm.server";

describe("naya-routing.server", () => {
  beforeEach(() => {
    invalidateNayaModelRoutingCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    invalidateNayaModelRoutingCache();
    vi.restoreAllMocks();
  });

  it("retourne les paramètres par défaut (deepseek-v4-flash) si la table est vide ou absente", async () => {
    const fakeDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const settings = await getNayaModelRoutingSettings(fakeDb);
    expect(settings.challengeModel).toBe("deepseek-v4-flash");
    expect(settings.fallbackEnabled).toBe(true);
  });

  it("met à jour et met en cache les paramètres de routage", async () => {
    const fakeDb = {
      from: () => ({
        upsert: (payload: any) => ({
          select: () => ({
            single: async () => ({
              data: {
                challenge_model: payload.challenge_model,
                fallback_enabled: payload.fallback_enabled,
                updated_at: payload.updated_at,
                updated_by: payload.updated_by,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const updated = await updateNayaModelRoutingSettings(
      fakeDb,
      { challengeModel: "qwen3.8-flash", fallbackEnabled: true },
      "admin@genizio.com",
    );

    expect(updated.challengeModel).toBe("qwen3.8-flash");
    expect(updated.fallbackEnabled).toBe(true);

    // Vérifie que le cache mémoire répond immédiatement
    const cached = await getNayaModelRoutingSettings();
    expect(cached.challengeModel).toBe("qwen3.8-flash");
  });

  it("route vers callDeepSeekText quand deepseek-v4-flash est configuré", async () => {
    const callDeepSeekMock = vi.fn(async () => '{"title": "Défi DeepSeek"}');

    const res = await dispatchChallengeTextGeneration({
      prompt: "Génère un défi",
      jsonMode: true,
      maxOutputTokens: 1000,
      maxRetries: 1,
      callDeepSeekFn: callDeepSeekMock,
    });

    expect(res.modelUsed).toBe("deepseek-v4-flash");
    expect(res.text).toBe('{"title": "Défi DeepSeek"}');
    expect(callDeepSeekMock).toHaveBeenCalled();
  });

  it("route vers callQwen quand qwen3.8-flash est configuré", async () => {
    const fakeDb = {
      from: () => ({
        upsert: (payload: any) => ({
          select: () => ({
            single: async () => ({
              data: { challenge_model: "qwen3.8-flash", fallback_enabled: true },
              error: null,
            }),
          }),
        }),
      }),
    };
    await updateNayaModelRoutingSettings(fakeDb, { challengeModel: "qwen3.8-flash" });

    const qwenSpy = vi.spyOn(qwenModule, "callQwen").mockResolvedValue({
      text: '{"title": "Défi Qwen"}',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    const callDeepSeekMock = vi.fn();

    const res = await dispatchChallengeTextGeneration({
      prompt: "Génère un défi",
      jsonMode: true,
      maxOutputTokens: 1000,
      maxRetries: 1,
      callDeepSeekFn: callDeepSeekMock,
    });

    expect(res.modelUsed).toBe("qwen3.8-flash");
    expect(res.text).toBe('{"title": "Défi Qwen"}');
    expect(qwenSpy).toHaveBeenCalled();
    expect(callDeepSeekMock).not.toHaveBeenCalled();
  });

  it("bascule automatiquement sur DeepSeek si Qwen échoue et fallbackEnabled est actif", async () => {
    const fakeDb = {
      from: () => ({
        upsert: (payload: any) => ({
          select: () => ({
            single: async () => ({
              data: { challenge_model: "qwen3.8-flash", fallback_enabled: true },
              error: null,
            }),
          }),
        }),
      }),
    };
    await updateNayaModelRoutingSettings(fakeDb, { challengeModel: "qwen3.8-flash", fallbackEnabled: true });

    vi.spyOn(qwenModule, "callQwen").mockRejectedValue(new Error("Timeout Qwen"));
    const callDeepSeekMock = vi.fn(async () => '{"title": "Défi de Secours DeepSeek"}');

    const res = await dispatchChallengeTextGeneration({
      prompt: "Génère un défi",
      jsonMode: true,
      maxOutputTokens: 1000,
      maxRetries: 1,
      callDeepSeekFn: callDeepSeekMock,
    });

    expect(res.modelUsed).toBe("deepseek-v4-flash");
    expect(res.text).toBe('{"title": "Défi de Secours DeepSeek"}');
    expect(callDeepSeekMock).toHaveBeenCalled();
  });
});

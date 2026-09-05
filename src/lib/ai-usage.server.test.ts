import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeAiFeatureQuota, resolveAiDailyLimit } from "@/lib/ai-usage.server";

// La logique SQL atomique (consume_ai_feature_quota) est testée au niveau
// migration ; ici on verrouille le contrat du module serveur : mapping de la
// réponse RPC, fail-open sur panne, résolution des limites par env.

function makeDb(rpcResult: { data: unknown; error: unknown }) {
  return {
    rpc: async (_fn: string, _args: Record<string, unknown>) => rpcResult,
  };
}

describe("resolveAiDailyLimit", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  const cleanEnv = () => {
    delete process.env.AI_COPILOT_DAILY_LIMIT_VERIFIED;
    delete process.env.AI_COPILOT_DAILY_LIMIT_UNVERIFIED;
  };

  it("retourne les défauts produit : 8 vérifié / 2 non vérifié", () => {
    cleanEnv();
    expect(resolveAiDailyLimit("educator_copilot", true)).toBe(8);
    expect(resolveAiDailyLimit("educator_copilot", false)).toBe(2);
  });

  it("respecte les surcharges env (valeurs positives uniquement)", () => {
    process.env.AI_COPILOT_DAILY_LIMIT_VERIFIED = "20";
    process.env.AI_COPILOT_DAILY_LIMIT_UNVERIFIED = "1";
    expect(resolveAiDailyLimit("educator_copilot", true)).toBe(20);
    expect(resolveAiDailyLimit("educator_copilot", false)).toBe(1);
  });

  it("ignore les env invalides (0, négatif, non numérique) et retombe sur les défauts", () => {
    process.env.AI_COPILOT_DAILY_LIMIT_VERIFIED = "0";
    process.env.AI_COPILOT_DAILY_LIMIT_UNVERIFIED = "-5";
    expect(resolveAiDailyLimit("educator_copilot", true)).toBe(8);
    expect(resolveAiDailyLimit("educator_copilot", false)).toBe(2);

    process.env.AI_COPILOT_DAILY_LIMIT_VERIFIED = "abc";
    expect(resolveAiDailyLimit("educator_copilot", true)).toBe(8);
  });
});

describe("consumeAiFeatureQuota", () => {
  it("mappe la réponse RPC (allowed + remaining)", async () => {
    const db = makeDb({ data: [{ allowed: true, remaining: 7 }], error: null });
    const res = await consumeAiFeatureQuota(db, "u1", "educator_copilot", 8);
    expect(res).toEqual({ allowed: true, remaining: 7, limit: 8 });
  });

  it("refuse quand la limite est atteinte", async () => {
    const db = makeDb({ data: [{ allowed: false, remaining: 0 }], error: null });
    const res = await consumeAiFeatureQuota(db, "u1", "educator_copilot", 2);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it("fail-open (allowed) et tracé quand la RPC renvoie une erreur", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = makeDb({ data: null, error: { message: "relation missing" } });
    const res = await consumeAiFeatureQuota(db, "u1", "educator_copilot", 8);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(-1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("fail-open quand la table est absente (exception réseau/SQL)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      rpc: async () => {
        throw new Error("connection refused");
      },
    };
    const res = await consumeAiFeatureQuota(db, "u1", "educator_copilot", 8);
    expect(res.allowed).toBe(true);
    errSpy.mockRestore();
  });

  it("fail-open sur réponse RPC vide (comportement inattendu du proxy)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = makeDb({ data: [], error: null });
    const res = await consumeAiFeatureQuota(db, "u1", "educator_copilot", 8);
    expect(res.allowed).toBe(true);
    errSpy.mockRestore();
  });
});

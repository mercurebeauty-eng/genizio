import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  readSubstitutionVerifyConfig,
  SUBSTITUTION_VERIFY_SETTINGS_KEY,
} from "@/lib/substitution.functions";

// La vérification shadow est pilotée par la ligne app_settings « substitution_verify »
// (Admin OS, effectif immédiat) avec repli sur les variables d'environnement puis sur
// les défauts — un échec de lecture ne doit jamais bloquer la vérification elle-même.

function mockDb(result: { data: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

beforeEach(() => {
  delete process.env.NAYA_SUBSTITUTION_VERIFY_ENABLED;
  delete process.env.NAYA_SUBSTITUTION_VERIFY_RATE;
});
afterEach(() => {
  delete process.env.NAYA_SUBSTITUTION_VERIFY_ENABLED;
  delete process.env.NAYA_SUBSTITUTION_VERIFY_RATE;
});

describe("readSubstitutionVerifyConfig — app_settings fait foi, env en repli", () => {
  it("lit la ligne app_settings (clé, bornage du taux)", async () => {
    const db = mockDb({ data: { value: { enabled: false, rate: 0.3 } } });
    const config = await readSubstitutionVerifyConfig(db);
    expect(db.from).toHaveBeenCalledWith("app_settings");
    expect(db.from("app_settings")).toBeTruthy();
    expect(SUBSTITUTION_VERIFY_SETTINGS_KEY).toBe("substitution_verify");
    expect(config).toEqual({ enabled: false, rate: 0.3 });
  });

  it("borne le taux hors limites (1.4 → 1, -2 → 0) et traite un enabled non booléen", async () => {
    const dbHigh = mockDb({ data: { value: { enabled: true, rate: 1.4 } } });
    expect(await readSubstitutionVerifyConfig(dbHigh)).toEqual({ enabled: true, rate: 1 });
    const dbLow = mockDb({ data: { value: { enabled: true, rate: -2 } } });
    expect(await readSubstitutionVerifyConfig(dbLow)).toEqual({ enabled: true, rate: 0 });
    const dbBad = mockDb({ data: { value: { enabled: "oui", rate: "beaucoup" } } });
    const config = await readSubstitutionVerifyConfig(dbBad);
    expect(config.enabled).toBe(false);
    expect(config.rate).toBe(1); // repli env : défaut 1
  });

  it("ligne absente → repli variables d'environnement", async () => {
    process.env.NAYA_SUBSTITUTION_VERIFY_ENABLED = "false";
    process.env.NAYA_SUBSTITUTION_VERIFY_RATE = "0.25";
    const db = mockDb({ data: null });
    expect(await readSubstitutionVerifyConfig(db)).toEqual({ enabled: false, rate: 0.25 });
  });

  it("ligne absente et env absentes → défauts (activé, 100 %)", async () => {
    const db = mockDb({ data: null });
    expect(await readSubstitutionVerifyConfig(db)).toEqual({ enabled: true, rate: 1 });
  });

  it("erreur DB → repli env, jamais de levée", async () => {
    process.env.NAYA_SUBSTITUTION_VERIFY_ENABLED = "false";
    const db = mockDb({ data: null, error: { message: "down" } });
    expect(await readSubstitutionVerifyConfig(db)).toEqual({ enabled: false, rate: 1 });
  });

  it("exception du client → repli env, jamais de levée", async () => {
    const db = {
      from: vi.fn().mockImplementation(() => {
        throw new Error("network down");
      }),
    } as any;
    expect(await readSubstitutionVerifyConfig(db)).toEqual({ enabled: true, rate: 1 });
  });
});

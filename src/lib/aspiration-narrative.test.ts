import { describe, it, expect } from "vitest";
import { formatAspirationChildLine, formatAspirationParentLine } from "@/lib/aspiration-narrative";
import type { AspirationHypothesis } from "@/lib/aspiration-confidence";
import { findAspirationBridge } from "@/lib/aspiration-map";

// Narration qualitative (§16, 2026-08-12) : la séquence vécue « Explorons cela →
// voici ce que Naya observe » — jamais de chiffres, jamais de verdict.

const mkHypothesis = (status: AspirationHypothesis["status"]): AspirationHypothesis => ({
  label: "Menuiserie",
  type: "metier",
  source: "enfant",
  status,
  engagement: 0.5,
  completions: 0,
  abandoned: 0,
  trials: 0,
  bridge: findAspirationBridge("Menuiserie"),
});

describe("formatAspirationChildLine", () => {
  it("untested : « Explorons cela » (séquence §16)", () => {
    expect(formatAspirationChildLine(mkHypothesis("untested"))).toContain("Explorons cela");
  });

  it("exploring : Naya observe", () => {
    expect(formatAspirationChildLine(mkHypothesis("exploring"))).toContain("explore");
  });

  it("confirmed : moteur réel, jamais un score", () => {
    const line = formatAspirationChildLine(mkHypothesis("confirmed"));
    expect(line).toContain("motiver");
    expect(line).not.toMatch(/\d/);
  });

  it("refuted : réorientation douce, jamais « tu t'es trompé »", () => {
    const line = formatAspirationChildLine(mkHypothesis("refuted"));
    expect(line).toContain("cherche maintenant ce qui te motive vraiment");
    expect(line).not.toContain("tromp");
  });

  it("aucune ligne ne contient de chiffre ni d'étiquette technique", () => {
    for (const status of ["untested", "exploring", "confirmed", "refuted"] as const) {
      expect(formatAspirationChildLine(mkHypothesis(status))).not.toMatch(/\d/);
      expect(formatAspirationChildLine(mkHypothesis(status))).not.toMatch(
        /METHOD_MISMATCH|refuted|confirmed/i,
      );
    }
  });
});

describe("formatAspirationParentLine", () => {
  it("mentionne la source enfant quand la déclaration vient de l'enfant", () => {
    expect(formatAspirationParentLine(mkHypothesis("untested"), "Awa")).toContain(
      "déclarée par l'enfant",
    );
    expect(formatAspirationParentLine(mkHypothesis("untested"), "Awa")).toContain("Awa");
  });

  it("refuted : jamais alarmiste, jamais un verdict", () => {
    const line = formatAspirationParentLine(mkHypothesis("refuted"), "Awa");
    expect(line).toContain("semble moins correspondre");
    expect(line).not.toContain("échec");
    expect(line).not.toMatch(/\d/);
  });
});

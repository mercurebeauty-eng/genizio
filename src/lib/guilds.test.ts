import { describe, it, expect } from "vitest";
import { getChildGuild, GUILDS, NO_GUILD_YET } from "./guilds";

describe("getChildGuild", () => {
  // Was previously "defaults to batisseurs" — a bug (bestScore started at -1,
  // so the first guild's tied score of 0 always won) that also contradicted
  // the function's own docstring (which claimed "strateges"). Fixed per user
  // request: no talent data should mean no guild forced, not a guessed one.
  it("returns NO_GUILD_YET (not any real guild) when talents is empty", () => {
    expect(getChildGuild({})).toEqual(NO_GUILD_YET);
  });

  it("returns NO_GUILD_YET for null talents too", () => {
    expect(getChildGuild(null)).toEqual(NO_GUILD_YET);
  });

  it("returns NO_GUILD_YET when every talent score is explicitly 0", () => {
    const allZero = Object.fromEntries(
      [
        "spatial",
        "corporelle",
        "sociale",
        "entrepreneuriale",
        "creative",
        "artisanale",
        "emotionnelle",
        "logico_mathematique",
        "linguistique",
      ].map((k) => [k, 0]),
    );
    expect(getChildGuild(allZero)).toEqual(NO_GUILD_YET);
  });

  it("NO_GUILD_YET is not one of the 6 real guilds", () => {
    expect(Object.values(GUILDS)).not.toContainEqual(NO_GUILD_YET);
  });

  it("picks the guild with the highest mean score", () => {
    // corporelle is explorateurs' only talent key — mean = raw score.
    expect(getChildGuild({ corporelle: 10 }).key).toBe("explorateurs");
  });

  it("averages multiple talent keys of the same guild", () => {
    // strateges = entrepreneuriale + sociale + emotionnelle, mean 5.
    expect(getChildGuild({ entrepreneuriale: 5, sociale: 5, emotionnelle: 5 }).key).toBe(
      "strateges",
    );
  });

  // Refonte 2026-08-09 : comportement VOLONTAIREMENT changé par rapport à l'ancienne
  // somme brute — une guilde à 1 talent dominant l'emporte désormais sur une guilde
  // large mais équilibrée (corporelle 12 > moyenne 5 des Stratèges). C'est le biais
  // "multi-clés" corrigé : avant, additionner 3 talents moyens (15) battait un seul
  // talent fort (12), ce qui éloignait la guilde de l'affinité réelle.
  it("prefers a dominant single talent over a broad balanced profile", () => {
    expect(
      getChildGuild({ entrepreneuriale: 5, sociale: 5, emotionnelle: 5, corporelle: 12 }).key,
    ).toBe("explorateurs");
  });

  // Refonte 2026-08-09 : la moyenne corrige l'avantage des guildes à 2-3 clés.
  // Ancienne somme : createurs (50+50=100) > inventeurs (90). Nouvelle moyenne :
  // inventeurs (90) > createurs (50). Le talent dominant est mieux reconnu.
  it("mean corrects the multi-key advantage (dominant talent wins)", () => {
    expect(getChildGuild({ logico_mathematique: 90, creative: 50, linguistique: 50 }).key).toBe(
      "inventeurs",
    );
  });

  it("breaks ties by the strongest single talent of the guild", () => {
    // batisseurs avg (3+1)/2 = 2 avec pic 3 ; createurs avg (2+2)/2 = 2 avec pic 2 →
    // batisseurs gagne par le pic, pas par l'ordre de déclaration.
    expect(getChildGuild({ spatial: 3, artisanale: 1, creative: 2, linguistique: 2 }).key).toBe(
      "batisseurs",
    );
  });

  it("falls back to declaration order when avg AND peak are tied", () => {
    // spatial+artisanale (batisseurs) et logico_mathematique (inventeurs) : moyenne 10
    // ET pic 10 partout — dernier recours déterministe = ordre de déclaration
    // (batisseurs déclarée en premier).
    expect(getChildGuild({ spatial: 10, artisanale: 10, logico_mathematique: 10 }).key).toBe(
      "batisseurs",
    );
  });

  it("every GuildInfo.talentKeys entry is a real talent key covered exactly once", () => {
    const seen = new Set<string>();
    for (const guild of Object.values(GUILDS)) {
      for (const key of guild.talentKeys) {
        expect(seen.has(key)).toBe(false); // no talent key claimed by two guilds
        seen.add(key);
      }
    }
  });
});

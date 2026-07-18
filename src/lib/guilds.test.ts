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
      ["spatial", "corporelle", "sociale", "entrepreneuriale", "creative", "artisanale", "emotionnelle", "logico_mathematique", "linguistique"]
        .map((k) => [k, 0]),
    );
    expect(getChildGuild(allZero)).toEqual(NO_GUILD_YET);
  });

  it("NO_GUILD_YET is not one of the 6 real guilds", () => {
    expect(Object.values(GUILDS)).not.toContainEqual(NO_GUILD_YET);
  });

  it("picks the guild whose talent keys sum to the highest score", () => {
    // corporelle is explorateurs' only talent key.
    expect(getChildGuild({ corporelle: 10 }).key).toBe("explorateurs");
  });

  it("sums multiple talent keys belonging to the same guild", () => {
    // strateges = entrepreneuriale + sociale + emotionnelle
    expect(getChildGuild({ entrepreneuriale: 5, sociale: 5, emotionnelle: 5 }).key).toBe("strateges");
    // 15 beats any single-key guild scoring at most 12 in this scenario
    expect(getChildGuild({ entrepreneuriale: 5, sociale: 5, emotionnelle: 5, corporelle: 12 }).key).toBe("strateges");
  });

  it("breaks ties by earliest-declared guild in GUILDS (batisseurs first)", () => {
    // spatial (batisseurs) and logico_mathematique (inventeurs) tied at 10 —
    // strict ">" means the first guild to reach that score wins ties.
    expect(getChildGuild({ spatial: 10, logico_mathematique: 10 }).key).toBe("batisseurs");
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

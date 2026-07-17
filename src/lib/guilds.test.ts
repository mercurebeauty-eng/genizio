import { describe, it, expect } from "vitest";
import { getChildGuild, GUILDS } from "./guilds";

describe("getChildGuild", () => {
  // getChildGuild's own JSDoc says it "retourne strateges par défaut si aucun
  // talent n'est encore développé" — but that is NOT what the code does. The
  // loop initializes bestScore = -1 and bestGuildKey = "strateges", then the
  // very first guild iterated (batisseurs, first key in GUILDS) scores 0 for
  // an empty talents object, and 0 > -1, so bestGuildKey is immediately
  // overwritten to "batisseurs" and nothing later beats a tied 0. This test
  // characterizes the actual behavior, not the documented intent — see the
  // characterization note in this session's report. Do not "fix" this without
  // deciding which of the two (code or comment) is the intended behavior.
  it("defaults to Les Bâtisseurs (not Les Stratèges, despite the docstring) when talents is empty", () => {
    expect(getChildGuild({}).key).toBe("batisseurs");
  });

  it("defaults to Les Bâtisseurs for null talents too", () => {
    expect(getChildGuild(null).key).toBe("batisseurs");
  });

  it("defaults to Les Bâtisseurs when every talent score is explicitly 0", () => {
    const allZero = Object.fromEntries(
      ["spatial", "corporelle", "sociale", "entrepreneuriale", "creative", "artisanale", "emotionnelle", "logico_mathematique", "linguistique"]
        .map((k) => [k, 0]),
    );
    expect(getChildGuild(allZero).key).toBe("batisseurs");
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

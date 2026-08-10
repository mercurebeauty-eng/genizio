import { describe, expect, it } from "vitest";
import { seedTalentsFromInterests } from "./talent-seed";

describe("seedTalentsFromInterests", () => {
  it("returns the full 9-key talents object, all zeros for no interests", () => {
    const result = seedTalentsFromInterests([]);
    expect(Object.keys(result).length).toBe(9);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });

  it("counts one point per declared behavioral tag on its talent key", () => {
    const result = seedTalentsFromInterests([
      "Aime assembler et construire", // spatial
      "Démonte pour comprendre", // spatial
      "Aime organiser les autres", // sociale
    ]);
    expect(result.spatial).toBe(2);
    expect(result.sociale).toBe(1);
    expect(result.artisanale).toBe(0);
    expect(result.logico_mathematique).toBe(0);
  });

  it("ignores unknown or legacy tags", () => {
    const result = seedTalentsFromInterests([
      "Tag legacy qui n'existe plus",
      "Joue avec les mots et les sons", // linguistique
    ]);
    expect(result.linguistique).toBe(1);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("returns all zeros for null or undefined interests", () => {
    for (const value of [null, undefined]) {
      const result = seedTalentsFromInterests(value);
      expect(Object.values(result).every((s) => s === 0)).toBe(true);
    }
  });
});

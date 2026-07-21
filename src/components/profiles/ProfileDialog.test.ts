import { describe, it, expect } from "vitest";
import { INTERESTS_BY_TALENT } from "./shared";
import { VALID_TALENT_KEYS } from "@/lib/talent-buckets";

describe("INTERESTS_BY_TALENT Schema & Behavioral Drivers Integrity", () => {
  it("contains all 9 Gardner talent keys", () => {
    const keys = Object.keys(INTERESTS_BY_TALENT);
    expect(keys).toHaveLength(9);
    for (const validKey of VALID_TALENT_KEYS) {
      expect(INTERESTS_BY_TALENT).toHaveProperty(validKey);
    }
  });

  it("every talent group has a non-empty label and valid behavioral posture tags", () => {
    for (const [key, group] of Object.entries(INTERESTS_BY_TALENT)) {
      expect(group.label).toBeTruthy();
      expect(group.tags.length).toBeGreaterThanOrEqual(3);
      for (const tag of group.tags) {
        expect(typeof tag).toBe("string");
        expect(tag.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it("has zero duplicate tags across the entire dictionary", () => {
    const allTags = Object.values(INTERESTS_BY_TALENT).flatMap((g) => g.tags);
    const uniqueTags = new Set(allTags);
    expect(uniqueTags.size).toBe(allTags.length);
  });
});

import { describe, it, expect } from "vitest";
import {
  getTalentBucket,
  getPortfolioPulse,
  TALENT_KEY_LABELS,
  VALID_TALENT_KEYS,
  TALENT_BUCKET_LABEL,
} from "./talent-buckets";

describe("getTalentBucket", () => {
  // Characterizes the exact thresholds as implemented: >=70 confirme,
  // >=40 en_developpement, >=1 signal_precoce, else pas_encore_explore.
  it.each([
    [0, "pas_encore_explore"],
    [1, "signal_precoce"],
    [39, "signal_precoce"],
    [40, "en_developpement"],
    [69, "en_developpement"],
    [70, "confirme"],
    [100, "confirme"],
    [-5, "pas_encore_explore"],
  ] as const)("score %i -> %s", (score, bucket) => {
    expect(getTalentBucket(score)).toBe(bucket);
  });
});

describe("VALID_TALENT_KEYS / TALENT_KEY_LABELS consistency", () => {
  it("has exactly 9 talent keys", () => {
    expect(VALID_TALENT_KEYS).toHaveLength(9);
  });

  it("VALID_TALENT_KEYS matches the keys of TALENT_KEY_LABELS exactly", () => {
    expect(new Set(VALID_TALENT_KEYS)).toEqual(new Set(Object.keys(TALENT_KEY_LABELS)));
  });

  it("every talent key has a non-empty French label", () => {
    for (const key of VALID_TALENT_KEYS) {
      expect(TALENT_KEY_LABELS[key]).toBeTruthy();
    }
  });
});

describe("getPortfolioPulse", () => {
  it("returns `limit` entries, defaulting to 5", () => {
    const pulse = getPortfolioPulse({ spatial: 80, corporelle: 50 });
    expect(pulse).toHaveLength(5);
  });

  it("treats null/undefined talents as all-zero (all pas_encore_explore)", () => {
    const pulse = getPortfolioPulse(null, 9);
    expect(pulse).toHaveLength(9);
    expect(pulse.every((e) => e.bucket === "pas_encore_explore")).toBe(true);
  });

  it("ranks the highest scores first", () => {
    const pulse = getPortfolioPulse(
      { spatial: 90, corporelle: 10, sociale: 50 },
      3,
    );
    expect(pulse[0].key).toBe("spatial");
  });

  it("keeps at least one pas_encore_explore entry in the slice when one exists", () => {
    // 9 talents, only 3 requested: without the "keep one unexplored" rule this
    // would be the top 3 scores only, all non-zero.
    const pulse = getPortfolioPulse(
      { spatial: 90, corporelle: 80, sociale: 70, creative: 60 },
      3,
    );
    expect(pulse.some((e) => e.bucket === "pas_encore_explore")).toBe(true);
  });

  it("falls back to '{label} — {bucket label}' for a (domain, bucket) pair with no custom phrase", () => {
    const pulse = getPortfolioPulse({ linguistique: 50 }, 9);
    const entry = pulse.find((e) => e.key === "linguistique")!;
    expect(entry.phrase).toBe(`${TALENT_KEY_LABELS.linguistique} — ${TALENT_BUCKET_LABEL.en_developpement}`);
  });
});

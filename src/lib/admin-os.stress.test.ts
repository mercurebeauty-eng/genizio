import { describe, it, expect } from "vitest";
import {
  calculateAgeDistribution,
  calculateActiveChildren,
  calculateRetentionRate,
  formatWhatsAppUrl,
} from "./admin-os.functions";

describe("Admin OS Helper Functions - Boundary & Stress Harness", () => {
  describe("calculateAgeDistribution Stress Tests", () => {
    it("handles empty array gracefully", () => {
      const res = calculateAgeDistribution([]);
      expect(res).toEqual([
        { bracket: "3-6 ans", count: 0, percentage: 0 },
        { bracket: "7-10 ans", count: 0, percentage: 0 },
        { bracket: "11-13 ans", count: 0, percentage: 0 },
        { bracket: "14+ ans", count: 0, percentage: 0 },
      ]);
    });

    it("ignores negative ages (<0) and buckets valid toddler ages (0, 1, 2) into '3-6 ans'", () => {
      const children = [{ age: -10 }, { age: -1 }, { age: 0 }, { age: 2 }];
      const res = calculateAgeDistribution(children);
      const bracket3to6 = res.find((b) => b.bracket === "3-6 ans");
      expect(bracket3to6?.count).toBe(2);
      expect(bracket3to6?.percentage).toBe(50);
    });

    it("buckets extreme ages (>100) into '14+ ans'", () => {
      const children = [{ age: 101 }, { age: 999 }];
      const res = calculateAgeDistribution(children);
      const bracket14Plus = res.find((b) => b.bracket === "14+ ans");
      expect(bracket14Plus?.count).toBe(2);
      expect(bracket14Plus?.percentage).toBe(100);
    });

    it("safely ignores null, undefined, and NaN age properties", () => {
      const children = [{ age: null as any }, { age: undefined as any }, { age: NaN as any }];
      const res = calculateAgeDistribution(children);
      const bracket3to6 = res.find((b) => b.bracket === "3-6 ans");
      const bracket14Plus = res.find((b) => b.bracket === "14+ ans");

      expect(bracket3to6?.count).toBe(0);
      expect(bracket14Plus?.count).toBe(0);
    });

    it("handles float/fractional ages using Math.floor (e.g. 6.4 falls into '3-6 ans')", () => {
      const children = [{ age: 6.4 }, { age: 6.6 }];
      const res = calculateAgeDistribution(children);
      const bracket3to6 = res.find((b) => b.bracket === "3-6 ans");
      const bracket7to10 = res.find((b) => b.bracket === "7-10 ans");
      expect(bracket3to6?.count).toBe(2);
      expect(bracket7to10?.count).toBe(0);
    });

    it("demonstrates total percentage sum rounding non-100% split", () => {
      const children = [{ age: 4 }, { age: 8 }, { age: 12 }];
      const res = calculateAgeDistribution(children);
      const sumPct = res.reduce((acc, curr) => acc + curr.percentage, 0);
      // 33 + 33 + 33 + 0 = 99%
      expect(sumPct).toBe(99);
    });
  });

  describe("calculateActiveChildren Stress Tests", () => {
    const refDate = new Date("2026-07-20T12:00:00Z");

    it("handles empty children and empty challenges", () => {
      expect(calculateActiveChildren([], 7, refDate, [])).toBe(0);
    });

    it("handles invalid date strings in child activity dates without throwing", () => {
      const children = [
        { id: "c1", last_activity_date: "invalid-date-string" },
        { id: "c2", updated_at: "not-a-date" },
      ];
      const active7d = calculateActiveChildren(children, 7, refDate);
      expect(active7d).toBe(0);
    });

    it("handles invalid date strings in challenges without throwing", () => {
      const children = [{ id: "c1", last_activity_date: null }];
      const challenges = [{ child_id: "c1", completed_at: "corrupted-timestamp" }];
      const active7d = calculateActiveChildren(children, 7, refDate, challenges);
      expect(active7d).toBe(0);
    });

    it("handles 0 days parameter (only exact/future timestamps active)", () => {
      const childrenPast = [{ id: "c1", last_activity_date: "2026-07-20T11:59:59Z" }];
      const childrenExact = [{ id: "c2", last_activity_date: "2026-07-20T12:00:00Z" }];

      expect(calculateActiveChildren(childrenPast, 0, refDate)).toBe(0);
      expect(calculateActiveChildren(childrenExact, 0, refDate)).toBe(1);
    });

    it("handles negative days parameter by requiring future timestamps", () => {
      const children = [{ id: "c1", last_activity_date: "2026-07-20T11:00:00Z" }];
      expect(calculateActiveChildren(children, -1, refDate)).toBe(0);
    });

    it("handles challenges belonging to non-existent children", () => {
      const children = [{ id: "c1", last_activity_date: "2026-01-01T00:00:00Z" }];
      const challenges = [{ child_id: "ghost-child", completed_at: "2026-07-20T10:00:00Z" }];
      const active7d = calculateActiveChildren(children, 7, refDate, challenges);
      expect(active7d).toBe(0);
    });
  });

  describe("calculateRetentionRate Stress Tests", () => {
    it("handles 0 total children or negative total children safely", () => {
      expect(calculateRetentionRate(0, 0)).toBe(0);
      expect(calculateRetentionRate(10, 0)).toBe(0);
      expect(calculateRetentionRate(5, -5)).toBe(0);
    });

    it("handles 0 active children with positive total children", () => {
      expect(calculateRetentionRate(0, 50)).toBe(0);
    });

    it("handles active30dCount greater than totalChildren", () => {
      expect(calculateRetentionRate(15, 10)).toBe(150);
    });

    it("handles negative active30dCount", () => {
      expect(calculateRetentionRate(-5, 10)).toBe(-50);
    });

    it("returns 0 when totalChildren is NaN", () => {
      const result = calculateRetentionRate(5, NaN);
      expect(result).toBe(0);
    });
  });

  describe("formatWhatsAppUrl Stress Tests", () => {
    it("returns null for missing, empty, or space-only strings", () => {
      expect(formatWhatsAppUrl(null)).toBeNull();
      expect(formatWhatsAppUrl(undefined)).toBeNull();
      expect(formatWhatsAppUrl("")).toBeNull();
      expect(formatWhatsAppUrl("   ")).toBeNull();
      expect(formatWhatsAppUrl("\t\n")).toBeNull();
    });

    it("returns null when string has no digit characters", () => {
      expect(formatWhatsAppUrl("no-digits-here")).toBeNull();
      expect(formatWhatsAppUrl("+++---()")).toBeNull();
    });

    it("strips formatting and symbols from phone numbers", () => {
      expect(formatWhatsAppUrl("+33 (0) 6 12 34 56 78")).toBe("https://wa.me/330612345678");
      expect(formatWhatsAppUrl("Tel: +225-07-00-11-22")).toBe("https://wa.me/22507001122");
    });

    it("handles single or double digit phone strings without throwing", () => {
      expect(formatWhatsAppUrl("0")).toBe("https://wa.me/0");
      expect(formatWhatsAppUrl("12")).toBe("https://wa.me/12");
    });

    it("sanitizes HTML/JS injection strings to pure digits", () => {
      const malicious = "+33612345678<script>alert(1)</script>";
      expect(formatWhatsAppUrl(malicious)).toBe("https://wa.me/336123456781");
    });

    it("returns null if a non-string type like number or object is passed", () => {
      expect(formatWhatsAppUrl(123456789 as any)).toBeNull();
      expect(formatWhatsAppUrl({} as any)).toBeNull();
    });
  });
});

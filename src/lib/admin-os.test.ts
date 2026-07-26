import { describe, it, expect } from "vitest";
import {
  calculateAgeDistribution,
  calculateActiveChildren,
  calculateRetentionRate,
  formatWhatsAppUrl,
  toMs,
  AgeBracketKey,
  calculateCityStats,
  calculateGardnerTotals,
  calculateGuildDistribution,
  detectHighPotentialProfiles,
  filterOrdersByStatus,
  filterTeenPassportProfiles,
  formatXOF,
  togglePassportState,
} from "./admin-os.functions";
import {
  calculateDeepSeekChatCost,
  calculateVisionSonnetCost,
  calculateNayaConversionRate,
  calculateNayaTelemetry,
  NAYA_PRICING,
} from "./naya-telemetry";

describe("Admin OS Helper Functions", () => {
  describe("toMs", () => {
    it("returns 0 for falsy or invalid date inputs", () => {
      expect(toMs(null)).toBe(0);
      expect(toMs(undefined)).toBe(0);
      expect(toMs("")).toBe(0);
      expect(toMs("not-a-date")).toBe(0);
    });

    it("returns correct epoch ms for valid date strings", () => {
      const iso = "2026-07-20T12:00:00Z";
      expect(toMs(iso)).toBe(new Date(iso).getTime());
    });
  });

  describe("calculateAgeDistribution", () => {
    it("returns zero counts and percentages when children array is empty", () => {
      const result = calculateAgeDistribution([]);
      expect(result).toHaveLength(4);
      for (const item of result) {
        expect(item.count).toBe(0);
        expect(item.percentage).toBe(0);
      }
    });

    it("correctly classifies children into exact age brackets", () => {
      const children = [
        { age: 3 }, // 3-6 ans
        { age: 5 }, // 3-6 ans
        { age: 6 }, // 3-6 ans
        { age: 7 }, // 7-10 ans
        { age: 9 }, // 7-10 ans
        { age: 10 }, // 7-10 ans
        { age: 11 }, // 11-13 ans
        { age: 13 }, // 11-13 ans
        { age: 14 }, // 14+ ans
        { age: 16 }, // 14+ ans
      ];

      const result = calculateAgeDistribution(children);

      const byBracket = Object.fromEntries(result.map((r) => [r.bracket, r]));

      expect(byBracket["3-6 ans"].count).toBe(3);
      expect(byBracket["3-6 ans"].percentage).toBe(30);

      expect(byBracket["7-10 ans"].count).toBe(3);
      expect(byBracket["7-10 ans"].percentage).toBe(30);

      expect(byBracket["11-13 ans"].count).toBe(2);
      expect(byBracket["11-13 ans"].percentage).toBe(20);

      expect(byBracket["14+ ans"].count).toBe(2);
      expect(byBracket["14+ ans"].percentage).toBe(20);
    });

    it("uses Math.floor for fractional ages like 6.4", () => {
      const result = calculateAgeDistribution([{ age: 6.4 }]);
      const byBracket = Object.fromEntries(result.map((r) => [r.bracket, r]));
      expect(byBracket["3-6 ans"].count).toBe(1);
    });

    it("guarantees all 4 standard age bracket keys are always present", () => {
      const result = calculateAgeDistribution([{ age: 8 }]);
      const brackets = result.map((r) => r.bracket);
      const expectedBrackets: AgeBracketKey[] = ["3-6 ans", "7-10 ans", "11-13 ans", "14+ ans"];

      expect(brackets).toEqual(expectedBrackets);
    });
  });

  describe("calculateRetentionRate", () => {
    it("returns 0 when totalChildren is 0 or invalid/NaN", () => {
      expect(calculateRetentionRate(0, 0)).toBe(0);
      expect(calculateRetentionRate(5, 0)).toBe(0);
      expect(calculateRetentionRate(5, NaN)).toBe(0);
      expect(calculateRetentionRate(5, -1)).toBe(0);
    });

    it("calculates exact rounded retention percentage", () => {
      expect(calculateRetentionRate(5, 10)).toBe(50);
      expect(calculateRetentionRate(1, 3)).toBe(33);
      expect(calculateRetentionRate(10, 10)).toBe(100);
      expect(calculateRetentionRate(0, 10)).toBe(0);
    });
  });

  describe("calculateActiveChildren", () => {
    const refDate = new Date("2026-07-20T12:00:00Z");

    it("counts children active within 7 days and 30 days based on last_activity_date", () => {
      const children = [
        {
          id: "child-1",
          last_activity_date: "2026-07-18T10:00:00Z", // 2 days ago -> active 7d & 30d
        },
        {
          id: "child-2",
          last_activity_date: "2026-07-05T10:00:00Z", // 15 days ago -> active 30d, inactive 7d
        },
        {
          id: "child-3",
          last_activity_date: "2026-05-01T10:00:00Z", // 80 days ago -> inactive 7d & 30d
        },
      ];

      const active7d = calculateActiveChildren(children, 7, refDate);
      const active30d = calculateActiveChildren(children, 30, refDate);

      expect(active7d).toBe(1);
      expect(active30d).toBe(2);
    });

    it("considers challenge activity timestamps if last_activity_date is missing", () => {
      const children = [
        {
          id: "child-4",
          last_activity_date: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];

      const challenges = [
        {
          child_id: "child-4",
          completed_at: "2026-07-19T14:00:00Z", // 1 day before refDate
        },
      ];

      const active7d = calculateActiveChildren(children, 7, refDate, challenges);
      expect(active7d).toBe(1);
    });
  });

  describe("formatWhatsAppUrl", () => {
    it("formats valid phone numbers into WhatsApp click-to-chat URLs", () => {
      expect(formatWhatsAppUrl("+225 07 12 34 56 78")).toBe("https://wa.me/2250712345678");
      expect(formatWhatsAppUrl("0612345678")).toBe("https://wa.me/0612345678");
    });

    it("returns null for invalid or missing phone inputs", () => {
      expect(formatWhatsAppUrl(null)).toBeNull();
      expect(formatWhatsAppUrl(undefined)).toBeNull();
      expect(formatWhatsAppUrl("")).toBeNull();
      expect(formatWhatsAppUrl("   ")).toBeNull();
      expect(formatWhatsAppUrl("abc-xyz")).toBeNull();
      expect(formatWhatsAppUrl(12345 as any)).toBeNull();
    });
  });

  describe("calculateCityStats", () => {
    it("returns empty array when children and orders are empty", () => {
      expect(calculateCityStats([])).toEqual([]);
    });

    it("aggregates children and order counts by city accurately", () => {
      const children = [
        { id: "c1", city: "Abidjan" },
        { id: "c2", city: "Abidjan" },
        { id: "c3", city: "Dakar" },
        { id: "c4", city: null },
        { id: "c5", city: "  " },
      ];

      const orders = [
        { child_id: "c1" },
        { child_id: "c1" },
        { child_id: "c3" },
        { child_id: "c4" },
      ];

      const stats = calculateCityStats(children, orders);

      const byCity = Object.fromEntries(stats.map((s) => [s.city, s]));

      expect(byCity["Abidjan"]).toEqual({
        city: "Abidjan",
        childrenCount: 2,
        ordersCount: 2,
        percentage: 40,
      });

      expect(byCity["Dakar"]).toEqual({
        city: "Dakar",
        childrenCount: 1,
        ordersCount: 1,
        percentage: 20,
      });

      expect(byCity["Ville non renseignée"]).toEqual({
        city: "Ville non renseignée",
        childrenCount: 2,
        ordersCount: 1,
        percentage: 40,
      });
    });
  });

  describe("calculateGardnerTotals", () => {
    it("aggregates totals across the 9 Gardner intelligences", () => {
      const children: Array<{ talents: Record<string, number> }> = [
        {
          talents: {
            spatial: 80,
            logico_mathematique: 50,
          },
        },
        {
          talents: {
            spatial: 40,
            creative: 75,
          },
        },
      ];

      const totals = calculateGardnerTotals(children);

      expect(totals).toHaveLength(9);

      const spatial = totals.find((t) => t.key === "spatial");
      expect(spatial).toBeDefined();
      expect(spatial?.totalScore).toBe(120);
      expect(spatial?.avgScore).toBe(60);
      expect(spatial?.count).toBe(2);

      const creative = totals.find((t) => t.key === "creative");
      expect(creative?.totalScore).toBe(75);
      expect(creative?.avgScore).toBe(37.5);
      expect(creative?.count).toBe(1);
    });
  });

  describe("calculateGuildDistribution", () => {
    it("aggregates children across the 6 Guildes and Guilde à découvrir", () => {
      const children: Array<{ talents: Record<string, number> }> = [
        { talents: { spatial: 80, artisanale: 40 } }, // Les Bâtisseurs
        { talents: { logico_mathematique: 90 } }, // Les Inventeurs
        { talents: {} }, // Guilde à découvrir
      ];

      const distribution = calculateGuildDistribution(children);

      const byKey = Object.fromEntries(distribution.map((g) => [g.key, g]));

      expect(byKey["batisseurs"].count).toBe(1);
      expect(byKey["inventeurs"].count).toBe(1);
      expect(byKey["aucune"].count).toBe(1);
      expect(byKey["batisseurs"].percentage).toBe(33);
    });
  });

  describe("detectHighPotentialProfiles", () => {
    it("detects high potential profiles with score >= 70", () => {
      const children: Array<{
        id: string;
        name: string;
        age: number;
        city: string;
        talents: Record<string, number>;
      }> = [
        {
          id: "c1",
          name: "Awa",
          age: 8,
          city: "Abidjan",
          talents: { spatial: 85, logico_mathematique: 40 },
        },
        {
          id: "c2",
          name: "Kofi",
          age: 10,
          city: "Yamoussoukro",
          talents: { creative: 95 },
        },
        {
          id: "c3",
          name: "Moussa",
          age: 6,
          city: "Dakar",
          talents: { sociale: 50 },
        },
      ];

      const alerts = detectHighPotentialProfiles(children);

      expect(alerts).toHaveLength(2);

      expect(alerts[0].childName).toBe("Kofi");
      expect(alerts[0].score).toBe(95);
      expect(alerts[0].dominantTalent).toBe("🎨 Créative");
      expect(alerts[0].badgeColor).toContain("purple");

      expect(alerts[1].childName).toBe("Awa");
      expect(alerts[1].score).toBe(85);
      expect(alerts[1].dominantTalent).toBe("📐 Spatiale");
      expect(alerts[1].badgeColor).toContain("emerald");
    });
  });

  describe("Admin OS Milestone 3: Naya AI Tracking & Costs", () => {
    it("calculates DeepSeek Chat and vision Sonnet cost breakdown correctly", () => {
      const chatCosts = calculateDeepSeekChatCost(2_000_000, 1_000_000); // $0.28 + $0.28
      const visionCosts = calculateVisionSonnetCost(500_000, 200_000); // $1.50 + $3.00

      // Total USD = 0.28 + 0.28 + 1.50 + 3.00 = $5.06
      const totalUsd = Math.round((chatCosts.costUsd + visionCosts.costUsd) * 10000) / 10000;
      expect(totalUsd).toBe(5.06);
      expect(chatCosts.costXof + visionCosts.costXof).toBe(Math.round(totalUsd * NAYA_PRICING.USD_TO_XOF_RATE));
    });

    it("calculates clamped conversion rate percentage", () => {
      expect(calculateNayaConversionRate(100, 42)).toBe(42);
      expect(calculateNayaConversionRate(0, 10)).toBe(0);
      expect(calculateNayaConversionRate(50, 60)).toBe(100);
    });

    it("generates complete Naya telemetry structure for Admin OS dashboard", () => {
      const telemetry = calculateNayaTelemetry({
        challengesGenerated: 25,
        challengesStarted: 20,
        challengesCompleted: 15,
        photoProofCompleted: 5,
        hypothesesCycles: 4,
        recommendationsCount: 10,
      });

      expect(telemetry.totalApiCalls).toBe(44);
      expect(telemetry.conversionRatePct).toBe(60);
      expect(telemetry.featureBreakdown).toHaveLength(3);
      expect(telemetry.modelBreakdown).toHaveLength(3);
      expect(telemetry.projection.projectedCallsMonthly).toBe(176);
    });
  });

  describe("Admin OS Milestone 4: Commerce & Passports d'Excellence", () => {
    it("filters orders by status correctly", () => {
      const orders = [
        { id: "o1", status: "pending" },
        { id: "o2", status: "delivered" },
        { id: "o3", status: "shipped" },
      ];

      expect(filterOrdersByStatus(orders, "Tous")).toHaveLength(3);
      expect(filterOrdersByStatus(orders, "En attente")).toEqual([{ id: "o1", status: "pending" }]);
      expect(filterOrdersByStatus(orders, "delivered")).toEqual([{ id: "o2", status: "delivered" }]);
    });

    it("filters teen passport profiles (age >= 14)", () => {
      const children = [
        { id: "c1", name: "Child 10yo", age: 10 },
        { id: "c2", name: "Teen 14yo", age: 14 },
        { id: "c3", name: "Teen 17yo", age: 17 },
      ];

      const teens = filterTeenPassportProfiles(children);
      expect(teens).toHaveLength(2);
      expect(teens.map((t) => t.id)).toEqual(["c2", "c3"]);
    });

    it("formats XOF currency prices correctly", () => {
      expect(formatXOF(50000)).toContain("50");
      expect(formatXOF(50000)).toContain("000");
      expect(formatXOF(50000)).toContain("FCFA");
      expect(formatXOF(null)).toBe("0 FCFA");
    });

    it("handles passport toggle state logic correctly", () => {
      expect(togglePassportState(false)).toBe(true);
      expect(togglePassportState(true)).toBe(false);
      expect(togglePassportState(false, true)).toBe(true);
    });
  });
});


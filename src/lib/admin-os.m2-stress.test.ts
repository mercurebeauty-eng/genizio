import { describe, it, expect } from "vitest";
import {
  calculateCityStats,
  calculateGardnerTotals,
  calculateGuildDistribution,
  detectHighPotentialProfiles,
} from "./admin-os.functions";

describe("Milestone 2 Stress Tests - Empirical Edge Case Verification", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. calculateCityStats Stress & Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("calculateCityStats Edge Cases", () => {
    it("handles null, undefined, empty, and whitespace-only city strings", () => {
      const children = [
        { id: "c1", city: null },
        { id: "c2", city: undefined },
        { id: "c3", city: "" },
        { id: "c4", city: "   " },
        { id: "c5", city: "\t\n  " },
        { id: "c6", city: "Abidjan" },
      ];

      const stats = calculateCityStats(children);
      const byCity = Object.fromEntries(stats.map((s) => [s.city, s]));

      expect(byCity["Abidjan"]).toEqual({
        city: "Abidjan",
        childrenCount: 1,
        ordersCount: 0,
        percentage: 17, // 1/6 = 16.66% -> 17%
      });

      expect(byCity["Ville non renseignée"]).toEqual({
        city: "Ville non renseignée",
        childrenCount: 5,
        ordersCount: 0,
        percentage: 83, // 5/6 = 83.33% -> 83%
      });
    });

    it("trims whitespace and handles special characters, unicode, and emojis in city names", () => {
      const children = [
        { id: "c1", city: "  Abidjan  " },
        { id: "c2", city: "Bouaké 🔥" },
        { id: "c3", city: "San-Pédro (Zone Bas-Sassandra)" },
        { id: "c4", city: "  Abidjan" },
      ];

      const stats = calculateCityStats(children);
      const abidjan = stats.find((s) => s.city === "Abidjan");
      const bouake = stats.find((s) => s.city === "Bouaké 🔥");
      const sanPedro = stats.find((s) => s.city === "San-Pédro (Zone Bas-Sassandra)");

      expect(abidjan).toBeDefined();
      expect(abidjan?.childrenCount).toBe(2);
      expect(bouake?.childrenCount).toBe(1);
      expect(sanPedro?.childrenCount).toBe(1);
    });

    it("correctly handles orders for non-existent children, null child_id, or null cities", () => {
      const children = [
        { id: "c1", city: "Abidjan" },
        { id: "c2", city: null },
      ];
      const orders = [
        { child_id: "c1" },
        { child_id: "c2" }, // child with null city -> grouped under 'Ville non renseignée'
        { child_id: "ghost-id" }, // child not in array -> grouped under 'Ville non renseignée'
        { child_id: null }, // order without child_id -> grouped under 'Ville non renseignée'
      ];

      const stats = calculateCityStats(children, orders);
      const byCity = Object.fromEntries(stats.map((s) => [s.city, s]));

      expect(byCity["Abidjan"].ordersCount).toBe(1);
      expect(byCity["Ville non renseignée"].ordersCount).toBe(3);
    });

    it("handles orders provided when children array is empty []", () => {
      const orders = [{ child_id: "ord-1" }, { child_id: "ord-2" }];
      const stats = calculateCityStats([], orders);

      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        city: "Ville non renseignée",
        childrenCount: 0,
        ordersCount: 2,
        percentage: 0,
      });
    });

    it("safely handles non-array or null children/orders inputs", () => {
      expect(calculateCityStats(null as any, undefined as any)).toEqual([]);
      expect(calculateCityStats(undefined as any, [] as any)).toEqual([]);
    });

    it("sorts 'Ville non renseignée' last when children counts are tied", () => {
      const children = [
        { id: "c1", city: "Dakar" },
        { id: "c2", city: "Abidjan" },
        { id: "c3", city: null },
      ];
      const stats = calculateCityStats(children);

      expect(stats.map((s) => s.city)).toEqual(["Abidjan", "Dakar", "Ville non renseignée"]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. calculateGardnerTotals Stress & Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("calculateGardnerTotals Edge Cases", () => {
    it("handles profiles with empty {} or missing (null/undefined) talents objects", () => {
      const children = [
        { talents: {} },
        { talents: null },
        { talents: undefined },
        { talents: { spatial: 50 } },
      ];

      const totals = calculateGardnerTotals(children);
      expect(totals).toHaveLength(9);

      const spatial = totals.find((t) => t.key === "spatial");
      expect(spatial?.totalScore).toBe(50);
      expect(spatial?.count).toBe(1);
      // avgScore should be totalScore (50) / totalChildren (4) = 12.5
      expect(spatial?.avgScore).toBe(12.5);

      // Other 8 talents should have totalScore 0, count 0, avgScore 0
      const creative = totals.find((t) => t.key === "creative");
      expect(creative?.totalScore).toBe(0);
      expect(creative?.count).toBe(0);
      expect(creative?.avgScore).toBe(0);
    });

    it("ignores zero, negative, NaN, non-numeric, or non-positive talent scores", () => {
      const children = [
        {
          talents: {
            spatial: 0,
            logico_mathematique: -15,
            creative: NaN,
            linguistique: "80" as any,
            corporelle: null as any,
            sociale: 90,
          },
        },
      ];

      const totals = calculateGardnerTotals(children);
      const byKey = Object.fromEntries(totals.map((t) => [t.key, t]));

      expect(byKey["spatial"].totalScore).toBe(0);
      expect(byKey["spatial"].count).toBe(0);

      expect(byKey["logico_mathematique"].totalScore).toBe(0);
      expect(byKey["logico_mathematique"].count).toBe(0);

      expect(byKey["creative"].totalScore).toBe(0);

      expect(byKey["linguistique"].totalScore).toBe(0);

      expect(byKey["sociale"].totalScore).toBe(90);
      expect(byKey["sociale"].count).toBe(1);
    });

    it("handles null or undefined child entries inside array without throwing", () => {
      const children = [null as any, undefined as any, { talents: { spatial: 60 } }];
      const totals = calculateGardnerTotals(children);
      const spatial = totals.find((t) => t.key === "spatial");
      expect(spatial?.totalScore).toBe(60);
      expect(spatial?.count).toBe(1);
    });

    it("handles non-array inputs gracefully", () => {
      const totals = calculateGardnerTotals(null as any);
      expect(totals).toHaveLength(9);
      for (const t of totals) {
        expect(t.totalScore).toBe(0);
        expect(t.avgScore).toBe(0);
      }
    });

    it("correctly handles decimal/fractional talent scores", () => {
      const children = [
        { talents: { spatial: 75.5 } },
        { talents: { spatial: 80.2 } },
      ];
      const totals = calculateGardnerTotals(children);
      const spatial = totals.find((t) => t.key === "spatial");
      expect(spatial?.totalScore).toBe(155.7);
      // 155.7 / 2 = 77.85 -> rounded to 1 decimal place = 77.9
      expect(spatial?.avgScore).toBe(77.9);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. calculateGuildDistribution Stress & Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("calculateGuildDistribution Edge Cases", () => {
    it("assigns profiles with empty {} or missing talents to 'Guilde à découvrir' (key: 'aucune')", () => {
      const children = [
        { talents: {} },
        { talents: null },
        { talents: undefined },
      ];

      const distribution = calculateGuildDistribution(children);
      const noGuild = distribution.find((g) => g.key === "aucune");

      expect(noGuild?.count).toBe(3);
      expect(noGuild?.percentage).toBe(100);
      expect(noGuild?.name).toBe("Guilde à découvrir");
    });

    it("correctly distributes children with varied talent profiles across guilds", () => {
      const children = [
        { talents: { spatial: 90 } }, // Les Bâtisseurs (batisseurs)
        { talents: { logico_mathematique: 85 } }, // Les Inventeurs (inventeurs)
        { talents: { corporelle: 80 } }, // Les Explorateurs (explorateurs)
        { talents: { creative: 95 } }, // Les Créateurs (createurs)
        { talents: { sociale: 88 } }, // Les Stratèges (strateges)
        { talents: {} }, // Guilde à découvrir (aucune)
      ];

      const distribution = calculateGuildDistribution(children);
      expect(distribution).toHaveLength(7);

      for (const guild of distribution) {
        if (["batisseurs", "inventeurs", "explorateurs", "createurs", "strateges", "aucune"].includes(guild.key)) {
          expect(guild.count).toBe(1);
          expect(guild.percentage).toBe(17); // Math.round(1/6 * 100) = 17
        } else {
          expect(guild.count).toBe(0);
          expect(guild.percentage).toBe(0);
        }
      }
    });

    it("handles total children = 0 cleanly with 7 guild items initialized to 0", () => {
      const distribution = calculateGuildDistribution([]);
      expect(distribution).toHaveLength(7);
      for (const g of distribution) {
        expect(g.count).toBe(0);
        expect(g.percentage).toBe(0);
      }
    });

    it("handles non-array inputs without throwing", () => {
      const distribution = calculateGuildDistribution(null as any);
      expect(distribution).toHaveLength(7);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. detectHighPotentialProfiles Boundary & Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("detectHighPotentialProfiles Threshold Boundary & Edge Cases", () => {
    it("tests score boundary close to 70 threshold (69 vs 70 vs 79 vs 80 vs 89 vs 90)", () => {
      const children = [
        {
          id: "child-69",
          name: "Marc",
          age: 7,
          city: "Abidjan",
          talents: { spatial: 69 },
        },
        {
          id: "child-69.9",
          name: "Sara",
          age: 8,
          city: "Abidjan",
          talents: { spatial: 69.9 },
        },
        {
          id: "child-70",
          name: "Fatou",
          age: 9,
          city: "Dakar",
          talents: { spatial: 70 },
        },
        {
          id: "child-79",
          name: "Jean",
          age: 10,
          city: "Lomé",
          talents: { creative: 79 },
        },
        {
          id: "child-80",
          name: "Amina",
          age: 11,
          city: "Bamako",
          talents: { logico_mathematique: 80 },
        },
        {
          id: "child-89",
          name: "Kofi",
          age: 12,
          city: "Accra",
          talents: { linguistique: 89 },
        },
        {
          id: "child-90",
          name: "Zahra",
          age: 13,
          city: "Niamey",
          talents: { sociale: 90 },
        },
      ];

      const alerts = detectHighPotentialProfiles(children);

      // Should ONLY detect scores >= 70 (Fatou, Jean, Amina, Kofi, Zahra) -> 5 alerts
      expect(alerts).toHaveLength(5);

      const alertIds = alerts.map((a) => a.childId);
      expect(alertIds).not.toContain("child-69");
      expect(alertIds).not.toContain("child-69.9");

      // Verify sorting by score descending (Zahra 90, Kofi 89, Amina 80, Jean 79, Fatou 70)
      expect(alerts[0].childId).toBe("child-90");
      expect(alerts[0].score).toBe(90);
      expect(alerts[0].badgeColor).toContain("purple"); // 90+ is purple

      expect(alerts[1].childId).toBe("child-89");
      expect(alerts[1].score).toBe(89);
      expect(alerts[1].badgeColor).toContain("emerald"); // 80-89 is emerald

      expect(alerts[2].childId).toBe("child-80");
      expect(alerts[2].score).toBe(80);
      expect(alerts[2].badgeColor).toContain("emerald"); // 80-89 is emerald

      expect(alerts[3].childId).toBe("child-79");
      expect(alerts[3].score).toBe(79);
      expect(alerts[3].badgeColor).toContain("amber"); // 70-79 is amber

      expect(alerts[4].childId).toBe("child-70");
      expect(alerts[4].score).toBe(70);
      expect(alerts[4].badgeColor).toContain("amber"); // 70-79 is amber
    });

    it("ignores profiles with empty {} or missing (null/undefined) talents", () => {
      const children = [
        { id: "c1", name: "NoTalentObj", age: 5, city: "Abidjan", talents: {} },
        { id: "c2", name: "NullTalents", age: 6, city: "Abidjan", talents: null },
        { id: "c3", name: "UndefTalents", age: 7, city: "Abidjan", talents: undefined },
      ];

      const alerts = detectHighPotentialProfiles(children);
      expect(alerts).toHaveLength(0);
    });

    it("handles null, empty, whitespace-only, and special character city strings in alerts", () => {
      const children = [
        { id: "c1", name: "Yao", age: 8, city: null, talents: { spatial: 75 } },
        { id: "c2", name: "Bamba", age: 9, city: "   ", talents: { creative: 85 } },
        { id: "c3", name: "Nia", age: 10, city: "San-Pédro 🌊", talents: { logico_mathematique: 95 } },
      ];

      const alerts = detectHighPotentialProfiles(children);
      expect(alerts).toHaveLength(3);

      const arrayByChild = Object.fromEntries(alerts.map((a) => [a.childId, a]));

      expect(arrayByChild["c1"].city).toBe("Ville non renseignée");
      expect(arrayByChild["c1"].rationale).toContain("Ville non renseignée");

      expect(arrayByChild["c2"].city).toBe("Ville non renseignée");

      expect(arrayByChild["c3"].city).toBe("San-Pédro 🌊");
      expect(arrayByChild["c3"].rationale).toContain("San-Pédro 🌊");
    });

    it("correctly identifies maximum score when multiple talents are >= 70", () => {
      const children = [
        {
          id: "c1",
          name: "Sery",
          age: 10,
          city: "Abidjan",
          talents: { spatial: 72, logico_mathematique: 88, creative: 75 },
        },
      ];

      const alerts = detectHighPotentialProfiles(children);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].score).toBe(88);
      expect(alerts[0].dominantTalent).toBe("Logique");
    });

    it("handles tied top scores cleanly", () => {
      const children = [
        {
          id: "c1",
          name: "Tia",
          age: 9,
          city: "Korhogo",
          talents: { spatial: 85, creative: 85 },
        },
      ];

      const alerts = detectHighPotentialProfiles(children);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].score).toBe(85);
      // Picks first tied dominant talent encountered
      expect(["Spatiale", "Créative"]).toContain(alerts[0].dominantTalent);
    });

    it("safely handles non-array input or null child items", () => {
      expect(detectHighPotentialProfiles(null as any)).toEqual([]);
      expect(detectHighPotentialProfiles([null as any, undefined as any])).toEqual([]);
    });
  });
});

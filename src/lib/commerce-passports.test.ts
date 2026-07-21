import { describe, it, expect } from "vitest";
import {
  filterOrdersByStatus,
  filterTeenPassportProfiles,
  formatXOF,
  togglePassportState,
  KitOrder,
} from "./admin-os.functions";

describe("Commerce & Passports d'Excellence Helpers", () => {
  describe("filterOrdersByStatus", () => {
    const mockOrders: KitOrder[] = [
      {
        id: "ord-1",
        user_id: "u-1",
        child_id: "c-1",
        challenge_id: null,
        total_price_xof: 15000,
        items: [{ name: "Kit Bâtisseur", price_xof: 15000 }],
        status: "pending",
        delivery_notes: null,
        created_at: "2026-07-20T10:00:00Z",
      },
      {
        id: "ord-2",
        user_id: "u-2",
        child_id: "c-2",
        challenge_id: null,
        total_price_xof: 25000,
        items: [{ name: "Kit Inventeur Premium", price_xof: 25000 }],
        status: "confirmed",
        delivery_notes: "Livraison rapide",
        created_at: "2026-07-20T11:00:00Z",
      },
      {
        id: "ord-3",
        user_id: "u-3",
        child_id: "c-3",
        challenge_id: null,
        total_price_xof: 10000,
        items: [{ name: "Kit Explorateur", price_xof: 10000 }],
        status: "shipped",
        delivery_notes: null,
        created_at: "2026-07-20T12:00:00Z",
      },
      {
        id: "ord-4",
        user_id: "u-4",
        child_id: "c-4",
        challenge_id: null,
        total_price_xof: 50000,
        items: [{ name: "Pack complet", price_xof: 50000 }],
        status: "delivered",
        delivery_notes: null,
        created_at: "2026-07-20T13:00:00Z",
      },
      {
        id: "ord-5",
        user_id: "u-5",
        child_id: "c-5",
        challenge_id: null,
        total_price_xof: 5000,
        items: [{ name: "Accessoires", price_xof: 5000 }],
        status: "cancelled",
        delivery_notes: null,
        created_at: "2026-07-20T14:00:00Z",
      },
    ];

    it("returns empty array when input orders is null or undefined", () => {
      expect(filterOrdersByStatus(null, "Tous")).toEqual([]);
      expect(filterOrdersByStatus(undefined, "pending")).toEqual([]);
    });

    it("returns all orders when status is 'Tous', 'all', or empty", () => {
      expect(filterOrdersByStatus(mockOrders, "Tous")).toHaveLength(5);
      expect(filterOrdersByStatus(mockOrders, "all")).toHaveLength(5);
      expect(filterOrdersByStatus(mockOrders, "")).toHaveLength(5);
    });

    it("filters orders correctly by exact status code", () => {
      const pending = filterOrdersByStatus(mockOrders, "pending");
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe("ord-1");

      const delivered = filterOrdersByStatus(mockOrders, "delivered");
      expect(delivered).toHaveLength(1);
      expect(delivered[0].id).toBe("ord-4");
    });

    it("supports French label status filters ('En attente', 'Confirmé', etc.)", () => {
      const pendingFr = filterOrdersByStatus(mockOrders, "En attente");
      expect(pendingFr).toHaveLength(1);
      expect(pendingFr[0].id).toBe("ord-1");

      const confirmedFr = filterOrdersByStatus(mockOrders, "Confirmé");
      expect(confirmedFr).toHaveLength(1);
      expect(confirmedFr[0].id).toBe("ord-2");

      const shippedFr = filterOrdersByStatus(mockOrders, "Expédié");
      expect(shippedFr).toHaveLength(1);
      expect(shippedFr[0].id).toBe("ord-3");

      const deliveredFr = filterOrdersByStatus(mockOrders, "Livré");
      expect(deliveredFr).toHaveLength(1);
      expect(deliveredFr[0].id).toBe("ord-4");

      const cancelledFr = filterOrdersByStatus(mockOrders, "Annulé");
      expect(cancelledFr).toHaveLength(1);
      expect(cancelledFr[0].id).toBe("ord-5");
    });
  });

  describe("filterTeenPassportProfiles", () => {
    it("returns empty array when input is null, undefined, or empty", () => {
      expect(filterTeenPassportProfiles(null)).toEqual([]);
      expect(filterTeenPassportProfiles(undefined)).toEqual([]);
      expect(filterTeenPassportProfiles([])).toEqual([]);
    });

    it("filters child profiles keeping only those with age >= 14", () => {
      const children = [
        { id: "c1", name: "Awa", age: 8 },
        { id: "c2", name: "Kofi", age: 13 },
        { id: "c3", name: "Yao", age: 14 },
        { id: "c4", name: "Aminata", age: 16 },
        { id: "c5", name: "Sidy", age: 17 },
      ];

      const teens = filterTeenPassportProfiles(children);
      expect(teens).toHaveLength(3);
      expect(teens.map((t) => t.id)).toEqual(["c3", "c4", "c5"]);
    });

    it("ignores children with missing, null, NaN, or non-numeric age", () => {
      const children = [
        { id: "c1", name: "Invalid 1", age: null as any },
        { id: "c2", name: "Invalid 2", age: undefined as any },
        { id: "c3", name: "Invalid 3", age: NaN },
        { id: "c4", name: "Valid Teen", age: 15 },
      ];

      const teens = filterTeenPassportProfiles(children);
      expect(teens).toHaveLength(1);
      expect(teens[0].name).toBe("Valid Teen");
    });
  });

  describe("formatXOF", () => {
    it("formats 0 and falsy values as '0 FCFA'", () => {
      expect(formatXOF(0)).toBe("0 FCFA");
      expect(formatXOF(null)).toBe("0 FCFA");
      expect(formatXOF(undefined)).toBe("0 FCFA");
      expect(formatXOF(NaN)).toBe("0 FCFA");
    });

    it("formats positive numbers into XOF currency strings with French formatting", () => {
      expect(formatXOF(50000)).toContain("50");
      expect(formatXOF(50000)).toContain("000");
      expect(formatXOF(50000)).toContain("FCFA");

      expect(formatXOF(1500)).toContain("1");
      expect(formatXOF(1500)).toContain("500");
      expect(formatXOF(1500)).toContain("FCFA");
    });
  });

  describe("togglePassportState", () => {
    it("toggles boolean state when explicit target is omitted", () => {
      expect(togglePassportState(false)).toBe(true);
      expect(togglePassportState(true)).toBe(false);
    });

    it("returns explicitTarget when provided", () => {
      expect(togglePassportState(false, true)).toBe(true);
      expect(togglePassportState(true, true)).toBe(true);
      expect(togglePassportState(true, false)).toBe(false);
      expect(togglePassportState(false, false)).toBe(false);
    });
  });
});

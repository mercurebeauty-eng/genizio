import { describe, it, expect } from "vitest";
import {
  resolveExtraSlotPrice,
  formatXof,
  formatXofAmount,
  STANDARD_PRICE_XOF,
  PASSPORT_PRICE_XOF,
  DIAGNOSTIC_PRICE_XOF,
  PACK_PRICE_XOF,
  SESSION_PRICE_XOF,
  resolveSponsorshipPrice,
} from "@/lib/pricing";

describe("resolveExtraSlotPrice", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");

  it("retourne directement le tarif standard premium de 35 000 FCFA", () => {
    const result = resolveExtraSlotPrice("2026-07-01T00:00:00.000Z", now);
    expect(result.priceXof).toBe(35000);
    expect(result.isPromo).toBe(false);
    expect(result.promoEndsAt).toBeNull();
  });

  it("gère les références null, undefined ou invalides de manière robuste", () => {
    expect(resolveExtraSlotPrice(null, now).priceXof).toBe(STANDARD_PRICE_XOF);
    expect(resolveExtraSlotPrice(undefined, now).priceXof).toBe(STANDARD_PRICE_XOF);
    expect(resolveExtraSlotPrice("pas-une-date", now).priceXof).toBe(STANDARD_PRICE_XOF);
  });
});

describe("constantes tarifaires premium", () => {
  it("valide les montants des produits et services", () => {
    expect(STANDARD_PRICE_XOF).toBe(35000);
    expect(PASSPORT_PRICE_XOF).toBe(75000);
    expect(DIAGNOSTIC_PRICE_XOF).toBe(50000);
    expect(SESSION_PRICE_XOF).toBe(15000);
    expect(PACK_PRICE_XOF).toBe(180000);
  });

  it("calcule le parrainage au tarif standard par mois", () => {
    const sp = resolveSponsorshipPrice(3, "XOF");
    expect(sp.paidMonths).toBe(3);
    expect(sp.amountPaid).toBe(3 * 35000);
  });
});

describe("formatXof / formatXofAmount", () => {
  it("formate le montant en français avec le suffixe FCFA", () => {
    expect(formatXofAmount(35000)).toMatch(/^35[\s ]000$/);
    expect(formatXof(35000)).toMatch(/^35[\s ]000 FCFA$/);
    expect(formatXof(50000)).toMatch(/^50[\s ]000 FCFA$/);
    expect(formatXof(75000)).toMatch(/^75[\s ]000 FCFA$/);
    expect(formatXof(180000)).toMatch(/^180[\s ]000 FCFA$/);
  });
});

import { describe, it, expect } from "vitest";
import {
  resolveExtraSlotPrice,
  formatXof,
  formatXofAmount,
  PROMO_PRICE_XOF,
  STANDARD_PRICE_XOF,
} from "@/lib/pricing";

// Prix de bienvenue (2026-08-03) : 5 000 FCFA pendant les 3 premiers mois du COMPTE (pas une
// fenêtre de lancement globale), puis 15 000 FCFA. Même barème utilisé côté organisations avec
// campaigns.created_at comme référence, d'où la signature générique "referenceCreatedAt".
describe("resolveExtraSlotPrice", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("un compte de moins de 3 mois est en promo", () => {
    const result = resolveExtraSlotPrice("2026-07-01T00:00:00.000Z", now);
    expect(result.priceXof).toBe(PROMO_PRICE_XOF);
    expect(result.isPromo).toBe(true);
    expect(result.promoEndsAt).not.toBeNull();
  });

  it("un compte de plus de 3 mois est au tarif standard", () => {
    const result = resolveExtraSlotPrice("2026-01-01T00:00:00.000Z", now);
    expect(result.priceXof).toBe(STANDARD_PRICE_XOF);
    expect(result.isPromo).toBe(false);
    expect(result.promoEndsAt).toBeNull();
  });

  it("un compte créé exactement il y a 3 mois n'est plus en promo", () => {
    const result = resolveExtraSlotPrice("2026-05-03T12:00:00.000Z", now);
    expect(result.isPromo).toBe(false);
    expect(result.priceXof).toBe(STANDARD_PRICE_XOF);
  });

  it("une référence manquante retombe sur le tarif standard, jamais une promo offerte par erreur", () => {
    expect(resolveExtraSlotPrice(null, now).priceXof).toBe(STANDARD_PRICE_XOF);
    expect(resolveExtraSlotPrice(undefined, now).priceXof).toBe(STANDARD_PRICE_XOF);
    expect(resolveExtraSlotPrice("pas-une-date", now).priceXof).toBe(STANDARD_PRICE_XOF);
  });
});

describe("formatXof / formatXofAmount", () => {
  // Intl.NumberFormat("fr-FR") insère une espace insécable étroite (U+202F) entre les
  // milliers, pas une espace ASCII classique — comparaison par regex plutôt que par égalité
  // stricte pour ne pas dépendre du caractère exact choisi par l'environnement Node/ICU.
  it("formate le montant en français avec le suffixe FCFA", () => {
    expect(formatXofAmount(5000)).toMatch(/^5[\s ]000$/);
    expect(formatXof(5000)).toMatch(/^5[\s ]000 FCFA$/);
    expect(formatXof(15000)).toMatch(/^15[\s ]000 FCFA$/);
  });
});

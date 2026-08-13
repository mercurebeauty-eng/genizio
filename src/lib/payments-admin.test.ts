import { describe, it, expect } from "vitest";
import {
  computeSubscriptionExtensionWindow,
  campaignTokenCount,
  resolveCampaignTokenLot,
} from "@/lib/payments-admin.functions";

// Refonte Admin OS — contrôles manuels de secours (décision #71-72). Les fonctions
// pures portent la logique critique (fenêtres, lots) ; les handlers server fns n'y
// ajoutent que la lecture/écriture. Tests des maths, pas des appels réseau.

describe("computeSubscriptionExtensionWindow — prolongation d'abonnement", () => {
  it("étend depuis la fin de période courante quand elle est future (jamais de découpe)", () => {
    const futureEnd = new Date(Date.now() + 20 * 86_400_000).toISOString();
    const { start, end } = computeSubscriptionExtensionWindow(futureEnd, 3);
    expect(new Date(start).getTime()).toBe(new Date(futureEnd).getTime());
    const months = (new Date(end).getFullYear() - new Date(futureEnd).getFullYear()) * 12 +
      (new Date(end).getMonth() - new Date(futureEnd).getMonth());
    expect(months).toBe(3);
  });

  it("démarre maintenant quand la période est déjà dépassée (relance après coupure)", () => {
    const pastEnd = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const { start, end } = computeSubscriptionExtensionWindow(pastEnd, 1);
    expect(new Date(start).getTime()).toBeGreaterThan(new Date(pastEnd).getTime());
    expect(new Date(end).getTime()).toBeGreaterThan(Date.now());
  });

  it("gère l'absence de période (première activation manuelle)", () => {
    const { start, end } = computeSubscriptionExtensionWindow(null, 1);
    expect(new Date(end).getTime() - new Date(start).getTime()).toBeGreaterThan(0);
  });
});

describe("campaignTokenCount — codes créés par un paiement de campagne", () => {
  it("divise le montant par le prix unitaire (30 000 / 3 000 → 10 codes)", () => {
    expect(campaignTokenCount(30000, 3000)).toBe(10);
  });

  it("arrondit à l'unité inférieure (montant partiel) mais jamais à zéro", () => {
    expect(campaignTokenCount(7500, 3000)).toBe(2);
    expect(campaignTokenCount(1000, 3000)).toBe(1);
  });
});

describe("resolveCampaignTokenLot — plafond à l'objectif restant", () => {
  it("respecte la capacité restante (5 existants, objectif 10, montant pour 10 → 5)", () => {
    expect(resolveCampaignTokenLot(30000, 3000, 5, 10)).toBe(5);
  });

  it("retourne 0 quand la capacité est atteinte (objectif plein)", () => {
    expect(resolveCampaignTokenLot(30000, 3000, 10, 10)).toBe(0);
  });

  it("lève une erreur si la campagne n'a pas de prix unitaire", () => {
    expect(() => resolveCampaignTokenLot(30000, null, 0, 10)).toThrow(/prix unitaire/);
    expect(() => resolveCampaignTokenLot(30000, 0, 0, 10)).toThrow(/prix unitaire/);
  });
});

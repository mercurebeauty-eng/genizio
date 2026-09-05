import { describe, expect, it } from "vitest";
import {
  claimBottomOverlay,
  getBottomOverlayCount,
  subscribeBottomOverlays,
} from "@/lib/ui-overlays";

// Store d'overlays bas d'écran : chaque overlay affiché (popup d'installation,
// setup push) réserve un slot ; WhatsAppFAB s'efface tant que le compteur > 0.
// Le compteur doit rester exact et jamais négatif, quel que soit l'ordre des
// claim/release (montages/démontages React dans n'importe quel ordre).

describe("ui-overlays store", () => {
  it("claim/release maintient le compteur", () => {
    expect(getBottomOverlayCount()).toBe(0);
    const release1 = claimBottomOverlay();
    expect(getBottomOverlayCount()).toBe(1);
    const release2 = claimBottomOverlay();
    expect(getBottomOverlayCount()).toBe(2);
    release1();
    expect(getBottomOverlayCount()).toBe(1);
    release2();
    expect(getBottomOverlayCount()).toBe(0);
  });

  it("double release ne descend jamais sous zéro", () => {
    const release = claimBottomOverlay();
    release();
    release();
    expect(getBottomOverlayCount()).toBe(0);
  });

  it("notifie les abonnés à chaque changement, et le désabonnement stoppe les notifications", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeBottomOverlays(() => seen.push(getBottomOverlayCount()));

    const release = claimBottomOverlay();
    expect(seen).toEqual([1]);
    release();
    expect(seen).toEqual([1, 0]);

    unsubscribe();
    const release2 = claimBottomOverlay();
    expect(seen).toEqual([1, 0]); // plus de notification après désabonnement
    release2();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimBottomOverlay,
  getBottomOverlayCount,
  subscribeBottomOverlays,
} from "@/lib/ui-overlays";

// Le store d'overlays doit rester exact sous montage/démontage :
// chaque claim actif = +1, chaque release = -1, jamais de compte négatif.

describe("ui-overlays store", () => {
  afterEach(() => {
    // Retour à zéro entre les tests même si un cleanup a été raté.
    while (getBottomOverlayCount() > 0) {
      const release = claimBottomOverlay();
      release();
      break;
    }
  });

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

  it("notifie les abonnés lors des changements d'état", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBottomOverlays(listener);

    const release1 = claimBottomOverlay();
    expect(listener).toHaveBeenCalledTimes(1);

    release1();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    const release2 = claimBottomOverlay();
    expect(listener).toHaveBeenCalledTimes(2);
    release2();
  });
});


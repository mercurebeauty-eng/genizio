import { useEffect, useSyncExternalStore } from "react";
import {
  claimBottomOverlay,
  getBottomOverlayCount,
  subscribeBottomOverlays,
} from "@/lib/ui-overlays";

/**
 * Déclare un overlay bas d'écran (popup d'installation, setup push…) tant que
 * `active` est vrai et le composant monté. Le cleanup libère le slot même si
 * le composant démonte entre-temps (navigation SPA).
 */
export function useBottomOverlayClaim(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return claimBottomOverlay();
  }, [active]);
}

/** Nombre d'overlays bas actuellement affichés (0 = zone libre). */
export function useBottomOverlayCount(): number {
  return useSyncExternalStore(subscribeBottomOverlays, getBottomOverlayCount, () => 0);
}

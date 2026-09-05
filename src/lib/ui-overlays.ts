// Compteur partagé des overlays « bas d'écran » (PwaInstallPrompt,
// PushNotificationsSetup) montés dans __root.
//
// Pourquoi ce store : sur un écran 360×640, ces overlays entraient en
// collision entre eux ET avec l'AppTabBar (bottom-0, ~5rem) et le
// WhatsAppFAB — trois éléments fixed en z-50 empilés sur la même zone.
// Chaque overlay se déclare ici en s'affichant ; WhatsAppFAB s'efface
// tant que la zone est occupée. Pattern identique à sw-ready.ts :
// useSyncExternalStore + module-level, pas de provider React.

let bottomOverlayCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Réserve un slot d'overlay bas tant que la callback de cleanup n'a pas tourné. */
export function claimBottomOverlay(): () => void {
  bottomOverlayCount += 1;
  emit();
  return () => {
    bottomOverlayCount = Math.max(0, bottomOverlayCount - 1);
    emit();
  };
}

export function subscribeBottomOverlays(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBottomOverlayCount(): number {
  return bottomOverlayCount;
}

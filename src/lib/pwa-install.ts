// Capture du prompt d'installation PWA — au niveau MODULE, pas composant.
//
// Pourquoi ici : l'événement `beforeinstallprompt` (Chrome/Android/Edge) se
// déclenche très tôt dans le chargement de la page, souvent AVANT que React
// n'hydrate les composants. Un listener branché dans un useEffect raterait
// l'événement une fois sur deux selon la vitesse de rendu — c'est exactement
// le bug qui rendait le popup d'installation erratique. On capture donc
// l'événement au chargement du bundle (ce fichier est importé par le
// composant, évalué dès le premier module graph) et le composant vient le
// lire quand il est prêt.

export interface DeferredInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let captured: DeferredInstallPrompt | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // preventDefault : on bloque la mini-infobar native de Chrome pour
    // garder la main sur notre propre UI d'installation.
    e.preventDefault();
    captured = e as unknown as DeferredInstallPrompt;
  });
}

/** Le prompt est-il disponible sur cette page (événement déjà reçu) ? */
export function getDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return captured;
}

/**
 * Politique de réaffichage après fermeture par l'utilisateur.
 * Extrêment pur pour être testé : le popup est supprimé pendant
 * `suppressionDays` jours, puis revient automatiquement tant que
 * la PWA n'est pas installée.
 */
export const INSTALL_PROMPT_SUPPRESSION_DAYS = 2;

export function isInstallPromptSuppressed(
  dismissedAtMs: number | null,
  nowMs: number,
  suppressionDays: number = INSTALL_PROMPT_SUPPRESSION_DAYS,
): boolean {
  if (dismissedAtMs === null || Number.isNaN(dismissedAtMs)) return false;
  return nowMs - dismissedAtMs < suppressionDays * 24 * 60 * 60 * 1000;
}

/** L'app tourne-t-elle déjà installée (standalone) ? iOS : navigator.standalone. */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

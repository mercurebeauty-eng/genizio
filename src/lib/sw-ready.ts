// Accès fiabilisé au service worker — point d'entrée unique pour tout ce qui
// a besoin du SW (push, precache…).
//
// Pourquoi ce module existe : `navigator.serviceWorker.ready` ne résout QUE
// lorsqu'un SW est enregistré — tant que personne n'a appelé register(), il
// attend indéfiniment, sans erreur. C'est exactement le bug qui laissait
// push_subscriptions vide : le hook push attendait un SW jamais enregistré
// (injectRegister:false + useRegisterSW sans immediate), en silence.
//
// Contrats :
//   • une seule attente partagée (singleton) — plusieurs composants peuvent
//     l'appeler au montage sans créer N courses de timeout ;
//   • timeout explicite au lieu d'un hang éternel, avec message actionnable ;
//   • rejet immédiat (message clair) sur les environnements non supportés ;
//   • échec = reset du singleton pour autoriser une vraie nouvelle tentative
//     (le bouton « Réessayer » ne rejoue pas un échec mis en cache).

const SW_READY_TIMEOUT_MS = 8_000;

let pending: Promise<ServiceWorkerRegistration> | null = null;

export function isServiceWorkerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Résout avec la registration du service worker dès qu'elle existe, ou rejette :
 *  • immédiatement si l'environnement ne supporte pas les service workers ;
 *  • après `timeoutMs` si aucun SW n'a été enregistré (message qui nomme la
 *    vraie cause — l'enregistrement — plutôt qu'un timeout générique).
 */
export function awaitServiceWorkerReady(
  timeoutMs: number = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) {
    return Promise.reject(
      new Error("Notifications push non supportées sur cet appareil ou navigateur."),
    );
  }

  // Si aucun enregistrement n'est encore actif, déclencher l'enregistrement de /sw.js
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.serviceWorker?.getRegistration === "function"
  ) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg && typeof navigator.serviceWorker?.register === "function") {
          navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  pending ??= Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Service worker introuvable après ${Math.round(timeoutMs / 1000)} s — l'enregistrement n'a pas eu lieu (vérifiez /sw.js).`,
          ),
        );
      }, timeoutMs);
    }),
  ]).catch((err) => {
    pending = null; // échec non mis en cache : la prochaine tentative est réelle
    throw err;
  });
  return pending;
}

/** Réservé aux tests : réinitialise l'attente partagée. */
export function resetServiceWorkerReadyForTests(): void {
  pending = null;
}

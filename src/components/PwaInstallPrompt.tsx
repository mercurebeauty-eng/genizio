import { useState, useEffect } from "react";
import { X, Download, Share, PlusSquare, Smartphone, Info } from "lucide-react";
import {
  getDeferredInstallPrompt,
  isInstallPromptSuppressed,
  isRunningStandalone,
  type DeferredInstallPrompt,
} from "@/lib/pwa-install";

// Délai anti-intrusif avant apparition (on ne saute pas à la gorge au
// chargement, mais on reste ensuite visible jusqu'à action).
const SHOW_DELAY_MS = 3_000;
const DISMISSED_KEY = "pwa-prompt-dismissed";

function readDismissedAt(): number | null {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Déjà installée (standalone) : jamais de popup.
    if (isRunningStandalone()) {
      // Nettoyage : une installation invalide la suppression résiduelle.
      localStorage.removeItem(DISMISSED_KEY);
      return;
    }

    // 2. Fermé récemment par l'utilisateur : réapparaît après 2 jours (au lieu
    //    de 7 — la popup doit accompagner une personne non-installatrice,
    //    pas disparaître une semaine après un seul clic de trop).
    if (isInstallPromptSuppressed(readDismissedAt(), Date.now())) return;

    // 3. Détection iOS (pas de beforeinstallprompt chez Apple : guide manuel).
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    const timer = setTimeout(() => setShowPrompt(true), SHOW_DELAY_MS);

    if (ios) {
      return () => clearTimeout(timer);
    }

    // 4. Android / Desktop : l'événement a PEUT-ÊTRE déjà tiré avant le montage
    //    (course de chargement — c'était le bug principal). On récupère d'abord
    //    la capture au niveau module, puis on écoute les arrivées tardives.
    const early = getDeferredInstallPrompt();
    if (early) setDeferredPrompt(early);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as DeferredInstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Installation terminée : le popup se retire immédiatement, tout seul.
    const handleInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISSED_KEY);
    };
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt ?? getDeferredInstallPrompt();
    if (!prompt) return;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
        // appinstalled fera le nettoyage ; par sécurité on supprime aussi ici.
        localStorage.removeItem(DISMISSED_KEY);
      } else {
        // L'utilisateur a fermé la NATIVE prompt de Chrome : suppression plus
        // longue que la croix (il a explicitement refusé l'OS), mais pas 90 jours.
        localStorage.setItem(DISMISSED_KEY, Date.now().toString());
      }
    } catch (err) {
      // AbortError possible si le prompt est déjà en cours — non fatal.
      console.error("Prompt d'installation PWA échoué:", err);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!showPrompt) return null;

  const canAutoInstall = Boolean(deferredPrompt ?? getDeferredInstallPrompt());

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-6 sm:right-6 z-50 mx-auto max-w-md rounded-3xl border border-ink/10 bg-white p-4 sm:p-5 shadow-xl animate-in slide-in-from-bottom-10 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 rounded-xl border-2 border-ink p-1 hover:bg-surface transition-all cursor-pointer"
        aria-label="Fermer"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-3 sm:gap-4 items-start pr-8">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand border border-white/20 text-white shadow-md shrink-0">
          <Smartphone className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-balance text-base font-black text-ink">
            Installer Génizio
          </h4>
          <p className="text-xs font-semibold text-ink/60 mt-0.5 leading-relaxed">
            Installez l'application sur votre écran d'accueil pour l'ouvrir en plein écran et
            accéder rapidement à Naya.
          </p>
        </div>
      </div>

      <div className="mt-4 border-t-2 border-ink/10 pt-4">
        {isIos ? (
          /* iOS instructions */
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border-2 border-ink p-3 text-xs text-amber-950 font-semibold leading-relaxed">
              <Info className="size-4 text-amber-600 shrink-0" />
              <span>
                Sur iPhone / iPad, l'installation automatique n'est pas autorisée par Apple.
              </span>
            </div>
            <p className="text-xs font-bold text-ink/80">
              Suivez ces étapes simples pour l'installer :
            </p>
            <ol className="space-y-2 text-xs font-medium text-ink/75">
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">
                  1
                </span>
                <span>
                  Touchez le bouton de partage <Share className="size-3.5 inline mx-1 text-brand" />{" "}
                  dans Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">
                  2
                </span>
                <span>
                  Faites défiler et touchez{" "}
                  <strong className="font-extrabold text-ink">Sur l'écran d'accueil</strong>{" "}
                  <PlusSquare className="size-3.5 inline mx-1 text-brand" />.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">
                  3
                </span>
                <span>
                  Validez en cliquant sur{" "}
                  <strong className="font-extrabold text-ink">Ajouter</strong> en haut à droite.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          /* Android / Desktop auto install */
          <div>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleDismiss}
                className="press-white rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink cursor-pointer"
              >
                Plus tard
              </button>
              <button
                onClick={handleInstallClick}
                disabled={!canAutoInstall}
                className="press-brand flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="size-4" />
                <span>Installer maintenant</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-ink/60 font-bold mt-3 leading-relaxed">
              * Android crée automatiquement un fichier d'installation natif (WebAPK) pour une
              intégration système parfaite.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

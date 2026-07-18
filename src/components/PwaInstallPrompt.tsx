import { useState, useEffect } from "react";
import { X, Download, Share, PlusSquare, Smartphone, Info } from "lucide-react";

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 2. Check if user dismissed prompt recently (hide for 7 days)
    const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedTime) {
      const now = new Date().getTime();
      const diff = now - parseInt(dismissedTime, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return; // less than 7 days ago
      }
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(ios);

    if (ios) {
      // iOS doesn't support beforeinstallprompt, so we just show the iOS guide
      // We wait 3 seconds before showing it so it's not obtrusive right away
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    } else {
      // Android / Desktop Chrome / Edge support
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Show the prompt after 3s
        setTimeout(() => setShowPrompt(true), 3000);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the PWA install prompt");
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", new Date().getTime().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-md rounded-3xl border-[3px] border-ink bg-white p-5 shadow-brutal animate-in slide-in-from-bottom-10 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 rounded-xl border-2 border-ink p-1 hover:bg-surface transition-all cursor-pointer"
        aria-label="Fermer"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-4 items-start pr-8">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand border-2 border-ink text-white shadow-brutal-sm shrink-0">
          <Smartphone className="size-6" />
        </div>
        <div>
          <h4 className="font-display text-base font-black text-ink">Installer Génizio</h4>
          <p className="text-xs font-semibold text-ink/60 mt-0.5 leading-relaxed">
            Installez l'application sur votre écran d'accueil pour l'ouvrir en plein écran et accéder rapidement à Naya.
          </p>
        </div>
      </div>

      <div className="mt-4 border-t-2 border-ink/10 pt-4">
        {isIos ? (
          /* iOS instructions */
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border-2 border-ink p-3 text-xs text-amber-950 font-semibold leading-relaxed">
              <Info className="size-4 text-amber-600 shrink-0" />
              <span>Sur iPhone / iPad, l'installation automatique n'est pas autorisée par Apple.</span>
            </div>
            <p className="text-xs font-bold text-ink/80">Suivez ces étapes simples pour l'installer :</p>
            <ol className="space-y-2 text-xs font-medium text-ink/75">
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">1</span>
                <span>Touchez le bouton de partage <Share className="size-3.5 inline mx-1 text-brand" /> dans Safari.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">2</span>
                <span>Faites défiler et touchez <strong className="font-extrabold text-ink">Sur l'écran d'accueil</strong> <PlusSquare className="size-3.5 inline mx-1 text-brand" />.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded bg-stone-100 border border-ink text-[10px] font-black font-mono">3</span>
                <span>Validez en cliquant sur <strong className="font-extrabold text-ink">Ajouter</strong> en haut à droite.</span>
              </li>
            </ol>
          </div>
        ) : (
          /* Android / Desktop auto install */
          <div>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleDismiss}
                className="rounded-2xl border-[3px] border-ink bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                Plus tard
              </button>
              <button
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-[3px] border-ink bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="size-4" />
                <span>Installer maintenant</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-ink/60 font-bold mt-3 leading-relaxed">
              * Android crée automatiquement un fichier d'installation natif (WebAPK) pour une intégration système parfaite.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

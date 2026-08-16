import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Link } from "@tanstack/react-router";
import { ArrowUpCircle, RefreshCw } from "lucide-react";

// Sans polling explicite, useRegisterSW ne revérifie une nouvelle version
// qu'au moment de l'enregistrement initial du service worker — un onglet
// (ou la PWA) resté ouvert après un déploiement ne voit donc jamais la
// bannière tant qu'il n'est pas complètement fermé puis rouvert. On
// revérifie périodiquement ET à chaque retour au premier plan (le cas réel
// d'une PWA rouverte depuis l'écran d'accueil du téléphone).
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function PwaUpdateBanner() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      setRegistration(reg ?? null);
    },
  });

  useEffect(() => {
    if (!registration) return;
    const check = () => registration.update();
    const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [registration]);

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-1/2 z-[70] w-full max-w-[414px] -translate-x-1/2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] animate-in slide-in-from-top-6 duration-300">
      <div
        className="flex items-center gap-3 rounded-2xl border border-white/20 px-4 py-3 shadow-xl"
        style={{ background: "linear-gradient(120deg, var(--brand), var(--brand-glow))" }}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-white">
          <ArrowUpCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-white">Nouvelle mise à jour disponible</p>
          <Link
            to="/nouveautes"
            className="text-[11px] font-semibold text-white/80 underline underline-offset-2"
          >
            En savoir plus
          </Link>
        </div>
        <button
          onClick={() => updateServiceWorker()}
          className="press-white flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
          Mettre à jour
        </button>
      </div>
    </div>
  );
}

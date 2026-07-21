import { useRegisterSW } from "virtual:pwa-register/react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Sparkles } from "lucide-react";

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-1/2 z-[70] w-full max-w-[414px] -translate-x-1/2 px-3 pt-3 animate-in slide-in-from-top-6 duration-300">
      <div
        className="flex items-center gap-3 rounded-2xl border border-white/20 px-4 py-3 shadow-xl"
        style={{ background: "linear-gradient(120deg, var(--brand), var(--brand-glow))" }}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-white">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-white">Nouvelle mise à jour disponible</p>
          <Link to="/nouveautes" className="text-[11px] font-semibold text-white/80 underline underline-offset-2">
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

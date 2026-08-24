import { Link } from "@tanstack/react-router";
import { Sparkles, GraduationCap, Compass, ArrowRight } from "lucide-react";

export function AuthorBio() {
  return (
    <section
      aria-label="À propos de l'auteur"
      className="not-prose my-10 rounded-3xl border border-ink/10 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-display font-black text-2xl shadow-inner">
          CT
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand">
              Auteur & Directeur Pédagogique
            </span>
            <span className="text-[11px] font-semibold text-ink/50">Abidjan · Côte d'Ivoire</span>
          </div>

          <h3 className="mt-2 font-display text-lg font-black text-ink">
            Cheick Mohamed TRAORE
          </h3>

          <p className="mt-2 text-xs font-medium leading-relaxed text-ink/75">
            Fondateur de Génizio, concepteur de la méthode de l'apprentissage par le réel et
            spécialiste de l'hybridation pédagogique avec l'intelligence artificielle. Il œuvre pour
            l'émergence du capital humain des enfants en Afrique francophone et dans la diaspora à
            travers le cadre des 9 intelligences d'Howard Gardner.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 pt-3 border-t border-ink/10 text-xs">
            <div className="flex items-center gap-1.5 text-ink/70 font-semibold">
              <GraduationCap className="size-3.5 text-brand" aria-hidden />
              <span>Cadre Howard Gardner</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink/70 font-semibold">
              <Compass className="size-3.5 text-leaf" aria-hidden />
              <span>Pédagogie de l'action</span>
            </div>
            <Link
              to="/a-propos"
              className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              Lire le manifeste
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

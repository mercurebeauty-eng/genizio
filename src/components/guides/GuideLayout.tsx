import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Coquille éditoriale partagée par les pages de guide.
 *
 * Ces pages ont deux lecteurs distincts et il faut servir les deux :
 *  — un parent qui lit vraiment, d'où une largeur de texte tenue autour de
 *    68 caractères et une hiérarchie typographique nette ;
 *  — un moteur (Google, ChatGPT, Perplexity), d'où un <article> avec un seul
 *    <h1>, des <h2> qui reprennent des formulations réellement recherchées, et
 *    un fil d'Ariane visible en plus du JSON-LD.
 */
export function GuideLayout({
  eyebrow,
  title,
  intro,
  updated,
  readingTime,
  children,
  related,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  readingTime: string;
  children: ReactNode;
  related?: { label: string; to: string }[];
}) {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand"
          >
            <img src="/favicon-96x96.png" alt="" className="h-7 w-7" />
            GÉNIZIO
          </Link>
          <Link
            to="/auth"
            className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <Link to="/guides" className="hover:text-brand">
            Guides
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">{eyebrow}</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">{eyebrow}</p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-lg font-medium leading-relaxed text-ink/70">{intro}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-ink/10 py-3 text-xs font-bold text-ink/50">
          <span>Mis à jour le {updated}</span>
          <span aria-hidden>·</span>
          <span>{readingTime} de lecture</span>
          <span aria-hidden>·</span>
          <span>Par l'équipe Génizio</span>
        </div>

        {/* `prose-genizio` est défini dans styles.css — la mise en forme du corps de texte
            vit là plutôt qu'en classes utilitaires répétées sur chaque paragraphe. */}
        <div className="prose-genizio mt-10">{children}</div>

        <aside className="mt-16 rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">
            Passer de la lecture à la pratique
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
            Génizio propose à votre enfant des défis concrets adaptés à son âge et à ses centres
            d'intérêt, et construit la carte de ses talents à partir de ce qu'il réalise vraiment. 1
            profil enfant gratuit, puis 5 000 FCFA les 3 premiers mois (ensuite 15 000 FCFA) par
            profil supplémentaire.
          </p>
          <Link
            to="/auth"
            className="press-brand mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
          >
            Créer le profil de mon enfant
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>

        {related && related.length > 0 && (
          <nav className="mt-12" aria-label="Guides liés">
            <h2 className="mb-4 font-display text-lg font-extrabold">À lire ensuite</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.to}>
                  <Link
                    to={r.to}
                    className="flex h-full items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 text-sm font-bold transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
                  >
                    <span>{r.label}</span>
                    <ArrowRight className="size-4 shrink-0 text-brand" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-12 border-t border-ink/10 pt-6">
          <Link
            to="/guides"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Tous les guides
          </Link>
        </div>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/a-propos" className="hover:text-brand">
              À propos
            </Link>
            <Link to="/privacy" className="hover:text-brand">
              Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-brand">
              CGU
            </Link>
            <Link to="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Encart d'avertissement, utilisé sur les sujets qui frôlent le médical.
 * Génizio observe des talents, il ne pose aucun diagnostic — le dire
 * explicitement protège les familles ET le référencement : Google applique aux
 * contenus santé un niveau d'exigence (E-E-A-T) qui sanctionne les affirmations
 * médicales non qualifiées.
 */
export function MedicalDisclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
      <p className="text-sm font-semibold leading-relaxed text-amber-900">{children}</p>
    </div>
  );
}

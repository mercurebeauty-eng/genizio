import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/a-propos")({
  head: () =>
    pageMeta({
      title: "À propos — Génizio",
      description:
        "Génizio est un projet fondé par Cheick Mohamed TRAORE pour révéler les talents naturels des enfants, du Sénégal à la Côte d'Ivoire.",
      path: "/a-propos",
    }),
  component: AProposPage,
});

function AProposPage() {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand">
            <img src="/favicon-96x96.png" alt="" className="h-7 w-7" />
            GÉNIZIO
          </Link>
          <Link to="/auth" className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white">
            Créer un compte
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand">
          <ArrowLeft className="size-4" aria-hidden /> Retour
        </Link>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">À propos</p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Pourquoi Génizio existe
        </h1>

        <div className="prose-genizio mt-8">
          <h2>Notre mission</h2>
          <p>
            Génizio révèle les talents naturels de chaque enfant à travers des défis concrets à réaliser à la
            maison, fondés sur les 9 intelligences de Howard Gardner. L'idée de départ : le programme scolaire
            ne mesure qu'une petite partie de ce dont un enfant est capable — Génizio cherche le reste.
          </p>

          <h2>Le fondateur</h2>
          <p>
            Génizio est fondé par <strong>Cheick Mohamed TRAORE</strong>. Les détails juridiques de la structure
            porteuse sont précisés dans les{" "}
            <Link to="/mentions-legales" className="text-brand underline">
              mentions légales
            </Link>
            .
          </p>

          <h2>Où nous intervenons</h2>
          <p>
            Génizio s'adresse aux familles d'Afrique francophone et de la diaspora, principalement en Côte
            d'Ivoire, au Sénégal et en France.
          </p>

          <h2>Nous contacter</h2>
          <p>
            La voie la plus rapide est WhatsApp. L'adresse email de l'éditeur est aussi disponible sur la page{" "}
            <Link to="/mentions-legales" className="text-brand underline">
              mentions légales
            </Link>
            .
          </p>
        </div>

        <a
          href="https://wa.me/33606433148?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20G%C3%A9nizio."
          target="_blank"
          rel="noopener noreferrer"
          className="press-brand mt-2 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white"
        >
          <MessageCircle className="size-4" aria-hidden />
          Écrire sur WhatsApp
        </a>

        <aside className="mt-16 rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">Passer de la lecture à la pratique</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
            Génizio propose à votre enfant des défis concrets adaptés à son âge et à ses centres d'intérêt, et
            construit la carte de ses talents à partir de ce qu'il réalise vraiment. 1 profil enfant gratuit, puis
            5 000 FCFA les 3 premiers mois (ensuite 15 000 FCFA) par profil supplémentaire.
          </p>
          <Link
            to="/auth"
            className="press-brand mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
          >
            Créer le profil de mon enfant
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/privacy" className="hover:text-brand">Confidentialité</Link>
            <Link to="/terms" className="hover:text-brand">CGU</Link>
            <Link to="/mentions-legales" className="hover:text-brand">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

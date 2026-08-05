import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/mentions-legales")({
  head: () => {
    const meta = pageMeta({
      title: "Mentions légales — Génizio",
      description:
        "Informations légales sur l'éditeur de l'application Génizio : identité, hébergement et contact.",
      path: "/mentions-legales",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Mentions légales", path: "/mentions-legales" },
          ]),
        ),
      ],
    };
  },
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
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
          className="mb-8 flex items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">Mentions légales</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">
          Mentions légales
        </p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Mentions légales
        </h1>
        <p className="mt-4 text-sm font-semibold text-ink/60">
          Dernière mise à jour : 17 juillet 2026
        </p>

        <div className="not-prose my-8 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-relaxed text-amber-900">
            <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir des
            informations fournies par l'éditeur. Il constitue une base de bonne foi mais n'a pas été
            relu par un professionnel du droit. À faire réviser par un juriste avant tout lancement
            commercial à grande échelle, notamment du fait de l'exercice de l'activité sur plusieurs
            juridictions (Sénégal, Côte d'Ivoire, France).
          </p>
        </div>

        <div className="prose-genizio">
          <h2>Éditeur du site</h2>
          <p>
            Le site et l'application Génizio sont édités par <strong>Cheick Mohamed TRAORE</strong>,
            exerçant en tant qu'entrepreneur individuel (statut juridique de la structure porteuse
            en cours de formalisation à la date de publication de ce document).
          </p>
          <p>
            Contact :{" "}
            <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">
              traorecheikkh@gmail.com
            </a>
          </p>
          <p>
            Génizio opère à destination de familles situées principalement au Sénégal, en Côte
            d'Ivoire et en France.
          </p>

          <h2>Hébergement</h2>
          <p>
            L'application est hébergée par <strong>Vercel Inc.</strong> (ou l'hébergeur de
            déploiement en vigueur) et les données sont stockées via <strong>Supabase</strong>{" "}
            (infrastructure Amazon Web Services, région Europe — Londres).
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur Génizio (textes, logos, mascotte « Naya », charte
            graphique, structure des défis) est la propriété de l'éditeur, sauf mention contraire.
            Toute reproduction sans autorisation est interdite.
          </p>

          <h2>Contact</h2>
          <p>
            Pour toute question relative à ces mentions légales, à la Politique de confidentialité
            ou aux Conditions d'utilisation, écrivez à{" "}
            <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">
              traorecheikkh@gmail.com
            </a>
            .
          </p>

          <div className="not-prose border-t-2 border-ink/10 pt-4">
            <p className="text-xs font-semibold text-ink/60">
              Voir aussi :{" "}
              <Link to="/privacy" className="text-brand underline">
                Politique de confidentialité
              </Link>{" "}
              ·{" "}
              <Link to="/terms" className="text-brand underline">
                Conditions d'utilisation
              </Link>
            </p>
          </div>
        </div>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/guides" className="hover:text-brand">
              Guides
            </Link>
            <Link to="/a-propos" className="hover:text-brand">
              À propos
            </Link>
            <Link to="/privacy" className="hover:text-brand">
              Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-brand">
              CGU
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/mentions-legales")({
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-surface px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand">
          <ArrowLeft className="size-4" /> Retour
        </Link>

        <h1 className="font-display text-3xl font-extrabold mb-2">Mentions légales</h1>
        <p className="mb-8 text-sm text-ink/60">Dernière mise à jour : 17 juillet 2026</p>

        <div className="rounded-2xl border-[3px] border-amber-400 bg-amber-50 p-4 mb-8 text-sm text-amber-900">
          <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir des informations
          fournies par l'éditeur. Il constitue une base de bonne foi mais n'a pas été relu par un professionnel
          du droit. À faire réviser par un juriste avant tout lancement commercial à grande échelle, notamment
          du fait de l'exercice de l'activité sur plusieurs juridictions (Sénégal, Côte d'Ivoire, France).
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-ink/80">
          <section>
            <h2 className="font-display text-lg font-bold text-ink mb-2">Éditeur du site</h2>
            <p>
              Le site et l'application Génizio sont édités par <strong>Cheick Mohamed TRAORE</strong>, exerçant
              en tant qu'entrepreneur individuel (statut juridique de la structure porteuse en cours de
              formalisation à la date de publication de ce document).
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">traorecheikkh@gmail.com</a>
            </p>
            <p className="mt-2">
              Génizio opère à destination de familles situées principalement au Sénégal, en Côte d'Ivoire et en
              France.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink mb-2">Hébergement</h2>
            <p>
              L'application est hébergée par <strong>Vercel Inc.</strong> (ou l'hébergeur de déploiement en
              vigueur) et les données sont stockées via <strong>Supabase</strong> (infrastructure Amazon Web
              Services, région Europe — Londres).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink mb-2">Propriété intellectuelle</h2>
            <p>
              L'ensemble des contenus présents sur Génizio (textes, logos, mascotte « Naya », charte graphique,
              structure des défis) est la propriété de l'éditeur, sauf mention contraire. Toute reproduction
              sans autorisation est interdite.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink mb-2">Contact</h2>
            <p>
              Pour toute question relative à ces mentions légales, à la Politique de confidentialité ou aux
              Conditions d'utilisation, écrivez à{" "}
              <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">traorecheikkh@gmail.com</a>.
            </p>
          </section>

          <section className="pt-4 border-t-2 border-ink/10">
            <p className="text-xs text-ink/60">
              Voir aussi : <Link to="/privacy" className="text-brand underline">Politique de confidentialité</Link> ·{" "}
              <Link to="/terms" className="text-brand underline">Conditions d'utilisation</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

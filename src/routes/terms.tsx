import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => {
    const meta = pageMeta({
      title: "Conditions d'utilisation — Génizio",
      description:
        "Conditions générales d'utilisation de l'application Génizio : règles d'usage, comptes parents et enfants, contenus et responsabilités.",
      path: "/terms",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Conditions d'utilisation", path: "/terms" },
          ]),
        ),
      ],
    };
  },
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand"
          >
            <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-7 w-7" />
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
          <span className="text-ink/70">Conditions d'utilisation</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">CGU</p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Conditions d'utilisation
        </h1>
        <p className="mt-4 text-sm font-semibold text-ink/60">
          Dernière mise à jour : 17 juillet 2026
        </p>

        <div className="not-prose my-8 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-relaxed text-amber-900">
            <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir du
            fonctionnement réel de l'application. Il n'a pas été relu par un professionnel du droit
            — à faire réviser avant tout lancement commercial à grande échelle, notamment du fait
            des juridictions concernées (Sénégal, Côte d'Ivoire, France).
          </p>
        </div>

        <div className="prose-genizio">
          <h2>1. Objet</h2>
          <p>
            Génizio est une application qui aide les parents à découvrir et accompagner les talents
            de leurs enfants à travers des défis personnalisés générés par une intelligence
            artificielle (« Naya »), un suivi de progression, et des outils optionnels de partage
            (mentors, mur public) et d'achat de matériel (boutique de kits).
          </p>

          <h2>2. Qui peut utiliser Génizio</h2>
          <p>
            La création d'un compte est réservée aux parents ou tuteurs légaux majeurs. Les profils
            d'enfants sont créés et gérés exclusivement par le titulaire du compte parent — un
            enfant n'a jamais son propre compte ni ses propres identifiants. En créant un profil
            enfant, vous confirmez être le parent ou le tuteur légal de cet enfant et consentez au
            traitement de ses données tel que décrit dans notre{" "}
            <Link to="/privacy" className="text-brand underline">
              Politique de confidentialité
            </Link>
            .
          </p>

          <h2>3. Ce que Naya n'est pas</h2>
          <p>
            Naya est un compagnon pédagogique qui observe et propose — elle n'est ni un
            professionnel de santé, ni un psychologue, ni un enseignant diplômé. Les « intelligences
            » et « talents » affichés sont des signaux qualitatifs issus des défis réalisés, pas une
            évaluation psychologique ou un diagnostic. Aucune décision médicale, scolaire ou
            éducative formelle ne doit être prise sur la seule base de ces observations.
          </p>

          <h2>4. Contenu que vous partagez</h2>
          <p>
            Les photos, descriptions et notes que vous ajoutez restent votre propriété. En les
            soumettant sur Génizio, vous nous accordez le droit de les stocker et de les afficher
            dans l'application (et, si vous choisissez explicitement de publier un défi, sur le Mur
            Public) dans le seul but de faire fonctionner le service. Vous êtes responsable de vous
            assurer d'avoir le droit de partager les photos que vous téléversez (par exemple, ne pas
            inclure d'autres enfants sans l'accord de leurs parents).
          </p>

          <h2>5. Mur Public</h2>
          <p>
            La publication d'un défi sur le Mur Public est toujours une action volontaire et
            explicite du parent — aucun contenu n'y est publié automatiquement. Nous nous réservons
            le droit de retirer tout contenu manifestement inapproprié, dangereux ou contraire à ces
            conditions.
          </p>

          <h2>6. Boutique de kits</h2>
          <p>
            La boutique permet de commander du matériel pédagogique. À ce jour, aucun paiement n'est
            traité directement dans l'application : la commande est enregistrée puis finalisée par
            échange direct via WhatsApp avec l'éditeur. Les délais et modalités de livraison sont
            convenus de gré à gré lors de cet échange et ne font pas l'objet d'un engagement
            contractuel automatisé dans l'application.
          </p>

          <h2>7. Partage avec un mentor</h2>
          <p>
            Le parent peut inviter un tiers (enseignant, coach) à consulter une vue limitée et
            révocable du parcours de l'enfant, en choisissant précisément quelles informations sont
            visibles. Le parent reste seul responsable des personnes qu'il invite.
          </p>

          <h2>8. Limitation de responsabilité</h2>
          <p>
            Génizio est fourni « en l'état ». Nous mettons en œuvre des moyens raisonnables pour
            assurer la disponibilité et la fiabilité du service, sans garantir une disponibilité
            continue et sans faille. Dans les limites permises par la loi applicable, notre
            responsabilité ne saurait être engagée pour des dommages indirects résultant de
            l'utilisation du service.
          </p>

          <h2>9. Suppression de compte</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis les Réglages ; cette action est
            irréversible et efface définitivement vos données et celles des profils enfants
            associés.
          </p>

          <h2>10. Droit applicable</h2>
          <p>
            Génizio opère à destination de familles au Sénégal, en Côte d'Ivoire et en France. À
            défaut d'accord contraire, le droit français régit ces conditions. Cette clause n'a pas
            pour effet de priver un utilisateur des protections impératives du droit de consommation
            applicable dans son pays de résidence.
          </p>

          <h2>11. Modifications</h2>
          <p>
            Ces conditions peuvent évoluer à mesure que le service évolue. La date de dernière mise
            à jour en haut de cette page reflète la version en vigueur.
          </p>

          <div className="not-prose border-t-2 border-ink/10 pt-4">
            <p className="text-xs font-semibold text-ink/60">
              Voir aussi :{" "}
              <Link to="/mentions-legales" className="text-brand underline">
                Mentions légales
              </Link>{" "}
              ·{" "}
              <Link to="/privacy" className="text-brand underline">
                Politique de confidentialité
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
            <Link to="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

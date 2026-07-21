import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-surface px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand">
          <ArrowLeft className="size-4" /> Retour
        </Link>

        <h1 className="font-display text-balance text-3xl font-extrabold mb-2">Conditions d'utilisation</h1>
        <p className="mb-8 text-sm text-ink/60">Dernière mise à jour : 17 juillet 2026</p>

        <div className="rounded-2xl border border-amber-400 bg-amber-50 p-4 mb-8 text-sm text-amber-900">
          <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir du fonctionnement
          réel de l'application. Il n'a pas été relu par un professionnel du droit — à faire réviser avant tout
          lancement commercial à grande échelle, notamment du fait des juridictions concernées (Sénégal, Côte
          d'Ivoire, France).
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-ink/80">
          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">1. Objet</h2>
            <p>
              Génizio est une application qui aide les parents à découvrir et accompagner les talents de leurs
              enfants à travers des défis personnalisés générés par une intelligence artificielle (« Naya »),
              un suivi de progression, et des outils optionnels de partage (mentors, mur public) et d'achat de
              matériel (boutique de kits).
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">2. Qui peut utiliser Génizio</h2>
            <p>
              La création d'un compte est réservée aux parents ou tuteurs légaux majeurs. Les profils d'enfants
              sont créés et gérés exclusivement par le titulaire du compte parent — un enfant n'a jamais son
              propre compte ni ses propres identifiants. En créant un profil enfant, vous confirmez être le
              parent ou le tuteur légal de cet enfant et consentez au traitement de ses données tel que décrit
              dans notre <Link to="/privacy" className="text-brand underline">Politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">3. Ce que Naya n'est pas</h2>
            <p>
              Naya est un compagnon pédagogique qui observe et propose — elle n'est ni un professionnel de
              santé, ni un psychologue, ni un enseignant diplômé. Les « intelligences » et « talents » affichés
              sont des signaux qualitatifs issus des défis réalisés, pas une évaluation psychologique ou un
              diagnostic. Aucune décision médicale, scolaire ou éducative formelle ne doit être prise sur la
              seule base de ces observations.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">4. Contenu que vous partagez</h2>
            <p>
              Les photos, descriptions et notes que vous ajoutez restent votre propriété. En les soumettant sur
              Génizio, vous nous accordez le droit de les stocker et de les afficher dans l'application (et,
              si vous choisissez explicitement de publier un défi, sur le Mur Public) dans le seul but de faire
              fonctionner le service. Vous êtes responsable de vous assurer d'avoir le droit de partager les
              photos que vous téléversez (par exemple, ne pas inclure d'autres enfants sans l'accord de leurs
              parents).
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">5. Mur Public</h2>
            <p>
              La publication d'un défi sur le Mur Public est toujours une action volontaire et explicite du
              parent — aucun contenu n'y est publié automatiquement. Nous nous réservons le droit de retirer
              tout contenu manifestement inapproprié, dangereux ou contraire à ces conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">6. Boutique de kits</h2>
            <p>
              La boutique permet de commander du matériel pédagogique. À ce jour, aucun paiement n'est traité
              directement dans l'application : la commande est enregistrée puis finalisée par échange direct
              via WhatsApp avec l'éditeur. Les délais et modalités de livraison sont convenus de gré à gré lors
              de cet échange et ne font pas l'objet d'un engagement contractuel automatisé dans l'application.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">7. Partage avec un mentor</h2>
            <p>
              Le parent peut inviter un tiers (enseignant, coach) à consulter une vue limitée et révocable du
              parcours de l'enfant, en choisissant précisément quelles informations sont visibles. Le parent
              reste seul responsable des personnes qu'il invite.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">8. Limitation de responsabilité</h2>
            <p>
              Génizio est fourni « en l'état ». Nous mettons en œuvre des moyens raisonnables pour assurer la
              disponibilité et la fiabilité du service, sans garantir une disponibilité continue et sans faille.
              Dans les limites permises par la loi applicable, notre responsabilité ne saurait être engagée pour
              des dommages indirects résultant de l'utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">9. Suppression de compte</h2>
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis les Réglages ; cette action est
              irréversible et efface définitivement vos données et celles des profils enfants associés.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">10. Droit applicable</h2>
            <p>
              Génizio opère à destination de familles au Sénégal, en Côte d'Ivoire et en France. À défaut
              d'accord contraire, le droit français régit ces conditions. Cette clause n'a pas pour effet de
              priver un utilisateur des protections impératives du droit de consommation applicable dans son
              pays de résidence.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">11. Modifications</h2>
            <p>
              Ces conditions peuvent évoluer à mesure que le service évolue. La date de dernière mise à jour en
              haut de cette page reflète la version en vigueur.
            </p>
          </section>

          <section className="pt-4 border-t-2 border-ink/10">
            <p className="text-xs text-ink/60">
              Voir aussi : <Link to="/mentions-legales" className="text-brand underline">Mentions légales</Link> ·{" "}
              <Link to="/privacy" className="text-brand underline">Politique de confidentialité</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

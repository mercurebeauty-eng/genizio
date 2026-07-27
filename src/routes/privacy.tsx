import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageMeta({
      title: "Politique de confidentialité — Génizio",
      description:
        "Comment Génizio collecte, utilise et protège les données personnelles des familles et des enfants sur l'application.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-surface px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand">
          <ArrowLeft className="size-4" /> Retour
        </Link>

        <h1 className="font-display text-balance text-3xl font-extrabold mb-2">Politique de confidentialité</h1>
        <p className="mb-8 text-sm text-ink/60">Dernière mise à jour : 17 juillet 2026</p>

        <div className="rounded-2xl border border-amber-400 bg-amber-50 p-4 mb-8 text-sm text-amber-900">
          <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir de l'architecture
          réelle de l'application, dans un esprit de bonne foi et en s'appuyant sur les standards RGPD comme
          référence la plus protectrice. Il n'a pas été relu par un professionnel du droit — à faire réviser
          avant tout traitement de données à grande échelle, notamment du fait des juridictions concernées
          (Sénégal, Côte d'Ivoire, France).
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-ink/80">
          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">1. Qui sommes-nous ?</h2>
            <p>
              Génizio est édité par Cheick Mohamed TRAORE (voir{" "}
              <Link to="/mentions-legales" className="text-brand underline">mentions légales</Link>), responsable
              du traitement des données décrites ci-dessous. Contact :{" "}
              <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">traorecheikkh@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">2. Génizio et les données d'enfants — principe fondateur</h2>
            <p>
              Génizio est un service utilisé par des <strong>parents</strong> pour accompagner leurs enfants.
              Le compte utilisateur (email, connexion Google) appartient toujours au parent. Les profils
              d'enfants sont créés, gérés et supprimables uniquement par le parent qui les a créés — l'enfant
              n'a jamais de compte ni d'identifiants propres. Le consentement au traitement des données d'un
              enfant est donné par son parent au moment de la création du profil.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">3. Données que nous collectons</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Compte parent :</strong> adresse email, identifiant Google (aucun mot de passe stocké — connexion Google exclusivement).</li>
              <li><strong>Profil enfant :</strong> prénom, âge, ville/pays (optionnels), centres d'intérêt, scores de talents (carte des 9 intelligences).</li>
              <li><strong>Défis et preuves :</strong> titre/description des défis réalisés, notes du parent, photo de preuve envoyée par le parent, observations générées par l'IA à partir de cette photo.</li>
              <li><strong>Mur public (optionnel) :</strong> si le parent choisit de publier un défi complété, la photo, une légende et le prénom de l'enfant deviennent visibles publiquement.</li>
              <li><strong>Commandes boutique :</strong> produits commandés, prix, statut de livraison — liés au profil enfant concerné.</li>
              <li><strong>Partage mentor (optionnel) :</strong> si le parent invite un mentor (enseignant, coach), un lien d'accès scopé et révocable est créé ; le mentor ne voit que ce que le parent a explicitement autorisé.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">4. Comment l'IA « Naya » utilise ces données</h2>
            <p>
              Les photos de preuve et les descriptions de défis sont envoyées à l'API d'Anthropic (modèles
              Claude) pour générer des défis personnalisés et analyser les preuves photo. Anthropic agit ici
              comme <strong>sous-traitant technique</strong> : ces données lui sont transmises uniquement pour
              produire une réponse, ne servent pas à l'entraînement de leurs modèles selon leur politique
              d'API commerciale, et ne sont pas conservées par Anthropic au-delà du traitement de la requête.
              Aucune décision automatisée à conséquence légale n'est prise sur cette base — Naya observe et
              suggère, elle ne note ni ne classe les enfants.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">5. Hébergement et sécurité</h2>
            <p>
              Les données sont stockées via Supabase (base de données PostgreSQL et stockage de fichiers),
              hébergées en Europe (région Londres, Royaume-Uni). L'accès aux données est protégé par des règles
              de sécurité au niveau de la base de données (Row Level Security) garantissant qu'un parent ne
              peut techniquement accéder qu'aux profils d'enfants qu'il a lui-même créés.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">6. Commande de kits matériels via WhatsApp</h2>
            <p>
              Lorsque vous commandez un kit depuis la boutique, l'application enregistre la commande (produits,
              prix) puis vous redirige vers WhatsApp avec un message pré-rempli pour finaliser l'échange avec
              l'éditeur. WhatsApp est un service tiers de Meta Platforms, soumis à sa propre politique de
              confidentialité — Génizio n'a pas de contrôle sur le traitement des messages une fois envoyés
              sur WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">7. Cookies</h2>
            <p>
              Génizio n'utilise aucun cookie de suivi publicitaire ou analytique. Seul un cookie technique
              strictement nécessaire (mémorisation de l'état replié/déplié d'un menu) est déposé — il ne
              nécessite pas de consentement au titre de la réglementation cookies. Si un outil d'analyse
              d'audience ou publicitaire était ajouté à l'avenir, cette politique serait mise à jour et un
              bandeau de consentement serait ajouté avant toute activation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">8. Vos droits</h2>
            <p>
              Depuis la page <Link to="/profile" className="text-brand underline">Réglages</Link>, chaque parent
              peut à tout moment :
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>consulter le registre de tous les événements liés à ses données (accès, partages, exports) ;</li>
              <li>exporter l'intégralité de ses données et de celles de ses enfants au format JSON ;</li>
              <li>supprimer définitivement son compte et toutes les données associées (profils enfants, défis, accès mentors).</li>
            </ul>
            <p className="mt-2">
              Pour toute autre demande (rectification, limitation du traitement, opposition), contactez{" "}
              <a href="mailto:traorecheikkh@gmail.com" className="text-brand underline">traorecheikkh@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-balance text-lg font-bold text-ink mb-2">9. Conservation des données</h2>
            <p>
              Les données sont conservées tant que le compte parent est actif. En cas de suppression de compte,
              les données sont effacées immédiatement et de façon définitive de nos systèmes de production.
            </p>
          </section>

          <section className="pt-4 border-t-2 border-ink/10">
            <p className="text-xs text-ink/60">
              Voir aussi : <Link to="/mentions-legales" className="text-brand underline">Mentions légales</Link> ·{" "}
              <Link to="/terms" className="text-brand underline">Conditions d'utilisation</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

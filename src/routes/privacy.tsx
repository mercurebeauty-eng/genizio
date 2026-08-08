import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const meta = pageMeta({
      title: "Politique de confidentialité — Génizio",
      description:
        "Comment Génizio collecte, utilise et protège les données personnelles des familles et des enfants sur l'application.",
      path: "/privacy",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Politique de confidentialité", path: "/privacy" },
          ]),
        ),
      ],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
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
          <span className="text-ink/70">Politique de confidentialité</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">
          Confidentialité
        </p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm font-semibold text-ink/60">
          Dernière mise à jour : 17 juillet 2026
        </p>

        <div className="not-prose my-8 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-relaxed text-amber-900">
            <strong>Note :</strong> ce document a été rédigé avec l'assistance d'une IA à partir de
            l'architecture réelle de l'application, dans un esprit de bonne foi et en s'appuyant sur
            les standards RGPD comme référence la plus protectrice. Il n'a pas été relu par un
            professionnel du droit — à faire réviser avant tout traitement de données à grande
            échelle, notamment du fait des juridictions concernées (Sénégal, Côte d'Ivoire, France).
          </p>
        </div>

        <div className="prose-genizio">
          <h2>1. Qui sommes-nous ?</h2>
          <p>
            Génizio est édité par Cheick Mohamed TRAORE (voir{" "}
            <Link to="/mentions-legales" className="text-brand underline">
              mentions légales
            </Link>
            ), responsable du traitement des données décrites ci-dessous. Contact :{" "}
            <a href="mailto:serviceclient@genizio.com" className="text-brand underline">
              serviceclient@genizio.com
            </a>
            .
          </p>

          <h2>2. Génizio et les données d'enfants — principe fondateur</h2>
          <p>
            Génizio est un service utilisé par des <strong>parents</strong> pour accompagner leurs
            enfants. Le compte utilisateur (email, connexion Google) appartient toujours au parent.
            Les profils d'enfants sont créés, gérés et supprimables uniquement par le parent qui les
            a créés — l'enfant n'a jamais de compte ni d'identifiants propres. Le consentement au
            traitement des données d'un enfant est donné par son parent au moment de la création du
            profil.
          </p>

          <h2>3. Données que nous collectons</h2>
          <ul>
            <li>
              <strong>Compte parent :</strong> adresse email, identifiant Google (aucun mot de passe
              stocké — connexion Google exclusivement).
            </li>
            <li>
              <strong>Profil enfant :</strong> prénom, âge, ville/pays (optionnels), centres
              d'intérêt, scores de talents (carte des 9 intelligences).
            </li>
            <li>
              <strong>Défis et preuves :</strong> titre/description des défis réalisés, notes du
              parent, photo de preuve envoyée par le parent, observations générées par l'IA à partir
              de cette photo.
            </li>
            <li>
              <strong>Mur public (optionnel) :</strong> si le parent choisit de publier un défi
              complété, la photo, une légende et le prénom de l'enfant deviennent visibles
              publiquement.
            </li>
            <li>
              <strong>Commandes boutique :</strong> produits commandés, prix, statut de livraison —
              liés au profil enfant concerné.
            </li>
            <li>
              <strong>Partage mentor (optionnel) :</strong> si le parent invite un mentor
              (enseignant, coach), un lien d'accès scopé et révocable est créé ; le mentor ne voit
              que ce que le parent a explicitement autorisé.
            </li>
          </ul>

          <h2>4. Comment l'IA « Naya » utilise ces données</h2>
          <p>
            Les photos de preuve et les descriptions de défis sont envoyées à l'API d'Anthropic
            (modèles Claude) pour générer des défis personnalisés et analyser les preuves photo.
            Anthropic agit ici comme <strong>sous-traitant technique</strong> : ces données lui sont
            transmises uniquement pour produire une réponse, ne servent pas à l'entraînement de
            leurs modèles selon leur politique d'API commerciale, et ne sont pas conservées par
            Anthropic au-delà du traitement de la requête. Aucune décision automatisée à conséquence
            légale n'est prise sur cette base — Naya observe et suggère, elle ne note ni ne classe
            les enfants.
          </p>

          <h2>5. Hébergement et sécurité</h2>
          <p>
            Les données sont stockées via Supabase (base de données PostgreSQL et stockage de
            fichiers), hébergées en Europe (région Londres, Royaume-Uni). L'accès aux données est
            protégé par des règles de sécurité au niveau de la base de données (Row Level Security)
            garantissant qu'un parent ne peut techniquement accéder qu'aux profils d'enfants qu'il a
            lui-même créés.
          </p>

          <h2>6. Commande de kits matériels via WhatsApp</h2>
          <p>
            Lorsque vous commandez un kit depuis la boutique, l'application enregistre la commande
            (produits, prix) puis vous redirige vers WhatsApp avec un message pré-rempli pour
            finaliser l'échange avec l'éditeur. WhatsApp est un service tiers de Meta Platforms,
            soumis à sa propre politique de confidentialité — Génizio n'a pas de contrôle sur le
            traitement des messages une fois envoyés sur WhatsApp.
          </p>

          <h2>7. Cookies</h2>
          <p>
            Génizio n'utilise aucun cookie de suivi publicitaire ou analytique. Seul un cookie
            technique strictement nécessaire (mémorisation de l'état replié/déplié d'un menu) est
            déposé — il ne nécessite pas de consentement au titre de la réglementation cookies. Si
            un outil d'analyse d'audience ou publicitaire était ajouté à l'avenir, cette politique
            serait mise à jour et un bandeau de consentement serait ajouté avant toute activation.
          </p>

          <h2>8. Vos droits</h2>
          <p>
            Depuis la page{" "}
            <Link to="/profile" className="text-brand underline">
              Réglages
            </Link>
            , chaque parent peut à tout moment :
          </p>
          <ul>
            <li>
              consulter le registre de tous les événements liés à ses données (accès, partages,
              exports) ;
            </li>
            <li>
              exporter l'intégralité de ses données et de celles de ses enfants au format JSON ;
            </li>
            <li>
              supprimer définitivement son compte et toutes les données associées (profils enfants,
              défis, accès mentors).
            </li>
          </ul>
          <p>
            Pour toute autre demande (rectification, limitation du traitement, opposition),
            contactez{" "}
            <a href="mailto:serviceclient@genizio.com" className="text-brand underline">
              serviceclient@genizio.com
            </a>
            .
          </p>

          <h2>9. Conservation des données</h2>
          <p>
            Les données sont conservées tant que le compte parent est actif. En cas de suppression
            de compte, les données sont effacées immédiatement et de façon définitive de nos
            systèmes de production.
          </p>

          <div className="not-prose border-t-2 border-ink/10 pt-4">
            <p className="text-xs font-semibold text-ink/60">
              Voir aussi :{" "}
              <Link to="/mentions-legales" className="text-brand underline">
                Mentions légales
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

import { createFileRoute } from "@tanstack/react-router";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
} from "@/lib/seo";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Store, Wrench, Utensils } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/quelle-librairie-choisir-lieux-creativite-enfant";

const FAQ = [
  {
    question: "Faut-il absolument acheter beaucoup de livres pour que son enfant réussisse ?",
    answer:
      "Avoir accès à la lecture est un atout précieux pour le vocabulaire et l'imaginaire, mais empiler des manuels scolaires ou des livres coûteux ne suffit pas. L'apprentissage réel se produit lorsque l'enfant met en pratique ce qu'il observe et se confronte au monde réel : compter au marché, observer la nature, fabriquer un objet en suivant des instructions.",
  },
  {
    question: "Comment éveiller la curiosité intellectuelle sans budget librairie important ?",
    answer:
      "Utilisez votre environnement immédiat comme terrain d'exploration gratuit : les bibliothèques publiques ou de quartier, les contes oraux partagés en famille le soir, les étals du marché pour apprendre les calculs et la négociation, ou les ateliers de mécanique et d'artisanat du quartier pour comprendre la physique appliquée.",
  },
  {
    question: "Quels types de livres privilégier quand on va en librairie ?",
    answer:
      "Privilégiez les livres interactifs, les bandes dessinées historiques ou documentaires, les recueils de contes traditionnels et les manuels de projets pratiques (bricolage, expériences scientifiques simples, origami) plutôt que de simples fiches d'exercices répétitives.",
  },
];

export const Route = createFileRoute("/guides/quelle-librairie-choisir-lieux-creativite-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Éveiller la créativité de l'enfant : l'impact du marché",
      description:
        "Vous cherchez la meilleure librairie jeunesse ou des livres éducatifs ? Découvrez pourquoi le marché, le garage et la cuisine éveillent 10 fois plus son génie.",
      path: PATH,
      image: "/guides/og-librairie-creativite.jpg",
      type: "article",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(faqPageJsonLd(FAQ)),
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: "Lieux d'éveil & Créativité", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Quelle librairie choisir pour son enfant ? Pourquoi le marché et le quartier éveillent 10 fois plus sa créativité",
            description:
              "Comment transformer l'environnement direct (marché, cuisine, atelier) en laboratoire d'apprentissage vivant et complémentaire de la lecture.",
            path: PATH,
            image: "/guides/og-librairie-creativite.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-08-24",
          }),
        ),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Éveil & Créativité"
      title="Quelle librairie choisir pour son enfant ? Pourquoi le marché et le quartier éveillent 10 fois plus sa créativité"
      intro="Quand on souhaite développer l'intelligence de son enfant, le premier réflexe est souvent de chercher « la meilleure librairie », d'acheter des encyclopédies illustrées ou des cahiers de soutien coûteux. La lecture est une merveilleuse clé d'ouverture. Pourtant, limiter l'éveil culturel et intellectuel aux seuls rayons des librairies feutrées est une erreur : le monde réel regorge d'écoles vivantes, accessibles et gratuites."
      updated="24 août 2026"
      readingTime="7 min"
      path={PATH}
      faq={FAQ}
      related={[
        {
          label: "Développer les talents de son enfant en Afrique",
          to: "/guides/education-enfants-afrique-francophone",
        },
        {
          label: "24 activités éducatives sans écran à la maison",
          to: "/guides/activites-educatives-enfant",
        },
        {
          label: "Pratique avant théorie à l'ère de l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
        {
          label: "Jouets éducatifs et placards de la maison",
          to: "/guides/jouets-educatifs-kits-scientifiques-placards-maison",
        },
      ]}
    >
      <img
        src="/guides/og-librairie-creativite.jpg"
        alt="Enfant africain observant avec enthousiasme une balance au marché tout en notant des calculs sur un carnet"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Les limites de la culture purement livresque</h2>
      <p>
        Un enfant qui lit beaucoup acquiert du vocabulaire, c'est indiscutable. Mais sans confrontation au réel, ce savoir reste abstrait :
      </p>
      <ul>
        <li>Il connaît la définition de la masse, mais ne sait pas estimer le poids d'un sac de riz à la main.</li>
        <li>Il a lu des histoires de diplomatie, mais panique lorsqu'il doit poser une question à un artisan inconnu.</li>
        <li>Il sait résoudre une équation sur une feuille, mais ne sait pas comment calculer le budget des courses familiales.</li>
      </ul>

      <h2>2. Les 3 grands laboratoires d'apprentissage du quotidien</h2>
      <p>
        Voici trois espaces gratuits que vous fréquentez déjà et qui développent l'intelligence pratique de votre enfant :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Store className="h-5 w-5 text-brand" />
            1. Le Marché : l'école d'arithmétique vivante
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Comparer les prix au kilogramme, vérifier le rendu de monnaie de tête, négocier avec politesse et observer la provenance des produits locaux.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Utensils className="h-5 w-5 text-brand" />
            2. La Cuisine : le laboratoire de chimie
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Comprendre les fractions en coupant des légumes, observer les changements d'états (ébullition, émulsion, levée de pâte) et apprendre la précision des dosages.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Wrench className="h-5 w-5 text-brand" />
            3. L'Atelier : la physique appliquée
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Observer un menuisier ou un mécanicien, comprendre l'effet de levier d'une pince, la transmission d'une chaîne de vélo ou la conductivité d'un câble électrique.
          </p>
        </div>
      </div>

      <h2>3. Comment concilier livres et pratique concrète</h2>
      <p>
        La meilleure formule consiste à créer un pont permanent entre ce que l'enfant lit et ce qu'il fabrique :
      </p>
      <ol>
        <li><strong>Après une histoire d'aventure</strong> : Demandez-lui de dessiner la carte du pays imaginaire à l'échelle de votre salon ou de votre cour.</li>
        <li><strong>Après un livre sur la nature</strong> : Sortir observer les insectes du quartier, récolter des feuilles différentes et créer un herbier réel.</li>
        <li><strong>Après la lecture d'un conte oral</strong> : Lui faire réécrire la fin de l'histoire et la jouer devant toute la famille.</li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          L'apprentissage par l'action avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio transforme les moments ordinaires du quotidien en missions d'éveil passionnantes. Avec <strong>Naya</strong>, votre enfant apprend en faisant, à son rythme, partout où il se trouve.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Découvrir les défis du quotidien
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/activites-educatives-enfant">
              Explorer 24 activités maison
            </Link>
          </Button>
        </div>
      </div>
    </GuideLayout>
  );
}
export default Route;

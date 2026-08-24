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
import { ArrowRight, CheckCircle2, Sparkles, Brain, Lightbulb } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/test-de-personnalite-enfant-talents";

const FAQ = [
  {
    question: "Les tests de personnalité gratuits en ligne pour enfant sont-ils fiables ?",
    answer:
      "La quasi-totalité des tests en ligne gratuits (tests MBTI juniors, quiz de personnalité ou tests de couleurs) manquent de validité psychométrique pour les enfants. Un enfant de 7 à 14 ans n'a pas encore stabilisé son identité et répond souvent selon ce qu'il croit que ses parents ou ses enseignants attendent de lui. Seul un neuropsychologue ou un psychologue clinicien peut administrer des bilans validés (comme le WISC-V). Mais pour observer ses forces au quotidien, rien ne vaut l'observation de ses réalisations concrètes.",
  },
  {
    question: "Comment connaître les vrais talents de mon enfant sans test psychologique ?",
    answer:
      "En appliquant la grille des 9 intelligences multiples d'Howard Gardner à travers des situations réelles : observez comment il réagit quand il doit réparer un objet (kinesthésique/spatial), négocier au marché (interpersonnel/verbal), organiser ses affaires (logique/intrapersonnel) ou raconter une histoire. Ce sont ses choix spontanés dans l'action qui révèlent ses dominantes naturelles.",
  },
  {
    question: "À quel âge peut-on identifier la personnalité dominante d'un enfant ?",
    answer:
      "Dès l'âge de 5-6 ans, des tendances fortes apparaissent (besoin de bouger, sensibilité aux sons, goût de l'ordre ou de la narration). Cependant, la plasticité cérébrale reste immense jusqu'à l'âge adulte : l'important n'est pas d'enfermer l'enfant dans une case ('il est timide', 'il est scientifique'), mais de lui offrir des défis variés pour explorer tous ses potentiels.",
  },
];

export const Route = createFileRoute("/guides/test-de-personnalite-enfant-talents")({
  head: () => {
    const meta = pageMeta({
      title: "Test de personnalité enfant : pourquoi 20 questions ne remplaceront jamais l'action",
      description:
        "Vous cherchez un test de personnalité ou un quiz pour votre enfant ? Découvrez pourquoi les QCM sur écran sont trompeurs et comment révéler ses vrais talents par l'action réelle.",
      path: PATH,
      image: "/guides/og-test-personnalite.jpg",
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
            { name: "Test de personnalité enfant", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Test de personnalité enfant : pourquoi 20 questions sur écran ne remplaceront jamais l'action réelle",
            description:
              "Analyse critique des tests de personnalité en ligne pour enfants et méthode concrète d'observation des 9 intelligences à travers 3 défis pratiques.",
            path: PATH,
            image: "/guides/og-test-personnalite.jpg",
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
      eyebrow="Orientation & Talents"
      title="Test de personnalité pour enfant : pourquoi 20 questions sur écran ne remplaceront jamais l'action réelle"
      intro="Quand un parent tape « test de personnalité enfant » ou « quiz psychologie pour mon fils », il cherche une réponse rassurante à une angoisse légitime : qui est vraiment mon enfant, et comment l'aider à s'épanouir ? Mais faire remplir un questionnaire à choix multiples à un enfant de 8 ou 12 ans repose sur un malentendu fondamental. Voici pourquoi les tests sur écran sont biaisés, et comment cartographier ses vraies forces à travers des situations de vie réelles."
      updated="24 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Les 9 formes d'intelligence de Gardner",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Test d'orientation et métiers d'avenir",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Pratique avant théorie à l'ère de l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
        {
          label: "Découvrir les métiers dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
      ]}
    >
      <img
        src="/guides/og-test-personnalite.jpg"
        alt="Père observant avec fierté sa fille explorer des blocs de construction et des dessins à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Le piège des tests de personnalité en ligne pour enfants</h2>
      <p>
        Internet regorge de quiz promettant de révéler si votre enfant est « leader », « créatif », « logique » ou « empathique » en 15 questions. Bien que ludiques en apparence, ces tests posent trois limites scientifiques majeures :
      </p>
      <ul>
        <li>
          <strong>Le biais de désirabilité sociale</strong> : Un enfant ne répond pas à ce qu'il ressent intimement, mais à ce qu'il pense être la « bonne réponse » pour faire plaisir à ses parents ou ressembler au modèle scolaire.
        </li>
        <li>
          <strong>L'illusion de la case fermée</strong> : Étiqueter un enfant de 9 ans comme « non-manuel » ou « introverti » risque de créer une prophétie autoréalisatrice qui bride son exploration.
        </li>
        <li>
          <strong>La déconnexion du réel</strong> : Cocher une case « Aimes-tu aider les autres ? » ne dit rien de sa capacité à désamorcer une dispute entre camarades dans la cour de récréation.
        </li>
      </ul>

      <h2>2. Observer la personnalité en action : les 4 situations révélatrices</h2>
      <p>
        La psychologie développementale moderne démontre que la personnalité et les talents d'un jeune enfant se révèlent dans ses <em>comportements spontanés face à la matière et aux autres</em>, et non devant un écran. Voici 4 moments clés à observer :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Brain className="h-5 w-5 text-brand" />
            Face à un problème imprévu
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un jouet se casse, une recette rate ou un plan tombe à l'eau : abandonne-t-il immédiatement, cherche-t-il un coupable, ou bricole-t-il immédiatement une solution alternative ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Quand personne ne le regarde
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Vers quoi se tourne son énergie lorsqu'il n'a ni écran ni consigne scolaire ? Démonter des objets, dessiner des plans, classer des collections ou imaginer des scénarios ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Lightbulb className="h-5 w-5 text-brand" />
            Dans les interactions sociales
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            En groupe, prend-il spontanément le rôle du stratège, du médiateur qui apaise les tensions, du bâtisseur qui exécute ou de l'orateur qui galvanise les autres ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            Son rapport à la contrainte matérielle
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Est-il à l'aise avec la manipulation d'outils, la gestion d'un budget au marché ou la mesure physique des espaces ?
          </p>
        </div>
      </div>

      <h2>3. Le protocole des « 3 défis du week-end » (À faire à la maison)</h2>
      <p>
        Au lieu d'un test abstrait, proposez à votre enfant ce protocole simple sur un samedi :
      </p>
      <ol>
        <li>
          <strong>Défi 1 : La Mission du Marché (Intelligence Pratique & Interpersonnelle)</strong><br />
          Donnez-lui une liste de 3 ingrédients et un budget précis. Laissez-le choisir les étals, vérifier les prix et calculer la monnaie rendue. Vous découvrirez son sens de la négociation et sa gestion du stress.
        </li>
        <li>
          <strong>Défi 2 : L'Invention en Carton (Intelligence Spatiale & Kinesthésique)</strong><br />
          Avec une boîte de récupération, du ruban adhésif et des ciseaux, demandez-lui de concevoir un objet utile (un support de livre, un pont pour billes, un rangement). Observez sa persévérance face aux échecs d'équilibre.
        </li>
        <li>
          <strong>Défi 3 : L'Histoire Inversée (Intelligence Linguistique & Narrative)</strong><br />
          Demandez-lui de vous expliquer le fonctionnement d'un objet du quotidien comme s'il était un journaliste de télévision. Vous mesurerez sa clarté d'esprit et sa confiance orale.
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Comment Génizio documente la personnalité par la preuve
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Sur Génizio, l'IA compagne <strong>Naya</strong> n'enferme jamais un enfant dans un score statique. Elle lui propose des défis réels adaptés à son âge, enregistre ses réussites tangibles et génère un <em>Passeport de Talents</em> évolutif fondé sur ce qu'il a réellement accompli.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Découvrir le Jumeau Pédagogique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/intelligences-multiples-gardner">
              Explorer les 9 intelligences
            </Link>
          </Button>
        </div>
      </div>
    </GuideLayout>
  );
}

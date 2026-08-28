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
      title: "Test de personnalité pour enfant : Les 4 limites à connaître",
      description:
        "Pourquoi les tests de personnalité en ligne pour enfants sont trompeurs ? Découvrez comment révéler ses vrais talents par l'action et 3 défis concrets.",
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
            dateModified: "2026-08-26",
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
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Test d'orientation collégien & IA",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Découvrir les métiers dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
        {
          label: "Rendre son enfant autonome",
          to: "/guides/autonomie-responsabilite-maison",
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
          <strong>Le biais de désirabilité sociale :</strong> Un enfant ne répond pas à ce qu'il ressent intimement, mais à ce qu'il pense être la « bonne réponse » pour faire plaisir à ses parents.
        </li>
        <li>
          <strong>L'illusion de la case fermée :</strong> Étiqueter un enfant de 9 ans comme « non-manuel » ou « timide » risque de figer son identité (consultez nos conseils pour{" "}
          <a href="/guides/timidite-confiance-prise-de-parole">aider un enfant réservé à libérer sa parole</a>).
        </li>
        <li>
          <strong>La déconnexion du réel :</strong> Cocher une case ne dit rien de sa capacité à résoudre un problème concret dans la vraie vie ou à exprimer son profil naturel (découvrez comment{" "}
          <a href="/guides/potentiel-haut-potentiel-enfant">repérer les signes d'un enfant précoce ou HPI</a>).
        </li>
      </ul>

      <h2>2. Observer la personnalité en action : les 4 situations révélatrices</h2>
      <p>
        La psychologie cognitive démontre que les talents d'un jeune enfant se révèlent dans ses comportements spontanés face à la matière et aux autres, selon la grille des{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Howard Gardner</a>. Voici 4 moments clés à observer :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Brain className="h-5 w-5 text-brand" />
            Face à un problème imprévu
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un jouet se casse, une recette rate : abandonne-t-il immédiatement ou bricole-t-il une solution alternative ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Quand personne ne le regarde
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Vers quoi se tourne son énergie lorsqu'il n'a ni écran ni consigne scolaire ? Démonter, dessiner, classer, inventer ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Lightbulb className="h-5 w-5 text-brand" />
            Dans les interactions sociales
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            En groupe, prend-il spontanément le rôle du stratège, du médiateur bienveillant, du bâtisseur ou de l'orateur ?
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            Son rapport à l'autonomie
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Est-il capable de mener une mission au marché ou de gérer une responsabilité quotidienne (retrouvez nos repères d'
            <a href="/guides/autonomie-responsabilite-maison">autonomie et de responsabilités à la maison</a>) ?
          </p>
        </div>
      </div>

      <h2>3. Le protocole des « 3 défis du week-end » (À faire à la maison)</h2>
      <p>
        Au lieu d'un test abstrait sur écran, proposez à votre enfant ce protocole simple :
      </p>
      <ol className="space-y-4 my-6">
        <li>
          <strong>Défi 1 : La Mission du Marché (Intelligence Pratique & Interpersonnelle)</strong><br />
          Donnez-lui une liste de 3 ingrédients et un budget précis. Laissez-le choisir les étals, négocier et calculer la monnaie rendue.
        </li>
        <li>
          <strong>Défi 2 : L'Invention en Carton (Intelligence Spatiale & Kinesthésique)</strong><br />
          Avec une boîte de récupération et des ciseaux (inspiré de nos{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles et de bricolage</a>), demandez-lui de fabriquer un objet fonctionnel.
        </li>
        <li>
          <strong>Défi 3 : L'Histoire Inversée (Intelligence Linguistique & Narrative)</strong><br />
          Demandez-lui de vous expliquer le fonctionnement d'une machine comme s'il était présentateur télé.
        </li>
      </ol>

      <h2>Pour aller plus loin vers l'orientation future</h2>
      <p>
        Pour accompagner un collégien ou adolescent dans la découverte de ses affinités avec les métiers de demain, explorez notre{" "}
        <a href="/guides/test-orientation-metier-enfant-futur">test d'orientation collégien & métiers d'avenir</a> ainsi que notre guide pour{" "}
        <a href="/guides/orientation-scolaire-metiers-avenir">aider son enfant à choisir son métier dès 10 ans</a>.
      </p>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Comment Génizio documente la personnalité par la preuve
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Sur Génizio, l'IA compagne <strong>Naya</strong> n'enferme jamais un enfant dans un score statique. Elle lui propose des défis réels adaptés à son âge, enregistre ses réussites tangibles et génère un <em>Passeport de Talents</em> évolutif fondé sur ce qu'il a réellement accompli.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all">
            <Link to="/auth">
              Découvrir le Jumeau Pédagogique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all">
            <Link to="/guides/intelligences-multiples-gardner">
              Explorer les 9 intelligences
            </Link>
          </Button>
        </div>
      </div>

      <h2>Questions fréquentes (FAQ)</h2>
      {FAQ.map((item) => (
        <div key={item.question} className="my-5 border-b border-ink/10 pb-4">
          <h3 className="text-lg font-bold text-ink">{item.question}</h3>
          <p className="mt-2 text-ink/80">{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}

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
import { ArrowRight, Award, FolderCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/choix-parcoursup-parcours-scolaire-enfant";

const FAQ = [
  {
    question: "Comment choisir ses vœux d'orientation sans stress ?",
    answer:
      "La clé est d'inverser la perspective : ne partez pas de la liste des formations disponibles en essayant d'y 'faire entrer' votre enfant. Partez des preuves concrètes de ce qu'il sait faire et aime réaliser (ses projets, son endurance, sa créativité, ses centres d'intérêt). Une fois ses points forts identifiés, sélectionnez des filières variées combinant des vœux de rêve, des choix équilibrés et des formations de sécurité.",
  },
  {
    question: "Les notes sont-elles le seul critère d'admission dans les filières d'avenir ?",
    answer:
      "De moins en moins. Même si les algorithmes de sélection filtrent un premier niveau académique, la lettre de motivation, les projets extra-scolaires, les réalisations concrètes (portfolio, engagements associatifs, créations) font la différence absolue lors des entretiens et des études de dossiers.",
  },
  {
    question: "Que faire si mon enfant a un dossier moyen ou hétérogène ?",
    answer:
      "Un profil hétérogène (bon dans certaines matières, faible dans d'autres) est souvent le signe d'une motivation sélective ou d'une intelligence pratique non valorisée par les examens classiques. Valorisez ses réalisations tangibles, encouragez-le à développer des projets personnels et misez sur les filières professionnelles ou universitaires appliquées (BTS, BUT, écoles pratiques) où ses compétences réelles s'exprimeront pleinement.",
  },
];

export const Route = createFileRoute("/guides/choix-parcoursup-parcours-scolaire-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Vœux Parcoursup : Valoriser le vrai profil de votre enfant",
      description:
        "Orientation et vœux scolaires : comment dédramatiser Parcoursup, valoriser le profil réel de votre enfant et bâtir un passeport de réussites tangibles.",
      path: PATH,
      image: "/guides/og-parcoursup.jpg",
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
            { name: "Choix de parcours & Orientation", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Choix des vœux et parcours scolaire : pourquoi le vrai profil de votre enfant dépasse ses bulletins",
            description:
              "Conseils bienveillants et pragmatiques pour aborder les choix de filières, les vœux scolaires et construire un passeport de réalisations valorisant.",
            path: PATH,
            image: "/guides/og-parcoursup.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-08-27",
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
      eyebrow="Orientation & Parcours"
      title="Choix des vœux et parcours scolaire : pourquoi le vrai profil de votre enfant dépasse ses bulletins"
      intro="À l'approche des choix d'orientation, du brevet ou de la constitution des dossiers scolaires, une immense pression s'abat sur les familles : peur du mauvais choix, angoisse des algorithmes et sentiment que l'avenir se joue sur une poignée de moyennes trimestrielles. Pourtant, les meilleurs parcours ne sont jamais linéaires. Voici comment aborder cette étape avec sérénité et transformer ses talents réels en atouts décisifs."
      updated="27 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Test d'orientation collégien & IA",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Orientation dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
        {
          label: "Décrochage et confiance en soi",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        {
          label: "Réussite scolaire sans stress",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "12 défis pour adolescents",
          to: "/guides/defis-pour-adolescents",
        },
      ]}
    >
      <img
        src="/guides/og-parcoursup.jpg"
        alt="Lycéenne africaine souriante présentant avec fierté son portfolio de projets pratiques aux côtés de sa mère"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Le mythe du « choix unique et définitif »</h2>
      <p>
        L'un des plus grands générateurs d'anxiété chez les jeunes et leurs parents est l'idée reçue selon laquelle une décision prise à 15 ou 18 ans conditionnerait irrémédiablement toute une vie.
      </p>
      <p>
        Dans la réalité économique actuelle :
      </p>
      <ul>
        <li>Une personne active change en moyenne de métier ou d'orientation majeure 4 à 6 fois au cours de sa vie.</li>
        <li>Les compétences les plus valorisées (rigueur d'exécution, adaptabilité, communication) sont transversales et s'ancrent dans les{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence dominantes</a>.</li>
        <li>Pour aider votre enfant à mûrir ses réflexions dès le collège, découvrez notre{" "}
        <a href="/guides/test-orientation-metier-enfant-futur">test d'orientation collégien spécial IA</a> et nos enquêtes pour{" "}
        <a href="/guides/orientation-scolaire-metiers-avenir">choisir son métier dès 10 ans</a>.</li>
      </ul>

      <h2>2. Construire un « Passeport de Réalisations » dès le collège</h2>
      <p>
        Comment faire sortir du lot le profil de votre enfant, au-delà de ses bulletins de notes (voir nos clés de{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">réussite scolaire sereine</a>) ? En l'aidant à documenter ce qu'il accomplit concrètement :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <FolderCheck className="h-5 w-5 text-brand" />
            Les projets finis
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un site web créé, un meuble restauré, un projet d'écriture ou une micro-entreprise du week-end issue de nos{" "}
            <a href="/guides/defis-pour-adolescents">12 défis stimulants pour adolescents</a>.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Award className="h-5 w-5 text-brand" />
            Les engagements réels
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            L'aide régulière au quartier, l'animation d'une équipe sportive ou le mentorat fraternel.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" />
            La persévérance prouvée
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Avoir surmonté une difficulté scolaire ou personnelle (consultez notre guide sur le{" "}
            <a href="/guides/decrochage-scolaire-confiance-enfant">décrochage scolaire et la reconquête de la confiance</a>).
          </p>
        </div>
      </div>

      <h2>3. La méthode des 3 cercles pour sélectionner ses choix d'orientation</h2>
      <p>
        Au moment de hiérarchiser les choix scolaires, posez-vous avec votre enfant et classez ses souhaits en 3 cercles équilibrés :
      </p>
      <ol className="space-y-3 my-6">
        <li>
          <strong>Le Cercle d'Ambition (2 à 3 vœux) :</strong> Les filières d'excellence ou passionnées qui le font rêver, même si le niveau d'admission est sélectif.
        </li>
        <li>
          <strong>Le Cercle de Cohérence (4 à 5 vœux) :</strong> Des formations solides et reconnues, parfaitement alignées avec son niveau actuel et ses aptitudes dominantes.
        </li>
        <li>
          <strong>Le Cercle de Sécurité (2 à 3 vœux) :</strong> Des parcours accessibles avec une forte employabilité ou des passerelles multiples pour rebondir.
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Votre enfant est bien plus qu'une moyenne générale
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio permet à votre enfant de bâtir son cahier de réussites tangibles dès le plus jeune âge. Chaque défi relevé devient une preuve concrète qu'il pourra fièrement exposer dans ses lettres de motivation et ses entretiens futurs.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Commencer le passeport de mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/orientation-scolaire-metiers-avenir">
              Enquêtes métiers à la maison
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
export default Route;

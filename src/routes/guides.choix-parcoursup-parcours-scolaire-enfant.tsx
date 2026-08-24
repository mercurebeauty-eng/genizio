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
        "Angoisse de l'orientation, choix des filières et vœux d'avenir : découvrez comment dédramatiser le parcours scolaire de votre enfant et valoriser ses vraies forces.",
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
      eyebrow="Orientation & Parcours"
      title="Choix des vœux et parcours scolaire : pourquoi le vrai profil de votre enfant dépasse ses bulletins"
      intro="À l'approche des choix d'orientation, du brevet ou de la constitution des dossiers scolaires, une immense pression s'abat sur les familles : la peur du mauvais choix, l'angoisse des algorithmes de sélection et le sentiment que l'avenir se joue sur une poignée de moyennes trimestrielles. Pourtant, les meilleurs parcours ne sont jamais linéaires. Voici comment aborder cette étape avec sérénité et transformer ses talents réels en atouts décisifs."
      updated="24 août 2026"
      readingTime="8 min"
      path={PATH}
      faq={FAQ}
      related={[
        {
          label: "Test d'orientation et métiers d'avenir",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Décrochage scolaire et confiance en soi",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        {
          label: "Aider son enfant à réussir à l'école sans stress",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "Motiver un adolescent : 12 défis concrets",
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
        L'un des plus grands générateurs d'anxiété chez les jeunes et leurs parents est l'idée reçue selon laquelle une décision prise à 15 ou 18 ans conditionnerait irrémédiablement les 40 prochaines années d'existence.
      </p>
      <p>
        Dans la réalité économique actuelle :
      </p>
      <ul>
        <li>Une personne active changera en moyenne de métier ou d'orientation majeure 4 à 6 fois au cours de sa vie professionnelle.</li>
        <li>Les compétences les plus valorisées (rigueur d'exécution, adaptabilité, leadership, maîtrise des outils numériques) sont transversales et transférables d'un secteur à un autre.</li>
        <li>Une filière initiale qui ne plaît pas n'est pas un échec, mais une étape d'apprentissage qui affine ce que l'enfant ne veut plus.</li>
      </ul>

      <h2>2. Construire un « Passeport de Réalisations » dès le collège</h2>
      <p>
        Comment faire sortir du lot le profil de votre enfant, au-delà de ses bulletins de notes ? En l'aidant à documenter ce qu'il accomplit concrètement :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <FolderCheck className="h-5 w-5 text-brand" />
            Les projets finis
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un site web créé, un meuble restauré, un potager aménagé, un roman court écrit ou un budget d'événement familial géré de A à Z.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Award className="h-5 w-5 text-brand" />
            Les engagements réels
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            L'aide régulière apportée à des personnes âgées du quartier, l'animation d'une équipe sportive, le bénévolat ou la participation à un club d'échecs.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" />
            La persévérance prouvée
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Avoir surmonté une difficulté (passer de 7 à 12 en physique, apprendre un instrument de musique, réparer un moteur).
          </p>
        </div>
      </div>

      <h2>3. La méthode des 3 cercles pour sélectionner ses choix d'orientation</h2>
      <p>
        Au moment de hiérarchiser les choix scolaires, posez-vous avec votre enfant et classez ses souhaits en 3 cercles équilibrés :
      </p>
      <ol>
        <li>
          <strong>Le Cercle d'Ambition (2 à 3 vœux)</strong> : Les filières d'excellence ou passionnées qui le font rêver, même si le niveau d'admission est exigeant.
        </li>
        <li>
          <strong>Le Cercle de Cohérence (4 à 5 vœux)</strong> : Des formations solides et reconnues, parfaitement alignées avec son niveau actuel et ses aptitudes dominantes.
        </li>
        <li>
          <strong>Le Cercle de Sécurité (2 à 3 vœux)</strong> : Des parcours accessibles avec une forte employabilité ou des passerelles multiples pour rebondir.
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
    </GuideLayout>
  );
}
export default Route;

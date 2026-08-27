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
import { ArrowRight, Sparkles, Scissors, Coins, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/sac-a-dos-marques-challenge-creativite-enfant";

const FAQ = [
  {
    question: "Faut-il céder quand son enfant réclame une marque coûteuse comme North Face ou Nike ?",
    answer:
      "Céder systématiquement installe l'illusion que la valeur personnelle dépend d'un logo commercial. Refuser brutalement sans expliquer crée de la frustration et le sentiment d'être exclu du groupe d'amis. La meilleure approche est le compromis responsabilisant : 'Je comprends pourquoi ce sac te plaît. Voici le budget de base que nous allouons pour un sac solide. Si tu veux ce modèle précis, comment proposes-tu de financer ou de mériter la différence ?'",
  },
  {
    question: "Comment valoriser la créativité artisanale face aux marques chez les adolescents ?",
    answer:
      "Les adolescents adorent la notion d'exclusivité (les 'pièces uniques' ou 'éditions limitées'). Montrez-lui que des créateurs de mode célèbres et des artistes ont commencé en personnalisant des sacs neutres avec de la peinture textile, des patchs ou des broderies. Personnaliser son propre équipement permet de passer du statut de simple suiveur de mode à celui de créateur de tendance.",
  },
  {
    question: "Quelles activités concrètes proposer pour apprendre la valeur de l'argent ?",
    answer:
      "Proposez-lui des mini-défis d'autonomie économique adaptés à son âge : vendre de vieux jouets sur un vide-grenier ou une plateforme d'occasion, fabriquer et vendre des gourmandises ou du jus de fruits lors d'un événement familial, ou proposer des petits services rémunérés (laver la voiture des voisins, désherber le jardin, ranger le garage).",
  },
];

export const Route = createFileRoute("/guides/sac-a-dos-marques-challenge-creativite-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant et marques de luxe : Comment éveiller sa créativité",
      description:
        "Sac North Face, sacoche Nike ou housse tendance : comment réagir face à la pression des marques scolaires et transformer l'envie en projet d'autonomie génial.",
      path: PATH,
      image: "/guides/og-sac-challenge.jpg",
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
            { name: "Marques & Défi créatif", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Votre enfant réclame le sac North Face ou Nike ? Challengez-le : et s'il créait son équipement ?",
            description:
              "Comment canaliser la pression sociale des marques scolaires chez l'enfant et l'adolescent pour développer l'ingéniosité manuelle et la gestion financière.",
            path: PATH,
            image: "/guides/og-sac-challenge.jpg",
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
      eyebrow="Créativité & Autonomie"
      title="Votre enfant réclame le sac North Face ou Nike ? Challengez-le : et s'il créait son équipement ?"
      intro="Chaque rentrée scolaire ou passage au collège amène son lot d'exigences : le sac à dos North Face dernier cri, la sacoche Nike incontournable, la housse à la mode. Cette pression des marques pèse sur le budget familial et suscite des tensions. Mais plutôt que de sanctionner ou de céder passivement, pourquoi ne pas transformer cette envie en son tout premier défi de créateur et de gestionnaire ?"
      updated="27 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "15 activités manuelles récup",
          to: "/guides/activites-manuelles-enfant",
        },
        {
          label: "Développer l'autonomie à la maison",
          to: "/guides/autonomie-responsabilite-maison",
        },
        {
          label: "12 défis stimulants pour ados",
          to: "/guides/defis-pour-adolescents",
        },
        {
          label: "Discipline positive sans punition",
          to: "/guides/discipline-positive-sans-punition",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
      ]}
    >
      <img
        src="/guides/og-sac-challenge.jpg"
        alt="Deux enfants africains joyeux personnalisant ensemble un sac à dos en toile dans un atelier d'artisanat"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Comprendre le vrai besoin derrière la demande de marque</h2>
      <p>
        Quand un jeune réclame une marque précise, ce n'est pas un simple caprice : l'objet remplit un rôle d'intégration sociale et d'affirmation de soi dans la cour d'école.
      </p>
      <p>
        Plutôt que d'entrer dans un bras de fer (retrouvez nos repères de{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition ni humiliation</a>), reconnaissez son désir d'appartenance tout en stimulant son{" "}
        <a href="/guides/autonomie-responsabilite-maison">autonomie et son sens des responsabilités à la maison</a>.
      </p>

      <h2>2. Les 3 défis pour transformer le consommateur en producteur</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Scissors className="h-5 w-5 text-brand" />
            Défi 1 : La Customisation Unique
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Acheter un sac neutre très solide et le personnaliser avec du wax, de la broderie ou de la peinture textile (piochez dans nos{" "}
            <a href="/guides/activites-manuelles-enfant">15 activités manuelles créatives</a>).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Coins className="h-5 w-5 text-brand" />
            Défi 2 : Le Projet Co-Financement (50/50)
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Allouez le budget d'un sac standard. Pour le modèle haut de gamme, encouragez-le à mériter le supplément par des services utiles issus de nos{" "}
            <a href="/guides/defis-pour-adolescents">12 défis stimulants pour adolescents</a>.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Défi 3 : La Housse Upcycling Zéro Déchet
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Concevoir et coudre une pochette de protection d'ordinateur en recyclant de vieux jeans. L'occasion idéale d'explorer ses{" "}
            <a href="/guides/intelligences-multiples-gardner">intelligences kinesthésique et visuo-spatiale</a>.
          </p>
        </div>
      </div>

      <h2>3. Ce que cette expérience apprend pour la vie</h2>
      <p>
        En relevant ce défi, votre enfant apprend trois leçons inestimables pour son avenir :
      </p>
      <ol className="space-y-3 my-6">
        <li><strong>L'effort a une valeur mesurable :</strong> Il comprend le lien direct entre travail, patience et argent.</li>
        <li><strong>La fierté du « Fait Maison » :</strong> Il passe du statut de suiveur passif à celui de créateur original.</li>
        <li><strong>L'esprit d'initiative :</strong> Il découvre qu'il a le pouvoir d'agir sur son environnement.</li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Développer l'ingéniosité pratique avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio encourage les enfants à fabriquer, construire, réparer et entreprendre à travers des missions amusantes guidées par <strong>Naya</strong>. Chaque création enrichit son passeport d'accomplissements.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Lancer un défi à mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/activites-manuelles-enfant">
              Voir les idées d'activités manuelles
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

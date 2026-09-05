import { createFileRoute } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Scissors, Coins, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/sac-a-dos-marques-challenge-creativite-enfant";

const FAQ = [
  {
    question:
      "Faut-il céder quand son enfant réclame une marque coûteuse comme North Face ou Nike ?",
    answer:
      "Céder à chaque envie installe l'idée que l'estime de soi dépend d'un logo. Mais refuser sans dialogue isole l'adolescent de son groupe. La bonne réponse : financer le coût d'un sac standard solide, et lui proposer de mériter ou financer lui-même le surcoût.",
  },
  {
    question: "Comment valoriser la créativité artisanale face aux marques chez les adolescents ?",
    answer:
      "Misez sur l'édition limitée : personnaliser un sac neutre avec du tissu wax ou des patchs le transforme en pièce unique qu'aucun camarade ne possède.",
  },
  {
    question: "Quelles activités concrètes proposer pour apprendre la valeur de l'argent ?",
    answer:
      "Trois pistes simples : trier et revendre d'anciens jouets sur une plateforme de seconde main, tenir un stand de boissons maison lors d'une fête de quartier, ou proposer des petits services rémunérés aux proches (laver la voiture, désherber le potager, ranger le garage).",
  },
  {
    question: "Comment gérer la pression des marques au collège sans braquer son ado ?",
    answer:
      "Le besoin d'appartenir au groupe est intense à cet âge. Discutez des stratégies publicitaires qui vendent un statut social plutôt qu'une qualité réelle. Fixez une enveloppe budgétaire globale : l'adolescent arbitre librement ses choix, ce qui l'oblige à renoncer à un article pour en financer un autre.",
  },
  {
    question: "Que faire si mon enfant a honte de ses affaires sans marque ?",
    answer:
      "Accueillez son malaise sans ironie. Aidez-le à affirmer un style propre : des vêtements chinés avec soin, des customisations originales ou des accessoires singuliers suscitent souvent plus de respect que l'uniforme copié sur quarante camarades. L'assurance naît de l'audace d'être soi.",
  },
  {
    question: "Comment lui faire mesurer le coût réel d'un logo de marque ?",
    answer:
      "Convertissez le prix en temps de travail concret : montrez-lui le nombre d'heures de travail ou le budget de courses familiales correspondant à une paire de baskets à la mode. Ce parallèle simple remet la dépense dans la réalité sans sermon culpabilisant.",
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
            { name: "Marques scolaires et créativité", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Votre enfant réclame un sac de marque ? Challengez-le : et s'il créait son équipement ?",
            description:
              "Méthode pour transformer la pression des marques scolaires en opportunité d'apprentissage de l'autonomie, du budget et de la créativité manuelle.",
            path: PATH,
            image: "/guides/og-sac-challenge.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-09-04",
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
      intro="Chaque rentrée scolaire ou passage au collège amène son lot d'exigences : le sac à dos de marque, la sacoche à la mode, la trousse tendance. Cette pression des marques pèse sur le budget familial et crée des tiraillements. Plutôt que de sanctionner ou de céder passivement, transformez cette envie en défi d'ingéniosité et de gestion."
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
        Quand un jeune réclame une marque précise, ce n'est pas un caprice isolé. C'est un besoin
        d'appartenance. À cet âge, le vêtement sert d'armure sociale.
      </p>
      <p>
        Plutôt que d'entrer dans un bras de fer (retrouvez nos repères de{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>),
        validez son désir tout en sollicitant son{" "}
        <a href="/guides/autonomie-responsabilite-maison">
          autonomie et son sens des responsabilités
        </a>
        .
      </p>

      <h2>2. Les 3 défis pour transformer le consommateur en producteur</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Scissors className="h-5 w-5 text-brand" />
            Défi 1 : La Customisation Unique
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un sac neutre en toile brute, quelques chutes de wax et de la colle textile :
            l'adolescent crée un modèle collector que personne d'autre ne portera (idées dans nos{" "}
            <a href="/guides/activites-manuelles-enfant">activités manuelles</a>).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Coins className="h-5 w-5 text-brand" />
            Défi 2 : Le Projet Co-Financement
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Fixez le budget d'un sac standard. S'il veut le modèle premium, il finance la différence
            par son épargne (voir notre méthode pour{" "}
            <a href="/guides/comment-gerer-argent-de-poche-enfant">gérer son argent de poche</a>) ou
            nos <a href="/guides/defis-pour-adolescents">défis pour adolescents</a>.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            Défi 3 : La Housse Upcycling
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Recycler un vieux jean pour coudre une pochette d'ordinateur rembourrée et muscler ses{" "}
            <a href="/guides/intelligences-multiples-gardner">intelligences manuelles</a>.
          </p>
        </div>
      </div>

      <h2>3. Ce que cette expérience apprend pour la vie</h2>
      <p>En relevant ce défi, votre enfant apprend trois leçons inestimables pour son avenir :</p>
      <ol className="space-y-3 my-6">
        <li>
          <strong>L'effort a une valeur mesurable :</strong> Il comprend le lien direct entre
          travail, patience et argent.
        </li>
        <li>
          <strong>La fierté du « Fait Maison » :</strong> Il passe du statut de suiveur passif à
          celui de créateur original.
        </li>
        <li>
          <strong>L'esprit d'initiative :</strong> Il découvre qu'il a le pouvoir d'agir sur son
          environnement.
        </li>
      </ol>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Développer l'ingéniosité pratique avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio encourage les enfants à fabriquer, construire, réparer et entreprendre à travers
          des missions amusantes guidées par <strong>Naya</strong>. Chaque création enrichit son
          passeport d'accomplissements.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all"
          >
            <Link to="/auth">
              Lancer un défi à mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all"
          >
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

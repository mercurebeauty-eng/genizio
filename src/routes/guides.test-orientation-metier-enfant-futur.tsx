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
import { ArrowRight, Briefcase, Bot, Target, Compass, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/test-orientation-metier-enfant-futur";

const FAQ = [
  {
    question: "À quel âge doit-on commencer à réfléchir à l'orientation de son enfant ?",
    answer:
      "Dès 9-11 ans, non pas pour choisir un métier définitif, mais pour ouvrir son horizon sur la diversité des activités humaines : comment fonctionne un commerce, comment une maison est construite, quel problème un médecin ou un ingénieur résout. L'objectif au collège n'est pas de décider, mais d'explorer sans stress.",
  },
  {
    question: "Les tests de métiers gratuits pour collégiens sont-ils efficaces ?",
    answer:
      "Ils sont utiles pour donner des idées de secteurs, mais ils souffrent d'un gros défaut : ils se basent sur des catalogues de métiers du passé. À l'ère de l'intelligence artificielle, les frontières entre les professions changent à grande vitesse. Il vaut mieux développer des compétences polyvalentes (résoudre un problème, communiquer, apprendre vite) que de s'enfermer dans un intitulé de poste.",
  },
  {
    question: "Que faire si mon enfant dit qu'il n'aime rien ou n'a pas de passion ?",
    answer:
      "C'est parfaitement normal. La passion n'est pas une révélation magique qui tombe du ciel : elle naît souvent de la compétence. Quand un enfant réussit à fabriquer, réparer ou organiser quelque chose avec succès, le plaisir arrive. Proposez-lui de petites missions pratiques plutôt que de lui demander abstraitement ce qu'il 'aime'.",
  },
];

export const Route = createFileRoute("/guides/test-orientation-metier-enfant-futur")({
  head: () => {
    const meta = pageMeta({
      title: "Test d'orientation et de métier : comment savoir ce qui anime vraiment votre enfant",
      description:
        "Avant de faire passer un test d'orientation à votre enfant, découvrez pourquoi les métiers de demain exigent des compétences réelles plutôt qu'une case figée.",
      path: PATH,
      image: "/guides/og-test-orientation.jpg",
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
            { name: "Test d'orientation & Métiers", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Test d'orientation et de métier : comment savoir ce qui anime vraiment votre enfant",
            description:
              "Pourquoi les tests d'orientation classiques sont dépassés par l'ère de l'IA et comment développer les 4 méta-compétences de l'avenir dès le collège.",
            path: PATH,
            image: "/guides/og-test-orientation.jpg",
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
      eyebrow="Orientation & Avenir"
      title="Test d'orientation et de métier : comment savoir ce qui anime vraiment votre enfant"
      intro="« Que veux-tu faire quand tu seras grand ? » Cette question, posée dès le primaire, génère souvent plus d'anxiété que de clarté. Alors que 85 % des emplois de la prochaine décennie seront profondément transformés par l'intelligence artificielle, chercher à figer un intitulé de métier dans un test QCM n'a plus de sens. Voici comment aider votre enfant à découvrir ce qui l'anime réellement et à muscler les compétences que les machines ne remplaceront pas."
      updated="24 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Test de personnalité pour enfant",
          to: "/guides/test-de-personnalite-enfant-talents",
        },
        {
          label: "Aider son enfant à choisir son métier dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
        {
          label: "Parcoursup et parcours scolaire dédramatisés",
          to: "/guides/choix-parcoursup-parcours-scolaire-enfant",
        },
        {
          label: "Pratique avant théorie à l'ère de l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
      ]}
    >
      <img
        src="/guides/og-test-orientation.jpg"
        alt="Adolescent africain découvrant des maquettes d'architecture et des plans avec un mentor dans un studio moderne"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Pourquoi les questionnaires d'orientation classiques sont obsolètes</h2>
      <p>
        Les tests d'orientation traditionnels reposent sur une logique héritée de l'ère industrielle : faire correspondre des goûts déclarés (<em>« Aimes-tu les animaux ? »</em> $\rightarrow$ Vétérinaire ; <em>« Aimes-tu les calculs ? »</em> $\rightarrow$ Comptable) avec une liste fermée de diplômes.
      </p>
      <p>
        Dans le monde d'aujourd'hui, cette approche pose deux écueils majeurs :
      </p>
      <ul>
        <li>
          <strong>L'obsolescence rapide des tâches répétitives</strong> : Les tâches de calculs purs, de rédaction de base ou de diagnostic standardisé sont désormais assistées par l'IA.
        </li>
        <li>
          <strong>La rigidité des filières</strong> : La valeur d'un futur professionnel ne résidera plus dans la restitution de connaissances mémorisées, mais dans sa capacité à s'adapter, à combiner des disciplines et à créer de la valeur concrète sur le terrain.
        </li>
      </ul>

      <h2>2. Les 4 méta-compétences qui feront la différence</h2>
      <p>
        Au lieu de chercher un nom de métier, aidez votre enfant à développer ces 4 piliers fondamentaux :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Target className="h-5 w-5 text-brand" />
            1. La résolution de problèmes du monde réel
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Être capable de prendre une situation floue (un appareil en panne, une organisation défaillante, un besoin client) et d'élaborer une solution tangible pas à pas.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Compass className="h-5 w-5 text-brand" />
            2. La communication et la force de conviction
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Savoir expliquer une idée clairement, écouter les objections, négocier et donner envie à d'autres de collaborer sur un projet.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Bot className="h-5 w-5 text-brand" />
            3. L'aisance avec l'intelligence artificielle
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Utiliser l'IA non pas pour copier des devoirs, mais comme un copilote pour coder, prototyper, rechercher des données et multiplier par 10 sa productivité.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            4. L'ingéniosité matérielle et spatiale
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Garder un ancrage dans le physique : fabriquer, réparer, mesurer, concevoir des espaces ou des circuits. Le virtuel a toujours besoin du réel.
          </p>
        </div>
      </div>

      <h2>3. L'enquête d'immersion : 3 missions pratiques pour votre collégien</h2>
      <p>
        Pour l'aider à découvrir ce qui le passionne, donnez-lui des missions d'explorateur :
      </p>
      <ol>
        <li>
          <strong>L'interview du professionnel de proximité</strong> : Votre enfant choisit un adulte de son entourage (un mécanicien, un pharmacien, une créatrice de mode, un informaticien) et lui pose 5 questions précises : <em>Quel est le moment le plus difficile de ta journée ? Quel problème aimes-tu le plus résoudre ? Que ferais-tu si tu devais recommencer ?</em>
        </li>
        <li>
          <strong>Le mini-stage d'observation de 2 heures</strong> : L'accompagner sur un lieu de travail pour observer sans juger comment les gens communiquent, organisent leur espace et gèrent les imprévus.
        </li>
        <li>
          <strong>Le projet d'application directe</strong> : Identifier un petit problème à la maison ou dans le quartier et concevoir une solution complète (un système d'arrosage économe, un panneau indicateur, un planning partagé).
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Construire un portfolio de compétences avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio aide votre enfant à documenter chacun de ses projets pratiques sous forme de preuves tangibles. Plus tard, face à une filière sélective ou un recruteur, il n'arrivera pas seulement avec des notes, mais avec un vrai portfolio de réalisations.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Créer le compte de mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/defis-pour-adolescents">
              Voir 12 défis pour adolescents
            </Link>
          </Button>
        </div>
      </div>
    </GuideLayout>
  );
}
export default Route;

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
      "Dès 9-11 ans, uniquement pour éveiller sa curiosité sur le monde qui l'entoure. Au collège, le but n'est pas de figer un choix, mais d'expérimenter sans pression.",
  },
  {
    question: "Les tests de métiers gratuits pour collégiens sont-ils efficaces ?",
    answer:
      "Leur utilité reste superficielle car ils s'appuient sur des nomenclatures d'hier. Face aux mutations technologiques accélérées, les frontières professionnelles bougent chaque année. Mieux vaut cultiver l'agilité intellectuelle, la clarté d'expression et la capacité d'apprentissage continu que d'enfermer un jeune dans une étiquette de poste rigide.",
  },
  {
    question: "Que faire si mon enfant dit qu'il n'aime rien ou n'a pas de passion ?",
    answer:
      "C'est normal. L'intérêt ne précède pas toujours l'action : il naît souvent du sentiment d'efficacité quand on fabrique, répare ou organise un projet concret.",
  },
  {
    question: "Quelles compétences protègent le mieux face à l'intelligence artificielle ?",
    answer:
      "L'esprit critique, la dextérité manuelle appliquée et l'empathie relationnelle. Les métiers combinant conception pratique, médiation humaine et diagnostic de terrain résisteront bien mieux que les tâches répétitives d'analyse de données ou de rédaction formelle.",
  },
  {
    question: "Mon ado rêve d'être influenceur ou streamer : comment lui répondre sans conflit ?",
    answer:
      "Prenez son envie au mot en la transformant en laboratoire de compétences : écriture d'un synopsis, cadrage d'une vidéo, respect du droit à l'image et gestion du son. En passant du statut de spectateur passif à celui de créateur rigoureux, il mesure le travail réel que réclame chaque production sans ressentir de rejet.",
  },
  {
    question: "Comment accompagner son collégien pour dénicher un stage de 3ème pertinent ?",
    answer:
      "Aidez-le à lister cinq domaines qui piquent sa curiosité, même modestes (artisanat, commerce local, laboratoire de recherche). Incitez-le à décrocher son téléphone ou à se déplacer avec une lettre personnalisée : cette démarche directe forge l'assurance bien plus que des dizaines de candidatures automatiques sans contact humain.",
  },
];

export const Route = createFileRoute("/guides/test-orientation-metier-enfant-futur")({
  head: () => {
    const meta = pageMeta({
      title: "Test d'orientation collégien : Choisir son métier face à l'IA",
      description:
        "Avant de faire passer un test d'orientation à votre collégien, comprenez pourquoi les métiers de demain valorisent les compétences d'adaptation.",
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
            { name: "Test d'orientation et métier futur", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Test d'orientation et de métier : comment savoir ce qui anime vraiment votre enfant",
            description:
              "Pourquoi les tests d'orientation pour collégiens sont obsolètes et comment cultiver les compétences pérennes face aux transformations du travail.",
            path: PATH,
            image: "/guides/og-test-orientation.jpg",
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
      eyebrow="Orientation & Avenir"
      title="Test d'orientation et de métier : comment savoir ce qui anime vraiment votre enfant"
      intro="« Que veux-tu faire quand tu seras grand ? » Cette question, posée dès le primaire, génère souvent plus d'anxiété que de clarté. Alors que 85 % des emplois futurs seront transformés par les nouvelles technologies, figer un intitulé de métier dans un QCM n'a plus de sens. Aidez plutôt votre enfant à cerner ses forces motrices et à muscler les aptitudes que les algorithmes ne remplaceront pas."
      updated="27 août 2026"
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
        {
          label: "12 défis pour adolescents",
          to: "/guides/defis-pour-adolescents",
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
        Les tests d'orientation traditionnels reposent sur une logique héritée du siècle dernier : faire correspondre des réponses déclaratives à des catégories figées (comme le montre notre analyse critique sur les{" "}
        <a href="/guides/test-de-personnalite-enfant-talents">limites des tests de personnalité pour enfants</a>).
      </p>
      <p>
        Dans le monde professionnel contemporain, la priorité n'est pas le titre d'un poste, mais la capacité à résoudre des problèmes concrets et à mobiliser ses{" "}
        <a href="/guides/intelligences-multiples-gardner">formes d'intelligence dominantes</a>.
      </p>

      <h2>2. Les 4 méta-compétences qui feront la différence</h2>
      <p>
        Au lieu de chercher un nom de métier, aidez votre enfant à développer ces 4 piliers fondamentaux :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Target className="h-5 w-5 text-brand" />
            1. La résolution de problèmes réels
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Être capable de prendre une situation floue et d'élaborer une solution concrète (comme illustré dans notre guide{" "}
            <a href="/guides/pratique-avant-theorie-apprentissage-ia">la pratique avant la théorie face à l'IA</a>).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Compass className="h-5 w-5 text-brand" />
            2. La communication et force de conviction
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Savoir expliquer une idée clairement, négocier et fédérer autour d'un projet commun.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Bot className="h-5 w-5 text-brand" />
            3. L'aisance avec l'intelligence artificielle
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Utiliser l'IA comme un copilote pour prototyper et décupler sa créativité (voir notre dossier{" "}
            <a href="/guides/ia-apprentissage-enfant">l'IA pour aider son enfant à apprendre</a>).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            4. L'ingéniosité matérielle et manuelle
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Garder un ancrage dans le physique : fabriquer, réparer, concevoir des espaces.
          </p>
        </div>
      </div>

      <h2>3. L'enquête d'immersion : 3 missions pratiques pour collégiens</h2>
      <p>
        Pour l'aider à découvrir ce qui le passionne, donnez-lui des missions d'explorateur issues de nos enquêtes pour{" "}
        <a href="/guides/orientation-scolaire-metiers-avenir">aider son enfant à choisir son métier dès 10 ans</a> :
      </p>
      <ol className="space-y-4 my-6">
        <li>
          <strong>L'interview d'un professionnel de proximité :</strong> Choisir un artisan, médecin ou ingénieur et lui poser 5 questions concrètes sur son quotidien et ses défis.
        </li>
        <li>
          <strong>Le mini-stage d'observation de 2 heures :</strong> Observer la réalité d'un atelier, d'un commerce ou d'un laboratoire.
        </li>
        <li>
          <strong>Le projet d'application directe :</strong> Réaliser l'un de nos{" "}
          <a href="/guides/defis-pour-adolescents">12 défis pratiques pour adolescents</a> pour tester sa persévérance et sa créativité.
        </li>
      </ol>

      <h2>Anticiper les filières sans angoisse</h2>
      <p>
        Que ce soit pour le choix de spécialités au lycée ou pour préparer sereinement l'après-bac, consultez également nos conseils pour{" "}
        <a href="/guides/choix-parcoursup-parcours-scolaire-enfant">dédramatiser Parcoursup et le parcours scolaire</a>.
      </p>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Construire un portfolio de compétences avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio aide votre enfant à documenter chacun de ses projets pratiques sous forme de preuves tangibles. Plus tard, face à une filière sélective ou un recruteur, il n'arrivera pas seulement avec des notes, mais avec un vrai portfolio de réalisations.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all">
            <Link to="/auth">
              Créer le compte de mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all">
            <Link to="/guides/defis-pour-adolescents">
              Voir 12 défis pour adolescents
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

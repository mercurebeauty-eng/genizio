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
import { ArrowRight, Eye, Cpu, Zap, HeartHandshake, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/autisme-tdah-apprentissage-forces-reelles";

const FAQ = [
  {
    question: "Comment un enfant avec autisme ou TDAH apprend-il le plus efficacement ?",
    answer:
      "Les enfants neuroatypiques (sur le spectre de l'autisme, avec TDAH ou DYS) traitent l'information de manière préférentiellement visuelle, spatiale et kinesthésique (en manipulant la matière). Ils ont besoin de comprendre 'à quoi ça sert dans le réel' avant d'accepter une théorie abstraite, et s'épanouissent dans des consignes séquencées et des environnements prévisibles.",
  },
  {
    question: "L'école classique est-elle adaptée aux profils neuroatypiques ?",
    answer:
      "Le modèle traditionnel de cours magistral (rester assis 6 heures à écouter un flux verbal continu) met ces enfants en surcharge sensorielle et cognitive. Ce n'est pas un manque d'intelligence, mais un décalage de méthode. Dès qu'on leur permet d'apprendre par le projet, l'expérimentation visuelle ou le défi pratique, leur potentiel se libère de façon spectaculaire.",
  },
  {
    question: "Comment canaliser l'hyperfocalisation d'un enfant atypique ?",
    answer:
      "L'hyperfocalisation (la capacité à se plonger pendant des heures dans un sujet passionnant) est un super-pouvoir si on sait l'accueillir. Utilisez ses centres d'intérêt spécifiques (les trains, les circuits, les animaux, les étoiles) comme passerelle pour aborder les mathématiques, la lecture ou la géographie.",
  },
];

export const Route = createFileRoute("/guides/autisme-tdah-apprentissage-forces-reelles")({
  head: () => {
    const meta = pageMeta({
      title: "Autisme, TDAH et pensée visuelle : pourquoi apprendre par le réel est une force",
      description:
        "Profils atypiques, autisme et TDAH : découvrez comment leur façon d'apprendre par le réel, l'image et l'action concrète surpasse les limites de l'école classique.",
      path: PATH,
      image: "/guides/og-neurodiversite.jpg",
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
            { name: "Autisme, TDAH & Neurodiversité", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Autisme, TDAH et pensée visuelle : pourquoi leur façon d'apprendre par le réel est une force majeure",
            description:
              "Analyse pédagogique des forces des enfants neuroatypiques et comment la pédagogie par l'action concrète transforme leurs difficultés scolaires en talents réels.",
            path: PATH,
            image: "/guides/og-neurodiversite.jpg",
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
      eyebrow="Neurodiversité & Apprentissage"
      title="Autisme, TDAH et pensée visuelle : pourquoi leur façon d'apprendre par le réel est une force majeure"
      intro="Quand un enfant autiste ou atteint de TDAH peine à suivre une leçon magistrale en classe, on qualifie trop vite sa différence de 'handicap d'apprentissage'. Pourtant, l'histoire des plus grands innovateurs — de Temple Grandin aux pionniers de l'informatique — prouve que la pensée visuelle, le souci du détail et le besoin d'expérimentation concrète sont des moteurs de génie exceptionnels. Voici comment transformer ce fonctionnement singulier en une immense force."
      updated="24 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Enfant agité ou hyperactif : l'aider à se concentrer",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Haut potentiel : les vrais signes à observer",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Gérer la colère et les émotions de son enfant",
          to: "/guides/gestion-colere-emotions-enfant",
        },
        {
          label: "Pratique avant théorie à l'ère de l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
      ]}
    >
      <img
        src="/guides/og-neurodiversite.jpg"
        alt="Enfant africain neurodivergent concentré avec passion sur l'assemblage de structures mécaniques colorées"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <div className="my-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-ink/90">
        <div className="flex items-center gap-2 font-semibold text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Avertissement éducatif
        </div>
        <p className="mt-1">
          Ce guide propose un éclairage pédagogique pour accompagner l'apprentissage à la maison. Il ne remplace pas le diagnostic ni le suivi par des professionnels de santé (pédopsychiatre, neuropédiatre, orthophoniste, psychomotricien).
        </p>
      </div>

      <h2>1. La pensée en images et le besoin d'ancrage dans la matière</h2>
      <p>
        Pour un enfant à profil neuroatypique, les mots abstraits flottant dans l'air pendant 45 minutes sont difficiles à fixer. Son cerveau fonctionne en <strong>pensée spatiale, visuelle ou systémique</strong> :
      </p>
      <ul>
        <li>Il a besoin de voir la structure globale avant les détails.</li>
        <li>Il comprend une règle de physique ou de grammaire instantanément lorsqu'il peut la manipuler (blocs de couleurs, cartes logiques, maquettes).</li>
        <li>La confrontation directe avec des objets réels (engrenages, codes informatiques, instruments) dissipe l'anxiété et active une concentration absolue.</li>
      </ul>

      <h2>2. Les 3 super-pouvoirs des profils atypiques</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Cpu className="h-5 w-5 text-brand" />
            1. L'Hyperfocalisation
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Une capacité hors du commun à explorer un sujet jusqu'à son niveau d'expertise le plus pointu (la programmation, la botanique, la mécanique, l'astronomie).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Eye className="h-5 w-5 text-brand" />
            2. La Détection des Anomalies
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un œil ultra aiguisé pour repérer ce qui cloche dans un système, une incohérence logique ou une pièce mal emboîtée que les autres ne remarquent pas.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Zap className="h-5 w-5 text-brand" />
            3. L'Authenticité Radicale
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Une loyauté sincère aux faits et à la vérité, sans faux-semblants sociaux, précieuse dans la recherche scientifique et la création originale.
          </p>
        </div>
      </div>

      <h2>3. 4 principes pour adapter les apprentissages à la maison</h2>
      <ol>
        <li><strong>Rendre chaque consigne visuelle</strong> : Remplacer les longs discours par un schéma, une liste à cocher ou des pictogrammes clairs.</li>
        <li><strong>Utiliser ses centres d'intérêt spécifiques</strong> : Si votre enfant est passionné par les bus ou les dinosaures, créez des problèmes de mathématiques ou des textes de lecture autour de ces thèmes.</li>
        <li><strong>Alterner effort et décharge motrice</strong> : Permettre à l'enfant de bouger, de manipuler une balle anti-stress ou de travailler debout s'il en ressent le besoin.</li>
        <li><strong>Célébrer la finitude des tâches</strong> : Donner des objectifs avec un début et une fin très visibles (<em>« Dès que ces 5 pièces sont assemblées, c'est terminé »</em>).</li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Génizio : un environnement pensé pour chaque profil d'intelligence
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio respecte le rythme et la modalité d'apprentissage unique de votre enfant. Grâce à <strong>Naya</strong>, les défis sont personnalisés selon ses centres d'intérêt réels et ses talents dominants.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Personnaliser le parcours de mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/enfant-agite-concentration">
              Conseils concentration & TDAH
            </Link>
          </Button>
        </div>
      </div>
    </GuideLayout>
  );
}
export default Route;

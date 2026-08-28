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
      title: "Autisme & TDAH : Leurs atouts uniques d'apprentissage",
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
      eyebrow="Neurodiversité & Apprentissage"
      title="Autisme, TDAH et pensée visuelle : pourquoi leur façon d'apprendre par le réel est une force majeure"
      intro="Quand un enfant autiste ou avec un TDAH peine à suivre une leçon magistrale en classe, on qualifie trop vite sa différence de 'difficulté scolaire'. Pourtant, l'histoire des plus grands innovateurs — de Temple Grandin aux pionniers des sciences — prouve que la pensée visuelle, le souci du détail et le besoin d'expérimentation concrète sont des moteurs de génie exceptionnels. Voici comment valoriser ce fonctionnement singulier."
      updated="26 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Enfant agité ou inattentif : l'aider",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Gérer la colère et émotions",
          to: "/guides/gestion-colere-emotions-enfant",
        },
        {
          label: "Pratique avant théorie",
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
        Pour un enfant à profil neuroatypique, les cours purement magistraux assis pendant 6 heures génèrent une surcharge cognitive et sensorielle rapide. Son cerveau s'épanouit dans la <strong>pensée spatiale, visuelle et kinesthésique</strong> (telle que décrite dans la{" "}
        <a href="/guides/intelligences-multiples-gardner">théorie des 9 intelligences de Gardner</a>) :
      </p>
      <ul>
        <li>Il a besoin de voir la structure globale avant les détails.</li>
        <li>Il comprend une règle de physique ou de mathématiques instantanément lorsqu'il peut la manipuler via des{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles et d'ingénierie concrète</a>.
        </li>
        <li>La confrontation directe avec des objets réels (mécanique, programmation, puzzles 3D) dissipe l'anxiété et active une concentration absolue (découvrez nos méthodes pour un{" "}
          <a href="/guides/enfant-agite-concentration">enfant inattentif ou hyperactif</a>).
        </li>
      </ul>

      <h2>2. Les 3 super-pouvoirs des profils atypiques</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Cpu className="h-5 w-5 text-brand" />
            1. L'Hyperfocalisation
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Une capacité hors du commun à explorer un sujet jusqu'à un degré d'expertise remarquable (robotique, dessin technique, astronomie, botanique).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Eye className="h-5 w-5 text-brand" />
            2. La Détection des Anomalies
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Un œil ultra aiguisé pour repérer les failles logiques, les détails invisibles pour les autres ou les pièces mal ajustées.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Zap className="h-5 w-5 text-brand" />
            3. L'Authenticité Radicale
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Une grande loyauté aux faits et à la logique pure, exempte de faux-semblants, qui forge de grands esprits scientifiques et créatifs.
          </p>
        </div>
      </div>

      <h2>3. 4 principes pour adapter les apprentissages à la maison</h2>
      <ol className="space-y-3 my-6">
        <li>
          <strong>Rendre chaque consigne visuelle :</strong> Remplacer les longs discours par un schéma, une liste à cocher ou des pictogrammes clairs.
        </li>
        <li>
          <strong>Utiliser ses centres d'intérêt spécifiques :</strong> S'il est passionné par les circuits électriques ou les animaux, faites-en la passerelle d'accès vers les maths et la lecture (consultez notre principe de{" "}
          <a href="/guides/pratique-avant-theorie-apprentissage-ia">la pratique avant la théorie</a>).
        </li>
        <li>
          <strong>Réguler les surcharges sensorielles :</strong> Les crises sont souvent causées par un trop-plein sensoriel ou une incompréhension : appliquez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils d'apaisement émotionnel</a>.
        </li>
        <li>
          <strong>Identifier une éventuelle double exceptionnalité :</strong> De nombreux enfants TDAH ou autistes présentent aussi un haut potentiel intellectuel (consultez notre guide sur les{" "}
          <a href="/guides/potentiel-haut-potentiel-enfant">signes du haut potentiel HPI</a>).
        </li>
      </ol>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Génizio : un environnement pensé pour chaque profil d'intelligence
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio respecte le rythme et la modalité d'apprentissage unique de votre enfant. Grâce à <strong>Naya</strong>, les défis sont personnalisés selon ses centres d'intérêt réels et ses talents dominants sans jamais l'enfermer dans un diagnostic réducteur.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all">
            <Link to="/auth">
              Personnaliser le parcours de mon enfant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all">
            <Link to="/guides/enfant-agite-concentration">
              Conseils concentration & TDAH
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

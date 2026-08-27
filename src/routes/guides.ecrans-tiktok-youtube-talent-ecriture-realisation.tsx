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
import { ArrowRight, Video, PenTool, Clapperboard, Lightbulb } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/ecrans-tiktok-youtube-talent-ecriture-realisation";

const FAQ = [
  {
    question: "Comment réagir si mon enfant ou adolescent dit qu'il veut devenir 'Youtubeur' ou 'streameur' ?",
    answer:
      "Ne rejetez pas ce souhait avec mépris. Dites-lui : 'C'est formidable, mais un bon créateur n'improvise pas devant une caméra : c'est d'abord un excellent scénariste, un cadreur et un monteur. Si tu veux créer du contenu, prouvons-le par un projet complet : écris d'abord le script, fais le storyboard et filme un mini-documentaire familial sans diffuser ton visage sur Internet.'",
  },
  {
    question: "Faut-il interdire totalement TikTok et YouTube pour protéger son enfant ?",
    answer:
      "L'interdiction totale à l'adolescence crée souvent des contournements secrets et empêche l'apprentissage de l'autodiscipline. La méthode la plus durable consiste à cadrer les horaires (pas d'écran dans la chambre après 20h) et surtout à changer sa posture : passer de 'consommateur passif sous hypnose' à 'créateur critique qui comprend la mécanique des algorithmes'.",
  },
  {
    question: "Quelles compétences réelles la création vidéo développe-t-elle ?",
    answer:
      "La réalisation d'une vidéo courte de qualité mobilise des compétences académiques majeures : la synthèse et la rédaction (scénario), la diction et l'assurance orale (face caméra), la géométrie et la lumière (cadrage), le rythme et la rigueur technique (montage audio/vidéo).",
  },
];

export const Route = createFileRoute("/guides/ecrans-tiktok-youtube-talent-ecriture-realisation")({
  head: () => {
    const meta = pageMeta({
      title: "Écrans & Enfants : Devenir créateur plutôt que spectateur",
      description:
        "Votre enfant passe des heures sur TikTok ? Découvrez comment transformer cette consommation passive en un véritable apprentissage de la réalisation vidéo.",
      path: PATH,
      image: "/guides/og-tiktok-realisation.jpg",
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
            { name: "Écrans & Création vidéo", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Votre enfant passe des heures sur TikTok ou YouTube ? Transformez son écran en talent d'écriture et de réalisation",
            description:
              "Comment passer d'une consommation passive des écrans à une démarche active en apprenant à son enfant les bases du montage, du script et de la réalisation.",
            path: PATH,
            image: "/guides/og-tiktok-realisation.jpg",
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
      eyebrow="Écrans & Numérique"
      title="Votre enfant passe des heures sur TikTok ou YouTube ? Transformez son écran en talent d'écriture et de réalisation"
      intro="La bataille des écrans est le premier sujet de conflit dans les familles. Couper le Wi-Fi, confisquer le smartphone, limiter arbitrairement le temps... Ces réactions d'urgence s'essoufflent vite. Et si, plutôt que d'interdire, vous changiez la posture de votre enfant : passer de simple consommateur passif à créateur exigeant ?"
      updated="27 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "Sevrage écrans sans crise",
          to: "/guides/ecrans-addiction-alternatives-enfant",
        },
        {
          label: "12 défis pour adolescents",
          to: "/guides/defis-pour-adolescents",
        },
        {
          label: "Libérer l'aisance orale",
          to: "/guides/timidite-confiance-prise-de-parole",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "24 activités sans écran",
          to: "/guides/activites-educatives-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-tiktok-realisation.jpg"
        alt="Adolescent africain concentré dessinant un storyboard de film avec un smartphone sur trépied à son bureau"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Pourquoi l'interdiction frontale ne fonctionne plus</h2>
      <p>
        Les algorithmes des plateformes vidéo captent puissamment l'attention des jeunes. Plutôt que de subir ce piège (découvrez notre méthode de{" "}
        <a href="/guides/ecrans-addiction-alternatives-enfant">sevrage progressif des écrans chez l'enfant</a>), apprendre à déconstruire les mécanismes de la vidéo permet à l'adolescent de développer son esprit critique.
      </p>
      <p>
        La réalisation vidéo sollicite simultanément plusieurs{" "}
        <a href="/guides/intelligences-multiples-gardner">formes d'intelligences de Gardner</a> : l'intelligence linguistique (écriture de script), spatiale (cadrage et lumière) et musicale (rythme et montage sonore).
      </p>

      <h2>2. Le protocole du « Studio Familial » : 3 étapes de création</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <PenTool className="h-5 w-5 text-brand" />
            Étape 1 : Le Script écrit
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Avant d'allumer la caméra, l'enfant écrit un texte de 150 mots avec une accroche percutante et une conclusion claire.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Clapperboard className="h-5 w-5 text-brand" />
            Étape 2 : Le Storyboard
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Dessiner 6 cases pour définir les angles de vue et la mise en scène.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Video className="h-5 w-5 text-brand" />
            Étape 3 : Le Tournage & Montage
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Filmer un documentaire familial et monter les séquences avec rigueur. Un travail de diction idéal pour{" "}
            <a href="/guides/timidite-confiance-prise-de-parole">développer la confiance orale</a>.
          </p>
        </div>
      </div>

      <h2>3. Les règles d'or d'un projet créatif réussi</h2>
      <ul>
        <li>
          <strong>La projection en salon privé :</strong> Le projet est projeté devant la famille lors d'un goûter convivial (à combiner avec nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives à la maison</a>), sans pression d'exposition sur les réseaux publics.
        </li>
        <li>
          <strong>Relever de vrais challenges :</strong> Intégrez cette activité dans nos{" "}
          <a href="/guides/defis-pour-adolescents">12 défis stimulants pour adolescents</a> (reportage de quartier, micro-interview).
        </li>
      </ul>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Développer les compétences du futur avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio canalise l'énergie créative des jeunes à travers des missions captivantes d'écriture, de communication et de projets réels. <strong>Naya</strong> accompagne chaque étape pour transformer leur curiosité en talents solides.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Lancer un défi de création
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/ecrans-addiction-alternatives-enfant">
              Méthode sevrage écrans sans crise
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

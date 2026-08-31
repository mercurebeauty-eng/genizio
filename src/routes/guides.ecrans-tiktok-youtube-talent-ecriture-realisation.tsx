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
    question: "Comment réagir si mon enfant veut devenir 'Youtubeur' ?",
    answer:
      "Rappelez-lui qu'un créateur est avant tout un scénariste. Proposez-lui de réaliser un documentaire de famille sans diffuser son visage en ligne.",
  },
  {
    question: "Faut-il interdire totalement TikTok et YouTube pour protéger son enfant ?",
    answer:
      "L'interdiction brute favorise les contournements secrets. Cadrez plutôt les horaires (aucun écran en chambre après 20h) et développez son esprit critique en décortiquant avec lui pourquoi les algorithmes cherchent à retenir son attention en continu.",
  },
  {
    question: "Quelles compétences réelles la création vidéo développe-t-elle ?",
    answer:
      "L'écriture de scénario structure la pensée, le cadrage affine le sens spatial et le montage forge la rigueur.",
  },
];

export const Route = createFileRoute("/guides/ecrans-tiktok-youtube-talent-ecriture-realisation")({
  head: () => {
    const meta = pageMeta({
      title: "Écrans & Enfants : Devenir créateur plutôt que spectateur",
      description:
        "Votre enfant passe des heures sur TikTok ? Voyez comment transformer cette consommation passive en un apprentissage de la réalisation vidéo.",
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
      intro="Chaque soir, la bataille des écrans cristallise les tensions familiales. Couper le Wi-Fi ou confisquer le téléphone règle rarement le fond du problème. Et si, plutôt que d'interdire sans cesse, vous changiez sa posture : passer de simple consommateur passif à créateur exigeant ?"
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
        Les plateformes de flux continu captent l'attention par le défilement infini. Plutôt que de subir ce mécanisme (voir notre méthode de{" "}
        <a href="/guides/ecrans-addiction-alternatives-enfant">sevrage progressif des écrans chez l'enfant</a>), apprendre à fabriquer une vidéo développe l'esprit critique du jeune.
      </p>
      <p>
        Filmer et monter une courte séquence sollicite plusieurs{" "}
        <a href="/guides/intelligences-multiples-gardner">formes d'intelligences de Gardner</a> : l'écriture de script (linguistique), le cadrage (spatial) et le montage sonore (rythmique).
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

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Développer les compétences du futur avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio canalise l'énergie créative des jeunes à travers des missions concrètes d'écriture, de communication et de projets réels. <strong>Naya</strong> accompagne chaque étape pour transformer leur curiosité en compétences solides.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all">
            <Link to="/auth">
              Lancer un défi de création
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all">
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

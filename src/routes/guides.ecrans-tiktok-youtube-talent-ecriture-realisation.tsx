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
      title: "Enfant accro à TikTok ou YouTube ? Le transformer en créateur et scénariste",
      description:
        "Votre enfant passe des heures sur les vidéos ou veut devenir youtubeur ? Découvrez comment transformer son temps d'écran en compétences d'écriture et de réalisation.",
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
            { name: "Écrans, TikTok & Réalisation", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Votre enfant passe des heures sur TikTok ou YouTube ? Transformez son écran en talent d'écriture et de réalisation",
            description:
              "Méthode concrète pour canaliser la passion des écrans chez les enfants et adolescents vers l'écriture de scénarios, le storyboard et la réalisation vidéo familiale.",
            path: PATH,
            image: "/guides/og-tiktok-realisation.jpg",
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
      eyebrow="Écrans & Créativité"
      title="Votre enfant passe des heures sur TikTok ou YouTube ? Transformez son écran en talent d'écriture et de réalisation"
      intro="Voir son enfant ou son adolescent scroller passivement pendant des heures sur des vidéos courtes est l'une des plus grandes angoisses parentales d'aujourd'hui. Les disputes éclatent, les téléphones sont confisqués, mais la dynamique de fond ne change pas. Pourtant, l'attrait pour la vidéo cache une passion pour la narration et l'image. Voici comment faire basculer votre enfant du rôle de consommateur passif à celui de créateur exigeant."
      updated="24 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Mon enfant est accro aux écrans : sevrage en douceur",
          to: "/guides/ecrans-addiction-alternatives-enfant",
        },
        {
          label: "Motiver un adolescent : 12 défis qui marchent",
          to: "/guides/defis-pour-adolescents",
        },
        {
          label: "Enfant timide : libérer l'assurance orale",
          to: "/guides/timidite-confiance-prise-de-parole",
        },
        {
          label: "ChatGPT et l'IA pour les devoirs",
          to: "/guides/ia-apprentissage-enfant",
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
        Les algorithmes des plateformes vidéo sont conçus par des centaines d'ingénieurs pour capter la dopamine de notre cerveau. Blâmer un jeune de 13 ans parce qu'il a du mal à s'arrêter revient à lui demander de résister seul à une machine de captation sophistiquée.
      </p>
      <p>
        En revanche, lorsqu'on lui apprend <strong>comment ces vidéos sont fabriquées</strong>, le charme s'estompe : il commence à analyser les ficelles narratives, les coupes au montage et les accroches émotionnelles avec un œil critique.
      </p>

      <h2>2. Le protocole du « Studio Familial » : 3 étapes de création</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <PenTool className="h-5 w-5 text-brand" />
            Étape 1 : Le Script sur Papier (Interdit d'allumer la caméra)
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Avant de toucher un smartphone, il doit rédiger un texte structuré de 150 mots avec une accroche (les 3 premières secondes), un développement clair et une chute percutante.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Clapperboard className="h-5 w-5 text-brand" />
            Étape 2 : Le Storyboard Dessiné
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Dessiner 6 cases simples représentant les plans de caméra : plan large, gros plan sur un détail, contre-plongée. Cela muscle sa vision spatiale et son sens du cadrage.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Video className="h-5 w-5 text-brand" />
            Étape 3 : Le Tournage & Montage (Projet Privé)
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Filmer un documentaire familial (l'histoire des grands-parents, la préparation d'un plat traditionnel, la vie du chat) et monter les plans avec une musique libre de droits.
          </p>
        </div>
      </div>

      <h2>3. Les règles d'or de la protection et de la valorisation</h2>
      <ul>
        <li><strong>Règle du circuit fermé</strong> : Le film est destiné à être projeté dans le salon devant la famille réunie, pas diffusé publiquement sur les réseaux sociaux. Cela élimine la course toxique aux « likes ».</li>
        <li><strong>Débriefing comme au cinéma</strong> : Après la projection, félicitez le travail d'écriture, le son et le rythme. Demandez-lui : <em>« Si tu devais refaire ce plan, comment améliorerais-tu la lumière ? »</em></li>
        <li><strong>Le grand basculement</strong> : Dès qu'il a goûté à la complexité de fabriquer 1 minute de vidéo propre, il ne regarde plus jamais YouTube de la même manière passive.</li>
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
    </GuideLayout>
  );
}
export default Route;

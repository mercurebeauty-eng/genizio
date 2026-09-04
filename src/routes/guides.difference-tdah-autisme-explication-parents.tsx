import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
} from "@/lib/seo";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  Zap,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/difference-tdah-autisme-explication-parents";

const FAQ = [
  {
    question: "Un enfant peut-il être à la fois autiste et présenter un TDAH ?",
    answer:
      "Oui. Cette double condition porte le nom d'AuDHD. Longtemps jugée impossible par les classifications médicales officielles, la recherche estime désormais que 30 à 50 % des profils autistes vivent également avec un TDAH. Le quotidien oscille alors entre un besoin viscéral de stabilité et une soif impulsive de nouveauté qui torpille ses propres repères.",
  },
  {
    question: "L'hyperfocalisation existe-t-elle dans les deux profils ?",
    answer:
      "Oui, mais son carburant neurologique change. Chez le TDAH, l'hyperfocus jaillit sous l'effet d'une forte décharge de dopamine (jeu vidéo prenant, urgence absolue). Chez le profil autiste, l'intérêt spécifique demeure constant, méthodique, et sert de refuge sécurisant face au désordre environnant.",
  },
  {
    question: "Le TDAH fait-il partie intégrante du spectre de l'autisme ?",
    answer:
      "Non. Ce sont deux conditions distinctes réunies sous la bannière des troubles du neurodéveloppement (TND). Leurs câblages cérébraux diffèrent, même si leurs conséquences visibles se confondent en classe.",
  },
];

export const Route = createFileRoute(
  "/guides/difference-tdah-autisme-explication-parents",
)({
  head: () => {
    const meta = pageMeta({
      title: "TDAH et autisme : les principales différences | Génizio",
      description:
        "Attention, routines, interactions sociales et hypersensibilité : découvrez les vraies différences entre TDAH et autisme, et que faire en cas de cumul.",
      path: PATH,
      image: "/guides/og-difference-tdah-autisme.jpg",
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
            { name: "TDAH et Autisme : les différences", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "TDAH et autisme : explication des principales différences et repères pour les parents",
            description:
              "Attention, routines, interactions sociales et hypersensibilité : découvrez les vraies différences entre TDAH et autisme, et que faire en cas de cumul.",
            path: PATH,
            image: "/guides/og-difference-tdah-autisme.jpg",
            datePublished: "2026-09-04",
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
      eyebrow="Neurodiversité & Parentalité"
      title="TDAH et autisme : explication des principales différences et repères pour les parents"
      intro="Agitation en classe, décalage avec les camarades, tempêtes émotionnelles inattendues : de l'extérieur, TDAH et autisme se ressemblent à s'y méprendre. Beaucoup de familles errent des mois entre plusieurs avis contradictoires. Pourtant, sous la surface des comportements, les moteurs neurologiques n'ont rien à voir. Décryptons leurs mécanismes pour offrir à votre enfant les repères adaptés à son fonctionnement singulier."
      updated="4 septembre 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Pensée visuelle et apprentissage par le réel",
          to: "/guides/autisme-tdah-apprentissage-forces-reelles",
        },
        {
          label: "Aider un enfant agité à se concentrer",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Apaiser les tempêtes émotionnelles",
          to: "/guides/gestion-colere-emotions-enfant",
        },
        {
          label: "Réussir l'entrée en 6ème sans stress",
          to: "/guides/reussir-entree-en-6eme-conseils-parents",
        },
        {
          label: "Les 9 formes d'intelligence de Gardner",
          to: "/guides/intelligences-multiples-gardner",
        },
      ]}
    >
      <img
        src="/guides/og-difference-tdah-autisme.jpg"
        alt="Deux enfants explorant des jeux sensoriels et puzzles géométriques dans un espace d'apprentissage apaisant"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Pourquoi TDAH et autisme sont si souvent confondus</h2>
      <p>
        Un enfant qui refuse d'écouter, coupe la parole et panique devant un imprévu : est-il distrait ou hypersensible ? En consultation, le doute est fréquent. Jusqu'en 2013, le manuel de référence des psychiatres (DSM-4) interdisait même de poser les deux diagnostics chez une même personne. On choisissait l'un ou l'autre, laissant des milliers d'enfants avec un tableau clinique incomplet.
      </p>
      <p>
        Tous deux relèvent de la grande famille des <strong>Troubles du Neurodéveloppement (TND)</strong>. Ils partagent des défis exécutifs communs : difficultés à planifier, mémoire de travail saturée et régulation des impulsions délicate.
      </p>
      <p>
        La ressemblance s'arrête là. Les intentions profondes diffèrent du tout au tout. L'enfant TDAH fuit l'ennui cérébral causé par un manque de dopamine ; l'enfant autiste cherche d'abord à se protéger contre un environnement sensoriel trop violent ou imprévisible.
      </p>

      <h2>2. Le grand tableau différentiel : 5 dimensions clés au quotidien</h2>
      <p>
        Pour dépasser les étiquettes abstraites, observez comment ces deux manières d'être au monde s'expriment dans les situations concrètes du foyer :
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse rounded-2xl border border-ink/10 bg-white text-left text-sm shadow-sm">
          <thead className="border-b border-ink/10 bg-surface text-ink">
            <tr>
              <th className="p-4 font-bold">Axe d'observation</th>
              <th className="p-4 font-bold">Profil TDAH</th>
              <th className="p-4 font-bold">Profil Autiste (TSA sans déficience)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 text-ink/80">
            <tr>
              <td className="p-4 font-semibold text-ink">1. Mécanisme de l'attention</td>
              <td className="p-4">
                <strong>Attention fluctuante :</strong> Filtre sélectif poreux. Distrait par le moindre bruit sauf s'il est stimulé par un intérêt intense (hyperfocus court et passionné).
              </td>
              <td className="p-4">
                <strong>Attention hyper-focalisée :</strong> Concentration spontanée sur des sujets spécifiques. Difficulté majeure à déplacer son focus d'une tâche à l'autre sans transition préparée.
              </td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">2. Rapport aux routines</td>
              <td className="p-4">
                <strong>Rejet de la monotonie :</strong> La répétition l'éteint. Il adore les changements de programme impromptus qui relancent sa vivacité mentale.
              </td>
              <td className="p-4">
                <strong>Besoin vital de prévisibilité :</strong> La routine abaisse son anxiété. Une modification d'horaire ou de trajet non anticipée déclenche un effondrement (*meltdown*).
              </td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">3. Interactions sociales</td>
              <td className="p-4">
                <strong>Difficultés par impulsivité :</strong> Veut s'intégrer, mais coupe la parole, envahit l'espace des autres ou monopolise le jeu par enthousiasme débordant.
              </td>
              <td className="p-4">
                <strong>Difficultés de décodage intuitif :</strong> Peine à lire le second degré, les regards ou les codes non écrits. Épuisé par les petits bavardages de cour de récréation.
              </td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">4. Sensorialité</td>
              <td className="p-4">
                <strong>Recherche de stimulation :</strong> Aime le mouvement, tripote des objets, met de la musique pour se concentrer (*sensory seeker*).
              </td>
              <td className="p-4">
                <strong>Évitement de la surcharge :</strong> Souvent agressé par les néons clignotants, le brouhaha de la cantine ou l'étiquette rugueuse d'un vêtement (*sensory avoider*).
              </td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">5. Motricité & Apaisement</td>
              <td className="p-4">
                <strong>Bougeotte motrice globale :</strong> Jambe qui sautille, besoin de se lever, corps en tension pour maintenir son cerveau éveillé.
              </td>
              <td className="p-4">
                <strong>Mouvements d'autorégulation (*stimming*) :</strong> Battements de mains, balancements rythmés, alignements d'objets pour faire baisser une surcharge émotionnelle.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Le paradoxe de l'AuDHD : quand l'enfant cumule les deux profils</h2>
      <p>
        Imaginez un capitaine qui exige un itinéraire nautique rigoureusement tracé sur la carte, associé à un second de bord qui arrache le gouvernail au premier coup de vent pour explorer une île inconnue.
      </p>
      <p>
        C'est exactement ce que vivent les enfants dits <strong>AuDHD</strong> (contraction de *Autism* et *ADHD*).
      </p>
      <p>
        Ce cumul alimente une tension interne permanente :
      </p>
      <ul>
        <li>
          <strong>La contradiction des routines :</strong> La part autistique réclame un planning millimétré pour se sentir en sécurité. Mais dès que la routine s'installe, la part TDAH s'ennuie à mourir et provoque le chaos pour retrouver de la dopamine.
        </li>
        <li>
          <strong>L'illusion de la normalité (*masking*) :</strong> Souvent dotés d'une vive intelligence conceptuelle, ces enfants compensent par une énergie monumentale à l'école. En classe, ils tiennent le coup. À la maison, la porte franchie, le barrage cède : colères fulgurantes ou mutisme total.
        </li>
      </ul>
      <p>
        Pour comprendre comment ces singularités s'articulent avec les talents personnels, consultez notre dossier sur{" "}
        <a href="/guides/intelligences-multiples-gardner">les 9 formes d'intelligence de Gardner</a>.
      </p>

      <h2>4. Adapter la maison et l'école : ce qui soulage chaque profil</h2>
      <p>
        Une consigne efficace pour un profil TDAH peut déstabiliser un profil TSA. Voici comment nuancer vos interventions parentales :
      </p>

      <div className="my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <Zap className="h-5 w-5 text-brand" />
            Pour l'enfant avec TDAH
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-ink/80">
            <li>• <strong>Séquencer en micro-défis :</strong> Fractionnez les devoirs en blocs d'action de 15 minutes avec minuteur visible (timer visuel).</li>
            <li>• <strong>Tolérer le mouvement utile :</strong> Laissez-le gigoter sur un coussin ergonomique à picots ou manipuler un fidget pendant qu'il récite sa leçon.</li>
            <li>• <strong>Miser sur la nouveauté visuelle :</strong> Changez régulièrement l'ordre des tâches pour éviter la lassitude (consultez notre méthode pour{" "}
            <a href="/guides/enfant-agite-concentration">canaliser l'attention d'un enfant agité</a>).</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" />
            Pour l'enfant autiste (TSA)
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-ink/80">
            <li>• <strong>Annoncer les changements :</strong> Prévenez toujours dix minutes avant une transition : <em>« Quand l'aiguille sera sur le 6, nous éteindrons la console pour passer à table »</em>.</li>
            <li>• <strong>Consignes claires et univoques :</strong> Évitez les métaphores floues (<em>« Tiens-toi comme il faut »</em>). Privilégiez l'explicite : <em>« Pose tes deux pieds au sol et pose ton crayon »</em>.</li>
            <li>• <strong>Sanctuaire sensoriel :</strong> Proposez un casque antibruit pour les devoirs et créez un coin cocon avec lumière tamisée (approfondissez avec notre analyse sur{" "}
            <a href="/guides/autisme-tdah-apprentissage-forces-reelles">la pensée visuelle et tactile</a>).</li>
          </ul>
        </div>
      </div>

      <h2>5. La démarche diagnostique : par où commencer sans anxiété ?</h2>
      <p>
        Poser un nom sur les difficultés de son enfant n'est pas l'enfermer dans une case. C'est lui offrir un décodeur pour toute son existence.
      </p>
      <p>
        Les démarches prennent du temps, souvent entre six et dix-huit mois. Ne restez pas isolés.
      </p>
      <ol className="my-6 space-y-3">
        <li>
          <strong>1. Documenter les faits concrets :</strong> Notez pendant deux semaines les situations déclenchantes (crises au supermarché, refus d'habillage, blocages face aux devoirs) plutôt que de vagues impressions.
        </li>
        <li>
          <strong>2. Le bilan neuropsychologique :</strong> Réalisé par un psychologue spécialisé, il évalue les fonctions attentionnelles, le quotient intellectuel et les particularités exécutives.
        </li>
        <li>
          <strong>3. La confirmation médicale :</strong> Seul un médecin spécialisé (pédopsychiatre, neuropédiatre ou équipe d'un Centre de Ressources Autisme) valide officiellement le diagnostic et guide les aménagements scolaires (PAP, PPS).
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-brand" />
          <h3 className="text-xl font-bold text-ink">
            Le Défi 10 minutes à la maison : L'audit sensoriel de la chambre
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          Ce soir, asseyez-vous par terre avec votre enfant dans sa chambre, en silence pendant trois minutes. Demandez-lui : <em>« Quels sont les trois bruits ou lumières qui te piquent les yeux ou les oreilles ici ? »</em>. Un tic-tac d'horloge trop fort ? Un néon agressif ? Aménagez ensemble un coin refuge garni de coussins moelleux où il a le droit absolu de s'isoler quand le monde extérieur s'emballe.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Découvrir les parcours adaptés Génizio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/gestion-colere-emotions-enfant">
              Mieux gérer les colères et tempêtes
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

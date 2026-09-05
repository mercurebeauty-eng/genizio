import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";

const PATH = "/guides/defis-pour-adolescents";

const FAQ = [
  {
    question: "Quels défis proposer à un adolescent de 12 à 16 ans ?",
    answer:
      "Les défis qui fonctionnent à cet âge ont trois caractéristiques : ils produisent quelque chose de montrable à d'autres qu'aux parents, ils comportent une vraie difficulté (un adolescent repère immédiatement une tâche conçue pour l'occuper), et ils laissent la méthode ouverte. Concrètement : monter une petite activité commerciale sur un week-end et en calculer la marge réelle, produire un mini-documentaire de 3 minutes sur un métier du quartier, réparer un objet en panne, organiser un événement pour des plus jeunes.",
  },
  {
    question: "Comment motiver un adolescent qui ne s'intéresse à rien ?",
    answer:
      "« Ne s'intéresse à rien » signifie presque toujours « ne s'intéresse à rien de ce que je lui propose ». Le levier le plus efficace n'est pas de trouver l'activité parfaite mais de transférer le pouvoir de décision : laisser choisir le sujet, la méthode et le rendu, et ne garder que la contrainte de terminer. Un adolescent qui exécute une consigne d'adulte fournit le minimum ; le même, responsable d'un projet qu'il a choisi, y passe ses soirées. Commencer petit — un défi d'une heure qu'il choisit — rétablit plus sûrement l'engagement qu'un grand projet imposé.",
  },
  {
    question:
      "Mon fils ne fait que jouer aux jeux vidéo ou scroller les réseaux sociaux, que faire ?",
    answer:
      "D'abord, ne diabolisez pas l'écran : le jeu vidéo et les réseaux sociaux sont son espace social, celui où il retrouve ses amis — c'est pour cela qu'ils sont si difficiles à remplacer. Ensuite, négociez un contrat clair plutôt qu'une interdiction : un temps d'écran défini (par exemple après les devoirs, une durée fixe), et des moments sans téléphone non négociables (repas, nuit). Enfin, proposez des projets qui concurrencent l'écran sur son propre terrain : un défi qui se montre en ligne (une vidéo, une création à poster) a beaucoup plus de chances de l'accrocher qu'une activité « pour enfants ». Le jeu vidéo n'est pas l'ennemi : c'est un rival que l'on ne bat qu'avec des projets aussi engageants que lui.",
  },
  {
    question: "Pourquoi les activités « éducatives » ne marchent plus à l'adolescence ?",
    answer:
      "Parce qu'à partir de 12 ans environ, l'adolescent identifie l'intention pédagogique derrière l'activité, et une activité perçue comme un exercice déguisé perd sa crédibilité. Ce qui la remplace, c'est l'utilité réelle : un projet qui sert à quelqu'un, rapporte de l'argent, résout un problème concret ou peut être montré à ses pairs. Le contenu d'apprentissage peut être identique — c'est le cadrage et l'enjeu qui changent.",
  },
  {
    question: "Comment gérer l'argent de poche et la pression scolaire d'un adolescent ?",
    answer:
      "L'argent de poche est un excellent terrain d'apprentissage, à condition d'en faire un outil de gestion, pas une récompense pour chaque action : un montant fixe chaque mois, que l'adolescent répartit lui-même (sorties, économies, imprévus), avec un petit carnet de comptes. Quant à la pression scolaire, elle est souvent plus forte chez les parents que chez l'adolescent lui-même : distinguez ce qui relève de l'école (les notes, le travail) de ce qui relève de la vie (son humeur, ses amis, ses projets). Un adolescent qui sent que sa valeur ne se réduit pas à son bulletin parle plus facilement de ses difficultés — et la pression diminue des deux côtés.",
  },
  {
    question: "Un adolescent peut-il utiliser Génizio ?",
    answer:
      "Oui, Génizio couvre les 5-16 ans et les défis sont générés selon l'âge précis. Pour un adolescent, cela donne des projets structurés sur plusieurs jours plutôt que des manipulations courtes, avec une vraie exigence de résultat. Le dossier de réalisations prend aussi un autre sens à cet âge : il devient une trace de réalisations concrètes, utile au moment de l'orientation, quand il faut montrer autre chose qu'un bulletin.",
  },
];

export const Route = createFileRoute("/guides/defis-pour-adolescents")({
  head: () => {
    const meta = pageMeta({
      title: "Motiver un adolescent : 12 défis qui marchent (12-16 ans)",
      description:
        "Ce qui motive vraiment un adolescent de 12 à 16 ans, comment proposer un défi sans conflit (téléphone, jeux vidéo), et 12 défis concrets qui tiennent la route.",
      path: PATH,
      image: "/guides/og-ados.jpg",
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
            { name: "Défis pour adolescents", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Motiver un adolescent de 12 à 16 ans : 12 défis qui marchent",
          description:
            "Guide pratique pour motiver un ado sans conflit : concilier écrans, autonomie et 12 projets concrets d'action pour révéler ses talents.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-ados.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-26",
          about: [
            { "@type": "Thing", name: "Motivation des adolescents" },
            { "@type": "Thing", name: "Défis pour jeunes" },
            { "@type": "Thing", name: "Orientation scolaire" },
            { "@type": "Thing", name: "Autonomie" },
          ],
        }),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Adolescents & Motivation"
      title="Motiver un adolescent de 12 à 16 ans : les défis qui marchent"
      intro="À partir de 12 ans, la plupart des activités « éducatives » classiques cessent de fonctionner : l'adolescent repère l'intention pédagogique et décroche. Ce qui prend le relais, c'est l'utilité réelle, la responsabilité confiée et la reconnaissance de ses pairs. Voici comment le stimuler sans dispute."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Test d'orientation collégien & IA",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Orientation & Métiers dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
        {
          label: "Décrochage et perte de confiance",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        {
          label: "De spectateur à créateur de contenus",
          to: "/guides/ecrans-tiktok-youtube-talent-ecriture-realisation",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
      ]}
    >
      <img
        src="/guides/og-ados.jpg"
        alt="Adolescent africain concentré sur son ordinateur travaillant sur un projet ambitieux"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Ce qui change vers 12 ans : le besoin d'utilité réelle</h2>
      <p>
        Un adolescent n'exécute plus une consigne simplement parce qu'un adulte la lui demande. Il
        évalue spontanément la pertinence de la tâche : à quoi ça sert, qui va le voir, est-ce un
        projet valorisant ?
      </p>
      <p>
        À cet âge, les écrans et réseaux sociaux captent une grande partie de son attention. Plutôt
        que d'entrer dans un bras de fer stérile (découvrez nos méthodes pour{" "}
        <a href="/guides/ecrans-addiction-alternatives-enfant">réduire les écrans sans conflit</a>),
        proposez-lui de devenir créateur : transformer son intérêt pour les vidéos en écriture de
        scripts ou réalisation de montages (consultez notre guide{" "}
        <a href="/guides/ecrans-tiktok-youtube-talent-ecriture-realisation">
          TikTok et YouTube : transformer le scroll en talent de réalisation
        </a>
        ).
      </p>

      <h3>Les trois conditions d'un défi motivant</h3>
      <ul>
        <li>
          <strong>Un rendu montrable :</strong> Une vidéo terminée, un objet vendu, un événement
          organisé, un outil fonctionnel.
        </li>
        <li>
          <strong>Une difficulté réelle :</strong> Le projet doit comporter un risque d'échec pour
          susciter un vrai sentiment d'accomplissement.
        </li>
        <li>
          <strong>La méthode laissée libre :</strong> Vous fixez l'objectif, l'adolescent choisit le
          chemin.
        </li>
      </ul>

      <h2>Comment introduire un défi sans conflit</h2>
      <ol className="space-y-3 my-6">
        <li>
          <strong>Ne proposez jamais en plein jeu vidéo :</strong> Choisissez un moment neutre (en
          voiture, au dîner).
        </li>
        <li>
          <strong>Offrez deux options au choix :</strong>{" "}
          <em>
            « Tu préfères monter une micro-vente ce week-end ou réaliser un reportage vidéo sur le
            quartier ? »
          </em>
        </li>
        <li>
          <strong>Laissez-le fixer sa date de rendu :</strong> Un engagement temporel choisi
          responsabilise le jeune.
        </li>
      </ol>

      <h2>12 défis stimulants pour adolescents (12-16 ans)</h2>

      <h3>1. Entreprendre & Gérer</h3>
      <ul>
        <li>
          Monter une micro-activité le samedi (lavage auto, vente de pâtisseries) et calculer son
          bénéfice net.
        </li>
        <li>
          Revendre 3 objets inutilisés en ligne en rédigeant des annonces vendeuses et honnêtes.
        </li>
        <li>
          Chiffrer un projet personnel (achat d'un matériel, voyage) et établir un plan de
          financement.
        </li>
      </ul>

      <h3>2. Créer & Documenter</h3>
      <ul>
        <li>
          Réaliser un mini-documentaire de 3 minutes sur un artisan du quartier, montage et musique
          compris.
        </li>
        <li>
          Créer une série photo thématique et rédiger un texte argumentatif pour chaque image.
        </li>
        <li>Tenir un journal de bord de projet sur 30 jours.</li>
      </ul>

      <h3>3. Réparer & Ingénierie</h3>
      <ul>
        <li>
          Diagnostiquer et réparer un appareil domestique en panne en documentant chaque étape.
        </li>
        <li>Fabriquer un meuble simple sur mesure à partir de plans côtés.</li>
        <li>Installer un système domotique, solaire ou réseau à la maison.</li>
      </ul>

      <h3>4. Transmettre & Convaincre</h3>
      <ul>
        <li>
          Organiser un tournoi sportif ou un atelier créatif pour les plus jeunes du quartier.
        </li>
        <li>Enseigner une compétence numérique ou linguistique à un adulte.</li>
        <li>
          Passer notre{" "}
          <a href="/guides/test-orientation-metier-enfant-futur">
            test d'orientation collégien spécial IA
          </a>{" "}
          et explorer les métiers d'avenir avec notre guide{" "}
          <a href="/guides/orientation-scolaire-metiers-avenir">orientation dès 10 ans</a>.
        </li>
      </ul>

      <h2>Le dossier de réalisations : préparer son orientation</h2>
      <p>
        Entre 12 et 16 ans, les choix de filières approchent. Si un adolescent traverse une période
        de démotivation scolaire (consultez notre guide sur le{" "}
        <a href="/guides/decrochage-scolaire-confiance-enfant">
          décrochage scolaire et la perte de confiance
        </a>
        ), ces réalisations concrètes lui prouvent ses compétences réelles et enrichissent son
        dossier pour les études futures selon ses{" "}
        <a href="/guides/intelligences-multiples-gardner">talents dominants</a>.
      </p>

      <h2>Ce que fait Génizio pour les adolescents</h2>
      <p>
        Génizio génère des défis ambitieux sur mesure, adaptés aux centres d'intérêt réels de chaque
        adolescent. En documentant ses projets dans son Passeport de Talents, le jeune bâtit une
        preuve concrète de ses compétences pratiques et créatives.
      </p>

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

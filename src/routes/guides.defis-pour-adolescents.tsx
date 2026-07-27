import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/defis-pour-adolescents";

const FAQ = [
  {
    question: "Quels défis proposer à un adolescent de 12 à 16 ans ?",
    answer:
      "Les défis qui fonctionnent à cet âge ont trois caractéristiques : ils produisent quelque chose de montrable à d'autres qu'aux parents, ils comportent une vraie difficulté (un adolescent repère immédiatement une tâche conçue pour l'occuper), et ils laissent la méthode ouverte. Concrètement : monter une micro-activité commerciale sur un week-end et en calculer la marge réelle, produire un mini-documentaire de 3 minutes sur un métier du quartier, réparer un objet en panne, coder un petit outil utile à la famille, organiser un événement pour des plus jeunes.",
  },
  {
    question: "Comment motiver un adolescent qui ne s'intéresse à rien ?",
    answer:
      "« Ne s'intéresse à rien » signifie presque toujours « ne s'intéresse à rien de ce que je lui propose ». Le levier le plus efficace n'est pas de trouver l'activité parfaite mais de transférer le pouvoir de décision : laisser choisir le sujet, la méthode et le rendu, et ne garder que la contrainte de terminer. Un adolescent qui exécute une consigne d'adulte fournit le minimum ; le même, responsable d'un projet qu'il a choisi, y passe ses soirées. Commencer petit — un défi d'une heure qu'il choisit — rétablit plus sûrement l'engagement qu'un grand projet imposé.",
  },
  {
    question: "Pourquoi les activités « éducatives » ne marchent plus à l'adolescence ?",
    answer:
      "Parce qu'à partir de 12 ans environ, l'adolescent identifie l'intention pédagogique derrière l'activité, et une activité perçue comme un exercice déguisé perd sa crédibilité. Ce qui la remplace, c'est l'utilité réelle : un projet qui sert à quelqu'un, rapporte de l'argent, résout un problème concret ou peut être montré à ses pairs. Le contenu d'apprentissage peut être identique — c'est le cadrage et l'enjeu qui changent.",
  },
  {
    question: "Un adolescent peut-il utiliser Génizio ?",
    answer:
      "Oui, Génizio couvre les 5-16 ans et les défis sont générés selon l'âge précis. Pour un adolescent, cela donne des projets structurés sur plusieurs jours plutôt que des manipulations courtes, avec une vraie exigence de résultat. Le portfolio prend aussi un autre sens à cet âge : il devient une trace de réalisations concrètes, utile au moment de l'orientation, quand il faut montrer autre chose qu'un bulletin.",
  },
];

export const Route = createFileRoute("/guides/defis-pour-adolescents")({
  head: () => {
    const meta = pageMeta({
      title: "Quels défis pour un adolescent de 12 à 16 ans ?",
      description:
        "Ce qui motive vraiment un adolescent, pourquoi les activités « éducatives » ne marchent plus, et 12 défis concrets qui tiennent la route.",
      path: PATH,
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
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Quels défis proposer à un adolescent de 12 à 16 ans ?",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          about: [
            { "@type": "Thing", name: "Motivation des adolescents" },
            { "@type": "Thing", name: "Défis pour jeunes" },
            { "@type": "Thing", name: "Orientation scolaire" },
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
      eyebrow="Adolescents"
      title="Quels défis proposer à un adolescent de 12 à 16 ans ?"
      intro="À partir de 12 ans, la plupart des activités « éducatives » cessent de fonctionner — non parce que l'adolescent est démotivé, mais parce qu'il repère l'intention pédagogique et n'y croit plus. Voici ce qui prend le relais."
      updated="27 juillet 2026"
      readingTime="7 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Les intelligences multiples expliquées simplement", to: "/guides/intelligences-multiples-gardner" },
      ]}
    >
      <h2>Ce qui change vers 12 ans</h2>
      <p>
        Un enfant de 8 ans accepte volontiers une activité parce qu'un adulte la propose. Un
        adolescent de 14 ans évalue d'abord : à quoi ça sert, qui va le voir, est-ce que ça a l'air
        sérieux. Une activité qui échoue à ces trois questions est abandonnée poliment — ou pas
        poliment.
      </p>
      <p>
        Ce n'est pas de la démotivation. C'est un déplacement de ce qui donne de la valeur à une
        tâche : du plaisir de faire vers <strong>la reconnaissance et l'utilité réelle</strong>.
      </p>

      <h3>Les trois conditions d'un défi crédible</h3>
      <ul>
        <li>
          <strong>Un rendu montrable.</strong> Quelque chose qui existe en dehors du cercle
          familial : une vidéo, un objet vendu, un événement qui a eu lieu, un outil que d'autres
          utilisent.
        </li>
        <li>
          <strong>Une difficulté réelle.</strong> Un adolescent détecte une tâche calibrée pour
          l'occuper. Le défi doit pouvoir échouer — sinon il ne vaut rien à ses yeux.
        </li>
        <li>
          <strong>La méthode laissée ouverte.</strong> On fixe l'objectif et l'échéance, pas le
          chemin. C'est la marge de décision qui fait la différence entre exécuter et s'engager.
        </li>
      </ul>

      <h2>12 défis qui tiennent la route</h2>

      <h3>Entreprendre</h3>
      <ul>
        <li>Monter une micro-activité sur un week-end (lavage de motos, jus, pâtisseries) et calculer la marge réelle, charges comprises</li>
        <li>Revendre trois objets inutilisés au meilleur prix, en rédigeant lui-même les annonces</li>
        <li>Chiffrer un projet qu'il veut vraiment (un téléphone, un voyage) et construire le plan pour y arriver</li>
      </ul>

      <h3>Produire et documenter</h3>
      <ul>
        <li>Réaliser un mini-documentaire de 3 minutes sur un métier du quartier, montage compris</li>
        <li>Photographier une série de 10 images sur un thème unique et en défendre le choix</li>
        <li>Tenir un carnet de projet pendant 30 jours et en tirer un bilan écrit</li>
      </ul>

      <h3>Réparer et construire</h3>
      <ul>
        <li>Diagnostiquer et réparer un appareil en panne, en documentant chaque étape</li>
        <li>Construire un meuble simple utile à la maison, à partir de mesures qu'il a prises</li>
        <li>Installer et configurer quelque chose de réel : un réseau, un éclairage, un système d'arrosage</li>
      </ul>

      <h3>Organiser et transmettre</h3>
      <ul>
        <li>Organiser un tournoi ou un atelier pour des plus jeunes, de l'inscription au déroulé</li>
        <li>Enseigner une compétence qu'il maîtrise à un adulte, et l'évaluer honnêtement à la fin</li>
        <li>Préparer et défendre un argumentaire sur un sujet qui le concerne, face à contradiction</li>
      </ul>

      <h2>L'erreur la plus fréquente : trop cadrer</h2>
      <p>
        Le réflexe naturel, face à un adolescent qui traîne, est d'ajouter du cadre : plus de
        consignes, plus de vérifications, plus d'étapes imposées. C'est généralement ce qui achève
        l'engagement.
      </p>
      <p>
        L'approche inverse fonctionne mieux : réduire à une seule contrainte non négociable —{" "}
        <strong>terminer et montrer le résultat à une date fixée</strong> — et rendre tout le reste
        négociable. Le sujet, la méthode, le format, le rythme.
      </p>

      <h2>Le portfolio prend son vrai sens à cet âge</h2>
      <p>
        Entre 12 et 16 ans arrivent les premières décisions d'orientation, et avec elles une
        difficulté concrète : un adolescent n'a souvent rien d'autre à montrer que des notes. Une
        trace datée de ce qu'il a réellement construit, vendu, organisé, réparé change la
        conversation — avec un établissement, un employeur, ou simplement avec lui-même.
      </p>
      <p>
        Génizio génère ce type de défis selon l'âge et les centres d'intérêt du jeune, et conserve
        la preuve de chaque réalisation dans un portfolio qui lui appartient.
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}

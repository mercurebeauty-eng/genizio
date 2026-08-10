import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/discipline-positive-sans-punition";

const FAQ = [
  {
    question: "Qu'est-ce que la discipline positive exactement ?",
    answer:
      "C'est une approche éducative fondée sur les travaux d'Alfred Adler et de Rudolf Dreikurs, popularisée par Jane Nelsen : l'idée qu'un enfant se comporte mieux quand il se sent relié et capable, et non quand il a peur. En pratique, elle combine trois choses : des limites claires et stables, des conséquences logiques plutôt que des punitions humiliantes, et des outils qui rendent l'enfant acteur de ses choix. Elle n'est ni permissive (tout est permis) ni punitive : elle vise à enseigner, pas à faire souffrir.",
  },
  {
    question: "La discipline positive, est-ce laisser l'enfant faire ce qu'il veut ?",
    answer:
      "Non, c'est l'inverse de l'abandon éducatif. La discipline positive insiste au contraire sur des limites fermes, mais posées sans humiliation. La différence avec l'éducation classique tient au comment : on ne punit pas pour faire peur, on associe l'enfant à des conséquences qu'il peut comprendre (« tu as déchiré le livre, tu le répareras »), et on lui offre des choix dans un cadre décidé par l'adulte (« tu ranges maintenant ou dans cinq minutes ? »). L'autorité reste celle du parent ; c'est sa forme qui change.",
  },
  {
    question: "Comment réagir quand mon enfant dépasse une limite sans crier ni frapper ?",
    answer:
      "Trois étapes suffisent souvent : accueillir l'émotion d'abord (« tu es en colère parce que je coupe la télévision »), rappeler la limite ensuite (« le cadre est : pas d'écran après 19 h »), et appliquer une conséquence logique plutôt qu'une punition arbitraire (« on ne regarde pas la télé ce soir, on le fera demain »). Si vous sentez que vous allez crier, mettez-vous en pause avant d'agir : un parent calme est une condition, pas un luxe. La régularité compte plus que la sévérité : une limite appliquée dix fois avec calme est plus efficace qu'une limite criée une fois.",
  },
  {
    question: "À partir de quel âge la discipline positive fonctionne-t-elle ?",
    answer:
      "Dès que l'enfant comprend des mots simples, vers 2-3 ans, les principes de base s'appliquent : nommer l'émotion, offrir deux choix limités, prévenir avant de changer d'activité. De 4 à 8 ans, on ajoute les conséquences logiques et la réparation. De 9 à 12 ans, l'essentiel devient la négociation des règles dans un cadre fixe, et à l'adolescence, la co-construction des limites. Le principe commun à tous les âges : plus l'enfant participe aux règles, plus il les respecte.",
  },
  {
    question: "La discipline positive est-elle en lien avec Génizio ?",
    answer:
      "Génizio s'appuie sur le même socle psychologique : donner à l'enfant des projets concrets à sa mesure, le laisser faire des choix, et valoriser ce qu'il a réellement accompli plutôt que de le comparer ou de l'étiqueter. Les défis de l'application sont conçus pour être des responsabilités responsabilisantes, pas des récompenses : l'enfant choisit, agit, et la carte de ses talents se construit à partir de ses réalisations réelles.",
  },
];

export const Route = createFileRoute("/guides/discipline-positive-sans-punition")({
  head: () => {
    const meta = pageMeta({
      title: "Discipline positive : éduquer sans crier ni punir",
      description:
        "La discipline positive en pratique : poser des limites claires sans crier ni punir, et faire grandir l'autonomie de l'enfant.",
      path: PATH,
      image: "/guides/og-discipline.jpg",
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
            { name: "Discipline positive", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Discipline positive : éduquer sans crier ni punir",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-discipline.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-10",
          about: [
            { "@type": "Thing", name: "Discipline positive" },
            { "@type": "Thing", name: "Éducation sans punition" },
            { "@type": "Thing", name: "Autorité parentale" },
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
      eyebrow="Éducation & limites"
      title="Discipline positive : éduquer sans crier ni punir"
      intro="Crier fonctionne quelques minutes, puis il faut crier plus fort. La discipline positive propose une autre voie : des limites fermes, posées sans humiliation, qui apprennent à l'enfant à se réguler lui-même au lieu de le faire par peur. Voici comment elle fonctionne concrètement."
      updated="10 août 2026"
      readingTime="8 min"
      related={[
        { label: "Rendre son enfant autonome sans crier", to: "/guides/autonomie-responsabilite-maison" },
        { label: "Gérer la colère de son enfant", to: "/guides/gestion-colere-emotions-enfant" },
        { label: "Rivalité frères et sœurs : coopérer", to: "/guides/fratrie-rivalite-cooperation" },
      ]}
    >
      <img
        src="/guides/og-discipline.jpg"
        alt="Parent posant une limite avec bienveillance et fermeté à son enfant à la maison"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Ce que la discipline positive n'est pas</h2>
      <p>
        Avant tout, levons les deux malentendus les plus fréquents. La discipline positive{" "}
        <strong>n'est pas la permissivité</strong> : elle ne dit pas « laisse faire, il va
        comprendre tout seul ». Elle dit le contraire — l'enfant a besoin de limites pour se sentir
        en sécurité, et les poser fait partie du rôle de parent.
      </p>
      <p>
        Elle n'est pas non plus une méthode « douce » qui ne fonctionnerait que sur les enfants
        calmes. Ses outils sont exigeants : ils demandent au parent de se réguler lui-même avant de
        réguler l'enfant. Le but n'est pas d'éviter les conflits, mais de les transformer en
        apprentissages.
      </p>

      <h2>Le principe : relier avant de corriger</h2>
      <p>
        Le point de départ de la discipline positive est une observation simple : un enfant qui se
        sent en sécurité et relié à ses parents se comporte mieux qu'un enfant qui a peur. Quand un
        comportement dérape, la première question n'est pas « comment punir ? » mais{" "}
        <strong>« de quoi cet enfant a-t-il besoin ? »</strong> — d'attention, de limites, de
        mouvement, de reconnaissance ?
      </p>
      <p>
        Cela ne signifie pas excuser un mauvais comportement. Cela signifie le corriger au bon
        niveau : le besoin d'abord, le comportement ensuite.
      </p>

      <h2>Quatre techniques concrètes</h2>
      <ol>
        <li>
          <strong>Les choix limités.</strong> Offrir deux options que l'adulte accepte vraiment :
          « tu prépares ton sac maintenant ou dans cinq minutes ? » L'enfant exerce son autonomie
          dans un cadre que vous décidez. Plus de choix qu'il n'en peut gérer l'angoisse.
        </li>
        <li>
          <strong>Les conséquences logiques.</strong> Une conséquence liée à l'acte, annoncée à
          l'avance, appliquée sans colère : « si tu jettes le livre, tu le ranges et tu le
          répareras ». On distingue la conséquence logique de la punition arbitraire (« pas de
          dessert ») qui n'apprend rien.
        </li>
        <li>
          <strong>La réparation.</strong> Plutôt que de punir, demander à l'enfant de réparer ce
          qu'il a abîmé — matériellement ou relationnellement (présenter des excuses précises,
          refaire une tâche). La réparation construit le sens des responsabilités ; la punition
          construit la rancune.
        </li>
        <li>
          <strong>Le temps de recul partagé.</strong> Quand l'émotion est trop forte, proposer un
          temps calme choisi par l'enfant (aller dans sa chambre, dessiner sa colère) plutôt qu'un
          coin punitif imposé. La différence : on ne l'exclut pas, on lui offre un outil pour se
          calmer, et on revient vers lui ensuite.
        </li>
      </ol>

      <h2>Les pièges qui font échouer la méthode</h2>
      <ul>
        <li>
          <strong>Menacer sans suivre.</strong> Une limite annoncée puis non appliquée enseigne que
          les paroles ne comptent pas. Mieux vaut annoncer moins et tenir davantage.
        </li>
        <li>
          <strong>Comparer.</strong> « Prends exemple sur ta sœur » n'apprend rien et attise la
          rivalité. On compare l'enfant à lui-même, jamais aux autres.
        </li>
        <li>
          <strong>Punir collectivement.</strong> Priver toute la fratrie à cause d'un seul construit
          l'injustice plus que la responsabilité.
        </li>
        <li>
          <strong>Confondre fermeté et froideur.</strong> On peut être ferme avec chaleur : le ton
          de la voix compte autant que le contenu de la règle.
        </li>
      </ul>

      <h2>Pourquoi ça demande de la régularité</h2>
      <p>
        Aucune technique ne change un comportement en une fois. Un enfant teste une limite
        plusieurs dizaines de fois avant de l'intégrer — c'est son travail. Le vôtre est de tenir la
        même limite, avec le même calme, assez longtemps pour qu'elle devienne prévisible. La
        répétition sereine fait la différence entre une règle comprise et une règle subie.
      </p>
      <p>
        Génizio applique le même principe à sa manière : chaque défi proposé à l'enfant lui donne un
        choix dans un cadre, un objectif clair, et une reconnaissance basée sur ce qu'il a
        réellement fait — une responsabilité responsabilisante, jamais une récompense arbitraire.
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

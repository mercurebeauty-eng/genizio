import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/intelligences-multiples-gardner";

const FAQ = [
  {
    question: "Qu'est-ce que la théorie des intelligences multiples ?",
    answer:
      "C'est une théorie proposée en 1983 par le psychologue américain Howard Gardner, dans son ouvrage « Frames of Mind ». Elle avance qu'il n'existe pas une intelligence unique et mesurable par un score de QI, mais plusieurs formes d'intelligence relativement indépendantes les unes des autres. Un enfant en difficulté sur les registres valorisés par l'école — le langage et la logique — peut être remarquablement compétent dans d'autres registres : spatial, corporel, interpersonnel, musical. La théorie invite donc à élargir ce qu'on regarde avant de conclure qu'un enfant « n'y arrive pas ».",
  },
  {
    question: "Quelles sont les 9 intelligences de Howard Gardner ?",
    answer:
      "Gardner en a d'abord décrit sept en 1983 : linguistique, logico-mathématique, spatiale, corporelle-kinesthésique, musicale, interpersonnelle (comprendre les autres) et intrapersonnelle (se comprendre soi-même). Il a ajouté l'intelligence naturaliste en 1995, et discuté une intelligence existentielle sans jamais la valider formellement. Les listes en neuf catégories que l'on rencontre couramment, y compris celle utilisée par Génizio, sont des adaptations pratiques de ce cadre, pas la liste canonique de Gardner.",
  },
  {
    question: "La théorie des intelligences multiples est-elle scientifiquement validée ?",
    answer:
      "Elle est largement diffusée dans le monde éducatif mais reste débattue dans la recherche en psychologie cognitive. Les critiques principales portent sur l'absence de preuves neurologiques d'intelligences réellement indépendantes, et sur le fait que les différentes aptitudes mesurées tendent à corréler entre elles. Gardner lui-même a mis en garde contre deux dérives : confondre ses intelligences avec des « styles d'apprentissage » (une notion, elle, contredite par les études), et étiqueter durablement un enfant. Utilisée comme grille d'observation pour élargir le regard, la théorie est utile ; utilisée comme test de classement, elle ne l'est pas.",
  },
  {
    question: "Comment identifier l'intelligence dominante de mon enfant ?",
    answer:
      "La question est mal posée, et Gardner le soulignait lui-même : chaque personne combine plusieurs intelligences, et ces combinaisons évoluent avec l'âge et les occasions rencontrées. Ce qui est utile n'est pas de désigner une dominante, mais de repérer sur plusieurs mois vers quelles activités l'enfant revient spontanément, dans lesquelles il persévère malgré la difficulté, et lesquelles il n'a jamais eu l'occasion d'essayer. Cette troisième catégorie est souvent la plus instructive : on ne peut pas repérer un talent dans un domaine auquel l'enfant n'a jamais été exposé.",
  },
  {
    question: "Comment Génizio utilise-t-il la théorie de Gardner ?",
    answer:
      "Génizio s'en sert comme d'une grille de couverture, pas d'un test. L'application propose des défis répartis sur 9 formes d'intelligence, et met à jour la carte des talents de l'enfant à partir des réalisations qu'il a effectivement menées à bout — jamais à partir d'un questionnaire rempli par le parent. L'objectif affiché est inverse de l'étiquetage : détecter les domaines jamais explorés pour y proposer des défis, plutôt qu'enfermer l'enfant dans un profil.",
  },
];

const INTELLIGENCES = [
  { name: "Linguistique", what: "Manier les mots, à l'oral comme à l'écrit.", signs: "Raconte des histoires spontanément, retient facilement ce qu'il entend, aime argumenter et jouer avec les mots." },
  { name: "Logico-mathématique", what: "Raisonner, calculer, repérer des régularités.", signs: "Pose des questions sur le pourquoi des choses, aime les énigmes et les stratégies, remarque les incohérences." },
  { name: "Spatiale", what: "Se représenter les volumes et l'espace.", signs: "Dessine avec justesse, s'oriente facilement, construit sans plan, visualise un objet avant de le faire." },
  { name: "Corporelle-kinesthésique", what: "Penser avec le corps et les mains.", signs: "Apprend en manipulant, coordination remarquable, imite un geste vu une seule fois, a du mal à rester assis." },
  { name: "Musicale & créative", what: "Percevoir rythmes, sons et formes.", signs: "Retient les mélodies, marque le rythme sans y penser, invente des variations, sensible aux ambiances." },
  { name: "Interpersonnelle (sociale)", what: "Comprendre les autres et agir avec eux.", signs: "Repère l'humeur d'autrui, joue le médiateur, organise naturellement le groupe, négocie." },
  { name: "Intrapersonnelle (émotionnelle)", what: "Se connaître et se réguler.", signs: "Sait nommer ce qu'il ressent, connaît ses limites, préfère parfois travailler seul, se fixe ses propres objectifs." },
  { name: "Naturaliste", what: "Observer et classer le vivant.", signs: "Distingue les espèces, remarque les changements de la nature, collectionne et trie, s'occupe des animaux ou des plantes." },
  { name: "Entrepreneuriale (adaptation pratique)", what: "Voir la valeur et passer à l'acte.", signs: "Propose d'échanger ou de vendre, évalue ce que vaut une chose, saisit une occasion, organise pour obtenir un résultat." },
];

export const Route = createFileRoute("/guides/intelligences-multiples-gardner")({
  head: () => {
    const meta = pageMeta({
      title: "Les 9 intelligences multiples de Gardner, expliquées",
      description:
        "Les 9 formes d'intelligence, ce que la théorie de Gardner dit vraiment, ses limites reconnues, et comment s'en servir sans étiqueter son enfant.",
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
            { name: "Intelligences multiples", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Les intelligences multiples de Howard Gardner, expliquées simplement",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-08",
          about: [
            { "@type": "Thing", name: "Théorie des intelligences multiples" },
            { "@type": "Person", name: "Howard Gardner" },
            { "@type": "Thing", name: "Psychologie du développement" },
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
      eyebrow="Théorie"
      title="Les intelligences multiples de Howard Gardner, expliquées simplement"
      intro="Une théorie très citée, souvent mal utilisée. Voici ce qu'elle affirme réellement, ce que la recherche lui reproche, et comment s'en servir avec son enfant sans tomber dans l'étiquetage."
      updated="27 juillet 2026"
      readingTime="9 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
      ]}
    >
      <h2>D'où vient la théorie</h2>
      <p>
        En 1983, le psychologue américain <strong>Howard Gardner</strong>, alors professeur à
        Harvard, publie <em>Frames of Mind</em>. Sa thèse : le test de QI mesure une tranche étroite
        des capacités humaines — essentiellement le langage et la logique — et laisse de côté des
        compétences tout aussi structurées.
      </p>
      <p>
        Il propose sept intelligences, en ajoute une huitième (naturaliste) en 1995, et évoque sans
        jamais la valider une intelligence existentielle. Sa proposition n'est pas que « tout le
        monde est intelligent à sa manière » — formule sympathique mais vide — mais que{" "}
        <strong>plusieurs systèmes cognitifs relativement autonomes coexistent</strong>, chacun avec
        ses opérations propres.
      </p>

      <h2>Les 9 formes retenues par Génizio</h2>
      <p>
        La liste ci-dessous est l'adaptation pratique utilisée par Génizio : les huit intelligences
        de Gardner, plus une dimension entrepreneuriale, particulièrement présente dans les
        contextes où les enfants côtoient très tôt le commerce et l'artisanat.
      </p>

      {INTELLIGENCES.map((i) => (
        <div key={i.name}>
          <h3>{i.name}</h3>
          <p>
            <strong>Ce que c'est :</strong> {i.what}
            <br />
            <strong>Ce qu'on observe :</strong> {i.signs}
          </p>
        </div>
      ))}

      <h2>Ce que la recherche reproche à cette théorie</h2>
      <MedicalDisclaimer>
        Point d'honnêteté : la théorie des intelligences multiples est très répandue dans le monde
        éducatif, mais elle reste <strong>contestée en psychologie cognitive</strong>. La présenter
        comme un fait établi serait inexact.
      </MedicalDisclaimer>
      <p>Les objections les plus sérieuses :</p>
      <ul>
        <li>
          <strong>Peu de preuves d'indépendance réelle.</strong> Les aptitudes mesurées corrèlent
          entre elles davantage que la théorie ne le prédirait.
        </li>
        <li>
          <strong>Pas de substrat neurologique clairement établi</strong> correspondant à chaque
          intelligence distincte.
        </li>
        <li>
          <strong>La confusion avec les « styles d'apprentissage ».</strong> L'idée qu'un enfant
          « visuel » apprendrait mieux avec des images est, elle, assez nettement contredite par les
          études. Gardner s'est lui-même désolidarisé de cette lecture.
        </li>
      </ul>
      <p>
        Notre position est donc précise : nous utilisons ce cadre comme{" "}
        <strong>grille d'observation et de couverture</strong> — s'assurer qu'un enfant a
        l'occasion de se frotter à des domaines variés — et non comme instrument de mesure ou de
        classement.
      </p>

      <h2>Comment s'en servir sans étiqueter</h2>
      <p>
        La dérive la plus courante consiste à faire passer un questionnaire, conclure « c'est un
        kinesthésique », et orienter toutes les activités en conséquence. C'est exactement l'inverse
        de l'intention de départ, et Gardner l'a dénoncé.
      </p>

      <div className="my-8 rounded-2xl bg-brand-50 p-6 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">💡 Le Défi d'Observation Parentale sur 3 Jours</h3>
        <p className="text-sm text-ink/80 leading-relaxed mb-3">
          Ne faites passer aucun QCM théorique à votre enfant. Pendant 3 jours, observez simplement ce qu'il fait <strong>quand personne ne lui donne de consignes</strong> :
        </p>
        <ul className="text-sm text-ink/80 leading-relaxed space-y-1">
          <li>• Se met-il à fredonner ou taper un rythme ? (Intelligence Musicale)</li>
          <li>• Dessine-t-il les plans de son jeu ? (Intelligence Spatiale)</li>
          <li>• Organise-t-il les règles pour les autres enfants ? (Intelligence Interpersonnelle)</li>
        </ul>
        <p className="text-sm text-ink/80 leading-relaxed mt-3">
          Notez ces 3 faits réels. Ce sont vos meilleurs repères pour lui proposer des défis adaptés sur Génizio.
        </p>
      </div>

      <p>Trois principes plus utiles :</p>
      <ol>
        <li>
          <strong>Observer les réalisations, pas les déclarations.</strong> Ce que l'enfant termine
          spontanément est plus fiable que ce qu'il dit aimer, ou que ce qu'un parent coche dans un
          formulaire.
        </li>
        <li>
          <strong>Chercher les angles morts.</strong> La question la plus productive n'est pas
          « dans quoi est-il fort ? » mais « à quoi n'a-t-il jamais été exposé ? ». Un talent non
          sollicité reste invisible.
        </li>
        <li>
          <strong>Utiliser les forces comme passerelles.</strong> Un enfant très à l'aise
          physiquement peut entrer dans la géométrie par le sport. On part de la force pour ouvrir
          un domaine faible, au lieu d'enfermer dans la force.
        </li>
      </ol>

      <h2>Ce que Génizio en fait concrètement</h2>
      <p>
        L'application génère des défis répartis sur ces 9 domaines. Quand l'enfant termine un défi
        et que le parent en photographie le résultat, la carte de ses talents se met à jour à partir
        de cette réalisation.
      </p>
      <p>
        Le mécanisme est délibérément orienté vers l'exploration : le moteur repère les
        intelligences les moins travaillées et propose des défis qui utilisent une force existante
        comme point d'entrée vers ces domaines. Aucun profil n'est figé, aucun verdict n'est
        affiché à l'enfant.
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

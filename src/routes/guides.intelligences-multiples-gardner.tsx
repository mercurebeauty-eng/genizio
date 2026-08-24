import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";

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
      "Elle est largement diffusée dans le monde éducatif mais reste débattue dans la recherche en psychologie cognitive. Les critiques principales portent sur l'absence de preuves neurologiques d'intelligences réellement indépendantes, et sur le fait que les différentes aptitudes mesurées tendent à corréler entre elles. Utilisée comme grille d'observation pour élargir le regard, la théorie est utile ; utilisée comme test de classement, elle ne l'est pas. Ce point est développé dans la section « Les limites » de ce guide.",
  },
  {
    question: "Comment identifier l'intelligence dominante de mon enfant ?",
    answer:
      "La question est mal posée, et Gardner le soulignait lui-même : chaque personne combine plusieurs intelligences, et ces combinaisons évoluent avec l'âge et les occasions rencontrées. Ce qui est utile n'est pas de désigner une dominante, mais de repérer sur plusieurs mois vers quelles activités l'enfant revient spontanément, dans lesquelles il persévère malgré la difficulté, et lesquelles il n'a jamais eu l'occasion d'essayer. Cette troisième catégorie est souvent la plus instructive : on ne peut pas repérer un talent dans un domaine auquel l'enfant n'a jamais été exposé.",
  },
  {
    question: "Mon enfant est-il surdoué ou précoce si toutes ses intelligences sont fortes ?",
    answer:
      "Pas forcément. La théorie des intelligences multiples ne dit rien du haut potentiel intellectuel : un enfant surdoué ou précoce se repère à d'autres signes (avance dans les apprentissages, questionnement intense, sensibilité particulière) et se diagnostique par un bilan spécialisé avec un professionnel. Les deux démarches ne se recouvrent pas : observer les forces de son enfant à travers les intelligences multiples, et s'interroger sur un éventuel haut potentiel, sont deux questions différentes — la première est accessible à tous les parents, la seconde demande un professionnel.",
  },
  {
    question: "Comment Génizio utilise-t-il la théorie de Gardner ?",
    answer:
      "Génizio s'en sert comme d'une grille de couverture, pas d'un test. L'application propose des défis répartis sur 9 formes d'intelligence, et met à jour la carte des talents de l'enfant à partir des réalisations qu'il a effectivement menées à bout — jamais à partir d'un questionnaire rempli par le parent. L'objectif affiché est inverse de l'étiquetage : détecter les domaines jamais explorés pour y proposer des défis, plutôt qu'enfermer l'enfant dans un profil.",
  },
];

const INTELLIGENCES = [
  {
    name: "Linguistique",
    what: "Manier les mots, à l'oral comme à l'écrit.",
    signs:
      "Raconte des histoires spontanément, retient facilement ce qu'il entend, aime argumenter et jouer avec les mots.",
  },
  {
    name: "Logico-mathématique",
    what: "Raisonner, calculer, repérer des régularités.",
    signs:
      "Pose des questions sur le pourquoi des choses, aime les énigmes et les stratégies, remarque les incohérences.",
  },
  {
    name: "Spatiale",
    what: "Se représenter les volumes et l'espace.",
    signs:
      "Dessine avec justesse, s'oriente facilement, construit sans plan, visualise un objet avant de le faire.",
  },
  {
    name: "Corporelle-kinesthésique",
    what: "Penser avec le corps et les mains.",
    signs:
      "Apprend en manipulant, coordination remarquable, imite un geste vu une seule fois, a du mal à rester assis.",
  },
  {
    name: "Musicale & créative",
    what: "Percevoir rythmes, sons et formes.",
    signs:
      "Retient les mélodies, marque le rythme sans y penser, invente des variations, sensible aux ambiances.",
  },
  {
    name: "Interpersonnelle (sociale)",
    what: "Comprendre les autres et agir avec eux.",
    signs:
      "Repère l'humeur d'autrui, joue le médiateur, organise naturellement le groupe, négocie.",
  },
  {
    name: "Intrapersonnelle (émotionnelle)",
    what: "Se connaître et se réguler.",
    signs:
      "Sait nommer ce qu'il ressent, connaît ses limites, préfère parfois travailler seul, se fixe ses propres objectifs.",
  },
  {
    name: "Naturaliste",
    what: "Observer et classer le vivant.",
    signs:
      "Distingue les espèces, remarque les changements de la nature, collectionne et trie, s'occupe des animaux ou des plantes.",
  },
  {
    name: "Entrepreneuriale (adaptation pratique)",
    what: "Voir la valeur et passer à l'acte.",
    signs:
      "Propose d'échanger ou de vendre, évalue ce que vaut une chose, saisit une occasion, organise pour obtenir un résultat.",
  },
];

export const Route = createFileRoute("/guides/intelligences-multiples-gardner")({
  head: () => {
    const meta = pageMeta({
      title: "Les 9 formes d'intelligence : identifier les talents de votre enfant",
      description:
        "Comment repérer les talents de votre enfant avec les 9 formes d'intelligence : signes concrets à observer à la maison, liens avec le surdouement, sans étiqueter.",
      path: PATH,
      image: "/guides/og-gardner.jpg",
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
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Les 9 formes d'intelligence : comment identifier les talents de votre enfant",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-gardner.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Théorie des intelligences multiples" },
            { "@type": "Person", name: "Howard Gardner" },
            { "@type": "Thing", name: "Talent de l'enfant" },
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
      eyebrow="Talents de l'enfant"
      title="Les 9 formes d'intelligence : comment identifier les talents de votre enfant"
      intro="Votre enfant ne réussit pas en classe, mais il répare, négocie, chante ou organise ? Ce n'est pas une contradiction : c'est la théorie des intelligences multiples de Howard Gardner — il n'existe pas une seule intelligence mesurée par les notes, mais plusieurs, qui se repèrent à la maison. Voici comment les observer sans étiqueter votre enfant."
      updated="14 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
      ]}
    >
      <img
        src="/guides/og-gardner.jpg"
        alt="Enfants africains explorant différentes formes de créativité et d'intelligences multiples"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
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
        <strong>plusieurs formes d'intelligence coexistent</strong>, chacune avec ses opérations
        propres.
      </p>

      <h2>Les 9 formes d'intelligence et comment les repérer chez votre enfant</h2>
      <p>
        La liste ci-dessous est l'adaptation pratique utilisée par Génizio : les huit intelligences
        de Gardner, plus une dimension entrepreneuriale, particulièrement présente dans les
        contextes où les enfants côtoient très tôt le commerce et l'artisanat. Pour chaque forme,
        voici ce qu'elle recouvre et les signes concrets à observer à la maison — sans
        questionnaire, sans test : juste ce que votre enfant fait spontanément.
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

      <h2>Mon enfant est-il surdoué, HPI ou précoce ?</h2>
      <p>
        La question revient souvent quand on découvre que son enfant a des forces peu visibles à
        l'école. Réponse courte :{" "}
        <strong>les intelligences multiples ne sont pas un test de haut potentiel</strong>. Un
        enfant surdoué, HPI ou précoce se repère à d'autres signes — avance dans les apprentissages,
        questionnement intense, sensibilité particulière, ennui en classe — et se confirme par un
        bilan avec un professionnel. Si vous vous posez cette question, notre{" "}
        <a href="/guides/potentiel-haut-potentiel-enfant">guide sur les signes du haut potentiel</a>{" "}
        vous donne les repères d'observation ; mais dans les deux cas, l'observation quotidienne des
        forces de l'enfant reste le meilleur point de départ.
      </p>

      <h2>Les limites : ce qu'il faut savoir pour ne pas se tromper</h2>
      <MedicalDisclaimer>
        Point d'honnêteté : la théorie des intelligences multiples est très répandue dans le monde
        éducatif, mais elle reste <strong>contestée en psychologie cognitive</strong>. La présenter
        comme un fait établi serait inexact.
      </MedicalDisclaimer>
      <p>
        En résumé : les critiques portent sur l'absence de preuves d'indépendance neurologique entre
        les intelligences, et sur la confusion fréquente avec les « styles d'apprentissage » (l'idée
        qu'un enfant « visuel » apprendrait mieux avec des images — contredite par les études, et
        désavouée par Gardner lui-même). Notre position est donc précise : nous utilisons ce cadre
        comme <strong>grille d'observation et de couverture</strong> — s'assurer qu'un enfant a
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
        <h3 className="font-bold text-brand text-base mb-2">
          💡 Le Défi d'Observation Parentale sur 3 Jours
        </h3>
        <p className="text-sm text-ink/80 leading-relaxed mb-3">
          Ne faites passer aucun QCM théorique à votre enfant. Pendant 3 jours, observez simplement
          ce qu'il fait <strong>quand personne ne lui donne de consignes</strong> :
        </p>
        <ul className="text-sm text-ink/80 leading-relaxed space-y-1">
          <li>• Se met-il à fredonner ou taper un rythme ? (Intelligence Musicale)</li>
          <li>• Dessine-t-il les plans de son jeu ? (Intelligence Spatiale)</li>
          <li>
            • Organise-t-il les règles pour les autres enfants ? (Intelligence Interpersonnelle)
          </li>
        </ul>
        <p className="text-sm text-ink/80 leading-relaxed mt-3">
          Notez ces 3 faits réels. Ce sont vos meilleurs repères pour lui proposer des défis adaptés
          sur Génizio.
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
          <strong>Chercher les angles morts.</strong> La question la plus productive n'est pas «
          dans quoi est-il fort ? » mais « à quoi n'a-t-il jamais été exposé ? ». Un talent non
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
        comme point d'entrée vers ces domaines. Aucun profil n'est figé, aucun verdict n'est affiché
        à l'enfant.
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

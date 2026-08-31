import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  howToJsonLd,
} from "@/lib/seo";

const PATH = "/guides/potentiel-haut-potentiel-enfant";

const FAQ = [
  {
    question: "Comment savoir si mon enfant est surdoué, HPI ou précoce ?",
    answer:
      "Aucun signe isolé ne suffit : le Haut Potentiel Intellectuel (HPI) relève d'un bilan psychométrique complet mené par un psychologue (WISC-V). À la maison, observez plutôt la soif de complexité, la rapidité à relier des domaines sans rapport ou un décalage entre maturité intellectuelle et hypersensibilité émotionnelle.",
  },
  {
    question: "Qu'est-ce qu'un enfant « zèbre » ?",
    answer:
      "C'est une métaphore populaire sans valeur diagnostique officielle. L'essentiel est de vérifier si le fonctionnement singulier de l'enfant pose une gêne dans sa vie quotidienne ou scolaire.",
  },
  {
    question: "Mon enfant est intelligent mais n'aime pas l'école : est-ce lié ?",
    answer:
      "Oui. L'école privilégie l'exécution standardisée. Un enfant précoce s'y ennuie par manque de rythme, tandis qu'un enfant à profil visuel ou manuel s'y sent à l'étroit. Observez ses réalisations en temps libre pour comprendre son vrai moteur.",
  },
  {
    question: "Faut-il demander un saut de classe pour un enfant précoce qui s'ennuie ?",
    answer:
      "Cette mesure se décide en équipe avec les enseignants et le psychologue. Si l'ennui génère une souffrance réelle, le saut de classe est bénéfique ; si l'enfant est épanoui avec ses camarades, des activités enrichies en classe suffisent souvent.",
  },
  {
    question: "Le potentiel d'un enfant se limite-t-il à ce qui est utile à l'école ?",
    answer:
      "Non. L'intelligence pratique, le leadership relationnel et l'ingéniosité manuelle sont des compétences déterminantes pour l'avenir, pourtant invisibles sur un bulletin scolaire.",
  },
  {
    question: "Faut-il faire tester le QI de son enfant ?",
    answer:
      "Seulement si un décalage ou une souffrance scolaire le justifie, pour éclairer un accompagnement personnalisé.",
  },
  {
    question: "Comment Génizio aide-t-il à repérer le potentiel d'un enfant ?",
    answer:
      "Génizio propose des défis du monde réel répartis sur 9 formes de talents. La carte des forces de votre enfant se construit à partir de ses réalisations pratiques, sans questionnaire artificiel.",
  },
];

export const Route = createFileRoute("/guides/potentiel-haut-potentiel-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant HPI, surdoué ou précoce : comment le reconnaître",
      description:
        "Enfant surdoué, HPI, précoce ou zèbre : les signes révélateurs, les limites du test de QI et comment nourrir son potentiel sans le surmener.",
      path: PATH,
      image: "/guides/og-haut-potentiel.jpg",
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
            { name: "Haut potentiel et enfant surdoué", path: PATH },
          ]),
        ),
        jsonLdScript(
          howToJsonLd({
            name: "Protocole 10 min : Grille d'observation des forces singulières à la maison",
            description:
              "Une méthode en 3 étapes pour observer les manifestations du haut potentiel sans l'enfermer dans une étiquette théorique.",
            steps: [
              {
                name: "Observer la vitesse d'assimilation et la mémoire",
                text: "Notez les sujets pour lesquels votre enfant comprend le principe dès la première explication et fait des liens spontanés avec d'autres domaines.",
              },
              {
                name: "Évaluer la profondeur du questionnement",
                text: "Relevez ses questions existentielles sur le sens, la justice ou le fonctionnement du monde pour identifier son besoin de complexité.",
              },
              {
                name: "Proposer un défi à haute intensité intellectuelle",
                text: "Offrez-lui un problème ouvert (énigme de logique ou projet de construction complexe) et observez son niveau d'engagement et de persévérance.",
              },
            ],
          }),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Enfant surdoué, HPI ou précoce : comment reconnaître et accompagner son haut potentiel",
            description:
              "Guide parental approfondi pour reconnaître un enfant à haut potentiel (HPI / zèbre), comprendre le test de QI et valoriser ses talents à la maison.",
            path: PATH,
            image: "/guides/og-haut-potentiel.jpg",
            datePublished: "2026-07-27",
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
      eyebrow="Potentiel & talents"
      title="Enfant surdoué, HPI ou précoce : comment reconnaître et accompagner son haut potentiel"
      intro="« Mon enfant est-il surdoué ou précoce ? » Cette question émerge souvent quand un enfant pose des questions vertigineuses, s'ennuie en classe ou fait preuve d'une sensibilité singulière. Voici les repères d'observation à la maison, les réalités du bilan psychologique et les clés pour valoriser son potentiel sans l'enfermer dans une case."
      updated="27 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Les 9 formes d'intelligence (Gardner)",
          to: "/guides/intelligences-multiples-gardner",
        },
        { label: "Test de personnalité : 4 limites", to: "/guides/test-de-personnalite-enfant-talents" },
        { label: "Autisme & TDAH : atouts uniques", to: "/guides/autisme-tdah-apprentissage-forces-reelles" },
        { label: "Enfant inattentif ou agité", to: "/guides/enfant-agite-concentration" },
      ]}
    >
      <img
        src="/guides/og-haut-potentiel.jpg"
        alt="Jeune élève africain plongé dans la réflexion d'un casse-tête stimulant"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Deux questions qu'on confond souvent</h2>
      <p>
        « Mon enfant a-t-il un don ? » recouvre en réalité deux questions très différentes. La
        première est clinique : correspond-il aux critères diagnostiques du{" "}
        <strong>haut potentiel intellectuel</strong> (HPI), une catégorie psychologique précise,
        établie par un professionnel à l'aide de tests standardisés. La seconde est bien plus large
        : dans quels domaines cet enfant particulier est-il déjà compétent, ou le deviendrait
        rapidement s'il en avait l'occasion — que ce soit reconnu par un diagnostic ou non.
      </p>
      <p>
        La confusion entre les deux mène à deux impasses opposées : soit on attend un diagnostic
        formel avant de prendre au sérieux ce qu'un enfant montre déjà, soit on colle l'étiquette «
        surdoué » sur la base d'impressions, ce qui n'aide ni l'enfant ni personne. Ce guide traite
        des deux, séparément.
      </p>

      <h2>Le haut potentiel intellectuel (HPI) : les signes observables à la maison</h2>
      <MedicalDisclaimer>
        Le haut potentiel intellectuel (HPI) est un fonctionnement neurocognitif validé par un bilan psychométrique (test WISC-V par un psychologue ou neuropsychologue). Ce guide vous donne des repères d'observation bienveillants et ne remplace aucun avis médical.
      </MedicalDisclaimer>
      <p>
        Les signes caractéristiques observés chez l'enfant précoce ou « zèbre » ne se résument pas à de bonnes notes scolaires. Ils combinent souvent :
      </p>
      <ul>
        <li>
          <strong>Une pensée arborescente et fulgurante :</strong> L'enfant fait des liens instantanés entre des sujets sans rapport apparent, posant des questions existentielles précoces (voir notre éclairage sur l'
          <a href="/guides/intelligences-multiples-gardner">intelligence existentielle et les 9 formes d'intelligence</a>).
        </li>
        <li>
          <strong>Une hypersensibilité sensorielle et émotionnelle :</strong> Un sens aigu de la justice, des réactions intenses aux bruits ou aux textures, et parfois des tempêtes émotionnelles (consultez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour apaiser la frustration</a>).
        </li>
        <li>
          <strong>Un besoin irrépressible de comprendre le sens :</strong> Un rejet viscéral du « par cœur » et des consignes non justifiées, qui peut être confondu avec de l'opposition ou un{" "}
          <a href="/guides/enfant-agite-concentration">manque d'attention</a>.
        </li>
        <li>
          <strong>Un perfectionnisme paralysant :</strong> La peur de l'échec ou d'un résultat imparfait qui l'amène parfois à refuser d'entamer une tâche.
        </li>
      </ul>

      <h2>Les limites des tests de QI en ligne et des QCM</h2>
      <p>
        De nombreux sites proposent des « tests de précocité » ou des quiz en quelques minutes. Attention : ces tests automatisés sont non seulement scientifiquement invalides, mais ils risquent d'enfermer votre enfant dans une fausse étiquette. Lisez notre enquête sur les{" "}
        <a href="/guides/test-de-personnalite-enfant-talents">4 limites majeures des tests de personnalité pour enfants</a>.
      </p>

      <h2>Pourquoi le désintérêt scolaire touche tant d'enfants HPI</h2>
      <p>
        « Mon enfant a d'immenses capacités mais ses notes chutent » : ce paradoxe est fréquent. L'enfant précoce souffre souvent d'un <strong>ennui actif</strong> : le rythme de répétition scolaire ne correspond pas à sa vitesse de traitement. Sans méthode de travail solide, il risque le désengagement. Voir nos clés pour{" "}
        <a href="/guides/decrochage-scolaire-confiance-enfant">redonner confiance à un enfant qui décroche à l'école</a> et nos conseils pour{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">l'aider à réussir sans stresser</a>.
      </p>
      <p>
        Il convient aussi de distinguer le HPI d'autres profils neuroatypiques, comme détaillé dans notre guide{" "}
        <a href="/guides/autisme-tdah-apprentissage-forces-reelles">Autisme & TDAH : valoriser leurs forces d'apprentissage</a>.
      </p>

      <h2>Nourrir son potentiel par l'action concrète à la maison</h2>
      <p>
        Au lieu de surcharger un enfant précoce d'exercices scolaires abstraits, proposez-lui des projets où son intelligence se confronte à la matière et au réel :
      </p>
      <ul>
        <li>
          Proposez des défis scientifiques et logiques issus de nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a>.
        </li>
        <li>
          Canalisez son besoin d'expérimentation grâce à des{" "}
          <a href="/guides/activites-manuelles-enfant">projets de bricolage et de fabrication manuelle</a>.
        </li>
        <li>
          Développez son sens des responsabilités avec nos rituels pour{" "}
          <a href="/guides/autonomie-responsabilite-maison">rendre son enfant autonome au quotidien</a>.
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio ne délivre pas d'étiquette de QI. L'application propose des défis concrets du monde réel adaptés aux 9 formes d'intelligence. En photographiant ses réussites concrètes, l'enfant construit son Passeport de Talents, révélant ses véritables forces sans pression ni comparaison.
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

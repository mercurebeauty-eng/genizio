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
      "Aucun signe isolé ne suffit à le dire — le haut potentiel intellectuel (HPI) est un diagnostic psychologique, posé par un psychologue à l'aide de tests spécialisés, pas une observation qu'un parent ou une application peut établir seule. Ce qu'un parent peut en revanche repérer, c'est un ensemble d'indices qui justifient de consulter : une soif de comprendre le « pourquoi » qui dépasse largement les réponses données à l'école, une facilité à faire des liens entre des domaines sans rapport apparent, un décalage entre une intelligence verbale très développée et une maladresse émotionnelle ou sociale, ou au contraire un ennui profond et un désinvestissement scolaire malgré des capacités par ailleurs évidentes.",
  },
  {
    question: "Qu'est-ce qu'un enfant « zèbre » ?",
    answer:
      "« Zèbre » est un surnom utilisé en France depuis les années 2000 pour désigner les enfants à haut potentiel intellectuel : comme le zèbre, l'enfant HPI n'est ni un cheval blanc ni un cheval noir, mais un animal à part, qui pense autrement. Le mot est devenu courant dans les groupes de parents et sur Internet, mais il n'a aucune valeur clinique : ce qui compte n'est pas le surnom, mais de savoir si les signes que vous observez gênent réellement votre enfant au quotidien. Si c'est le cas, la démarche est toujours la même : en parler à l'école et consulter un professionnel qui pourra évaluer la situation.",
  },
  {
    question: "Mon enfant est intelligent mais n'aime pas l'école : est-ce lié ?",
    answer:
      "C'est une configuration fréquente, et pas seulement chez les enfants à haut potentiel. L'école mesure surtout deux formes d'intelligence — linguistique et logico-mathématique — dans un format standardisé qui avantage la rapidité d'exécution et l'obéissance à la consigne. Un enfant dont les forces sont ailleurs (spatiales, corporelles, entrepreneuriales) peut s'y ennuyer ou s'y sentir incompris sans qu'il y ait le moindre problème cognitif. Un enfant réellement à haut potentiel peut, lui, s'ennuyer pour la raison inverse : le rythme est trop lent. Dans les deux cas, le désintérêt scolaire n'est pas une information suffisante en soi — il faut regarder ce que l'enfant fait quand on le laisse choisir.",
  },
  {
    question: "Faut-il demander un saut de classe pour un enfant précoce qui s'ennuie ?",
    answer:
      "Le saut de classe est une décision qui se prend avec l'école et un professionnel, jamais seul : il aide certains enfants précoces dont l'ennui scolaire est réel, mais il peut aussi isoler socialement un enfant qui saute une année. Avant d'y penser, les pistes moins radicales sont souvent essayées en premier : des exercices plus difficiles dans la même classe, un club ou un projet à son niveau, un accompagnement à la maison. Le critère décisif reste l'enfant : est-ce que sa scolarité actuelle le fait souffrir ? Un enfant qui s'ennuie mais reste épanoui socialement peut très bien continuer dans sa classe avec des aménagements simples.",
  },
  {
    question: "Le potentiel d'un enfant se limite-t-il à ce qui est utile à l'école ?",
    answer:
      "Non, et c'est précisément l'angle mort le plus fréquent. Le potentiel entrepreneurial (organiser un petit commerce entre camarades, évaluer la valeur d'un objet, saisir une occasion), le potentiel social (négocier, fédérer un groupe, désamorcer un conflit) ou le potentiel corporel (coordination fine, sens de l'espace) sont des formes de compétence réelles, transférables plus tard dans la vie professionnelle, mais quasiment invisibles dans un bulletin scolaire classique.",
  },
  {
    question: "Faut-il faire tester le QI de son enfant ?",
    answer:
      "Un test de QI a un usage précis : objectiver une hypothèse clinique posée par un professionnel (psychologue ou neuropsychologue), en général parce qu'un décalage important gêne concrètement l'enfant au quotidien. Ce n'est pas un outil de confirmation d'ambition parentale, et un chiffre isolé, sans le contexte clinique qui l'accompagne, informe assez peu sur ce qu'un enfant sait réellement faire de ses mains ou avec les autres.",
  },
  {
    question: "Comment Génizio aide-t-il à repérer le potentiel d'un enfant ?",
    answer:
      "Génizio ne pose aucun diagnostic et ne remplace aucun professionnel de santé. L'application propose des défis concrets répartis sur 9 formes de talent (au sens large de la théorie de Gardner, adaptée), et met à jour la carte des talents de l'enfant à partir des défis qu'il a réellement menés à bien — jamais à partir d'un questionnaire déclaratif. L'objectif est d'élargir ce qu'un parent observe, notamment dans les domaines que l'école ne regarde jamais.",
  },
];

export const Route = createFileRoute("/guides/potentiel-haut-potentiel-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant HPI, surdoué ou précoce : comment le reconnaître",
      description:
        "Enfant surdoué, HPI, précoce ou zèbre : découvrez les signes révélateurs, les limites du test de QI et comment nourrir son potentiel sans le surmener.",
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
      intro="« Mon enfant est-il surdoué ou précoce ? » Cette question taraude de nombreux parents lorsque leur enfant pose des questions vertigineuses, s'ennuie profondément à l'école ou fait preuve d'une hypersensibilité hors norme. Voici les vrais repères d'observation à la maison, les réalités du bilan psychologique et les clés pour valoriser son génie sans l'enfermer dans une case."
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
          <strong>Une pensée arborescente et fulgurante :</strong> L'enfant fait des liens instantanés entre des sujets sans rapport apparent, posant des questions existentielles précoces (découvrez notre éclairage sur l'
          <a href="/guides/intelligences-multiples-gardner">intelligence existentielle et les 9 intelligences de Gardner</a>).
        </li>
        <li>
          <strong>Une hypersensibilité sensorielle et émotionnelle :</strong> Un sens aigu de la justice, des réactions intenses aux bruits ou aux textures, et parfois des tempêtes émotionnelles (consultez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour apaiser la frustration de l'enfant</a>).
        </li>
        <li>
          <strong>Un besoin irrépressible de comprendre le sens :</strong> Un rejet viscéral du « par cœur » et des consignes non justifiées, qui peut être confondu avec de l'opposition ou un{" "}
          <a href="/guides/enfant-agite-concentration">manque d'attention et de concentration</a>.
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
        « Mon enfant a d'immenses capacités mais ses notes chutent » : ce paradoxe est fréquent. L'enfant précoce souffre souvent d'un <strong>ennui actif</strong> : le rythme de répétition scolaire ne correspond pas à sa vitesse de traitement. Sans méthode de travail solide, il risque le désengagement. Découvrez nos clés pour{" "}
        <a href="/guides/decrochage-scolaire-confiance-enfant">redonner confiance à un enfant qui décroche à l'école</a> et nos conseils pour{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">l'aider à réussir sans stresser</a>.
      </p>
      <p>
        Il est également crucial de distinguer le HPI d'autres profils neuroatypiques, comme détaillé dans notre guide{" "}
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

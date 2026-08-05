import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/potentiel-haut-potentiel-enfant";

const FAQ = [
  {
    question: "Comment savoir si mon enfant a un haut potentiel ?",
    answer:
      "Aucun signe isolé ne suffit à le dire — le haut potentiel intellectuel (HPI) est un diagnostic psychologique, posé par un psychologue à l'aide de tests standardisés (comme le WISC), pas une observation qu'un parent ou une application peut établir seule. Ce qu'un parent peut en revanche repérer, c'est un ensemble d'indices qui justifient de consulter : une soif de comprendre le « pourquoi » qui dépasse largement les réponses données à l'école, une facilité à faire des liens entre des domaines sans rapport apparent, un décalage entre une intelligence verbale très développée et une maladresse émotionnelle ou sociale, ou au contraire un ennui profond et un désinvestissement scolaire malgré des capacités par ailleurs évidentes.",
  },
  {
    question: "Mon enfant est intelligent mais n'aime pas l'école : est-ce lié ?",
    answer:
      "C'est une configuration fréquente, et pas seulement chez les enfants à haut potentiel. L'école mesure surtout deux formes d'intelligence — linguistique et logico-mathématique — dans un format standardisé qui avantage la rapidité d'exécution et l'obéissance à la consigne. Un enfant dont les forces sont ailleurs (spatiales, corporelles, entrepreneuriales) peut s'y ennuyer ou s'y sentir incompris sans qu'il y ait le moindre problème cognitif. Un enfant réellement à haut potentiel peut, lui, s'ennuyer pour la raison inverse : le rythme est trop lent. Dans les deux cas, le désintérêt scolaire n'est pas une information suffisante en soi — il faut regarder ce que l'enfant fait quand on le laisse choisir.",
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
      title: "Comment savoir si mon enfant a un haut potentiel",
      description:
        "Les vrais signes à observer, ce que seul un professionnel peut diagnostiquer, et pourquoi le potentiel d'un enfant dépasse largement ce que l'école mesure.",
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
            { name: "Haut potentiel", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Comment savoir si mon enfant a un haut potentiel ou un don particulier",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-07-27",
          about: [
            { "@type": "Thing", name: "Haut potentiel intellectuel" },
            { "@type": "Thing", name: "Développement du potentiel de l'enfant" },
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
      eyebrow="Potentiel & talents"
      title="Comment savoir si mon enfant a un haut potentiel ou un don particulier"
      intro="La question revient chez presque tous les parents à un moment ou un autre. Voici ce qui relève de l'observation à la maison, ce qui relève d'un diagnostic professionnel, et pourquoi le potentiel réel d'un enfant dépasse largement ce que l'école mesure."
      updated="27 juillet 2026"
      readingTime="10 min"
      related={[
        { label: "Les intelligences multiples de Gardner", to: "/guides/intelligences-multiples-gardner" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "30 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Quels défis pour un adolescent ?", to: "/guides/defis-pour-adolescents" },
      ]}
    >
      <h2>Deux questions qu'on confond souvent</h2>
      <p>
        « Mon enfant a-t-il un don ? » recouvre en réalité deux questions très différentes. La
        première est clinique : correspond-il aux critères diagnostiques du <strong>haut potentiel
        intellectuel</strong> (HPI), une catégorie psychologique précise, établie par un
        professionnel à l'aide de tests standardisés. La seconde est bien plus large : dans quels
        domaines cet enfant particulier est-il déjà compétent, ou le deviendrait rapidement s'il en
        avait l'occasion — que ce soit reconnu par un diagnostic ou non.
      </p>
      <p>
        La confusion entre les deux mène à deux impasses opposées : soit on attend un diagnostic
        formel avant de prendre au sérieux ce qu'un enfant montre déjà, soit on colle l'étiquette
        « surdoué » sur la base d'impressions, ce qui n'aide ni l'enfant ni personne. Ce guide traite
        des deux, séparément.
      </p>

      <h2>Le haut potentiel intellectuel : ce qu'un parent peut observer</h2>
      <MedicalDisclaimer>
        Le haut potentiel intellectuel (HPI) est un diagnostic psychologique. Ce guide décrit des
        indices qui justifient de consulter, pas des critères suffisants pour conclure vous-même.
        Seul un psychologue peut poser ce diagnostic, à l'aide de tests standardisés.
      </MedicalDisclaimer>
      <p>
        Les indices les plus souvent rapportés par les psychologues qui reçoivent des familles ne
        sont pas « une bonne mémoire » ou « de l'avance scolaire » seules, mais plutôt une
        combinaison de traits :
      </p>
      <ul>
        <li>
          <strong>Une pensée en arborescence.</strong> L'enfant part d'une question et enchaîne
          spontanément vers des domaines sans rapport apparent, avec une vitesse qui peut
          désorganiser son propre discours.
        </li>
        <li>
          <strong>Un décalage entre intelligence et maturité émotionnelle.</strong> Un raisonnement
          très abstrait pour son âge, combiné à une hypersensibilité ou des difficultés sociales
          bien réelles.
        </li>
        <li>
          <strong>Un ennui actif, pas passif.</strong> Non pas un enfant qui s'ennuie et se met en
          retrait, mais un enfant qui perturbe la classe précisément parce que le rythme est trop
          lent pour lui.
        </li>
        <li>
          <strong>Un perfectionnisme paralysant.</strong> Une exigence envers soi-même si élevée
          qu'elle empêche parfois de commencer une tâche, par peur de ne pas la réussir parfaitement.
        </li>
      </ul>
      <p>
        Si plusieurs de ces traits sont présents et gênent réellement l'enfant au quotidien — à
        l'école, dans ses relations, dans son rapport à lui-même — une consultation avec un
        psychologue spécialisé dans le développement de l'enfant est la seule étape qui permette de
        vraiment trancher.
      </p>

      <h2>Le potentiel, au sens large : ce que l'école ne regarde pas</h2>
      <p>
        Qu'il y ait diagnostic ou non, la question la plus utile au quotidien n'est pas « est-il
        surdoué ? » mais « dans quoi est-il déjà compétent, et dans quoi ne l'a-t-on jamais laissé
        essayer ? ». La théorie des intelligences multiples de Howard Gardner (détaillée dans{" "}
        <a href="/guides/intelligences-multiples-gardner">notre guide dédié</a>) est utile ici
        précisément parce qu'elle élargit le regard au-delà du linguistique et du logico-mathématique
        — les deux seules formes que l'école évalue vraiment.
      </p>
      <p>
        Un enfant qui négocie habilement entre camarades, qui repère instinctivement la valeur d'un
        objet, qui construit sans plan avec une justesse d'ingénieur, ou qui apaise un groupe en
        conflit sans qu'on le lui ait demandé, démontre un potentiel réel — simplement dans un
        registre que le bulletin scolaire ne mesure jamais.
      </p>

      <h2>Pourquoi le désintérêt scolaire ne prouve rien à lui seul</h2>
      <p>
        « Mon enfant est intelligent mais n'aime pas l'école » est l'une des phrases les plus
        entendues par les psychologues scolaires, et elle peut avoir deux origines opposées :
      </p>
      <ol>
        <li>
          <strong>Un rythme trop lent</strong> pour un enfant qui a besoin d'aller plus vite ou plus
          loin — fréquent chez les profils à haut potentiel.
        </li>
        <li>
          <strong>Un format inadapté</strong> pour un enfant dont les forces réelles sont ailleurs —
          fréquent chez tous les autres profils, sans lien avec un haut potentiel quelconque.
        </li>
      </ol>
      <p>
        Distinguer les deux ne se fait pas en une conversation, mais en observant, sur plusieurs
        semaines, ce que l'enfant fait quand la contrainte scolaire disparaît : vers quoi revient-il
        spontanément, et dans quoi persévère-t-il malgré la difficulté ?
      </p>

      <h2>Ce que Génizio observe, concrètement</h2>
      <p>
        Génizio ne cherche pas à établir un diagnostic ni à confirmer un haut potentiel — ce n'est ni
        son rôle ni sa compétence. L'application propose à l'enfant des défis concrets à réaliser à
        la maison, répartis sur 9 formes de talent, et met à jour sa carte de talents à partir des
        défis effectivement menés à bien, preuve à l'appui. L'intérêt de cette approche est
        d'observer sur la durée plutôt que sur un instantané, et de couvrir des domaines — sociaux,
        entrepreneuriaux, corporels — qu'aucun bulletin scolaire ne regarde.
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

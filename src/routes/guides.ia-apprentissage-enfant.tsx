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

const PATH = "/guides/ia-apprentissage-enfant";

const FAQ = [
  {
    question: "ChatGPT est-il sans danger pour les devoirs d'un enfant ?",
    answer:
      "Cela dépend entièrement de comment il est utilisé. ChatGPT n'est pas conçu pour un enfant : il peut affirmer une erreur avec la même assurance qu'un fait vérifié, et une conversation libre et non supervisée pose de vraies questions de sécurité. En revanche, utilisé par le parent comme outil de préparation — pour reformuler une leçon, générer des exercices ou expliquer une notion avec un exemple concret — il devient un assistant utile. La règle simple : l'adulte dialogue avec l'IA, jamais l'enfant seul, et l'enfant ne copie jamais une réponse toute faite.",
  },
  {
    question: "Mon enfant peut-il utiliser ChatGPT pour faire ses devoirs sans tricher ?",
    answer:
      "Oui, si l'usage est cadré. Tricher, c'est demander à l'IA de faire le devoir à sa place : recopier une rédaction, une réponse d'exercice ou une leçon sans comprendre. L'usage qui apprend, c'est celui où l'enfant reste l'auteur : il explique d'abord ce qu'il a compris, il essaie seul, et ce n'est qu'ensuite qu'un adulte peut utiliser l'IA pour combler un trou (refaire le même type d'exercice, trouver un exemple de la vie réelle, vérifier un résultat). Posez la règle avec lui dès le départ : « l'IA nous aide à comprendre, elle ne fait pas le travail à ta place ».",
  },
  {
    question: "L'IA va-t-elle remplacer le rôle du parent dans l'apprentissage ?",
    answer:
      "Non, et un outil bien conçu ne devrait même pas essayer. L'IA est efficace pour générer de la variété et adapter un niveau de difficulté à grande échelle — deux tâches fastidieuses pour un parent seul. Elle n'a en revanche aucune légitimité pour valider ce qu'un enfant a réellement accompli, encourager au bon moment, ou décider ce qui est important pour cet enfant précis. Ce jugement reste, et doit rester, entre les mains du parent.",
  },
  {
    question: "À partir de quel âge un enfant peut-il utiliser une IA ?",
    answer:
      "Les grandes plateformes (ChatGPT, Gemini, Copilot) exigent la majorité numérique — 15 ans dans l'Union européenne — pour un compte libre, et encore plus pour un compte personnel. Concrètement, pour un enfant de moins de 12 ans, l'IA doit rester un outil du parent : c'est l'adulte qui pose les questions et adapte les réponses à l'enfant. Entre 12 et 15 ans, l'usage peut être partagé, toujours sous supervision. L'âge n'est pas une formalité : plus l'enfant est jeune, plus il croit ce qu'on lui dit — y compris ce que dit une machine.",
  },
  {
    question: "Comment utiliser l'IA pour aider un enfant à apprendre sans risque ?",
    answer:
      "Trois principes limitent l'essentiel des risques : privilégier un outil pensé pour l'enfance plutôt qu'un assistant généraliste détourné de son usage prévu, garder une validation humaine sur ce que l'IA produit (un parent qui regarde le résultat plutôt qu'une IA qui juge seule), et préférer une IA qui pousse vers une action concrète dans le monde réel — construire, manipuler, présenter — plutôt qu'une conversation qui reste virtuelle.",
  },
  {
    question: "Comment Génizio utilise-t-il l'intelligence artificielle ?",
    answer:
      "L'IA de Génizio génère des défis d'apprentissage personnalisés pour chaque enfant, en fonction de son âge, de ses centres d'intérêt et de ce qu'il a déjà réalisé. Chaque défi se termine par une action concrète et réelle — jamais une simple conversation avec l'IA — et la réussite est validée par une preuve (le plus souvent une photo), elle-même vérifiée. Le parent supervise l'ensemble et reste la seule autorité qui décide et valide.",
  },
];

export const Route = createFileRoute("/guides/ia-apprentissage-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "ChatGPT et IA pour les devoirs de mon enfant : comment faire",
      description:
        "Comment utiliser ChatGPT et l'IA pour aider son enfant à faire ses devoirs sans tricher : prompts concrets pour les parents, âge minimum, risques et bons réflexes.",
      path: PATH,
      image: "/guides/og-ia.jpg",
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
            { name: "IA & apprentissage", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Comment utiliser ChatGPT et l'IA pour aider son enfant à faire ses devoirs",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-ia.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "ChatGPT et éducation" },
            { "@type": "Thing", name: "Devoirs scolaires et IA" },
            { "@type": "Thing", name: "Apprentissage personnalisé" },
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
      eyebrow="IA & apprentissage"
      title="Comment utiliser ChatGPT et l'IA pour aider son enfant à faire ses devoirs"
      intro="Votre enfant a des devoirs, des leçons à comprendre, des exercices à refaire — et vous n'avez pas toujours le temps ni la méthode. ChatGPT peut devenir un allié précieux pour le soir des devoirs, à condition de savoir l'utiliser : c'est un outil pour l'adulte, pas une nounou pour l'enfant. Voici comment, avec des exemples de demandes concrets."
      updated="14 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Les intelligences multiples de Gardner",
          to: "/guides/intelligences-multiples-gardner",
        },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-ia.jpg"
        alt="Père guidant avec bienveillance sa fille découvrant une application d'apprentissage interactif par IA"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Ce que l'IA fait réellement mieux qu'un parent seul</h2>
      <p>
        Un parent, aussi investi soit-il, ne peut pas générer chaque semaine une activité inédite,
        parfaitement calibrée au niveau exact de son enfant, dans un domaine qu'il n'a pas encore
        exploré. L'IA excelle précisément sur cette tâche : produire de la variété, ajuster une
        difficulté, croiser des domaines, à un coût et une vitesse qu'aucun parent ne peut égaler
        seul.
      </p>
      <p>
        Pour les devoirs, cela se traduit en trois usages concrets :{" "}
        <strong>reformuler une leçon</strong> que l'enfant n'a pas comprise en classe,{" "}
        <strong>générer des exercices supplémentaires</strong> du même type que ceux de l'école, et{" "}
        <strong>trouver des exemples de la vie réelle</strong> qui rendent une notion abstraite
        concrète. C'est un atout réel — à condition de ne pas confondre « générer l'exercice » et «
        faire le devoir à la place de l'enfant ».
      </p>

      <h2>5 demandes à copier telles quelles pour le soir des devoirs</h2>
      <p>
        La qualité de la réponse dépend de la qualité de la demande. Voici cinq formulations qui
        fonctionnent, à adapter avec le sujet de votre enfant :
      </p>
      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Refaire le même type d'exercice
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          <em>
            « Donne-moi 5 exercices de division comme celui-ci, avec des mangues à partager, pour un
            enfant de 9 ans. Donne les réponses à la fin. »
          </em>{" "}
          L'enfant refait le geste en classe, avec un exemple de son quotidien.
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. Expliquer comme une maman</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          <em>
            « Explique la différence entre un nom et un adjectif à un enfant de 8 ans, comme si tu
            étais sa maman, avec des exemples qu'on trouve dans une cour de maison. »
          </em>{" "}
          Le registre change : simple, concret, patient.
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Vérifier sans donner la réponse
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          <em>
            « Mon fils a répondu que 7 x 8 = 54. Sans lui donner la bonne réponse, propose une
            question qui l'aide à trouver son erreur tout seul. »
          </em>{" "}
          L'IA devient un répétiteur qui fait réfléchir, pas une calculatrice qui répond.
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-purple-50 p-5 border border-purple-200">
        <h3 className="font-bold text-purple-950 text-base mb-2">
          4. Un exemple du quartier pour une leçon abstraite
        </h3>
        <p className="text-sm text-purple-900 leading-relaxed">
          <em>
            « Trouve 3 exemples de fractions dans un marché en Afrique de l'Ouest (demi, quart,
            tiers). »
          </em>{" "}
          L'illustration de la vie réelle ancre la leçon : c'est ce que l'école n'a pas le temps de
          faire.
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-rose-50 p-5 border border-rose-200">
        <h3 className="font-bold text-rose-950 text-base mb-2">
          5. Préparer une récitation ou un exposé
        </h3>
        <p className="text-sm text-rose-900 leading-relaxed">
          <em>
            « Aide-moi à préparer un exposé de 3 minutes sur le climat avec un enfant de 10 ans : 3
            idées principales, une phrase d'introduction qui accroche, et une question pour la
            classe. »
          </em>{" "}
          L'enfant récite et explique avec ses mots — pas ceux de la machine.
        </p>
      </div>

      <h2>Où l'usage non cadré pose de vrais problèmes</h2>
      <p>
        ChatGPT et les autres assistants conversationnels généralistes ne sont pas conçus pour des
        enfants, et un usage libre, sans cadre, expose à plusieurs risques réels et documentés :
      </p>
      <ul>
        <li>
          <strong>Une confiance mal placée.</strong> Ces outils formulent une réponse fausse avec la
          même assurance qu'une réponse juste. Un enfant qui n'a pas encore les outils critiques
          pour repérer la différence peut apprendre une erreur avec autant de conviction qu'un fait
          vérifié.
        </li>
        <li>
          <strong>La tricherie facile.</strong> Demander à l'IA de rédiger une rédaction ou de
          résoudre un problème ne demande aucun effort — et n'apprend rien. L'enfant qui recopie
          sans comprendre se retrouve doublement perdant : il n'a pas appris, et il croit savoir.
        </li>
        <li>
          <strong>Une conversation sans garde-fou adapté.</strong> Un assistant généraliste ne sait
          pas qu'il parle à un enfant de 8 ans plutôt qu'à un adulte, et n'ajuste ni son registre ni
          ses limites en conséquence.
        </li>
        <li>
          <strong>Le passage au virtuel plutôt qu'au concret.</strong> Une conversation qui reste
          une conversation n'entraîne aucune compétence transférable dans le monde réel —
          construire, présenter, manipuler restent des apprentissages d'un autre ordre.
        </li>
        <li>
          <strong>Les données de l'enfant.</strong> Un outil qui collecte des informations sur un
          mineur doit le faire avec un cadre de confidentialité strict, ce qui n'est pas garanti par
          tous les usages détournés d'assistants généralistes.
        </li>
      </ul>

      <h2>Les règles d'or pour les devoirs avec ChatGPT</h2>
      <ol>
        <li>
          <strong>L'adulte dialogue, jamais l'enfant seul.</strong> Pour un enfant de moins de 12
          ans, c'est vous qui posez les questions et qui adaptez les réponses. L'IA ne remplace pas
          votre présence : elle la complète.
        </li>
        <li>
          <strong>L'enfant essaie avant, l'IA après.</strong> On demande à l'IA d'expliquer ou de
          vérifier après un premier essai de l'enfant. Jamais avant : un enfant qui reçoit la
          réponse sans chercher n'apprend pas.
        </li>
        <li>
          <strong>Jamais de recopiage.</strong> Ce que l'IA produit doit être reformulé par l'enfant
          avec ses propres mots — à l'oral ou à l'écrit. S'il ne peut pas l'expliquer, c'est qu'il
          n'a pas compris, et on recommence autrement.
        </li>
        <li>
          <strong>Vérifier les réponses.</strong> L'IA se trompe parfois avec assurance. Pour les
          matières où c'est possible (calcul, grammaire), faites-vous confirmer par une relecture ou
          croisez avec le livre de classe.
        </li>
      </ol>

      <h2>Comment Génizio applique ces principes</h2>
      <p>
        L'IA de Génizio génère un défi personnalisé pour chaque enfant, à partir de son âge, de ses
        centres d'intérêt et de ce qu'il a déjà accompli — mais le défi se termine toujours par une
        action réelle, dans le monde réel, jamais par une simple conversation avec l'IA. La réussite
        est validée par une preuve, le plus souvent une photo du résultat, elle-même vérifiée. Le
        parent supervise l'ensemble du parcours et reste la seule autorité qui valide ce qui compte
        pour son enfant.
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

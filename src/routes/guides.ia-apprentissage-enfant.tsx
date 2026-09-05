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
        "Comment utiliser ChatGPT et l'IA pour aider son enfant sans tricher ? Découvrez 5 prompts pour parents, les règles d'or et les bonnes pratiques scolaires.",
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
          description:
            "Guide parental pour intégrer l'intelligence artificielle dans les devoirs à la maison de façon éthique, pédagogique et sans tricherie.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-ia.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-27",
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
      eyebrow="IA & Éducation"
      title="Comment utiliser ChatGPT et l'IA pour aider son enfant à faire ses devoirs"
      intro="Votre enfant a des devoirs, des leçons à comprendre et des exercices à refaire. ChatGPT peut devenir un allié pédagogique précieux pour le soir des devoirs, à condition de savoir l'utiliser : c'est un outil de facilitation pour l'adulte, pas une calculatrice magique pour l'enfant. Voici comment l'utiliser efficacement avec 5 prompts prêts à l'emploi."
      updated="27 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Pratique avant théorie avec l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
        {
          label: "Réussite scolaire sans stress",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "Test d'orientation collégien & IA",
          to: "/guides/test-orientation-metier-enfant-futur",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Réduire les écrans sans conflit",
          to: "/guides/ecrans-addiction-alternatives-enfant",
        },
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
        Un parent, aussi investi soit-il, ne peut pas improviser chaque soir des analogies parfaites
        pour chaque notion d'école. L'IA excelle pour vulgariser, adapter un niveau de difficulté et
        contextualiser des concepts abstraits (découvrez pourquoi nous prônons{" "}
        <a href="/guides/pratique-avant-theorie-apprentissage-ia">
          la pratique avant la théorie à l'ère de l'IA
        </a>
        ).
      </p>
      <p>
        Pour les devoirs, cela se traduit en trois usages concrets :{" "}
        <strong>reformuler une leçon</strong> complexe,{" "}
        <strong>générer des exercices progressifs</strong> et{" "}
        <strong>trouver des exemples du quotidien</strong> qui ancrent la mémoire (retrouvez nos 6
        habitudes maison pour la{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">réussite scolaire de l'enfant</a>).
      </p>

      <h2>5 demandes à copier telles quelles pour le soir des devoirs</h2>
      <p>
        Voici cinq formulations de prompts très efficaces à utiliser pour accompagner votre enfant :
      </p>
      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Refaire le même type d'exercice
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          <em>
            « Donne-moi 5 exercices de division comme celui-ci, avec des mangues à partager, pour un
            enfant de 9 ans. Donne les réponses à la fin. »
          </em>
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Expliquer avec une métaphore imagée
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          <em>
            « Explique la différence entre un nom et un adjectif à un enfant de 8 ans, avec des
            exemples qu'on trouve dans une cour de maison. »
          </em>
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Guider sans donner la réponse brute
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          <em>
            « Mon fils a répondu que 7 x 8 = 54. Sans lui donner la bonne réponse, propose une
            question qui l'aide à trouver son erreur tout seul. »
          </em>
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-purple-50 p-5 border border-purple-200">
        <h3 className="font-bold text-purple-950 text-base mb-2">
          4. Contextualiser une notion abstraite
        </h3>
        <p className="text-sm text-purple-900 leading-relaxed">
          <em>
            « Trouve 3 exemples de fractions dans un marché en Afrique de l'Ouest (demi, quart,
            tiers). »
          </em>
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-rose-50 p-5 border border-rose-200">
        <h3 className="font-bold text-rose-950 text-base mb-2">5. Structurer un exposé oral</h3>
        <p className="text-sm text-rose-900 leading-relaxed">
          <em>
            « Aide-moi à préparer un exposé de 3 minutes sur le cycle de l'eau avec un enfant de 10
            ans : 3 idées clés et une accroche dynamique. »
          </em>{" "}
          (pour l'aider à s'exprimer devant la classe, découvrez nos astuces pour{" "}
          <a href="/guides/timidite-confiance-prise-de-parole">
            libérer la prise de parole d'un enfant timide
          </a>
          ).
        </p>
      </div>

      <h2>Les 4 règles d'or pour des devoirs éthiques avec l'IA</h2>
      <ol className="space-y-3 my-6">
        <li>
          <strong>Le parent pilote l'outil :</strong> C'est l'adulte qui filtre et adapte les
          réponses de l'IA pour préserver l'équilibre numérique (voir notre guide sur les{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">
            écrans et les alternatives sans addiction
          </a>
          ).
        </li>
        <li>
          <strong>L'enfant réfléchit avant :</strong> L'IA intervient en validation ou en éclairage,
          jamais comme premier recours de facilité.
        </li>
        <li>
          <strong>Zéro copier-coller :</strong> L'enfant doit toujours reformuler les notions avec
          ses propres mots pour ancrer les{" "}
          <a href="/guides/intelligences-multiples-gardner">connexions cognitives</a>.
        </li>
        <li>
          <strong>Préparer l'avenir :</strong> Familiariser son enfant aux usages intelligents de
          l'IA est un tremplin pour son futur métier (découvrez notre{" "}
          <a href="/guides/test-orientation-metier-enfant-futur">
            test d'orientation collégien spécial IA
          </a>
          ).
        </li>
      </ol>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio transforme l'IA en un tuteur interactif et bienveillant (Naya). Plutôt que de donner
        des réponses prémâchées, Naya challenge l'enfant par des missions pratiques dans le monde
        réel et valide ses accomplissements avec le parent.
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

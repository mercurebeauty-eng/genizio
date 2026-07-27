import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/ia-apprentissage-enfant";

const FAQ = [
  {
    question: "L'intelligence artificielle est-elle sans danger pour l'apprentissage d'un enfant ?",
    answer:
      "Cela dépend entièrement de comment elle est utilisée. Un chatbot généraliste (type assistant conversationnel grand public) n'est pas conçu pour un enfant : il peut affirmer une erreur avec la même assurance qu'un fait vérifié, il n'a pas de garde-fou adapté à l'âge ou à l'état émotionnel de l'enfant, et une conversation libre et non supervisée pose de vraies questions de sécurité. Un outil pensé spécifiquement pour l'enfance, avec supervision parentale intégrée et un usage cadré (générer une activité concrète plutôt que dialoguer librement), réduit drastiquement ces risques.",
  },
  {
    question: "L'IA va-t-elle remplacer le rôle du parent dans l'apprentissage ?",
    answer:
      "Non, et un outil bien conçu ne devrait même pas essayer. L'IA est efficace pour générer de la variété et adapter un niveau de difficulté à grande échelle — deux tâches fastidieuses pour un parent seul. Elle n'a en revanche aucune légitimité pour valider ce qu'un enfant a réellement accompli, encourager au bon moment, ou décider ce qui est important pour cet enfant précis. Ce jugement reste, et doit rester, entre les mains du parent.",
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
      title: "Comment utiliser l'IA pour aider son enfant à apprendre",
      description:
        "Ce qu'une IA bien conçue apporte réellement à l'apprentissage d'un enfant, les risques d'un usage non cadré, et les principes pour l'utiliser sans danger.",
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
            { name: "IA & apprentissage", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Comment utiliser l'intelligence artificielle pour aider son enfant à apprendre",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          about: [
            { "@type": "Thing", name: "Intelligence artificielle et éducation" },
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
      title="Comment utiliser l'intelligence artificielle pour aider son enfant à apprendre"
      intro="L'IA générative s'invite dans l'apprentissage des enfants, pour le meilleur et pour le pire. Voici ce qu'elle apporte réellement, ce qui pose problème quand elle est mal utilisée, et les principes pour en tirer parti sans risque."
      updated="27 juillet 2026"
      readingTime="8 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "30 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Quels défis pour un adolescent ?", to: "/guides/defis-pour-adolescents" },
      ]}
    >
      <h2>Ce que l'IA fait réellement mieux qu'un parent seul</h2>
      <p>
        Un parent, aussi investi soit-il, ne peut pas générer chaque semaine une activité inédite,
        parfaitement calibrée au niveau exact de son enfant, dans un domaine qu'il n'a pas encore
        exploré. C'est un travail de conception pédagogique à temps plein. L'IA générative excelle
        précisément sur cette tâche répétitive et combinatoire : produire de la variété, ajuster une
        difficulté, croiser des domaines, à un coût et une vitesse qu'aucun parent ne peut égaler
        seul.
      </p>
      <p>
        C'est un atout réel, pas un gadget marketing — à condition de ne pas confondre « générer
        l'activité » et « juger l'enfant », qui sont deux tâches très différentes.
      </p>

      <h2>Où l'usage non cadré pose de vrais problèmes</h2>
      <p>
        Les assistants conversationnels généralistes (les grands chatbots grand public) ne sont pas
        conçus pour des enfants, et un usage libre, sans cadre, expose à plusieurs risques réels et
        documentés :
      </p>
      <ul>
        <li>
          <strong>Une confiance mal placée.</strong> Ces outils formulent une réponse fausse avec la
          même assurance qu'une réponse juste. Un enfant qui n'a pas encore les outils critiques pour
          repérer la différence peut apprendre une erreur avec autant de conviction qu'un fait
          vérifié.
        </li>
        <li>
          <strong>Une conversation sans garde-fou adapté.</strong> Un assistant généraliste ne sait
          pas qu'il parle à un enfant de 8 ans plutôt qu'à un adulte, et n'ajuste ni son registre ni
          ses limites en conséquence.
        </li>
        <li>
          <strong>Le passage au virtuel plutôt qu'au concret.</strong> Une conversation qui reste une
          conversation n'entraîne aucune compétence transférable dans le monde réel — construire,
          présenter, manipuler restent des apprentissages d'un autre ordre.
        </li>
        <li>
          <strong>Les données de l'enfant.</strong> Un outil qui collecte des informations sur un
          mineur doit le faire avec un cadre de confidentialité strict, ce qui n'est pas garanti par
          tous les usages détournés d'assistants généralistes.
        </li>
      </ul>

      <h2>Trois principes pour un usage sans danger</h2>
      <ol>
        <li>
          <strong>Un outil pensé pour l'enfance, pas un assistant généraliste détourné.</strong> La
          différence n'est pas cosmétique : un outil conçu pour les enfants intègre des limites de
          conversation, une supervision parentale et une politique de données pensées dès le départ.
        </li>
        <li>
          <strong>Une validation humaine qui reste décisive.</strong> L'IA propose, le parent
          dispose. Ce n'est jamais à une IA de décider seule si un enfant a « réussi » quelque chose
          d'important pour lui.
        </li>
        <li>
          <strong>Le concret plutôt que le seul dialogue.</strong> Une IA qui pousse l'enfant à faire
          quelque chose de tangible — construire, présenter, résoudre avec les mains — transforme une
          conversation en compétence réelle, ce qu'un simple échange de messages ne fait pas.
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

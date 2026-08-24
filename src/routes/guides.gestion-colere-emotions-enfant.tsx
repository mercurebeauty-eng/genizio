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

const PATH = "/guides/gestion-colere-emotions-enfant";

const FAQ = [
  {
    question: "Pourquoi mon enfant se met-il si facilement en colère ?",
    answer:
      "Parce que le cerveau qui régule les émotions est le dernier à mûrir chez l'enfant : il se développe jusque vers 20-25 ans. Avant cela, une frustration déclenche une réaction émotionnelle immédiate, sans le filtre qui permet à un adulte de prendre du recul. Ajoutez à cela la fatigue, la faim ou un changement de rythme, et la colère devient vite une soupape. Ce n'est pas un caprice ni une mauvaise volonté : c'est un cerveau en construction qui a besoin d'être accompagné, pas puni, pour apprendre à se réguler.",
  },
  {
    question: "Comment réagir quand mon enfant fait une crise de colère ?",
    answer:
      "Quatre réflexes aident : rester calme (votre calme est contagieux, votre colère aussi) ; accueillir l'émotion sans la juger (« tu es très en colère parce que... ») — nommer l'émotion aide le cerveau à la traiter ; ne pas céder sur la limite qui a déclenché la crise, sinon la crise devient un moyen d'obtenir ; et offrir un exutoire physique (courir, taper dans un coussin, déchirer un papier) plutôt que de demander de se taire. Une fois la crise passée, on reparle de ce qui s'est passé, brièvement, sans sermon.",
  },
  {
    question: "Que dire pendant une crise de colère ? Et que ne jamais dire ?",
    answer:
      "Ce qui aide, à dire à voix basse, phrases courtes : « je suis là », « tu es en colère, c'est normal », « je ne te laisserai pas te faire mal », « on va trouver une solution ensemble ». Ce qui aggrave, à éviter absolument : « arrête de pleurer », « tu es ridicule », « tu fais exprès », « si tu continues, tu vas voir », et toute menace ou moquerie. La règle simple : on accueille le ressenti, on tient la limite, et on garde un ton calme même si l'enfant crie. Ce que vous dites compte moins que le calme avec lequel vous le dites.",
  },
  {
    question: "Faut-il punir un enfant pour sa colère ?",
    answer:
      "Punir la colère elle-même est contre-productif : elle est une émotion, pas un comportement, et l'enfant n'en est pas plus responsable que de sa faim. On peut en revanche poser des limites sur les comportements qui accompagnent la colère (frapper, casser, insulter) avec des conséquences claires. La distinction est importante : accueillir la colère (« je vois que tu es en colère ») n'est pas tolérer les actes (« tu as le droit d'être en colère, pas de frapper »). Un enfant qui peut exprimer sa colère sans être jugé apprend à la traverser ; un enfant puni pour l'avoir ressentie apprend seulement à la cacher.",
  },
  {
    question: "Les écrans rendent-ils mon enfant plus colérique ?",
    answer:
      "Le lien est indirect mais réel. Un enfant qui passe beaucoup de temps devant un écran fait moins d'activités physiques, dort parfois moins, et subit des transitions brutales quand on éteint — trois ingrédients classiques des crises. Sans diaboliser l'écran, deux réflexes réduisent les crises liées aux écrans : prévenir avant d'éteindre (« encore 5 minutes, ensuite on éteint ensemble ») et remplacer le temps d'écran retiré par une activité concrète plutôt que par du vide. Beaucoup de parents constatent une baisse nette des crises après quelques semaines de réduction progressive du temps d'écran.",
  },
  {
    question: "La colère de mon enfant est-elle normale ou faut-il consulter ?",
    answer:
      "La colère fréquente est normale chez l'enfant, surtout entre 2 et 6 ans. Elle mérite une évaluation professionnelle quand elle devient excessive en durée (des crises de plus de 30 minutes à répétition), en intensité (danger pour lui-même ou les autres, destruction), ou en fréquence (plusieurs crises par jour à un âge où l'enfant sait parler). Des signes associés — troubles du sommeil, repli, refus scolaire, idées noires — justifient aussi de consulter. Un pédiatre, un psychologue ou un pédopsychiatre peut évaluer la situation ; ce n'est pas un échec parental, c'est une prise en charge précoce.",
  },
  {
    question: "Génizio peut-il aider un enfant qui se met souvent en colère ?",
    answer:
      "Indirectement, oui : une grande partie des crises vient d'un excès d'énergie ou d'ennui mal canalisé. Génizio propose des défis concrets adaptés à l'âge et aux centres d'intérêt de l'enfant — construire, mesurer, cuisiner, organiser — qui donnent un débouché physique et créatif à cette énergie, et une reconnaissance basée sur ce qu'il a réellement accompli. Génizio ne pose aucun diagnostic et ne remplace pas un professionnel : c'est un outil éducatif qui crée des occasions de réussite et d'apaisement à la maison.",
  },
];

export const Route = createFileRoute("/guides/gestion-colere-emotions-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Crise de colère enfant : 5 outils pour l'apaiser",
      description:
        "Crise de colère, explosion, frustration : pourquoi l'enfant s'énerve, que dire pendant la crise, et 5 outils concrets pour l'apaiser sans céder ni crier.",
      path: PATH,
      image: "/guides/og-colere.jpg",
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
            { name: "Gestion des émotions", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Gérer la crise de colère de son enfant : 5 outils pour l'apaiser",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-colere.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Colère de l'enfant" },
            { "@type": "Thing", name: "Gestion des émotions" },
            { "@type": "Thing", name: "Crises de l'enfant" },
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
      eyebrow="Émotions & bien-être"
      title="Gérer la crise de colère de son enfant : 5 outils pour l'apaiser"
      intro="Une crise de colère à 18 h dans la cuisine, et c'est toute la maison qui tangue. Avant de chercher à « faire taire » cette colère, il faut comprendre ce qu'elle est : une émotion réelle, pas une attaque contre vous. Voici comment la traverser sans céder, sans crier, et en apprenant quelque chose à l'enfant."
      updated="14 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        {
          label: "Se faire obéir sans crier ni frapper",
          to: "/guides/discipline-positive-sans-punition",
        },
        {
          label: "Enfant qui perd confiance : l'aider",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-colere.jpg"
        alt="Parent accompagnant calmement un enfant en colère à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical et
        ne permet pas d'évaluer un trouble du comportement. Si les colères de votre enfant sont très
        fréquentes, très intenses, durent longtemps ou s'accompagnent de signes de souffrance,
        parlez-en à un pédiatre, un psychologue ou un pédopsychiatre.
      </MedicalDisclaimer>

      <h2>La colère n'est pas un caprice</h2>
      <p>
        Le cerveau qui permet de se calmer, de réfléchir avant d'agir et de tolérer la frustration
        est le <strong>dernier à se développer</strong> chez l'être humain. Chez un enfant de 4 ans
        comme chez un préadolescent, une frustration déclenche une réaction émotionnelle immédiate,
        sans le filtre qu'un adulte a appris à poser.
      </p>
      <p>
        Ajoutez la fatigue, la faim, un changement de rythme ou le besoin d'attention, et la colère
        devient une soupape de sécurité. La comprendre ainsi change la question : ce n'est plus «
        comment la faire taire ? » mais « de quoi cette colère est-elle le signal ? ». Chez les
        enfants hypersensibles — qui ressentent tout plus fort — la colère est souvent la pointe
        émergée d'une sensibilité débordante : il faut alors moins la réprimer que lui apprendre à
        la reconnaître avant qu'elle ne déborde.
      </p>

      <h2>Les trois erreurs parentales les plus fréquentes</h2>
      <ul>
        <li>
          <strong>La punir.</strong> Punir une émotion apprend à l'enfant à la cacher, pas à la
          traverser. On punit les actes (frapper, casser), jamais le ressenti.
        </li>
        <li>
          <strong>Céder pour avoir la paix.</strong> Si la crise obtient ce qu'elle voulait, elle
          devient une stratégie efficace — et elle reviendra, plus forte.
        </li>
        <li>
          <strong>Se mettre en colère en retour.</strong> Deux personnes en colère ne s'apaisent pas
          mutuellement. Votre calme est l'outil le plus important de la pièce.
        </li>
      </ul>

      <h2>5 outils concrets pour apaiser une crise</h2>
      <ol>
        <li>
          <strong>Nommer l'émotion.</strong> « Tu es très en colère parce que je coupe la
          télévision. » Nommer l'émotion l'aide à être traitée par le cerveau : c'est ce que font
          les professionnels, et vous pouvez le faire à la maison.
        </li>
        <li>
          <strong>Accueillir sans céder.</strong> On valide le ressenti (« je comprends que ce soit
          frustrant »), pas le comportement. La limite tient : « tu es en colère, et le cadre reste
          le même. »
        </li>
        <li>
          <strong>Offrir un exutoire physique.</strong> Courir, taper dans un coussin, déchirer un
          papier, presser une balle : le corps décharge avant que les mots reviennent. Demander à un
          enfant en crise de « se calmer » sans exutoire est rarement efficace.
        </li>
        <li>
          <strong>Installer un rituel de retour au calme.</strong> Un endroit choisi (pas un coin
          punitif), une boîte à objets apaisants, un dessin de la colère : l'enfant apprend qu'on
          peut revenir à un état calme, par soi-même, sans que ce soit une punition.
        </li>
        <li>
          <strong>Revenir sur la crise après coup.</strong> Une fois l'apaisement trouvé, cinq
          minutes suffisent : « Qu'est-ce qui s'est passé ? Qu'est-ce qui aurait pu te aider ? » Le
          lien parent-enfant sort renforcé, et l'enfant apprend à anticiper sa propre colère.
        </li>
      </ol>

      <h2>Que dire pendant la crise, et que ne jamais dire</h2>
      <p>
        Les mots comptent moins que le calme avec lequel on les dit — mais certains aident, d'autres
        enflamment.
      </p>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[500px] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">À dire, à voix basse</th>
              <th className="px-4 py-3">À éviter absolument</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3">« Je suis là. »</td>
              <td className="px-4 py-3">« Arrête de pleurer. »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« Tu es en colère, c'est normal. »</td>
              <td className="px-4 py-3">« Tu es ridicule. »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« Je ne te laisserai pas te faire mal. »</td>
              <td className="px-4 py-3">« Tu fais exprès pour m'énerver. »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« On va trouver une solution ensemble. »</td>
              <td className="px-4 py-3">« Si tu continues, tu vas voir. »</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        On accueille le ressenti, on tient la limite, et on garde un ton calme même si l'enfant
        crie. La menace et la moquerie ne calment jamais une crise : elles l'allongent, et
        apprennent à l'enfant que ses émotions font peur.
      </p>

      <h2>Prévenir vaut mieux que calmer</h2>
      <p>
        Une bonne partie des crises s'évitent en amont : des repères stables (repas, sommeil),
        prévenir avant de changer d'activité, offrir des choix limités, et surtout des{" "}
        <strong>occasions régulières de dépenser de l'énergie</strong> et de réussir quelque chose
        de concret. Un enfant qui a eu, dans la journée, un moment où il a construit, mesuré,
        cuisiné ou organisé quelque chose de réel a moins de pression à décharger à 18 h.
      </p>
      <p>
        C'est exactement le rôle des défis de Génizio : des activités concrètes adaptées à l'âge et
        aux centres d'intérêt de l'enfant, qui canalisent l'énergie vers la création et produisent
        une réussite visible. Un enfant qui a fait quelque chose de ses mains n'a pas besoin de le
        prouver en cassant quelque chose d'autre.
      </p>

      <h2>Quand la colère dépasse le cadre habituel</h2>
      <p>
        La colère est normale ; certaines intensités méritent un avis professionnel. Des crises
        fréquentes, très longues, ou qui mettent l'enfant ou les autres en danger ; des signes de
        repli, de tristesse durable ou de souffrance scolaire qui les accompagnent : dans ces cas,
        un professionnel de santé est la bonne étape — pas une sanction, pas une attente passive.
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

import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/decrochage-scolaire-confiance-enfant";

// Réponses qui se suffisent à elles-mêmes : c'est le format que Google affiche en
// réponse directe et que les assistants IA citent. Ton responsable : observation,
// jamais de verdict, renvoi vers les professionnels de santé.
const FAQ = [
  {
    question: "Mon enfant dit qu'il est nul, dois-je m'inquiéter ?",
    answer:
      "Quand un enfant répète qu'il « est nul », il exprime souvent un sentiment accumulé plutôt qu'un constat objectif. Observez : cela dure-t-il depuis plusieurs semaines ? Cela s'étend-il aussi aux activités qu'il aime ? Refuse-t-il de plus en plus d'essayer de nouvelles choses ? Une parole isolée ne suffit pas à s'inquiéter ; ce qui compte, c'est la persistance et l'effet sur sa vie quotidienne. Parlez-en avec lui, avec l'école, et si le mal-être se confirme, consultez un professionnel — psychologue ou médecin — qui pourra évaluer la situation sereinement.",
  },
  {
    question: "Un enfant qui décroche ou abandonne l'école est-il forcément en souffrance ?",
    answer:
      "Pas nécessairement, mais le décrochage n'est presque jamais un choix simple. C'est souvent le terme d'un long chemin de découragement accumulé. L'agitation, le repli ou la démotivation peuvent être les signes visibles d'une souffrance plus profonde. Plutôt que de coller une étiquette (« paresseux », « indiscipliné »), la question utile est : que cherche à nous dire ce comportement ? Quand le décrochage s'accompagne de mal-être durable, une évaluation par un professionnel de santé est la démarche la plus juste.",
  },
  {
    question: "Comment aider un enfant qui a perdu confiance en lui ?",
    answer:
      "La confiance se reconstruit par des expériences concrètes de réussite, pas par des encouragements généraux. Six leviers aident : nommer des forces précises (« tu as tenu bon jusqu'au bout » plutôt que « tu es intelligent ») ; créer des occasions de réussite qui produisent un résultat visible (une construction, un plat, une histoire terminée) ; valoriser l'effort et le progrès plutôt que les notes ; garder des routines stables qui sécurisent ; écouter sans moraliser pour que l'enfant ose dire ce qu'il ressent ; et demander de l'aide quand le besoin se fait sentir. Ces habitudes aident tous les enfants, qu'il y ait ou non une difficulté particulière.",
  },
  {
    question: "La santé mentale des enfants est-elle vraiment un sujet en Afrique ?",
    answer:
      "Oui, et c'est même l'un des sujets les moins abordés du continent. La dépression et l'anxiété existent chez les enfants et les adolescents partout dans le monde ; elles prennent simplement des formes que l'on ne reconnaît pas toujours. La crainte du jugement pousse encore beaucoup de familles à minimiser ou à taire ces difficultés. En parler ouvertement, sans honte, est la première étape : un enfant qui peut dire qu'il va mal, sans être jugé, a plus de chances d'être aidé tôt.",
  },
  {
    question: "Génizio peut-il détecter un problème de santé mentale chez mon enfant ?",
    answer:
      "Non, et ce n'est pas son objet. Génizio est un outil éducatif qui propose des défis concrets et cartographie les talents d'un enfant selon les 9 intelligences de Howard Gardner. Il n'effectue aucun dépistage, ne pose aucun diagnostic et ne remplace aucun avis médical. En revanche, l'historique des défis réalisés — ce que l'enfant termine, ce qu'il abandonne, sur quoi il reste engagé — constitue une observation écrite et datée, utile pour redonner confiance et partageable avec un professionnel si vous le consultez.",
  },
];

export const Route = createFileRoute("/guides/decrochage-scolaire-confiance-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Décrochage scolaire : la confiance se joue avant l'école",
      description:
        "Perte de confiance, abandon des ambitions, santé mentale : pourquoi le décrochage commence dès l'enfance, et comment agir à la maison.",
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
            { name: "Décrochage scolaire et confiance", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Décrochage scolaire : la confiance se joue avant l'école",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          about: [
            { "@type": "Thing", name: "Décrochage scolaire" },
            { "@type": "Thing", name: "Confiance en soi de l'enfant" },
            { "@type": "Thing", name: "Santé mentale de l'enfant" },
            { "@type": "Thing", name: "Épanouissement de l'enfant" },
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
      eyebrow="Confiance & bien-être"
      title="Décrochage scolaire : la confiance se joue avant l'école"
      intro="« Il a tout pour réussir, mais il ne croit plus en lui. » Combien de parents ont entendu cette phrase ? Le décrochage n'est presque jamais un événement soudain : il commence des années plus tôt, en silence, dans l'enfance. Voici pourquoi — et ce que vous pouvez faire, dès aujourd'hui, à la maison."
      updated="6 août 2026"
      readingTime="9 min"
      related={[
        { label: "Agitation et concentration : comprendre avant de s'inquiéter", to: "/guides/enfant-agite-concentration" },
        { label: "Révéler le potentiel d'un enfant en Afrique francophone", to: "/guides/education-enfants-afrique-francophone" },
        { label: "Quels défis proposer à un adolescent ?", to: "/guides/defis-pour-adolescents" },
      ]}
    >
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical
        et ne permet pas d'évaluer ou de diagnostiquer un trouble. Si votre enfant semble en
        souffrance, se replie sur lui-même, abandonne ce qu'il aimait, ou si son mal-être gêne son
        quotidien ou sa scolarité, parlez-en à un médecin, un pédiatre ou un psychologue : eux seuls
        peuvent évaluer une situation.
      </MedicalDisclaimer>

      <h2>Le décrochage commence avant le décrochage</h2>
      <p>
        Quand un jeune quitte l'école, on a l'impression d'un événement soudain. Dans la grande
        majorité des cas, c'est l'étape visible d'un chemin commencé des années plus tôt — souvent
        pendant l'enfance.
      </p>
      <p>
        À force de ne pas être compris, de ne pas se sentir à sa place, de ne recevoir aucun soutien,
        des blessures invisibles s'installent progressivement. Elles n'apparaissent pas sur un
        bulletin, mais elles agissent en profondeur : sur la <strong>confiance en soi</strong>, la{" "}
        <strong>motivation</strong> et la capacité à <strong>se projeter dans l'avenir</strong>.
      </p>
      <p>Ce que ces expériences répétées laissent chez un enfant :</p>
      <ul>
        <li>la conviction de ne pas être à la hauteur, même quand les faits disent le contraire ;</li>
        <li>le sentiment que ses efforts ne servent à rien, donc l'arrêt progressif des efforts ;</li>
        <li>l'impossibilité d'imaginer un avenir dans lequel il aurait sa place ;</li>
        <li>l'habitude de se taire, pour ne pas risquer d'être jugé une fois de plus.</li>
      </ul>

      <h2>Deux profils, un même risque</h2>
      <p>
        Certains enfants possèdent toutes les qualités pour réussir un parcours académique. D'autres
        ne s'épanouissent pas dans le système scolaire traditionnel, mais disposent de talents
        différents : <strong>artistiques, entrepreneuriaux, créatifs ou techniques</strong>. L'erreur
        serait d'opposer ces deux profils.
      </p>
      <p>
        Le risque, lui, est commun : la <strong>perte de confiance</strong>. Qu'on soit « bon à
        l'école » ou non, quand l'environnement ne reconnaît jamais ce qui nous anime réellement, on
        peut finir par croire qu'on n'a rien à offrir. C'est cette conviction qui fait abandonner les
        ambitions et renoncer à persévérer — pas le niveau scolaire.
      </p>
      <blockquote>
        Un enfant qui « échoue » n'apprend pas toujours à mieux travailler. Il apprend parfois, tout
        simplement, à ne plus essayer.
      </blockquote>

      <h2>La santé mentale des enfants, un sujet encore tabou en Afrique</h2>
      <p>
        La dépression, l'anxiété, le mal-être ou la perte de sens existent chez les enfants et les
        adolescents du continent, comme partout dans le monde. Ils prennent simplement des formes que
        l'on ne reconnaît pas toujours.
      </p>
      <p>
        Ces réalités sont souvent minimisées, voire ignorées. Pourtant, un jeune qui abandonne
        l'école, qui devient turbulent, qui semble démotivé, agressif ou incapable de rester concentré
        n'est pas forcément « paresseux » ou « indiscipliné ». Ces comportements peuvent être les
        manifestations visibles d'une <strong>souffrance beaucoup plus profonde</strong>.
      </p>
      <p>
        Quand une personne évolue dans un environnement qui l'empêche d'exprimer ce qui l'anime, ou
        lorsqu'elle ne trouve aucun sens à ce qu'elle fait au quotidien, elle peut progressivement
        sombrer dans un état de détresse psychologique. Cette réalité est largement sous-estimée —
        alors qu'elle est sous nos yeux.
      </p>

      <h2>Observer sans étiqueter : les signaux qui méritent votre attention</h2>
      <p>
        Ce qui suit n'est pas une grille de diagnostic, mais des repères d'observation. Ce qui compte,
        ce n'est pas un signe isolé, c'est son <strong>évolution dans le temps</strong> et son impact
        sur la vie quotidienne.
      </p>
      <ul>
        <li>un <strong>changement durable</strong> de comportement : un enfant ouvert qui devient renfermé, ou l'inverse ;</li>
        <li>la <strong>perte de plaisir</strong> dans des activités qu'il aimait auparavant ;</li>
        <li>un <strong>repli sur soi</strong>, moins d'envie de voir les amis ou la famille ;</li>
        <li>des <strong>troubles du sommeil ou de l'appétit</strong> qui persistent ;</li>
        <li>des paroles d'<strong>estime de soi en chute</strong> (« je suis nul », « ça ne sert à rien ») ;</li>
        <li>des signes de détresse à l'idée d'aller à l'école : maux de ventre, refus, angoisse le dimanche soir.</li>
      </ul>
      <p>
        Un seul signe, ponctuel, n'a rien d'alarmant : tous les enfants ont des mauvaises semaines. Ce
        qui mérite l'attention, c'est la <strong>persistance sur plusieurs semaines</strong> et
        l'effet réel sur le quotidien. Dans le doute, parlez-en à l'enfant, à l'école, puis à un
        professionnel.
      </p>

      <h2>Ce que les parents peuvent faire au quotidien</h2>
      <p>
        La confiance ne se décrète pas, elle se construit — par de petites expériences répétées. Six
        habitudes simples, applicables dès cette semaine :
      </p>
      <ol>
        <li>
          <strong>Nommez des forces précises.</strong> « Tu as tenu bon jusqu'au bout » construit
          plus qu'un « tu es intelligent » : l'enfant apprend ce qu'il a réellement fait, pas une
          étiquette.
        </li>
        <li>
          <strong>Créez des réussites visibles.</strong> Une activité qui aboutit à un objet, un plat,
          une photo ou une histoire finie donne une preuve concrète de ce dont l'enfant est capable.
        </li>
        <li>
          <strong>Valorisez l'effort et le progrès</strong>, pas seulement les notes. Le parcours
          compte autant que le résultat.
        </li>
        <li>
          <strong>Gardez des repères stables.</strong> Repas, sommeil, rythmes réguliers : la
          sécurité du cadre est le socle de la confiance.
        </li>
        <li>
          <strong>Écoutez sans moraliser.</strong> Un enfant qui peut dire qu'il va mal, sans être
          jugé ni sermonné, demandera de l'aide plus tôt.
        </li>
        <li>
          <strong>Demandez de l'aide quand c'est nécessaire.</strong> Consulter un professionnel n'est
          pas un échec parental — c'est une force. Plus tôt on agit, plus la confiance se reconstruit
          vite.
        </li>
      </ol>

      <h2>Ce que Génizio apporte — et ne remplace pas</h2>
      <p>
        Génizio propose à votre enfant des défis concrets, adaptés à son âge et à ses centres
        d'intérêt : fabriquer, cuisiner, mesurer, raconter, vendre. Chaque défi terminé est
        photographié par le parent, ce qui produit au fil des semaines une trace datée de ce que
        l'enfant a réellement fait, puis une carte de ses talents selon les 9 intelligences de
        Howard Gardner.
      </p>
      <p>
        Pour un enfant qui a perdu confiance, ces défis offrent quelque chose de précieux :{" "}
        <strong>l'expérience d'aller au bout des choses</strong>, de voir ses réussites reconnues, et
        de découvrir une force qu'il ne se connaissait pas.
      </p>
      <p>
        Mais Génizio ne dépiste rien et ne diagnostique rien : il n'évalue ni la santé mentale, ni le
        bien-être psychologique, et ne remplace aucun soignant. Si votre enfant est en souffrance,
        la première étape est d'en parler — avec lui, avec un professionnel de santé. Un outil
        éducatif ne remplace jamais une écoute et une prise en charge humaines.
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

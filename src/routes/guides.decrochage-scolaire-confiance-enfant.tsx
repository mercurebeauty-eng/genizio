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
    question: "Mauvaises notes ou redoublement : comment réagir sans casser la confiance ?",
    answer:
      "D'abord, ne faites pas des notes le miroir de la valeur de l'enfant : une mauvaise note est une information, pas un verdict. Demandez-lui ce qu'il a compris de son erreur, travaillez une seule difficulté à la fois, et valorisez les progrès même minimes (« la semaine dernière tu avais 4 fautes, aujourd'hui 2 »). En cas de redoublement, présentez-le comme une deuxième chance, pas comme une punition : beaucoup d'enfants refont une année avec plus d'assurance. Et si les mauvaises notes s'accompagnent de repli ou de découragement durable, c'est ce signal-là qu'il faut traiter en priorité, avant les notes.",
  },
  {
    question: "Un enfant qui décroche ou abandonne l'école est-il forcément en souffrance ?",
    answer:
      "Pas nécessairement, mais le décrochage n'est presque jamais un choix simple. C'est souvent le terme d'un long chemin de découragement accumulé. L'agitation, le repli ou la démotivation peuvent être les signes visibles d'une souffrance plus profonde. Plutôt que de coller une étiquette (« paresseux », « indiscipliné »), la question utile est : que cherche à nous dire ce comportement ? Quand le décrochage s'accompagne de mal-être durable, une évaluation par un professionnel de santé est la démarche la plus juste.",
  },
  {
    question:
      "Mon enfant est victime de harcèlement scolaire et ne veut plus aller à l'école, que faire ?",
    answer:
      "Le harcèlement scolaire est l'une des causes les plus fréquentes du refus d'aller à l'école. Si votre enfant se plaint de moqueries répétées, rentre avec des affaires abîmées ou des maux de ventre le matin, prenez-le au sérieux dès la première alerte : écoutez sans minimiser, notez les faits (dates, paroles, témoins), puis parlez-en à l'école en demandant une action précise et un suivi. Ne laissez pas l'enfant « se débrouiller seul » — c'est le rôle de l'adulte de protéger. Et s'il refuse catégoriquement d'aller en classe, c'est un signal d'alerte majeur : le harcèlement doit être traité par l'école et, si besoin, par un professionnel.",
  },
  {
    question: "Comment aider un enfant qui a perdu confiance en lui ?",
    answer:
      "La confiance se reconstruit par des expériences concrètes de réussite, pas par des encouragements généraux. Six habitudes aident : nommer des forces précises (« tu as tenu bon jusqu'au bout » plutôt que « tu es intelligent ») ; créer des occasions de réussite qui produisent un résultat visible (une construction, un plat, une histoire terminée) ; valoriser l'effort et le progrès plutôt que les notes ; garder des routines stables qui sécurisent ; écouter sans moraliser pour que l'enfant ose dire ce qu'il ressent ; et demander de l'aide quand le besoin se fait sentir. Ces habitudes aident tous les enfants, qu'il y ait ou non une difficulté particulière.",
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
      title: "Enfant qui perd confiance ou décroche à l'école : comment l'aider",
      description:
        "Signaux d'alerte du décrochage scolaire, harcèlement, mauvaises notes, perte de confiance : ce que les parents peuvent faire à la maison, et quand consulter.",
      path: PATH,
      image: "/guides/og-decrochage.jpg",
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
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Comment aider un enfant qui perd confiance et se décourage à l'école",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-decrochage.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Décrochage scolaire" },
            { "@type": "Thing", name: "Confiance en soi de l'enfant" },
            { "@type": "Thing", name: "Harcèlement scolaire" },
            { "@type": "Thing", name: "Santé mentale de l'enfant" },
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
      title="Comment aider un enfant qui perd confiance et se décourage à l'école"
      intro="« Il a tout pour réussir, mais il ne croit plus en lui. » Le décrochage n'est presque jamais un événement soudain : il commence des années plus tôt, en silence, par des signaux que l'on peut apprendre à repérer. Voici comment observer, agir à la maison, et savoir quand demander de l'aide."
      updated="14 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Agitation et concentration : comprendre avant de s'inquiéter",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Développer les talents de son enfant en Afrique",
          to: "/guides/education-enfants-afrique-francophone",
        },
        {
          label: "Enfant timide : libérer la parole",
          to: "/guides/timidite-confiance-prise-de-parole",
        },
        { label: "Motiver un adolescent (12-16 ans)", to: "/guides/defis-pour-adolescents" },
        {
          label: "Aider son enfant à réussir à l'école",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-decrochage.jpg"
        alt="Mère encourageant chaleureusement son enfant dans ses apprentissages à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical et
        ne permet pas d'évaluer ou de diagnostiquer un trouble. Si votre enfant semble en
        souffrance, se replie sur lui-même, abandonne ce qu'il aimait, ou si son mal-être gêne son
        quotidien ou sa scolarité, parlez-en à un médecin, un pédiatre ou un psychologue : eux seuls
        peuvent évaluer une situation.
      </MedicalDisclaimer>

      <h2>Le découragement se construit longtemps avant le décrochage</h2>
      <p>
        Quand un jeune quitte l'école, on a l'impression d'un événement soudain. Dans la grande
        majorité des cas, c'est l'étape visible d'un chemin commencé des années plus tôt — souvent
        pendant l'enfance.
      </p>
      <p>
        À force de ne pas être compris, de ne pas se sentir à sa place, de ne recevoir aucun
        soutien, des blessures invisibles s'installent progressivement. Elles n'apparaissent pas sur
        un bulletin, mais elles agissent en profondeur : sur la <strong>confiance en soi</strong>,
        la <strong>motivation</strong> et la capacité à <strong>se projeter dans l'avenir</strong>.
      </p>
      <p>Ce que ces expériences répétées laissent chez un enfant :</p>
      <ul>
        <li>
          la conviction de ne pas être à la hauteur, même quand les faits disent le contraire ;
        </li>
        <li>
          le sentiment que ses efforts ne servent à rien, donc l'arrêt progressif des efforts ;
        </li>
        <li>l'impossibilité d'imaginer un avenir dans lequel il aurait sa place ;</li>
        <li>l'habitude de se taire, pour ne pas risquer d'être jugé une fois de plus.</li>
      </ul>

      <h2>Les signaux d'alerte à observer (tableau pratique)</h2>
      <p>
        Ce qui suit n'est pas une grille de diagnostic, mais des repères d'observation. Ce qui
        compte, ce n'est pas un signe isolé, c'est son <strong>évolution dans le temps</strong> et
        son impact sur la vie quotidienne.
      </p>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[520px] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">Ce que vous observez</th>
              <th className="px-4 py-3">Ce que ça peut signaler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3">
                Un changement durable de comportement : un enfant ouvert qui devient renfermé, ou
                l'inverse
              </td>
              <td className="px-4 py-3">
                Un malaise qui s'installe, parfois un événement précis (une humiliation, un conflit)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                La perte de plaisir dans des activités qu'il aimait auparavant
              </td>
              <td className="px-4 py-3">Un découragement qui dépasse la simple mauvaise passe</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Des troubles du sommeil ou de l'appétit qui persistent</td>
              <td className="px-4 py-3">
                Une anxiété qui se manifeste par le corps — à prendre au sérieux
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                Des paroles d'estime de soi en chute (« je suis nul », « ça ne sert à rien »)
              </td>
              <td className="px-4 py-3">
                Une confiance érodée par des échecs répétés, des moqueries ou des comparaisons
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                Des signes de détresse à l'idée d'aller à l'école : maux de ventre, refus, angoisse
                le dimanche soir
              </td>
              <td className="px-4 py-3">
                Une peur liée à l'école : difficultés, pression, ou harcèlement scolaire
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                Des affaires abîmées, des « pertes » répétées, des moqueries qu'il raconte à
                contrecœur
              </td>
              <td className="px-4 py-3">
                Un possible harcèlement scolaire — à traiter dès la première alerte
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Un seul signe, ponctuel, n'a rien d'alarmant : tous les enfants ont des mauvaises semaines.
        Ce qui mérite l'attention, c'est la <strong>persistance sur plusieurs semaines</strong> et
        l'effet réel sur le quotidien. Dans le doute, parlez-en à l'enfant, à l'école, puis à un
        professionnel.
      </p>

      <h2>Mauvaises notes et redoublement : réagir sans casser la confiance</h2>
      <p>
        Les mauvaises notes sont souvent le premier signal visible — et le plus mal interprété. Une
        note n'est pas un miroir de la valeur de l'enfant : c'est une information sur un
        apprentissage précis, à un moment donné. Voici comment la traiter sans drame :
      </p>
      <ul>
        <li>
          <strong>Demandez-lui d'abord son analyse :</strong> « Qu'est-ce qui t'a semblé difficile
          dans ce contrôle ? » — l'enfant qui met des mots sur sa difficulté commence à la régler.
        </li>
        <li>
          <strong>Travaillez une seule difficulté à la fois :</strong> on ne corrige pas dix lacunes
          en une semaine ; on en choisit une, on la travaille, on vérifie la progression.
        </li>
        <li>
          <strong>Valorisez le progrès, pas le classement :</strong> « la semaine dernière tu avais
          4 fautes, aujourd'hui 2 » — c'est cette comparaison à lui-même qui motive.
        </li>
        <li>
          <strong>En cas de redoublement, changez de discours :</strong> c'est une deuxième chance,
          pas une punition. Beaucoup d'enfants refont une année avec plus d'assurance.
        </li>
        <li>
          <strong>Si les notes dégringolent brutalement</strong> chez un enfant qui travaillait
          bien, demandez-vous ce qui a changé : une difficulté nouvelle, un conflit avec un camarade
          ou un enseignant, un événement familial. La chute de notes est souvent un symptôme.
        </li>
      </ul>

      <h2>La santé mentale des enfants, un sujet encore tabou en Afrique</h2>
      <p>
        La dépression, l'anxiété, le mal-être ou la perte de sens existent chez les enfants et les
        adolescents du continent, comme partout dans le monde. Ils prennent simplement des formes
        que l'on ne reconnaît pas toujours : un enfant « turbulent » ou « rêveur » peut être un
        enfant en souffrance.
      </p>
      <p>
        Ces réalités sont souvent minimisées, voire ignorées. Pourtant, un jeune qui abandonne
        l'école, qui devient agité, démotivé ou agressif n'est pas forcément « paresseux » ou «
        indiscipliné » : ces comportements peuvent être les manifestations visibles d'une{" "}
        <strong>souffrance beaucoup plus profonde</strong>. La crainte du jugement pousse encore
        beaucoup de familles à taire ces difficultés. En parler ouvertement, sans honte, est la
        première étape de la prise en charge.
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
          <strong>Créez des réussites visibles.</strong> Une activité qui aboutit à un objet, un
          plat, une photo ou une histoire finie donne une preuve concrète de ce dont l'enfant est
          capable.
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
          <strong>Demandez de l'aide quand c'est nécessaire.</strong> Consulter un professionnel
          n'est pas un échec parental — c'est une force. Plus tôt on agit, plus la confiance se
          reconstruit vite.
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
        <strong>l'expérience d'aller au bout des choses</strong>, de voir ses réussites reconnues,
        et de découvrir une force qu'il ne se connaissait pas.
      </p>
      <p>
        Mais Génizio ne dépiste rien et ne diagnostique rien : il n'évalue ni la santé mentale, ni
        le bien-être psychologique, et ne remplace aucun soignant. Si votre enfant est en
        souffrance, la première étape est d'en parler — avec lui, avec un professionnel de santé. Un
        outil éducatif ne remplace jamais une écoute et une prise en charge humaines.
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

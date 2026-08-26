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
      title: "Décrochage scolaire : aider un enfant qui perd confiance",
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
          description:
            "Guide d'accompagnement parental : repérer les signes précoces de décrochage, réagir aux mauvaises notes sans drame et restaurer l'estime de soi.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-decrochage.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-26",
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
      eyebrow="Confiance & Bien-être"
      title="Comment aider un enfant qui perd confiance et se décourage à l'école"
      intro="« Il a tout pour réussir, mais il ne croit plus en lui. » Le décrochage n'est presque jamais un événement soudain : il s'installe progressivement à travers des signaux d'usure silencieux que l'on peut apprendre à repérer. Voici comment observer, agir à la maison et reconstruire l'estime de soi."
      updated="26 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        {
          label: "Réussite scolaire sans stress",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Canaliser un enfant agité",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Enfant timide : libérer la parole",
          to: "/guides/timidite-confiance-prise-de-parole",
        },
        {
          label: "Discipline positive sans punition",
          to: "/guides/discipline-positive-sans-punition",
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
        Quand un élève abandonne ses efforts, on a l'impression d'une rupture soudaine. Dans la grande majorité des cas, c'est l'aboutissement d'un long sentiment d'inadéquation scolaire.
      </p>
      <p>
        À force de notes décevantes et de comparaisons défavorables, des blessures d'estime s'installent. L'enfant finit par croire que son intelligence est insuffisante. Pourtant, selon la{" "}
        <a href="/guides/intelligences-multiples-gardner">théorie des 9 intelligences de Howard Gardner</a>, l'école ne mesure qu'une fraction restreinte des capacités humaines (le logico-mathématique et le verbal-linguistique).
      </p>

      <h2>Les signaux d'alerte à observer (tableau pratique)</h2>
      <p>
        Ce qui suit n'est pas une grille de diagnostic médical, mais des repères d'observation parentale. Ce qui compte, c'est la persistance sur plusieurs semaines :
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
              <td className="px-4 py-3 font-semibold">Repli sur soi et mutisme</td>
              <td className="px-4 py-3">
                Perte de confiance ou timidité anxieuse (découvrez nos conseils pour{" "}
                <a href="/guides/timidite-confiance-prise-de-parole">aider un enfant timide à s'exprimer</a>)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Agitation excessive et refus des devoirs</td>
              <td className="px-4 py-3">
                Trop-plein d'énergie ou surcharge cognitive (consultez notre guide pour{" "}
                <a href="/guides/enfant-agite-concentration">canaliser un enfant agité</a>)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Phrases d'auto-dévalorisation (« Je suis nul »)</td>
              <td className="px-4 py-3">Érosion de l'estime de soi sous la pression des notes</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Maux de ventre récurrents le matin</td>
              <td className="px-4 py-3">Angoisse scolaire ou harcèlement — à traiter sans attendre</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Mauvaises notes : réagir sans casser la confiance</h2>
      <p>
        Une mauvaise note est une opportunité d'apprentissage, non un jugement d'identité. Appliquez notre protocole pour{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">accompagner les devoirs sans crier ni stresser</a> :
      </p>
      <ul>
        <li>
          <strong>Demandez-lui son analyse :</strong> <em>« Qu'est-ce qui t'a semblé le plus confus dans cette consigne ? »</em>
        </li>
        <li>
          <strong>Encouragez l'effort :</strong> Félicitez sa persévérance avec les principes de la{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive</a>.
        </li>
        <li>
          <strong>Si vous avez un adolescent démotivé :</strong> Proposez-lui des projets d'action autonomes parmi nos{" "}
          <a href="/guides/defis-pour-adolescents">12 défis stimulants pour adolescents</a>.
        </li>
      </ul>

      <h2>Ce que les parents peuvent faire au quotidien</h2>
      <ol className="space-y-3 my-6">
        <li>
          <strong>1. Créer des victoires hors de l'école :</strong> Bricoler, cuisiner, coder, dessiner via nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités concrètes sans écran</a>.
        </li>
        <li>
          <strong>2. Nommer des forces précises :</strong> <em>« Tu es très attentif aux besoins des autres »</em> plutôt qu'un compliment vague.
        </li>
        <li>
          <strong>3. Protéger son sommeil :</strong> Réduisez l'exposition nocturne aux écrans avec nos méthodes de{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">sevrage progressif des écrans</a>.
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

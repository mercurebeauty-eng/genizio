import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/timidite-confiance-prise-de-parole";

const FAQ = [
  {
    question: "Comment savoir si mon enfant est timide ou simplement réservé ?",
    answer:
      "La réserve n'est pas une faiblesse. Un enfant réservé préfère souvent analyser, observer et réfléchir avant de s'exprimer — c'est une façon d'être, pas un défaut. La timidité ne devient un frein que si l'enfant souffre de ne pas réussir à formuler ses besoins, à répondre en classe ou à interagir avec les autres. Le signe qui doit attirer l'attention n'est pas la réserve elle-même, mais la souffrance : un enfant qui pleure, se bloque ou refuse l'école à cause de la parole mérite un accompagnement.",
  },
  {
    question: "Doit-on forcer un enfant timide à dire bonjour ou à parler en public ?",
    answer:
      "Forcer un enfant bloque ses facultés d'expression et renforce le sentiment de honte. Il est préférable de lui donner un rôle actif intermédiaire (distribuer des verres, montrer un dessin, annoncer le repas) qui facilite le contact social sans la pression du discours direct. La règle : on l'expose progressivement, jamais brutalement, et on félicite chaque tentative, même ratée.",
  },
  {
    question: "Mon enfant a un exposé à l'école et panique, comment l'aider ?",
    answer:
      "Préparez-le à la maison, en trois temps. Quelques jours avant : il raconte son exposé à voix haute devant vous, sans papier, et vous notez ce qu'il sait déjà. Deux jours avant : il répète devant deux personnes de confiance (un grand-parent, un frère), en s'aidant d'une feuille de 3 mots-clés seulement. La veille : on relit ensemble, on respire, on rappelle que la maîtresse n'attend pas un discours parfait mais un enfant qui partage ce qu'il a appris. Le jour J, dites-lui une phrase simple : « tu as préparé, tu connais, tu peux y arriver ».",
  },
  {
    question: "Combien de temps faut-il pour qu'un enfant prenne confiance en lui à l'oral ?",
    answer:
      "La confiance s'acquiert par petits succès répétés dans un cadre sécurisant. En 3 à 4 semaines de petits défis d'expression à la maison (raconter sa journée, décrire un objet, interviewer un membre de la famille), les enfants développent une meilleure aisance verbale et apprennent à porter leur voix sans crainte. La régularité compte plus que l'intensité : dix minutes par jour valent mieux qu'une grande répétition le dimanche.",
  },
  {
    question: "Un enfant très réservé peut-il avoir du mal à l'école ou à la rentrée ?",
    answer:
      "Oui, et c'est une vraie question à anticiper, surtout à la rentrée scolaire : un enfant réservé peut souffrir en silence — répondre trop bas, ne pas oser demander où sont les toilettes, subir des moqueries sans en parler. Parlez-en avec le maître ou la maîtresse dès les premiers jours : une place au premier rang, un mot d'encouragement discret ou un rôle dans la classe (distribuer les cahiers) changent souvent tout. Et si votre enfant se replie, perd le sommeil ou refuse l'école plusieurs semaines, n'hésitez pas à consulter un professionnel : la réserve n'est pas un problème, la souffrance, si.",
  },
];

export const Route = createFileRoute("/guides/timidite-confiance-prise-de-parole")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant timide : 4 activités pour libérer la parole (6-12)",
      description:
        "Exposé à l'école, prise de parole en classe, rentrée : comment aider un enfant réservé à prendre confiance à l'oral sans le forcer ni le mettre mal à l'aise.",
      path: PATH,
      image: "/guides/og-timidite.jpg",
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
            { name: "Timidité & Confiance", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Enfant timide ou réservé : 4 activités pour développer l'assurance orale",
            description:
              "Méthodes douces et activités concrètes pour stimuler la confiance et la prise de parole chez l'enfant, y compris avant un exposé à l'école.",
            path: PATH,
            image: "/guides/og-timidite.jpg",
            datePublished: "2026-08-08",
            dateModified: "2026-08-14",
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
      eyebrow="Confiance & Expression"
      title="Enfant timide ou réservé : 4 activités pour développer son assurance sans le forcer"
      intro="Un enfant réservé est souvent un grand observateur : il regarde, analyse, réfléchit avant de parler. L'objectif n'est pas de le transformer en bavard, mais de lui donner les clés pour porter sa voix quand il le faut — en classe, devant un exposé, avec les autres. Voici comment faire, en douceur, à la maison."
      updated="14 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "Décrochage scolaire : la confiance avant l'école",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-timidite.jpg"
        alt="Jeune fille s'exprimant joyeusement avec assurance devant sa famille"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>La réserve n'est pas un défaut : c'est une façon d'être</h2>
      <p>
        Dans la théorie des intelligences multiples de Howard Gardner, certains enfants ont une
        forte <strong>intelligence intrapersonnelle</strong> : ils se connaissent bien, analysent
        leurs émotions et observent leur environnement avant d'agir. Les enfants d'apparence «
        timide » sont très souvent des observateurs hors du commun — ce qui est une force dans
        beaucoup de domaines.
      </p>
      <p>
        Au lieu de lui répéter <em>"Ne sois pas timide"</em> (ce qui augmente le stress), valorisez
        son calme et donnez-lui des outils ludiques pour transmettre sa pensée. La timidité ne
        devient un problème que quand l'enfant en souffre — et c'est là qu'un accompagnement doux et
        régulier change tout.
      </p>

      <h2>4 exercices ludiques à réaliser à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">1. Le Journaliste de la Maison</h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Armé d'un faux micro (un stylo ou une cuillère en bois), l'enfant a pour mission
          d'interviewer un membre de la famille sur son souvenir d'enfance le plus drôle. Le rôle de
          journaliste lui donne une fonction protectrice : ce n'est pas lui qui s'expose, c'est lui
          qui pose les questions.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          2. Le Discours de 1 Minute (La Boîte à Sujets)
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Tirez au sort un objet du quotidien (une chaussure, une banane, un cahier). L'enfant a 1
          minute pour convaincre la famille que cet objet est magique. Le côté absurde du sujet
          désamorce la peur d'être jugé.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          3. Le Théâtre d'Ombres ou de Marionnettes
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Derrière un drap ou une boîte en carton découpée, l'enfant raconte une histoire courte. La
          marionnette sert d'écran protecteur : l'enfant s'exprime avec puissance sans subir le
          regard direct des auditeurs.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          4. L'Hôte d'Accueil de la Famille
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Lorsqu'un invité ou un proche arrive à la maison, confiez à votre enfant une
          responsabilité bien définie : proposer un verre d'eau ou installer le visiteur. Une tâche
          concrète réduit la gêne des premiers instants.
        </p>
      </div>

      <h2>Que faire avant un exposé à l'école ?</h2>
      <p>
        L'exposé ou la récitation est le moment le plus redouté de l'année pour un enfant réservé —
        et c'est aussi le meilleur endroit pour construire sa confiance, à condition de s'y préparer
        à la maison. Voici un plan simple sur trois jours :
      </p>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[500px] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">Quand</th>
              <th className="px-4 py-3">Ce qu'on fait à la maison</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3 font-bold">3 jours avant</td>
              <td className="px-4 py-3">
                Il raconte son exposé à voix haute, sans papier, devant vous. On note ce qu'il sait
                déjà — souvent plus qu'il ne le croit.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">2 jours avant</td>
              <td className="px-4 py-3">
                Il répète devant deux personnes de confiance (un grand-parent, un frère), avec une
                feuille de 3 mots-clés seulement.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">La veille et le jour J</td>
              <td className="px-4 py-3">
                On relit ensemble, on respire, on rappelle que la maîtresse n'attend pas un discours
                parfait. Le matin : « tu as préparé, tu connais, tu peux y arriver ».
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Comment encourager les progrès sans sur-réagir</h2>
      <ul>
        <li>
          <strong>Féliciter la tentative, pas le résultat :</strong>{" "}
          <em>"J'ai aimé la clarté de ton explication"</em> plutôt que{" "}
          <em>"Tu vois, ce n'était pas dur !"</em>
        </li>
        <li>
          <strong>Ne jamais parler à sa place :</strong> Laissez-lui quelques secondes de silence
          pour rassembler ses idées avant de répondre pour lui.
        </li>
        <li>
          <strong>Prévenir, jamais surprendre :</strong> Annoncez les situations de prise de parole
          à l'avance (« dimanche, tu raconteras ta semaine à tonton ») — la surprise est l'ennemie
          des enfants réservés.
        </li>
        <li>
          <strong>Valoriser ses réalisations tangibles :</strong> Son cahier des réussites (photos
          de ses exposés, dessins) est la meilleure preuve de son talent — montrez-le-lui avant
          chaque nouveau défi.
        </li>
      </ul>

      <h2>Foire aux questions sur la timidité chez l'enfant</h2>
      <div className="mt-8 space-y-6 border-t border-ink/10 pt-6">
        {FAQ.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-base font-bold text-ink">{item.question}</h3>
            <p className="text-sm leading-relaxed text-ink/75">{item.answer}</p>
          </div>
        ))}
      </div>
    </GuideLayout>
  );
}

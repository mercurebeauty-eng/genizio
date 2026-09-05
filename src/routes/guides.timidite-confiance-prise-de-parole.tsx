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
  {
    question: "Mon enfant refuse d'ouvrir la bouche à l'école : est-ce un mutisme sélectif ?",
    answer:
      "Si votre enfant parle couramment à la maison mais reste muet en classe ou devant des inconnus depuis plus d'un mois, il s'agit sans doute d'un mutisme sélectif. Ce n'est ni de la mauvaise volonté ni un caprice, mais une véritable réaction d'anxiété sociale. Évitez de le forcer ou de négocier la parole. Informez l'enseignant avec tact et rapprochez-vous d'un spécialiste (psychologue ou orthophoniste) pour désamorcer la tension en douceur.",
  },
  {
    question: "Comment l'aider à inviter un camarade à la maison sans le mettre sous pression ?",
    answer:
      "Limitez l'invitation à un seul camarade et sur une durée courte (une heure et demie après l'école). Préparez à l'avance une activité manuelle ou un défi pratique (pâtisserie, construction, puzzle) : quand les mains sont occupées sur un projet commun, le contact se noue sans l'angoisse d'avoir à tenir une conversation continue.",
  },
];

export const Route = createFileRoute("/guides/timidite-confiance-prise-de-parole")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant timide : 4 activités pour libérer la parole (6-12 ans)",
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
            { name: "Timidité et confiance en soi", path: PATH },
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
            dateModified: "2026-09-04",
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
      intro="Un enfant réservé est souvent un grand observateur : il regarde, analyse et réfléchit avant de s'exprimer. L'objectif n'est pas de le transformer en extraverti à tout prix, mais de lui donner les clés pour porter sa voix quand il le souhaite — en classe, devant un exposé ou en société. Voici comment l'accompagner en douceur à la maison."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Redonner confiance à l'école",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
        { label: "Réussite scolaire sans stress", to: "/guides/reussite-scolaire-aider-enfant" },
        {
          label: "Discipline positive et encouragements",
          to: "/guides/discipline-positive-sans-punition",
        },
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
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

      <h2>La réserve n'est pas un défaut : c'est une force d'observation</h2>
      <p>
        Dans la grille des intelligences multiples de Howard Gardner, certains enfants possèdent une
        forte <strong>intelligence intrapersonnelle</strong> : ils analysent leurs émotions,
        ressentent la nuance et observent attentivement avant d'agir (voir notre guide sur les{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Gardner</a>).
      </p>
      <p>
        Au lieu de lui répéter <em>« Ne sois pas timide »</em> (ce qui accentue l'anxiété),
        valorisez sa perspicacité. En lui confiant des missions graduelles selon les principes de la{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive</a>, vous renforcez
        sa confiance sans braquage.
      </p>

      <h2>4 exercices ludiques à réaliser à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">1. Le Journaliste de la Maison</h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Armé d'un faux micro (un stylo ou une cuillère en bois), l'enfant a pour mission
          d'interviewer un membre de la famille sur son souvenir d'enfance le plus drôle. Le rôle de
          journaliste lui offre un cadre protecteur : il pose les questions sans se sentir exposé.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          2. Le Discours de 1 Minute (La Boîte à Objets)
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Tirez au sort un objet du quotidien (une chaussure, une mangue, une brosse). L'enfant a 1
          minute pour convaincre la famille que cet objet possède un pouvoir magique. L'humour
          désamorce la peur du jugement.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          3. Le Théâtre d'Ombres ou de Marionnettes
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Derrière une boîte en carton découpée (fabriquée lors d'un atelier issu de nos{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles à la maison</a>),
          l'enfant fait parler un personnage. La marionnette sert d'écran protecteur : la voix se
          libère sans contact visuel direct.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          4. L'Hôte d'Accueil de la Famille
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Lorsqu'un invité arrive, confiez à votre enfant une responsabilité valorisante : offrir un
          verre d'eau ou le menu du repas. Développez son sens du service avec nos rituels pour{" "}
          <a href="/guides/autonomie-responsabilite-maison">rendre l'enfant autonome à la maison</a>
          .
        </p>
      </div>

      <h2>Que faire avant un exposé ou une récitation à l'école ?</h2>
      <p>
        L'exposé est souvent une épreuve redoutée. Pourtant, une préparation structurée à la maison
        le transforme en un formidable tremplin d'estime de soi (voir comment{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">
          accompagner la réussite scolaire sans stress
        </a>
        ) :
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
                Il raconte son sujet à voix haute en tête-à-tête avec vous. On note ses points
                forts.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">2 jours avant</td>
              <td className="px-4 py-3">
                Répétition devant 2 personnes bienveillantes (frère, grand-parent) avec une fiche de
                3 mots-clés.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">La veille & Jour J</td>
              <td className="px-4 py-3">
                Respiration ventrale, rappel que l'on partage une histoire et non une performance.
                Message d'encouragement : <em>« Tu es prêt, ta voix compte. »</em>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Quand la timidité cache une perte de confiance scolaire</h2>
      <p>
        Si la retenue de votre enfant s'accompagne d'un repli sur soi ou d'un refus d'aller en
        classe, consultez notre guide spécifique pour{" "}
        <a href="/guides/decrochage-scolaire-confiance-enfant">
          redonner confiance à un enfant en difficulté scolaire
        </a>
        .
      </p>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio aide les enfants timides à s'exprimer par l'action concrète. En validant des défis
        pratiques à leur rythme, les enfants découvrent la valeur de leur point de vue et partagent
        leurs réalisations avec fierté.
      </p>

      <h2>Foire aux questions (FAQ)</h2>
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

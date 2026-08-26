import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";

const PATH = "/guides/reussite-scolaire-aider-enfant";

const FAQ = [
  {
    question: "Comment aider mon enfant à réussir à l'école ?",
    answer:
      "Ce qui fonctionne le mieux se joue à la maison, et c'est plus simple qu'on ne le croit : des routines stables (sommeil, repas, temps de devoir à heure fixe) qui sécurisent l'enfant ; un espace de travail calme et prêt ; des devoirs faits en autonomie croissante plutôt que corrigés à sa place ; des félicitations précises sur l'effort et le progrès plutôt que sur l'intelligence ; et des occasions de réussir dans d'autres domaines que l'école (construire, cuisiner, organiser) qui entretiennent la confiance. Ces habitudes aident tous les enfants, quelles que soient leurs notes actuelles — et même dans une classe surchargée où l'enseignant ne peut pas suivre chaque élève.",
  },
  {
    question: "Mon enfant a de mauvaises notes : que faire ?",
    answer:
      "D'abord, ne pas dramatiser : une mauvaise note est une information, pas un verdict. Ensuite, chercher le « pourquoi » avant le « comment » : la difficulté est-elle passagère (fatigue, stress, conflit à l'école) ou durable ? Porte-t-elle sur une matière ou sur toutes ? L'enfant a-t-il compris la consigne, ou a-t-il eu un blocage ? Il est utile de parler avec l'enseignant, qui voit l'enfant dans un autre contexte. Enfin, reconstruire par des petites réussites concrètes : un objectif court, atteignable, validé, plutôt qu'un grand programme de rattrapage qui décourage.",
  },
  {
    question: "Comment faire les devoirs quand l'école ne peut pas suivre (classe surchargée) ?",
    answer:
      "Dans une classe de 60, 80 ou 100 élèves, l'enseignant n'a ni le temps ni les moyens de vérifier que chaque leçon est comprise — c'est donc à la maison que le suivi se joue, avec des moyens simples. La question rituelle est votre meilleur outil : chaque soir, « qu'as-tu appris aujourd'hui ? » — l'enfant qui reformule sa leçon la comprend, et vous repérez immédiatement ce qui n'a pas été compris. Ensuite, un créneau fixe de 20 à 30 minutes, une seule difficulté travaillée à la fois, et la règle des « 3 essais avant de demander » qui apprend à chercher. Si vous ne maîtrisez pas la matière, l'enfant peut vous expliquer sa leçon : c'est lui qui apprend en vous l'enseignant. Et en cas de redoublement annoncé, prenez-le comme une deuxième chance : un enfant qui refait une année avec un vrai rituel de travail à la maison réussit souvent mieux la seconde fois.",
  },
  {
    question: "Qu'est-ce qui prédit le mieux la réussite scolaire ?",
    answer:
      "Ni le QI ni l'avance précoce. Les facteurs qui ressortent le plus des recherches sont la confiance en sa capacité d'apprendre, la régularité des habitudes de travail, la capacité à tolérer l'erreur et à persévérer, et la stabilité de l'environnement familial. Un enfant qui croit que l'effort change les résultats — plutôt que « je suis nul de naissance » — persévère davantage et progresse davantage. C'est une bonne nouvelle pour les parents : ces facteurs se cultivent à la maison, indépendamment du niveau scolaire de départ.",
  },
  {
    question: "Faut-il récompenser les bonnes notes ?",
    answer:
      "Récompenser chaque bonne note avec de l'argent ou des cadeaux est contre-productif à long terme : l'enfant apprend à travailler pour la récompense et perd le plaisir d'apprendre. Ce qui fonctionne mieux, c'est de valoriser le processus : la régularité, l'effort, la méthode, le progrès entre deux contrôles. Célébrer la démarche (avoir révisé trois soirs de suite, avoir osé demander de l'aide) construit la motivation qui tient sur la durée. La fierté d'avoir bien fait, reconnue par le parent, vaut plus que n'importe quelle récompense matérielle.",
  },
  {
    question: "Mon enfant n'arrive pas à se concentrer sur ses devoirs, que faire ?",
    answer:
      "Commencez par vérifier les trois causes les plus courantes avant de chercher plus loin : le sommeil (un enfant fatigué ne se concentre pas), le sucre (un soda ou des bonbons avant les devoirs provoquent des montées et des chutes d'énergie) et le manque de mouvement (un enfant qui a besoin de bouger doit dépenser son énergie avant de travailler, ou travailler debout). Ensuite, adaptez le format : des blocs de 10 minutes avec des pauses, une seule consigne à la fois, et un point d'arrivée visible. Si malgré tout la concentration ne vient jamais, même sur des activités qu'il aime, parlez-en à un professionnel.",
  },
  {
    question: "Génizio peut-il aider mon enfant à réussir à l'école ?",
    answer:
      "Indirectement, oui, de deux façons. D'abord en entretenant la confiance en soi par des réussites concrètes hors de l'école : les défis de Génizio (construire, mesurer, cuisiner, vendre, organiser) donnent à l'enfant des preuves visibles qu'il est capable d'aller au bout des choses, ce qui rejaillit sur son rapport à l'apprentissage en classe. Ensuite en documentant ses réalisations dans un cahier de réussites qui le valorise autrement que par les notes. Génizio ne remplace pas l'école ni le soutien scolaire : il construit ce qui rend l'école possible — la confiance.",
  },
];

export const Route = createFileRoute("/guides/reussite-scolaire-aider-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Réussite scolaire : aider son enfant sans stress ni cris",
      description:
        "Découvrez 6 habitudes indispensables à la maison pour aider votre enfant à faire ses devoirs, surmonter les mauvaises notes et reprendre confiance sans conflit.",
      path: PATH,
      image: "/guides/og-reussite.jpg",
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
            { name: "Réussite scolaire et devoirs", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Réussite scolaire : comment aider son enfant à l'école sans crier ni stresser",
            description:
              "Guide pratique pour accompagner la scolarité de son enfant : devoirs sereins, gestion des mauvaises notes, autonomie et confiance en soi.",
            path: PATH,
            image: "/guides/og-reussite.jpg",
            datePublished: "2026-08-10",
            dateModified: "2026-08-26",
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
      eyebrow="Réussite scolaire & Devoirs"
      title="Réussite scolaire : comment aider son enfant à l'école sans crier ni stresser"
      intro="« Il est intelligent mais il ne travaille pas assez » : cette phrase cache presque toujours une autre réalité. Ce qui manque souvent à l'enfant n'est ni l'intelligence ni la volonté, mais des conditions propices à la maison — routines claires, méthode d'apprentissage adaptée et confiance en soi. Voici comment installer ces habitudes sans disputes quotidiennes."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Enfant qui décroche : l'aider",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        {
          label: "Canaliser un enfant agité",
          to: "/guides/enfant-agite-concentration",
        },
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
        { label: "Discipline positive sans crier", to: "/guides/discipline-positive-sans-punition" },
      ]}
    >
      <img
        src="/guides/og-reussite.jpg"
        alt="Enfant concentré sur son cahier accompagné de ses parents à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Ce qui prédit réellement la réussite scolaire</h2>
      <p>
        On croit souvent que la réussite scolaire dépend uniquement du QI ou de la facilité innée. Les recherches en psychologie cognitive démontrent le contraire : ce qui distingue les élèves qui réussissent durablement, c'est la <strong>confiance en leur capacité d'apprendre</strong>, la <strong>régularité</strong> des habitudes de travail, la capacité à <strong>tolérer l'erreur</strong> et la stabilité émotionnelle à la maison.
      </p>
      <p>
        Un enfant qui comprend que l'intelligence se développe avec l'entraînement persévère bien davantage qu'un enfant enfermé dans une étiquette (découvrez nos repères sur la{" "}
        <a href="/guides/intelligences-multiples-gardner">théorie des 9 formes d'intelligence</a>).
      </p>

      <h2>Les 6 habitudes indispensables à installer à la maison</h2>
      <ol className="space-y-3 my-6">
        <li>
          <strong>1. Des routines stables et un sommeil préservé :</strong> L'attention dépend d'un cerveau reposé. Éloignez les écrans le soir en appliquant nos conseils pour{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">réduire le temps d'écran sans crise</a>.
        </li>
        <li>
          <strong>2. Un espace de travail épuré :</strong> Une table débarrassée et sans distractions visuelles permet d'éviter l'éparpillement chez un{" "}
          <a href="/guides/enfant-agite-concentration">enfant inattentif ou qui ne tient pas en place</a>.
        </li>
        <li>
          <strong>3. L'autonomie plutôt que l'assistanat :</strong> Aidez-le à reformuler la consigne, mais ne faites jamais l'exercice à sa place. Apprenez-lui à devenir autonome grâce à nos rituels d'
          <a href="/guides/autonomie-responsabilite-maison">autonomie et de responsabilité</a>.
        </li>
        <li>
          <strong>4. Valoriser l'effort et la stratégie, pas le résultat brut :</strong> Félicitez sa persévérance (<em>« Tu as cherché 3 méthodes avant de trouver la solution, bravo ! »</em>) selon les principes de la{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>.
        </li>
        <li>
          <strong>5. Apaiser la frustration face aux erreurs :</strong> Une mauvaise note génère souvent de la colère ou du découragement. Appliquez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour réguler la frustration</a>.
        </li>
        <li>
          <strong>6. Des victoires dans d'autres domaines :</strong> Proposez-lui nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a> ou des{" "}
          <a href="/guides/activites-manuelles-enfant">ateliers manuels et de bricolage</a> pour nourrir son sentiment de compétence.
        </li>
      </ol>

      <h2>Quand l'école ne peut pas suivre : les devoirs dans une classe nombreuse</h2>
      <p>
        Dans de nombreuses écoles, les classes comptent 40, 60 voire 80 élèves. L'enseignant ne peut pas assurer un suivi individualisé quotidien. C'est à la maison que la consolidation se joue :
      </p>
      <ul>
        <li>
          <strong>La méthode de l'enfant-professeur :</strong> Demandez à votre enfant de vous expliquer sa leçon comme s'il était l'enseignant. Expliquer à voix haute est la méthode la plus puissante pour mémoriser.
        </li>
        <li>
          <strong>Le micro-créneau de 25 minutes :</strong> 25 minutes de concentration intense valent mieux que 2 heures de lutte passive.
        </li>
        <li>
          <strong>S'aider des nouveaux outils numériques :</strong> Découvrez comment utiliser judicieusement l'IA et les tuteurs virtuels avec notre guide{" "}
          <a href="/guides/ia-apprentissage-enfant">ChatGPT et l'IA pour les devoirs de mon enfant</a>.
        </li>
      </ul>

      <h2>Comment réagir aux mauvaises notes sans drame</h2>
      <p>
        Une mauvaise note est un signal d'ajustement, pas un verdict définitif. Voici comment transformer un échec en tremplin :
      </p>
      <ul>
        <li>
          <strong>Déculpabiliser :</strong> <em>« Cette note mesure ce que tu as compris ce jour-là, pas ta valeur ni ton intelligence. »</em>
        </li>
        <li>
          <strong>Analyser l'erreur avec méthode :</strong> Est-ce un manque de vocabulaire, une consigne lue trop vite ou un oubli de révision ?
        </li>
        <li>
          <strong>Prévenir le décrochage :</strong> Si les difficultés s'installent, suivez notre guide pas à pas pour{" "}
          <a href="/guides/decrochage-scolaire-confiance-enfant">redonner confiance à un enfant qui perd pied à l'école</a>.
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio renforce le moteur de la réussite scolaire : la confiance par l'action. En réalisant des défis concrets du quotidien (mesures, organisation, sciences maison, expression), votre enfant documente ses réussites réelles dans son Passeport de Talents, développant la curiosité et la persévérance nécessaires à l'école.
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

import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  howToJsonLd,
} from "@/lib/seo";

const PATH = "/guides/intelligences-multiples-gardner";

const FAQ = [
  {
    question: "Qu'est-ce que la théorie des intelligences multiples de Howard Gardner ?",
    answer:
      "Formulée en 1983 par le psychologue Howard Gardner (Harvard), cette théorie démontre qu'il n'existe pas une seule intelligence mesurable par le QI, mais au moins 8 à 9 formes d'intelligence distinctes : linguistique, logico-mathématique, spatiale, kinesthésique, musicale, interpersonnelle, intrapersonnelle, naturaliste et existentielle. Un enfant qui peine avec les cours magistraux peut ainsi exceller en logique spatiale, en négociation ou en ingéniosité manuelle.",
  },
  {
    question: "Quelle est la 9e intelligence : l'intelligence existentielle ou philosophique ?",
    answer:
      "L'intelligence existentielle (ou spirituelle/philosophique) est la capacité à s'interroger sur le sens profond de la vie, l'univers, la justice, la mort et l'existence humaine. Chez l'enfant, elle se manifeste très tôt par des questions métaphysiques profondes (« d'où venons-nous ? », « pourquoi le monde est-il ainsi ? ») et un sens aigu de l'éthique.",
  },
  {
    question: "Quelles sont les 9 intelligences de Howard Gardner ?",
    answer:
      "Les 9 formes recensées regroupent le linguistique (les mots), le logico-mathématique (la logique pure), le spatial (la vision en relief), le kinesthésique (la motricité et les mains), le musical (rythmes et harmonies), l'interpersonnel (l'intelligence sociale), l'intrapersonnel (l'introspection), le naturaliste (le vivant) et enfin l'existentiel (le questionnement de sens).",
  },
  {
    question: "Comment identifier les intelligences fortes de mon enfant sans test sur écran ?",
    answer:
      "Les QCM théoriques sont souvent biaisés. La méthode la plus fiable consiste à observer ce que votre enfant entreprend spontanément quand il est libre : démonte-t-il des objets ? Invente-t-il des histoires ? Régule-t-il les disputes de ses amis ? Documenter ses réalisations concrètes sur 2 à 3 semaines révèle ses talents dominants avec une grande précision.",
  },
  {
    question: "Mon enfant est-il surdoué (HPI) s'il développe plusieurs intelligences ?",
    answer:
      "Pas obligatoirement. Les intelligences multiples décrivent la diversité des modes d'apprentissage, tandis que le Haut Potentiel Intellectuel (HPI) concerne une vitesse et une intensité neuronale globale confirmée par un bilan psychométrique. Les deux approches se complètent pour valoriser l'enfant.",
  },
  {
    question: "Comment Génizio valorise-t-il les 9 intelligences à la maison ?",
    answer:
      "Génizio transforme chaque forme d'intelligence en défis concrets du quotidien (bricoler, calculer un budget de marché, interviewer un proche, observer la nature). En photographiant ses réalisations, le parent bâtit la cartographie vivante des talents de son enfant sans jamais l'enfermer dans une étiquette figée.",
  },
];

const INTELLIGENCES = [
  {
    name: "1. Linguistique & verbale",
    what: "Aisance avec les mots, la narration et le débat.",
    signs:
      "Raconte des histoires captivantes. Retient facilement le vocabulaire entendu. Aime lire ou écouter des contes.",
  },
  {
    name: "2. Logico-mathématique",
    what: "Raisonnement déductif, énigmes, calcul et structures de cause à effet.",
    signs:
      "Pose continuellement la question du « pourquoi ». Cherche les failles logiques dans les règles et adore le calcul mental.",
  },
  {
    name: "3. Visuelle & spatiale",
    what: "Visualisation 3D, orientation et conception spatiale.",
    signs:
      "S'oriente d'instinct. Assemble des constructions complexes sans notice. Imagine un objet sous tous ses angles avant de le dessiner ou de le fabriquer.",
  },
  {
    name: "4. Corporelle & kinesthésique",
    what: "Apprentissage par le corps, le toucher et la dextérité manuelle.",
    signs:
      "A besoin de manipuler pour comprendre. Apprend en bougeant.",
  },
  {
    name: "5. Musicale & rythmique",
    what: "Sensibilité aux rythmes, timbres sonores et mélodies.",
    signs:
      "Fredonne en permanence. Reproduit un rythme avec les doigts. Mémorise les airs dès la première écoute.",
  },
  {
    name: "6. Interpersonnelle (sociale)",
    what: "Intelligence relationnelle, empathie et esprit de coopération.",
    signs:
      "Perçoit l'humeur des autres. Désamorce les tensions entre camarades et prend spontanément le leadership dans un jeu d'équipe.",
  },
  {
    name: "7. Intrapersonnelle (émotionnelle)",
    what: "Connaissance lucide de ses forces, émotions et limites.",
    signs:
      "Exprime clairement ce qu'il ressent. Recherche des moments de solitude créative et apprend de ses erreurs avec maturité.",
  },
  {
    name: "8. Naturaliste & écologique",
    what: "Observation, catégorisation et compréhension du vivant.",
    signs:
      "Passionné par la faune et la flore. Remarque les moindres détails naturels.",
  },
  {
    name: "9. Existentielle (philosophique)",
    what: "Questionnement sur le sens de la vie, la justice, le cosmos et la morale.",
    signs:
      "Pose très tôt des questions métaphysiques (« d'où vient l'univers ? »). A besoin de comprendre la finalité profonde de chaque apprentissage pour s'engager.",
  },
];

export const Route = createFileRoute("/guides/intelligences-multiples-gardner")({
  head: () => {
    const meta = pageMeta({
      title: "Les 9 formes d'intelligence pour révéler ses talents",
      description:
        "Les 9 formes d'intelligence de Howard Gardner (kinesthésique, spatiale, existentielle...) pour repérer les forces de votre enfant sans test réducteur.",
      path: PATH,
      image: "/guides/og-gardner.jpg",
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
            { name: "Intelligences multiples de Gardner", path: PATH },
          ]),
        ),
        jsonLdScript(
          howToJsonLd({
            name: "Protocole en 3 étapes : Observer les 9 intelligences de son enfant à la maison",
            description:
              "Une méthode d'observation naturelle sans questionnaire sur écran pour cartographier les forces réelles de votre enfant en 14 jours.",
            steps: [
              {
                name: "Observation des moments de jeu libre",
                text: "Notez pendant 7 jours ce que votre enfant entreprend spontanément lorsqu'il n'a aucune consigne : construction, dessin, négociation, histoires ou démontage d'objets.",
              },
              {
                name: "Test des défis croisés 10 minutes",
                text: "Proposez 3 mini-défis variés (un calcul pratique, un parcours moteur, une énigme logique) et observez quelle activité déclenche l'état de concentration spontanée (flow).",
              },
              {
                name: "Validation par la fierté de réalisation",
                text: "Photographiez ses créations pour bâtir son portfolio et l'encourager dans ses formes d'intelligence dominantes.",
              },
            ],
          }),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Les 9 formes d'intelligence de Howard Gardner : comment identifier les talents de son enfant",
            description:
              "Guide parental complet sur les 9 formes d'intelligence (Gardner) : signes d'observation concrets, intelligence existentielle, activités maison et valorisation des talents.",
            path: PATH,
            image: "/guides/og-gardner.jpg",
            datePublished: "2026-07-27",
            dateModified: "2026-08-27",
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
      eyebrow="Talents de l'enfant"
      title="Les 9 formes d'intelligence : comment identifier les talents de votre enfant"
      intro="Votre enfant ne rentre pas dans le moule scolaire classique, mais il répare, négocie, dessine, compose ou organise ? Ce n'est pas un paradoxe : selon la théorie des intelligences multiples de Howard Gardner, l'intelligence ne se résume pas aux notes scolaires. Voici les 9 formes d'intelligence et les repères d'observation pour valoriser ses forces au quotidien."
      updated="27 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        { label: "Enfant HPI : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "Test de personnalité : 4 limites", to: "/guides/test-de-personnalite-enfant-talents" },
        { label: "Autisme & TDAH : atouts uniques", to: "/guides/autisme-tdah-apprentissage-forces-reelles" },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-gardner.jpg"
        alt="Enfants africains explorant différentes formes de créativité et d'intelligences multiples"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>D'où vient la théorie des intelligences multiples ?</h2>
      <p>
        En 1983, le chercheur américain <strong>Howard Gardner</strong> (Harvard) publie <em>Frames of Mind</em>. Un pavé dans la mare. Sa thèse est limpide : le QI traditionnel ne mesure qu'une fraction des capacités humaines. Les compétences logico-mathématiques et verbales prennent toute la place, au détriment du reste.
      </p>
      <p>
        Gardner formalise d'abord 7 intelligences. Il y ajoute plus tard le profil naturaliste et examine la composante existentielle. Constat neurobiologique fondamental : <strong>notre cerveau abrite plusieurs circuits de traitement distincts</strong>.
      </p>

      <h2>Les 9 formes d'intelligence : comment les repérer chez votre enfant</h2>
      <p>
        Voici les 9 profils adaptés aux parents. Oubliez les QCM abstraits : observez simplement ce qu'il entreprend au quotidien.
      </p>

      <div className="my-8 space-y-5">
        {INTELLIGENCES.map((i) => (
          <div key={i.name} className="rounded-2xl border border-ink/10 bg-surface p-5 shadow-xs">
            <h3 className="text-xl font-bold text-ink">{i.name}</h3>
            <p className="mt-2 text-ink/90 text-sm">
              <strong className="text-brand">Ce que c'est :</strong> {i.what}
            </p>
            <p className="mt-2 text-ink/80 text-sm bg-brand/5 p-3 rounded-xl border border-brand/10">
              <strong className="text-ink">Signes observables à la maison :</strong> {i.signs}
            </p>
          </div>
        ))}
      </div>

      <h2>Zoom sur l'intelligence existentielle : la 9e forme méconnue</h2>
      <p>
        Difficile à évaluer sur un bulletin scolaire, l'<strong>intelligence existentielle</strong> (ou philosophique) s'exprime pourtant dès l'âge de 5 ou 6 ans.
      </p>
      <p>
        L'enfant vous posera des questions directes : <em>« Pourquoi les humains meurent-ils ? »</em>, <em>« Qui a décidé ce qui est juste ? »</em>, <em>« D'où vient l'univers ? »</em>. Ces enfants ont un besoin vital de comprendre le <strong>sens</strong> de ce qu'ils apprennent. Face au « par cœur » non expliqué, ils décrochent par manque de substance philosophique (voir nos conseils pour{" "}
        <a href="/guides/decrochage-scolaire-confiance-enfant">redonner confiance à un enfant qui se décourage à l'école</a>).
      </p>

      <h2>Mon enfant est-il surdoué, HPI ou précoce ?</h2>
      <p>
        Confusion fréquente : exceller dans plusieurs intelligences ne signifie pas être HPI. <strong>Ce sont deux grilles distinctes</strong>.
      </p>
      <p>
        Le Haut Potentiel Intellectuel relève d'une vitesse de traitement global validée par un psychologue (WISC-V). Si vous observez un décalage marqué, consultez notre{" "}
        <a href="/guides/potentiel-haut-potentiel-enfant">dossier sur les signes réels du haut potentiel (HPI)</a>. Dans tous les cas, nourrir ses talents réels reste la meilleure réponse éducative.
      </p>

      <h2>Comment utiliser les forces de votre enfant comme passerelles</h2>
      <p>
        La règle d'or : ne jamais figer un enfant dans une case unique. Utilisez plutôt un talent dominant pour débloquer une matière difficile :
      </p>
      <ul>
        <li>
          <strong>Votre enfant bouge sans arrêt (kinesthésique) ?</strong> Proposez-lui des{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles</a> et découvrez nos repères pour{" "}
          <a href="/guides/enfant-agite-concentration">canaliser un enfant agité par le mouvement</a>.
        </li>
        <li>
          <strong>Il est très sensible et réfléchi (intrapersonnel) ?</strong> Aidez-le à poser des mots précis avec nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour apaiser la frustration</a>.
        </li>
        <li>
          <strong>Il est passionné de logique (logico-spatial) ?</strong> Nourrissez sa curiosité avec nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives maison</a>.
        </li>
      </ul>

      <div className="my-8 rounded-2xl bg-brand-50 p-6 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">
          💡 Le Défi d'Observation Parentale sur 3 Jours
        </h3>
        <p className="text-sm text-ink/80 leading-relaxed mb-3">
          Oubliez les QCM théoriques (voir notre enquête sur les{" "}
          <a href="/guides/test-de-personnalite-enfant-talents" className="underline font-semibold text-brand">
            limites des tests de personnalité pour enfants
          </a>). Pendant 3 jours, observez simplement votre enfant dans ses moments de liberté totale :
        </p>
        <ul className="text-sm text-ink/80 leading-relaxed space-y-1">
          <li>• Se met-il à fredonner ou reproduire des rythmes ? (Musicale)</li>
          <li>• Dessine-t-il les plans d'un monde imaginaire ? (Spatiale)</li>
          <li>• Vient-il négocier ou organiser un jeu pour ses frères et sœurs ? (Interpersonnelle)</li>
          <li>• Vous interroge-t-il sur les mystères de la nature ou de l'univers ? (Naturaliste / Existentielle)</li>
        </ul>
        <p className="text-sm text-ink/80 leading-relaxed mt-3">
          Ce sont ces réalisations concrètes qui révèlent sa trajectoire.
        </p>
      </div>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        L'application Génizio ne pose aucun diagnostic scolaire. Elle propose des défis concrets du quotidien répartis sur les 9 formes d'intelligence : construire un objet, calculer le budget d'un plat familial, inventer une histoire, observer la trajectoire du soleil.
      </p>
      <p>
        En photographiant le résultat de chaque défi réussi, vous construisez pas à pas le <strong>Passeport de Talents</strong> de votre enfant, fondé sur ses victoires réelles et son génie propre.
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

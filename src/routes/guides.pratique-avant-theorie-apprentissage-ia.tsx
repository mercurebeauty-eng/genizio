import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/pratique-avant-theorie-apprentissage-ia";

const FAQ = [
  {
    question:
      "Pourquoi enseigner la pratique avant la théorie fonctionne-t-il mieux avec les enfants ?",
    answer:
      "L'enfant apprend par l'expérience et la curiosité active, pas par l'abstraction pure. Lorsqu'on lui impose une formule ou une règle théorique sans contexte, son cerveau la traite comme une information morte à mémoriser pour un examen. À l'inverse, lorsqu'il est d'abord confronté à un problème concret (construire un objet qui tient, équilibrer un budget, faire pousser une plante), il se heurte aux contraintes du réel. C'est cette friction qui déclenche un besoin viscéral et spontané d'aller chercher la théorie pour réussir son projet. La connaissance devient alors un pouvoir d'action et non une corvée.",
  },
  {
    question:
      "Comment l'intelligence artificielle change-t-elle la valeur des compétences scolaires ?",
    answer:
      "L'IA automatise à coût quasi nul les tâches cognitives d'exécution : rédiger un texte standard, coder une fonction, traduire, calculer ou réciter des faits historiques. Être un excellent exécutant mémoriel ne suffit plus pour garantir son avenir. Ce qui devient inestimable, ce sont les méta-compétences humaines : l'esprit critique, la capacité à poser les bonnes questions, l'ingéniosité pratique, le sens de l'initiative, le jugement et l'audace de transformer une idée en réalisation tangible.",
  },
  {
    question:
      "Mon enfant a de mauvaises notes en théorie : est-ce le signe qu'il réussira moins bien plus tard ?",
    answer:
      "Absolument pas. Les examens scolaires classiques évaluent principalement la mémoire et la conformité à des procédures formelles. Beaucoup d'enfants pénalisés par ce format possèdent une intelligence spatiale, artisanale, entrepreneuriale ou relationnelle remarquable. Dans un monde où l'IA gère la théorie, ces profils axés sur l'action, l'intuition et la débrouillardise pratique détiennent précisément les qualités d'adaptation les plus recherchées.",
  },
  {
    question: "Comment appliquer ce principe à la maison dès ce soir en 10 minutes ?",
    answer:
      "Ne commencez jamais par expliquer la règle. Donnez un micro-défi concret avec du matériel simple : par exemple, 'construis une tour d'au moins 30 cm avec 10 spaghettis et du scotch', ou 'calcule combien nous avons dépensé pour le repas et imagine comment économiser 10 %'. Laissez l'enfant expérimenter, échouer, observer ce qui ne marche pas, puis posez des questions pour l'amener à découvrir lui-même le principe logique ou physique sous-jacent.",
  },
  {
    question: "Comment Naya et Génizio accompagnent-ils cette transition du réel vers la théorie ?",
    answer:
      "Génizio génère des défis personnalisés ancrés dans le quotidien de l'enfant (cuisine, mécanique, petit commerce, nature, expression). L'enfant réalise son projet, le parent valide la preuve photographique, et l'IA Naya intervient non pour donner des réponses toutes faites, mais pour stimuler le questionnement critique et cartographier les 9 formes d'intelligence de l'enfant au fil des semaines.",
  },
];

export const Route = createFileRoute("/guides/pratique-avant-theorie-apprentissage-ia")({
  head: () => {
    const meta = pageMeta({
      title: "Pratique avant théorie : éduquer son enfant à l'ère de l'IA",
      description:
        "Découvrez pourquoi la confrontation au réel doit précéder la théorie pour développer l'esprit critique, l'ingéniosité et l'employabilité future de votre enfant.",
      path: PATH,
      image: "/guides/og-pratique-theorie.jpg",
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
            { name: "Pédagogie & Ère IA", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Pourquoi la pratique doit précéder la théorie à l'ère de l'intelligence artificielle",
            description:
              "Comment inverser le modèle scolaire hérité pour révéler le plein potentiel pratique et intellectuel de votre enfant grâce à l'expérimentation concrète.",
            path: PATH,
            image: "/guides/og-pratique-theorie.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-08-24",
          }),
        ),
      ],
    };
  },
  component: GuidePratiqueAvantTheorie,
});

function GuidePratiqueAvantTheorie() {
  return (
    <GuideLayout
      eyebrow="Pédagogie & Ère IA"
      title="Pourquoi la pratique doit précéder la théorie à l'ère de l'intelligence artificielle"
      intro="Pendant plus d'un siècle, l'école a fonctionné sur une promesse simple : mémorisez d'abord la théorie abstraite, et vous l'appliquerez peut-être un jour. Mais avec l'essor fulgurant de l'IA, ce modèle est devenu obsolète. Pour préparer un enfant à un monde incertain, il faut inverser l'équation : partir de la confrontation directe au réel pour susciter la soif naturelle de savoir."
      updated="24 août 2026"
      readingTime="6 min"
      path={PATH}
      related={[
        {
          label: "L'IA pour aider son enfant à apprendre",
          to: "/guides/ia-apprentissage-enfant",
        },
        {
          label: "Les 9 formes d'intelligence de Gardner",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Aider son enfant à choisir son métier dès 10 ans",
          to: "/guides/orientation-scolaire-metiers-avenir",
        },
      ]}
    >
      <img
        src="/guides/og-pratique-theorie.jpg"
        alt="Enfant africain construisant un projet concret avec son père dans un atelier familial"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <div className="space-y-8">
        <h2>1. Le grand basculement : quand l'IA rend la théorie accessible à tous</h2>
        <p>
          Il y a encore vingt ans, l'accès au savoir théorique était le principal facteur de
          différenciation sociale et professionnelle. Celui qui connaissait par cœur les formules,
          les règles grammaticales ou les procédures administratives détenait un avantage décisif.
        </p>
        <p>
          Aujourd'hui, n'importe quel modèle d'intelligence artificielle est capable de rédiger un
          essai, de résoudre une équation complexe, de générer du code informatique ou de traduire
          dix langues en une fraction de seconde.{" "}
          <strong>Le coût d'accès à la théorie s'est effondré.</strong>
        </p>
        <p>
          Dans ce nouveau contexte, continuer à évaluer nos enfants uniquement sur leur capacité à
          restituer des cours théoriques revient à les préparer à des métiers que les algorithmes
          exécutent déjà mieux qu'eux.
        </p>

        <div className="rounded-3xl border border-brand/25 bg-brand/5 p-6 md:p-8">
          <h3 className="font-display text-lg font-extrabold text-ink mb-2">
            La question centrale que tout parent doit se poser :
          </h3>
          <p className="text-base font-semibold italic text-ink/80 leading-relaxed">
            « Si des milliers d'élèves sortent de l'école avec le même diplôme et que l'IA gère la
            théorie, qu'est-ce qui fera la valeur unique et l'employabilité de mon enfant ? »
          </p>
        </div>

        <h2>2. L'impasse du modèle hérité : pourquoi la théorie abstraite décourage</h2>
        <p>
          Observez la manière dont les enfants réagissent face aux devoirs scolaires traditionnels :
          le découragement, l'ennui ou l'agitation ne sont pas des preuves de paresse. Ce sont les
          signaux d'un cerveau qui ne comprend pas <em>pourquoi</em> il doit emmagasiner une notion
          déconnectée de sa réalité immédiate.
        </p>
        <p>
          Lorsqu'on enseigne les fractions, les pourcentages ou la géométrie sans que l'enfant n'ait
          jamais eu à mesurer une planche de bois ou à rendre la monnaie sur un marché, ces concepts
          restent des symboles froids sur une feuille de papier. L'enfant apprend pour la note, puis
          oublie dès le lendemain de l'examen.
        </p>

        <h2>3. Le renversement Génizio : du réel vers la théorie</h2>
        <p>
          L'apprentissage le plus puissant au monde ne commence pas par une leçon magistrale. Il
          commence par un défi pratique :
        </p>
        <ul className="space-y-3 list-disc pl-5 font-medium text-ink/80">
          <li>
            <strong>Étape 1 : L'immersion dans le réel.</strong> L'enfant se voit confier une
            mission tangible adaptée à son âge (ex. fabriquer un mini-système d'irrigation
            goutte-à-goutte avec des bouteilles recyclées, créer un logo et vendre des jus de
            bissap, concevoir un pont en bâtonnets qui supporte 1 kg).
          </li>
          <li>
            <strong>Étape 2 : La friction et l'échec constructif.</strong> Le premier pont
            s'écroule, le débit d'eau est trop rapide, le calcul des coûts est inexact. C'est à cet
            instant précis que se produit le déclic intellectuel : l'enfant comprend les limites de
            son intuition.
          </li>
          <li>
            <strong>Étape 3 : La soif spontanée de théorie.</strong> Parce qu'il veut que son projet
            réussisse, l'enfant demande spontanément la formule, le principe de physique ou la
            méthode de calcul. La théorie n'est plus une contrainte imposée de l'extérieur : elle
            devient son arme pour triompher du défi.
          </li>
        </ul>

        <h2>4. La revanche des profils atypiques et des intelligences pratiques</h2>
        <p>
          Pendant des générations, les enfants qui avaient besoin de bouger, de toucher, de démonter
          des objets ou de marchander ont été qualifiés d'élèves « perturbateurs » ou « non
          scolaires ». Le système valorisait presque exclusivement l'intelligence linguistique et
          logico-mathématique formelle.
        </p>
        <p>
          Or, dans l'économie du XXIe siècle, ce sont précisément ces profils qui prennent leur
          revanche :
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <h4 className="font-display font-extrabold text-base text-ink mb-1.5">
              L'intelligence entrepreneuriale
            </h4>
            <p className="text-xs font-semibold text-ink/70 leading-relaxed">
              Capacité à repérer une opportunité, négocier, mobiliser des ressources et assumer des
              décisions face à l'incertitude.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <h4 className="font-display font-extrabold text-base text-ink mb-1.5">
              L'intelligence spatiale & artisanale
            </h4>
            <p className="text-xs font-semibold text-ink/70 leading-relaxed">
              Compréhension intuitive des volumes, de la matière, de la mécanique et de la
              transformation d'une idée abstraite en objet fonctionnel.
            </p>
          </div>
        </div>

        <h2>5. De l'enfant exécutant à l'enfant architecte avec l'IA</h2>
        <p>
          Face aux outils d'intelligence artificielle, deux voies s'offrent aux jeunes générations :
        </p>
        <ol className="space-y-2 list-decimal pl-5 font-medium text-ink/80">
          <li>
            <strong>L'exécutant passif :</strong> Il utilise l'IA comme un robot pour faire ses
            devoirs à sa place, sans développer aucun muscle intellectuel propre. Il sera le premier
            fragilisé sur le marché de l'emploi.
          </li>
          <li>
            <strong>L'architecte éclairé :</strong> Il utilise l'IA comme un partenaire
            d'expérimentation. Il observe le réel, formule des hypothèses, demande à l'IA de
            critiquer son projet, teste les solutions et garde le discernement final.
          </li>
        </ol>
        <p>
          C'est précisément cette posture d'architecte que Génizio et son IA Naya développent chez
          chaque enfant.
        </p>

        <h2>6. Trois mini-défis à tester à la maison dès ce soir</h2>
        <div className="space-y-4 mt-4">
          <div className="rounded-2xl border border-ink/10 bg-surface/80 p-5">
            <h4 className="font-display font-bold text-sm text-brand mb-1">
              Défi 1 (6-9 ans) : L'ingénieur du pont suspendu
            </h4>
            <p className="text-xs font-medium text-ink/75">
              Donnez à votre enfant 10 feuilles de papier et 20 cm de scotch. Objectif : construire
              un pont entre deux chaises capable de soutenir une tasse pleine sans s'effondrer.
              Laissez-le plier, tester et comprendre la résistance des formes géométriques.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface/80 p-5">
            <h4 className="font-display font-bold text-sm text-brand mb-1">
              Défi 2 (9-13 ans) : Le mini-comptable du dîner
            </h4>
            <p className="text-xs font-medium text-ink/75">
              Donnez-lui le ticket des courses ou la liste des ingrédients du dîner. Sa mission :
              calculer le coût réel par assiette servie à la famille et trouver 2 propositions pour
              réduire le coût de 15 % sans changer la qualité du repas.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-surface/80 p-5">
            <h4 className="font-display font-bold text-sm text-brand mb-1">
              Défi 3 (12-16 ans) : Le plaidoyer contradictoire
            </h4>
            <p className="text-xs font-medium text-ink/75">
              Choisissez un sujet d'actualité ou un dilemme familial. Demandez-lui de défendre une
              opinion pendant 3 minutes, puis de changer instantanément de camp et de réfuter ses
              propres arguments avec la même vigueur. C'est l'exercice roi de l'esprit critique.
            </p>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}

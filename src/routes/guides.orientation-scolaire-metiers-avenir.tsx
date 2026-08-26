import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/orientation-scolaire-metiers-avenir";

const FAQ = [
  {
    question:
      "N'est-il pas trop tôt pour parler d'orientation scolaire à un enfant de 10 à 12 ans ?",
    answer:
      "Il ne s'agit pas de lui faire choisir une carrière définitive, mais d'éveiller sa curiosité pour la diversité des métiers du monde réel : artisanat, commerce, agriculture, santé, numérique, enseignement. Plus un enfant découvre tôt la variété des métiers et des filières possibles, plus il donne du sens à ses apprentissages scolaires actuels — « à quoi ça sert » devient une question concrète, pas une menace.",
  },
  {
    question: "Quelles filières peut choisir mon enfant après le collège ?",
    answer:
      "Tout dépend du pays et du système scolaire, mais le principe est le même : les filières professionnelles (CAP, BTS, formations techniques, apprentissage) mènent à des métiers réels et demandés — plomberie, électricité, couture, mécanique, cuisine, agriculture, informatique — souvent plus vite que les filières générales, et avec de vraies perspectives. Un enfant qui aime travailler avec ses mains n'a pas « raté » l'école : il a simplement besoin d'une filière qui valorise son intelligence pratique. L'important est de visiter, d'interroger des professionnels et de regarder ce qui existe vraiment près de chez vous avant de décider.",
  },
  {
    question:
      "Comment l'IA et l'apprentissage par projet aident-ils à déceler les métiers du futur ?",
    answer:
      "Les métiers de demain exigeront la résolution de problèmes complexes, la créativité et la pensée critique — des capacités que les examens purement théoriques mesurent mal. En observant les compétences mobilisées lors de défis réels (construire, vendre, organiser, réparer), on identifie les appétences naturelles qui feront la différence, bien avant que les notes n'en disent quoi que ce soit.",
  },
  {
    question:
      "Que faire si mon enfant ne s'intéresse qu'à un seul sujet (ex. le football ou la musique) ?",
    answer:
      "Utilisez ce sujet comme point de départ ! Autour du football gravitent des métiers de statistiques, de journalisme, de kinésithérapie, de gestion d'événements et d'architecture de stade. Autour de la musique : l'ingénierie du son, la production, l'événementiel, l'enseignement. Raccordez toujours la passion de l'enfant à l'éventail des métiers et des compétences qui l'entourent — la passion n'est pas une impasse, c'est une porte d'entrée.",
  },
];

export const Route = createFileRoute("/guides/orientation-scolaire-metiers-avenir")({
  head: () => {
    const meta = pageMeta({
      title: "Orientation scolaire : choisir son métier dès 10 ans",
      description:
        "Découvrez 3 enquêtes pratiques à faire à la maison pour éveiller son enfant aux métiers d'avenir, filières techniques et talents réels sans pression.",
      path: PATH,
      image: "/guides/og-orientation.jpg",
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
            { name: "Orientation scolaire & Métiers", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Aider son enfant à choisir son métier : 3 enquêtes à faire à la maison",
            description:
              "Méthode concrète pour aider son enfant à découvrir les métiers et les filières possibles à l'ère de l'intelligence artificielle.",
            path: PATH,
            image: "/guides/og-orientation.jpg",
            datePublished: "2026-08-08",
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
      eyebrow="Orientation & Métiers"
      title="Aider son enfant à choisir son métier : 3 enquêtes à faire à la maison"
      intro="L'orientation scolaire ne se décide pas en un jour, en fin de collège, face à une fiche administrative. Elle se construit en découvrant dès l'enfance la diversité des métiers concrets : artisanat, commerce, ingénierie, santé, numérique et création. Voici 3 enquêtes simples à mener à la maison pour révéler ses affinités professionnelles."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        { label: "Test d'orientation collégien & IA", to: "/guides/test-orientation-metier-enfant-futur" },
        { label: "12 défis pour adolescents", to: "/guides/defis-pour-adolescents" },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
        { label: "L'IA pour apprendre avec son enfant", to: "/guides/ia-apprentissage-enfant" },
        { label: "Pratique avant théorie à l'ère de l'IA", to: "/guides/pratique-avant-theorie-apprentissage-ia" },
      ]}
    >
      <img
        src="/guides/og-orientation.jpg"
        alt="Jeune élève découvrant un projet scientifique et technologique avec son père"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi les notes scolaires seules ne prédisent pas la réussite professionnelle</h2>
      <p>
        L'école traditionnelle mesure essentiellement l'intelligence verbale et logico-mathématique abstraite. Pourtant, le monde professionnel valorise tout autant l'intelligence relationnelle (négocier, fédérer), spatiale et manuelle (concevoir, réparer) ainsi que le sens pratique (découvrez la cartographie complète des{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Gardner</a>).
      </p>
      <p>
        À l'ère de l'intelligence artificielle, les compétences techniques pures évoluent très vite. Ce qui fait la différence durable, c'est l'agilité et l'apprentissage par l'action (consultez notre analyse sur{" "}
        <a href="/guides/pratique-avant-theorie-apprentissage-ia">la pratique avant la théorie face à l'IA</a>).
      </p>

      <h2>3 enquêtes d'orientation ludiques à mener à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">
          1. L'interview d'un professionnel du quartier
        </h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Proposez à votre enfant de préparer 5 questions et d'interviewer un artisan, un commerçant, un médecin ou un informaticien : <em>« Quelle est ta plus grande fierté dans ce métier ? »</em>, <em>« Quels défis résous-tu au quotidien ? »</em>.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">2. Le défi du 'Mini-Projet Réel'</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Invitez votre enfant à concevoir une petite activité concrète : fabriquer des objets récup (via nos{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles faciles</a>), organiser une vente de limonade ou créer un tutoriel vidéo. Il découvrira s'il préfère concevoir, chiffrer ou vendre.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. La carte des métiers de la famille
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Dressez l'arbre des métiers des parents, oncles, tantes et grands-parents. L'enfant découvre la richesse des parcours réels et la diversité des filières.
        </p>
      </div>

      <h2>Des outils complémentaires pour les collégiens et adolescents</h2>
      <p>
        Si votre enfant entre dans l'adolescence, découvrez notre outil interactif d'exploration :{" "}
        <a href="/guides/test-orientation-metier-enfant-futur">Test d'orientation collégien : choisir un métier à l'ère de l'IA</a>, ainsi que nos{" "}
        <a href="/guides/defis-pour-adolescents">12 défis pratiques pour motiver un adolescent</a>.
      </p>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio agit comme un observatoire vivant des talents de votre enfant. En réalisant des missions pratiques et variées, l'enfant explore différents univers (sciences, gestion, art, communication) et forge son profil naturel sans tests artificiels.
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

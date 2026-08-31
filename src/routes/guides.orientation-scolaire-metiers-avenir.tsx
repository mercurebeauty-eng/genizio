import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/orientation-scolaire-metiers-avenir";

const FAQ = [
  {
    question:
      "N'est-il pas trop tôt pour parler d'orientation scolaire à un enfant de 10 à 12 ans ?",
    answer:
      "Le but n'est pas de figer une carrière, mais de donner du sens aux apprentissages scolaires en découvrant les métiers du quotidien : artisanat, commerce, santé, numérique ou ingénierie.",
  },
  {
    question: "Quelles filières peut choisir mon enfant après le collège ?",
    answer:
      "Les filières techniques et professionnelles (CAP, bac pro, apprentissage) répondent à une vraie demande du marché (artisanat, énergie, maintenance, informatique). Un jeune attiré par le travail manuel a besoin d'un parcours qui valorise son intelligence concrète plutôt que de s'épuiser dans une voie générale inadaptée.",
  },
  {
    question:
      "Comment l'apprentissage par projet aide-t-il à déceler les métiers du futur ?",
    answer:
      "En observant un enfant bâtir, organiser ou réparer un projet réel, ses forces naturelles émergent bien plus nettement qu'à travers un bulletin de notes.",
  },
  {
    question:
      "Que faire si mon enfant ne s'intéresse qu'à un seul sujet (ex. le football ou la musique) ?",
    answer:
      "Prenez sa passion comme point de départ. Autour du sport gravitent des métiers de données, de kinésithérapie, de logistique et de journalisme. Raccordez toujours son centre d'intérêt à l'écosystème professionnel qui l'entoure.",
  },
];

export const Route = createFileRoute("/guides/orientation-scolaire-metiers-avenir")({
  head: () => {
    const meta = pageMeta({
      title: "Orientation scolaire : choisir son métier dès 10 ans",
      description:
        "3 enquêtes pratiques à faire à la maison pour éveiller son enfant aux métiers d'avenir, filières techniques et talents réels sans pression.",
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
              "Méthode concrète pour aider son enfant à découvrir les métiers et les filières d'avenir dès le collège.",
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
        L'école traditionnelle mesure essentiellement l'intelligence verbale et logico-mathématique abstraite. Pourtant, le monde professionnel valorise tout autant l'intelligence relationnelle (négocier, fédérer), spatiale et manuelle (concevoir, réparer) ainsi que le sens pratique (voir la cartographie des{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Gardner</a>).
      </p>
      <p>
        Face aux évolutions technologiques, les compétences techniques pures évoluent très vite. Ce qui fait la différence durable, c'est l'agilité et l'apprentissage par l'action (consultez notre analyse sur{" "}
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
        Si votre enfant entre dans l'adolescence, consultez notre outil interactif d'exploration :{" "}
        <a href="/guides/test-orientation-metier-enfant-futur">Test d'orientation collégien : choisir son métier face à l'IA</a>, ainsi que nos{" "}
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

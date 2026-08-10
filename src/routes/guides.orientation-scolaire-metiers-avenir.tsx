import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/orientation-scolaire-metiers-avenir";

const FAQ = [
  {
    question: "N'est-il pas trop tôt pour parler d'orientation à un enfant de 10 à 12 ans ?",
    answer:
      "Il ne s'agit pas de lui faire choisir une carrière définitive, mais d'éveiller sa curiosité pour la diversité des compétences du monde réel. Plus un enfant découvre tôt la variété des métiers (ingénierie, création, artisanat, technologie, entrepreneuriat), plus il donne du sens à ses apprentissages scolaires actuels.",
  },
  {
    question: "Comment l'IA et l'apprentissage par projet aident-ils à déceler les métiers du futur ?",
    answer:
      "Les métiers de demain exigeront la résolution de problèmes complexes, la créativité et la pensée critique — des capacités que les examens purement théoriques mesurent mal. En observant les compétences mobilisées lors de défis réels, on identifie les appétences naturelles qui feront la différence.",
  },
  {
    question: "Que faire si mon enfant ne s'intéresse qu'à un seul sujet (ex. le football ou la musique) ?",
    answer:
      "Utilisez ce sujet comme passion d'ancrage ! Autour du football gravitent des métiers de statistiques, de journalisme, de kinésithérapie, de gestion d'événements et d'architecture de stade. Raccordez toujours la passion de l'enfant à l'éventail des compétences associées.",
  },
];

export const Route = createFileRoute("/guides/orientation-scolaire-metiers-avenir")({
  head: () => {
    const meta = pageMeta({
      title: "Faire découvrir les métiers à son enfant dès 10 ans",
      description:
        "Comment identifier les forces de votre enfant et le préparer aux métiers de demain grâce à la théorie des 9 intelligences.",
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
            { name: "Orientation & Métiers", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Découvrir les talents et métiers d'avenir dès 10 ans : le guide du parent éclairé",
            description:
              "Méthode pour cartographier le potentiel unique de l'enfant et l'orienter vers les compétences de demain.",
            path: PATH,
            image: "/guides/og-orientation.jpg",
            datePublished: "2026-08-08",
          })
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
      title="Découvrir les talents et métiers d'avenir dès 10 ans : le guide du parent éclairé"
      intro="Le monde du travail évolue à une vitesse sans précédent. Préparer son enfant pour l'avenir ne consiste plus à lui imposer un parcours académique classique rigide, mais à déceler ses intelligences dominantes pour développer son adaptabilité et sa confiance créative."
      updated="8 août 2026"
      readingTime="6 min"
      related={[
        { label: "Motiver un adolescent (12-16 ans)", to: "/guides/defis-pour-adolescents" },
        { label: "Les intelligences multiples de Gardner", to: "/guides/intelligences-multiples-gardner" },
        { label: "L'IA pour aider son enfant à apprendre", to: "/guides/ia-apprentissage-enfant" },
      ]}
    >
      <img
        src="/guides/og-orientation.jpg"
        alt="Jeune élève découvrant un projet scientifique et technologique avec son père"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi les notes scolaires seules ne suffisent plus à prédire la réussite</h2>
      <p>
        L'école traditionnelle mesure principalement l'intelligence <strong>linguistique</strong> et <strong>logico-mathématique</strong> abstraite. Pourtant, les métiers qui émergent dans l'économie numérique, la transition énergétique ou la création valorisent tout autant l'intelligence <strong>interpersonnelle</strong> (leadership, négociation), <strong>spatiale</strong> (design, modélisation 3D) et <strong>naturaliste/systémique</strong> (gestion des ressources).
      </p>
      <p>
        Observer votre enfant en situation d'action concrète vous donne des indices précieux sur la façon dont son cerveau résout naturellement un problème.
      </p>

      <h2>3 enquêtes d'orientation ludiques à mener à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">1. L'interview d'un professionnel inspirant</h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Proposez à votre jeune de préparer 5 questions et d'interviewer un entrepreneur, un ingénieur ou un artisan de votre entourage. En décortiquant le quotidien réel d'un métier, l'enfant dépasse les stéréotypes et projette concrètement ses propres capacités.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">2. Le défi du 'Mini-Projet d'Entreprise'</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Invitez votre enfant à concevoir une petite activité commerciale ou solidaire : vendre des pâtisseries, réparer des objets du quartier ou créer une campagne de sensibilisation. Il découvrira s'il aime plutôt gérer les chiffres, concevoir le produit ou convaincre les clients.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. La carte du Portfolio des Talents</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Conservez les traces photos et les récits de ses projets réussis. Ce portfolio de preuves concrètes vaut tous les questionnaires d'orientation théoriques lorsqu'il s'agira de choisir ses spécialités ou ses études supérieures.
        </p>
      </div>

      <h2>Comment accompagner sans imposer ses propres rêves</h2>
      <ul>
        <li><strong>Valoriser le processus, pas seulement le métier final :</strong> <em>"Tu as un vrai sens du détail et de la négociation"</em> plutôt que <em>"Tu seras avocat"</em>.</li>
        <li><strong>Développer l'agilité numérique :</strong> Encouragez la création par l'IA et l'informatique plutôt que le simple visionnage passif.</li>
        <li><strong>Encourager l'audace :</strong> Laisser l'enfant expérimenter plusieurs projets et échouer sans jugement dramatique.</li>
      </ul>

      <h2>Foire aux questions sur l'orientation précoce</h2>
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

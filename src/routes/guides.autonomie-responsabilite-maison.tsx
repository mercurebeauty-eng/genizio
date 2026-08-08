import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/autonomie-responsabilite-maison";

const FAQ = [
  {
    question: "Pourquoi mon enfant attend-il que je crie pour ranger ses affaires ou faire ses devoirs ?",
    answer:
      "Quand les consignes sont perçues comme des ordres répétitifs sans finalité créative, l'enfant s'habitue au niveau d'escalade sonore avant de réagir. En remplaçant l'ordre passif par la gestion autonome d'un projet visible (charte, mission de responsable), l'enfant devient acteur de sa tâche.",
  },
  {
    question: "À quel âge un enfant peut-il devenir vraiment autonome à la maison ?",
    answer:
      "Dès 6-7 ans, un enfant est tout à fait capable de gérer son sac de classe, son rangement personnel et une mission domestique régulière si le système est clair et visuel. De 8 à 12 ans, il peut planifier son temps de travail et la préparation de recettes simples.",
  },
  {
    question: "Faut-il récompenser l'autonomie avec de l'argent ou des cadeaux ?",
    answer:
      "Non, le système 'Pay-to-win' détruit la motivation intrinsèque. L'autonomie doit être récompensée par de la confiance supplémentaire (nouveaux privilèges, liberté de choix) et la fierté d'inscrire sa réussite dans son portfolio.",
  },
];

export const Route = createFileRoute("/guides/autonomie-responsabilite-maison")({
  head: () => {
    const meta = pageMeta({
      title: "Rendre son enfant autonome sans crier : méthode en 3 étapes (6-12 ans)",
      description:
        "Comment développer la responsabilité et l'autonomie de votre enfant au quotidien en remplaçant la répétition d'ordres par des projets engageants.",
      path: PATH,
      image: "/guides/og-autonomie.jpg",
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
            { name: "Autonomie & Responsabilité", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Comment rendre son enfant autonome à la maison sans crier : la méthode du projet responsabilisant",
            description:
              "Méthode concrète pour développer le sens de l'organisation et l'initiative personnelle chez l'enfant.",
            path: PATH,
            image: "/guides/og-autonomie.jpg",
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
      eyebrow="Autonomie & Projets"
      title="Rendre son enfant autonome à la maison sans crier : la méthode du projet responsabilisant"
      intro="Répéter dix fois les mêmes consignes le soir est épuisant pour les parents et démotivant pour l'enfant. L'autonomie ne s'obtient pas par la contrainte répétée, mais en confiant à l'enfant de vraies responsabilités où il mesure l'impact direct de ses décisions."
      updated="8 août 2026"
      readingTime="6 min"
    >
      <img
        src="/guides/og-autonomie.jpg"
        alt="Enfant cochant fièrement son tableau d'accomplissement d'autonomie à la maison"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>La différence entre exécuter un ordre et gérer une mission</h2>
      <p>
        Lorsqu'on dit à un enfant <em>"Range ta chambre !"</em>, il perçoit une corvée imposée. Lorsqu'on lui confie la mission <strong>"Chef de l'Organisation de la Chambre"</strong> avec un objectif visuel clair, il bascule dans la posture de gestionnaire.
      </p>
      <p>
        Dans la théorie des intelligences multiples, la gestion de son environnement sollicite l'intelligence <strong>logique-mathématique</strong> (rangement par catégories) et l'intelligence <strong>kinezthésique</strong> (action physique).
      </p>

      <h2>Les 3 étapes pour installer l'autonomie sereine</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">1. Rédiger la 'Charte de la Maison' en duo</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Ne plaquez pas un règlement intérieur unilatéral. Asseyez-vous 15 minutes avec votre enfant et définissez ensemble 3 règles essentielles et les conséquences logiques. L'enfant s'engage 10 fois mieux dans une règle qu'il a contribué à formuler.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. Le tableau des missions visuelles (Pas de flou)</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Transformez les tâches en étapes concrètes numérotées : 1. Sac de classe vérifié, 2. Tenue du lendemain préparée, 3. Bureau libéré. L'enfant peut cocher lui-même ses réussites.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. Accorder du pouvoir réel (Le budget goûter / recette)</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Confiez-lui la responsabilité complète d'une tâche familiale : planifier les ingrédients du repas du samedi, calculer les sommes nécessaires et vous accompagner au marché. La responsabilité responsabilise.
        </p>
      </div>

      <h2>Que faire en cas d'oubli ou de refus ?</h2>
      <ul>
        <li><strong>Appliquer les conséquences naturelles :</strong> S'il oublie son cahier malgré son tableau de mission, laissez l'école lui en faire le rappel plutôt que de dramatiser à la maison.</li>
        <li><strong>Remplacer le reproche par l'analyse :</strong> <em>"Qu'est-ce qui a manqué dans ton organisation hier pour que tu sois en retard ce matin ?"</em></li>
        <li><strong>Célébrer la régularité :</strong> Validez ses réussites dans son passeport d'accomplissement.</li>
      </ul>

      <h2>Foire aux questions sur l'autonomie de l'enfant</h2>
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

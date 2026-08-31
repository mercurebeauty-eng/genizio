import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/autonomie-responsabilite-maison";

const FAQ = [
  {
    question:
      "Pourquoi mon enfant attend-il que je crie pour ranger sa chambre ou faire ses devoirs ?",
    answer:
      "L'enfant s'habitue au volume sonore et n'agit plus que sous la contrainte immédiate. Remplacez l'ordre répété par un tableau de bord visuel : quand il coche lui-même sa tâche, le support devient l'arbitre neutre.",
  },
  {
    question: "À quel âge un enfant peut-il devenir vraiment autonome à la maison ?",
    answer:
      "Dès 6-7 ans pour son cartable et ses chaussures. À 8-10 ans pour sa chambre et ses devoirs. À 11-12 ans pour la gestion de son temps et de petites courses. La constance prime sur la quantité : mieux vaut une seule habitude tenue chaque jour que cinq corvées bâclées.",
  },
  {
    question: "Faut-il récompenser l'autonomie avec de l'argent ou des cadeaux ?",
    answer:
      "Non. Payer pour ranger transforme le devoir familial en transaction marchande. Récompensez plutôt par de nouveaux privilèges et de la liberté d'initiative.",
  },
  {
    question: "Mon enfant refuse de participer aux tâches de la maison, comment réagir ?",
    answer:
      "Évitez le bras de fer direct. Offrez-lui le choix entre deux missions équivalentes (« ranger le salon ou vider le lave-vaisselle ? »). Si le refus persiste, laissez jouer la conséquence naturelle : les affaires non rangées ne sont pas disponibles le lendemain.",
  },
];

export const Route = createFileRoute("/guides/autonomie-responsabilite-maison")({
  head: () => {
    const meta = pageMeta({
      title: "Comment rendre son enfant autonome sans crier (6-12 ans)",
      description:
        "Comment rendre son enfant autonome sans crier ? Tâches adaptées par âge (6-12 ans), charte familiale et tableaux de mission visuels.",
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
            { name: "Autonomie et responsabilité enfant", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Comment rendre son enfant autonome et responsable à la maison sans crier",
            description:
              "Méthode concrète pour développer l'autonomie et le sens des responsabilités chez l'enfant de 6 à 12 ans sans disputes quotidiennes.",
            path: PATH,
            image: "/guides/og-autonomie.jpg",
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
      eyebrow="Autonomie & Responsabilités"
      title="Comment rendre son enfant autonome et responsable à la maison sans crier"
      intro="Répéter dix fois les mêmes consignes le soir épuise toute la famille. L'autonomie ne s'obtient pas par l'insistance sonore, mais par des règles concertées, des repères visuels clairs et une confiance réelle. Voici la méthode pour installer des routines solides sans conflit quotidien."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Discipline positive sans crier",
          to: "/guides/discipline-positive-sans-punition",
        },
        {
          label: "Réussite scolaire sans stress",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "Disputes frères et sœurs : coopérer",
          to: "/guides/fratrie-rivalite-cooperation",
        },
        {
          label: "Canaliser un enfant agité",
          to: "/guides/enfant-agite-concentration",
        },
        {
          label: "Réduire les écrans sans crise",
          to: "/guides/ecrans-addiction-alternatives-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-autonomie.jpg"
        alt="Enfant cochant fièrement son tableau d'accomplissement d'autonomie à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi votre enfant attend que vous criiez pour agir</h2>
      <p>
        Répéter 5 fois calmement une demande sans réaction, puis élever la voix pour qu'il bouge enfin : ce cercle d'escalade sonore habitue l'enfant à ne réagir qu'au volume sonore.
      </p>
      <p>
        Pour briser cette boucle, appliquez les piliers de la{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a> : des règles négociées ensemble, des tâches valorisantes et un support visuel neutre.
      </p>

      <h2>Parler avec son enfant avant de poser les règles</h2>
      <p>
        Prenez 15 minutes pour échanger : <em>« À quel moment te sens-tu le plus en forme pour ranger ton espace ? »</em>. Pour un{" "}
        <a href="/guides/enfant-agite-concentration">enfant agité ou inattentif</a>, décomposez les missions complexes en petites étapes de 5 minutes.
      </p>

      <h2>Les tâches par âge : ce qu'un enfant peut vraiment gérer</h2>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[520px] text-left text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">Âge</th>
              <th className="px-4 py-3">Ce qu'il peut gérer seul</th>
              <th className="px-4 py-3">La règle d'or</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3 font-bold">6-7 ans</td>
              <td className="px-4 py-3">
                Préparer son cartable (avec liste imagée), ranger ses chaussures, mettre la table
              </td>
              <td className="px-4 py-3">Une mission unique et constante chaque jour</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">8-10 ans</td>
              <td className="px-4 py-3">
                Ranger sa chambre, préparer ses affaires la veille, faire ses devoirs en autonomie (voir nos conseils de{" "}
                <a href="/guides/reussite-scolaire-aider-enfant">réussite scolaire</a>)
              </td>
              <td className="px-4 py-3">Tableau de bord à cocher en autonomie</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">11-12 ans</td>
              <td className="px-4 py-3">
                Gérer son emploi du temps, planifier ses révisions, réguler ses écrans (voir notre protocole{" "}
                <a href="/guides/ecrans-addiction-alternatives-enfant">sevrage écrans</a>), faire des courses
              </td>
              <td className="px-4 py-3">Liberté de timing dans un cadre validé</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3 étapes pour installer l'autonomie sans conflit</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Rédiger la 'Charte de la Maison' en duo
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Définissez ensemble 3 règles d'or et les conséquences logiques. L'enfant s'engage 10 fois mieux dans une règle qu'il a co-écrite. En cas de fratrie, organisez la répartition équitable pour éviter la rivalité (voir nos solutions pour{" "}
          <a href="/guides/fratrie-rivalite-cooperation">apaiser les conflits frères et sœurs</a>).
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Le tableau des missions visuelles
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Transformez les tâches en étapes numérotées concrètes : 1. Cartable prêt, 2. Tenue du lendemain sortie, 3. Bureau rangé. L'enfant coche lui-même : le support devient l'arbitre, vous n'êtes plus le gendarme.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Accorder une vraie responsabilité
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Confiez-lui la gestion d'un budget pour préparer un plat ou le choix de l'activité du dimanche. On grandit quand on nous confie du pouvoir réel.
        </p>
      </div>

      <h2>Que faire en cas d'oubli ?</h2>
      <ul>
        <li>
          <strong>Laisser agir la conséquence naturelle :</strong> Un devoir oublié ou une tenue froissée responsabilise bien plus vite qu'un long sermon.
        </li>
        <li>
          <strong>Remplacer le reproche par la question :</strong> <em>« De quoi as-tu besoin pour ne pas oublier ton cahier demain matin ? »</em>
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio transforme l'autonomie en jeu d'aventure. En relevant des défis concrets du monde réel, l'enfant prend des initiatives, documente ses réussites et remplit son Passeport de Talents avec fierté.
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

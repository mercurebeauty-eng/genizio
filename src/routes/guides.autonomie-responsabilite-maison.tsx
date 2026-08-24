import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/autonomie-responsabilite-maison";

const FAQ = [
  {
    question:
      "Pourquoi mon enfant attend-il que je crie pour ranger sa chambre ou faire ses devoirs ?",
    answer:
      "Quand les consignes sont perçues comme des ordres répétitifs sans finalité claire, l'enfant s'habitue à un niveau de plus en plus fort avant de réagir : il ne range pas parce qu'on le lui demande, mais parce qu'on crie. C'est un cercle épuisant. En remplaçant l'ordre répété par un système visible et négocié — un tableau des missions qu'il cocha lui-même, une règle qu'il a contribué à formuler — l'enfant devient acteur de sa tâche au lieu d'attendre l'escalade.",
  },
  {
    question: "À quel âge un enfant peut-il devenir vraiment autonome à la maison ?",
    answer:
      "Dès 6-7 ans, un enfant est tout à fait capable de gérer son sac de classe, son rangement personnel et une mission domestique régulière si le système est clair et visuel. De 8 à 10 ans, il peut préparer son cartable la veille, ranger sa chambre seul et tenir une petite responsabilité (arroser les plantes, mettre la table). De 11 à 12 ans, il peut planifier son temps de travail, suivre une recette simple et gérer de petites courses au quartier. L'âge compte moins que la régularité : mieux vaut une seule mission tenue chaque jour que cinq missions oubliées.",
  },
  {
    question: "Faut-il récompenser l'autonomie avec de l'argent ou des cadeaux ?",
    answer:
      "Non. Payer l'enfant pour ranger sa chambre ou faire ses devoirs transforme une responsabilité normale en marchandise : il ne fera plus rien sans négocier son tarif, et le jour où vous n'aurez plus de monnaie, il n'y aura plus d'effort. L'autonomie se récompense par de la confiance supplémentaire : de nouveaux privilèges (choisir le menu du dimanche, inviter un ami, décider de l'heure de son bain), la fierté de cocher ses réussites dans son cahier, et des responsabilités plus grandes quand il a prouvé qu'il pouvait les tenir.",
  },
  {
    question: "Mon enfant refuse de participer aux tâches de la maison, comment réagir ?",
    answer:
      "Ne transformez pas le refus en guerre de pouvoir. Revenez à la discussion : demandez-lui quelle mission il choisirait plutôt que celle que vous imposez (« tu préfères ranger le salon ou t'occuper du linge ? »), et proposez d'échanger une tâche contre une autre entre frères et sœurs. Si le refus persiste, appliquez la conséquence naturelle : un enfant qui ne range pas sa chambre trouve moins facilement ses affaires — et c'est lui qui en subit l'inconvénient. L'important est de rester calme et régulier : la crise de refus passe, la règle reste.",
  },
];

export const Route = createFileRoute("/guides/autonomie-responsabilite-maison")({
  head: () => {
    const meta = pageMeta({
      title: "Comment rendre son enfant autonome sans crier (6-12 ans)",
      description:
        "Ranger sa chambre, préparer son sac, faire ses devoirs sans dispute : comment développer l'autonomie et la responsabilité de votre enfant, avec des tâches adaptées à son âge.",
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
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Comment rendre son enfant autonome et responsable à la maison sans crier",
            description:
              "Méthode concrète pour que votre enfant range, prépare son sac et fasse ses devoirs sans qu'on crie : discussion, tâches adaptées à l'âge et tableau de missions visuel.",
            path: PATH,
            image: "/guides/og-autonomie.jpg",
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
      eyebrow="Autonomie & Projets"
      title="Comment rendre son enfant autonome et responsable à la maison sans crier"
      intro="Répéter dix fois les mêmes consignes le soir est épuisant pour les parents et démotivant pour l'enfant. L'autonomie ne s'obtient pas par la contrainte répétée : elle s'installe en parlant avec l'enfant, en lui confiant de vraies responsabilités adaptées à son âge, et en lui montrant l'impact direct de ses décisions. Voici comment faire, étape par étape."
      updated="14 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        {
          label: "Rivalité frères et sœurs : coopérer",
          to: "/guides/fratrie-rivalite-cooperation",
        },
        { label: "Motiver un adolescent (12-16 ans)", to: "/guides/defis-pour-adolescents" },
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

      <h2>Pourquoi votre enfant attend que vous criez pour agir</h2>
      <p>
        Observez ce qui se passe réellement : vous demandez calmement à votre enfant de ranger sa
        chambre, rien ne se passe. Vous redemandez, toujours rien. Vous élevez la voix, il bouge
        enfin. Ce n'est pas de la mauvaise volonté : l'enfant a simplement appris que les paroles
        calmes ne comptent pas, et que <strong>seul le niveau de bruit fait foi</strong>. C'est le
        cercle de l'escalade sonore : plus vous criez, plus il attend la prochaine montée de ton —
        et vous vous épuisez dans un rôle de gendarme que vous n'avez pas choisi.
      </p>
      <p>
        La sortie de ce cercle ne passe pas par des ordres mieux formulés, mais par un changement de
        système : des <strong>règles négociées avec lui</strong>, des{" "}
        <strong>tâches adaptées à son âge</strong> et un <strong>tableau visible</strong> qu'il
        coche lui-même. Quand l'enfant devient acteur de sa propre organisation, vous n'avez plus
        besoin d'être le rappel à l'ordre permanent.
      </p>

      <h2>Parler avec son enfant avant de mettre en place les règles</h2>
      <p>
        Avant d'installer un système, discutez-en avec lui. Asseyez-vous 15 minutes et posez de
        vraies questions :{" "}
        <em>« Qu'est-ce qui est le plus fatigant pour toi quand il faut ranger ? »</em>,{" "}
        <em>« À quel moment de la journée tu te sens le plus capable de t'organiser ? »</em>. Vous
        découvrirez souvent que le problème n'est pas la paresse : c'est un rangement trop vague («
        range ta chambre » ne dit pas par où commencer), un moment mal choisi, ou une mission trop
        grande pour ses capacités.
      </p>
      <p>
        Ensuite, <strong>négociez la charte de la maison ensemble</strong>. L'enfant propose d'abord
        ses idées de règles et de conséquences, vous validez, vous écrivez le résultat et vous
        l'affichez. Un enfant s'engage dix fois mieux dans une règle qu'il a contribué à formuler —
        et quand il la conteste, vous n'avez plus à défendre votre autorité : il suffit de montrer
        la charte qu'il a signée avec vous.
      </p>

      <h2>Les tâches par âge : ce qu'un enfant peut vraiment gérer</h2>
      <p>
        Le secret d'une autonomie qui tient dans la durée :{" "}
        <strong>confier des tâches à sa mesure</strong>. Une mission trop difficile décourage, une
        mission trop facile ennuie. Voici des repères concrets, adaptés aux familles qui n'ont pas
        de matériel particulier :
      </p>
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
                Préparer son sac de classe (avec une liste), ranger ses jouets par catégorie, mettre
                la table, se brosser les dents sans rappel
              </td>
              <td className="px-4 py-3">
                Une seule mission par jour, toujours la même, avec une image ou un dessin pour s'y
                retrouver
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">8-10 ans</td>
              <td className="px-4 py-3">
                Ranger sa chambre de A à Z, préparer son cartable la veille, arroser les plantes,
                aider à préparer un repas simple
              </td>
              <td className="px-4 py-3">
                Le tableau des missions avec cases à cocher — il gère lui-même, vous vérifiez en fin
                de journée
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">11-12 ans</td>
              <td className="px-4 py-3">
                Planifier son temps de devoirs, suivre une recette seul, faire de petites courses au
                quartier, gérer un petit budget
              </td>
              <td className="px-4 py-3">
                Il fixe lui-même ses horaires dans un cadre validé — vous lâchez prise, il
                s'organise
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3 étapes pour installer l'autonomie sans crier</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Rédiger la 'Charte de la Maison' en duo
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Ne plaquez pas un règlement intérieur unilatéral. Asseyez-vous 15 minutes avec votre
          enfant et définissez ensemble 3 règles essentielles et les conséquences logiques. L'enfant
          s'engage 10 fois mieux dans une règle qu'il a contribué à formuler.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Le tableau des missions visuelles (Pas de flou)
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Transformez les tâches en étapes concrètes numérotées : 1. Sac de classe vérifié, 2. Tenue
          du lendemain préparée, 3. Bureau libéré. L'enfant peut cocher lui-même ses réussites — le
          tableau devient son chef, et vous n'êtes plus le rappel vivant.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Accorder du pouvoir réel (Le budget goûter / recette)
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Confiez-lui la responsabilité complète d'une tâche familiale : planifier les ingrédients
          du repas du samedi, calculer les sommes nécessaires et vous accompagner au marché. Une
          responsabilité confiée pour de vrai responsabilise — on se sent concerné quand on décide,
          pas quand on exécute.
        </p>
      </div>

      <h2>Que faire en cas d'oubli ou de refus ?</h2>
      <ul>
        <li>
          <strong>Appliquer les conséquences naturelles :</strong> S'il oublie son cahier malgré son
          tableau de mission, laissez l'école lui en faire le rappel plutôt que de dramatiser à la
          maison. La conséquence naturelle enseigne mieux que n'importe quel sermon.
        </li>
        <li>
          <strong>Remplacer le reproche par l'analyse :</strong>{" "}
          <em>
            "Qu'est-ce qui a manqué dans ton organisation hier pour que tu sois en retard ce matin
            ?"
          </em>{" "}
          La question ouvre une solution ; l'accusation ferme la discussion.
        </li>
        <li>
          <strong>Revenir à la charte, pas à la voix :</strong> Si l'enfant conteste une règle,
          montrez l'accord affiché qu'il a contribué à écrire. Il ne se bat plus contre vous, mais
          contre sa propre signature.
        </li>
        <li>
          <strong>Célébrer la régularité :</strong> Validez ses réussites dans son cahier des
          réussites (tableau, photos de ses rangements réussis). La fierté visible nourrit la
          motivation bien mieux que les rappels.
        </li>
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

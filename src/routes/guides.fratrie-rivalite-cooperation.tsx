import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/fratrie-rivalite-cooperation";

const FAQ = [
  {
    question: "Pourquoi les frères et sœurs se disputent-ils si souvent pour des détails ?",
    answer:
      "La rivalité entre frères et sœurs est une quête d'attention, de territoire et d'affirmation d'identité au sein de la famille. Lorsque chaque enfant a l'impression d'être comparé ou d'évoluer dans le même registre, la compétition s'intensifie. Un jouet disputé n'est presque jamais un jouet : c'est un test de la préférence parentale. Quand chaque enfant se sait reconnu dans sa singularité, la tension baisse naturellement.",
  },
  {
    question: "Que faire quand deux enfants se disputent un jouet ou la télécommande ?",
    answer:
      "Ne jouez pas le rôle du juge qui désigne le coupable : c'est la garantie de faire deux mécontents. Prenez le temps de la dispute en main avec une phrase simple : « Je vois que vous voulez tous les deux la même chose. Vous avez deux minutes pour trouver une solution où chacun gagne quelque chose. » Si aucune solution n'arrive, c'est vous qui décidez, mais de façon tournante et annoncée : « Aujourd'hui c'est toi, demain c'est toi — et dimanche, on choisit ensemble un jeu que vous ferez à deux. » La régularité de la règle compte plus que l'équité de chaque décision.",
  },
  {
    question: "Comment arrêter les comparaisons involontaires entre enfants ?",
    answer:
      "Évitez les formulations du type 'Prends exemple sur ton frère'. Célébrez chaque enfant dans son profil d'intelligences propre. Quand chacun se sait reconnu dans sa singularité, l'envie d'écraser l'autre s'estompe naturellement. Et si vous entendez une comparaison venir d'un autre adulte (grand-parent, voisin, enseignant), corrigez-la devant l'enfant : « Lui c'est lui, toi c'est toi, et je suis fière des deux ».",
  },
  {
    question: "Les disputes entre frères et sœurs sont-elles toujours mauvaises ?",
    answer:
      "Non — c'est même l'inverse. Une dispute, c'est la toute première école de négociation : on apprend à défendre son point de vue, à écouter l'autre, à trouver un compromis. Ce qui est mauvais, ce n'est pas le conflit, c'est qu'il se termine toujours par la force, par les pleurs ou par un parent qui tranche tout. Votre rôle n'est pas d'empêcher les disputes, mais de leur donner des règles : on ne frappe pas, on ne casse rien, on ne se moque pas — et on cherche une solution ensemble avant d'appeler un adulte.",
  },
  {
    question: "Que faire lors d'une dispute pour que les enfants apprennent à négocier ?",
    answer:
      "Ne jouez pas le rôle du juge ou du policier qui désigne le coupable. Donnez-leur pour règle : 'Trouvez ensemble une solution où chacun gagne quelque chose' et laissez-les rédiger un accord avant de valider la reprise du jeu. S'ils n'y arrivent pas, proposez un « match retour » : chacun expose son point de vue pendant une minute pendant que l'autre écoute sans interrompre, puis on cherche une solution à deux. C'est long la première fois, plus rapide la deuxième, et au bout de quelques semaines ils négocient sans vous.",
  },
];

export const Route = createFileRoute("/guides/fratrie-rivalite-cooperation")({
  head: () => {
    const meta = pageMeta({
      title: "Fratrie et disputes : comment développer la coopération",
      description:
        "Comment apaiser les disputes et la jalousie entre frères et sœurs ? Découvrez 3 règles d'arbitrage positives et 3 défis d'équipe pour coopérer.",
      path: PATH,
      image: "/guides/og-fratrie.jpg",
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
            { name: "Fratrie et coopération", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Disputes frères et sœurs : comment les transformer en coopération",
            description:
              "Méthode parentale pour désamorcer les disputes, éliminer les comparaisons toxiques et favoriser l'esprit d'équipe dans la fratrie.",
            path: PATH,
            image: "/guides/og-fratrie.jpg",
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
      eyebrow="Fratrie & Coopération"
      title="Disputes frères et sœurs : les transformer en coopération"
      intro="Les disputes entre frères et sœurs fatiguent énormément les parents — un jouet disputé, une jalousie pour la télécommande ou une rivalité à table. Pourtant, la fratrie est le tout premier laboratoire d'apprentissage social. En remplaçant les comparaisons par des missions communes, on transforme les frictions en esprit d'équipe solide."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Discipline positive sans crier",
          to: "/guides/discipline-positive-sans-punition",
        },
        { label: "Gérer la colère et frustration", to: "/guides/gestion-colere-emotions-enfant" },
        {
          label: "Rendre son enfant autonome",
          to: "/guides/autonomie-responsabilite-maison",
        },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-fratrie.jpg"
        alt="Frère et sœur collaborant joyeusement sur un projet créatif commun"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi la comparaison est le pire poison de la paix familiale</h2>
      <p>
        Dans beaucoup de familles, les enfants sont comparés involontairement : <em>« Regarde ton grand frère, lui est sage »</em>. Cette étiquette pousse les enfants dans une rivalité territoriale pour capter le regard des parents.
      </p>
      <p>
        Grâce aux{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Howard Gardner</a>, montrez à chaque enfant que ses talents sont uniques : l'aîné excelle peut-être en logique et organisation, tandis que le cadet brille par son empathie ou son agilité manuelle. Ils ne sont pas rivaux, ils sont coéquipiers complémentaires.
      </p>

      <h2>Arbitrer une dispute sans jouer les policiers</h2>
      <p>
        Chercher le « coupable » (<em>« C'est qui qui a commencé ? »</em>) transforme chaque querelle en procès judiciaire où l'un ressort vainqueur et l'autre humilié. En appliquant la{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>, privilégiez la responsabilisation :
      </p>
      <ul>
        <li>
          <strong>Accueillir la frustration :</strong> <em>« Je vois que vous êtes très en colère tous les deux »</em> (découvrez comment{" "}
          <a href="/guides/gestion-colere-emotions-enfant">apaiser les tempêtes émotionnelles chez l'enfant</a>).
        </li>
        <li>
          <strong>Le contrat de négociation :</strong> <em>« Vous avez 2 minutes pour trouver un accord où chacun gagne quelque chose, sinon le jouet reste sur l'étagère jusqu'à demain. »</em>
        </li>
        <li>
          <strong>L'apprentissage de l'autonomie :</strong> Développez leur maturité grâce à nos rituels pour{" "}
          <a href="/guides/autonomie-responsabilite-maison">rendre les enfants autonomes et responsables</a>.
        </li>
      </ul>

      <h2>3 défis d'équipe à réaliser à deux pour souder la fratrie</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. L'Escape Game de la Maison
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à la fratrie une mission commune : déchiffrer un mot de passe en 15 minutes pour débloquer le goûter. L'un calcule l'indice, l'autre retrouve la clé cachée. La coopération devient la seule stratégie gagnante.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. La Fabrique d'Objets en Binôme
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Proposez-leur de concevoir ensemble une maquette en carton issue de nos{" "}
          <a href="/guides/activites-manuelles-enfant">activités manuelles récup</a>. L'un découpe, l'autre assemble et peint.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Le Grand Journal de Famille
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          L'un est reporter et interviewe les parents, l'autre est photographe et met en page les nouvelles de la semaine (issues de nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a>).
        </p>
      </div>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio valorise chaque enfant selon sa propre carte d'intelligences sans jamais instaurer de classement comparatif. Les défis d'équipe permettent aux frères et sœurs de combiner leurs talents respectifs pour débloquer des réussites familiales partagées.
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

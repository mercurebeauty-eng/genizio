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
      title: "Disputes frères et sœurs : comment les transformer en coopération",
      description:
        "Disputes pour un jouet, jalousie, comparaisons : comment apaiser les tensions entre frères et sœurs et transformer les conflits en entraide, avec des exemples concrets.",
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
            { name: "Fratrie & Coopération", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Disputes frères et sœurs : les transformer en coopération",
            description:
              "Méthode pour apaiser les disputes entre frères et sœurs et développer l'entraide grâce à des jeux et des missions à faire ensemble.",
            path: PATH,
            image: "/guides/og-fratrie.jpg",
            datePublished: "2026-08-08",
            dateModified: "2026-08-14",
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
      eyebrow="Fratrie & Coopération"
      title="Disputes frères et sœurs : les transformer en coopération"
      intro="Les disputes entre frères et sœurs fatiguent énormément les parents — un jouet qui passe de main en main, deux enfants qui se disputent la télécommande, une jalousie qui explose au moment du repas. Pourtant, la fratrie est le tout premier laboratoire de négociation. En remplaçant la compétition par des jeux et des missions à faire ensemble, on transforme les conflits en esprit d'équipe."
      updated="14 août 2026"
      readingTime="7 min"
      related={[
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Enfant timide : libérer la parole", to: "/guides/timidite-confiance-prise-de-parole" },
        { label: "Rendre son enfant autonome sans crier", to: "/guides/autonomie-responsabilite-maison" },
      ]}
    >
      <img
        src="/guides/og-fratrie.jpg"
        alt="Frère et sœur collaborant joyeusement sur un projet créatif commun"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi la comparaison est le pire ennemi de la paix familiale</h2>
      <p>
        Dans beaucoup de familles, les enfants sont comparés sans qu'on s'en rende compte : l'un est
        vu comme « l'intellectuel », l'autre comme « le créatif » ou « le turbulent ». Cette étiquette
        pousse les enfants à s'affronter pour obtenir l'exclusivité de l'attention parentale — et
        chaque dispute pour un jouet devient une dispute pour savoir qui compte le plus.
      </p>
      <p>
        Grâce aux 9 intelligences de Howard Gardner, on apprend à montrer à l'enfant que{" "}
        <strong>chaque être humain possède une combinaison unique de forces</strong>. L'aîné a
        peut-être une intelligence logique plus avancée, tandis que le cadet fait preuve d'une
        intelligence <strong>kinesthésique</strong> ou sociale remarquable. Ils ne sont pas rivaux :
        ils sont <strong>coéquipiers</strong> — et votre rôle est de le leur rappeler à chaque
        occasion, en valorisant ce qui rend chacun unique au lieu de comparer.
      </p>

      <h2>Arbitrer une dispute sans jouer le juge</h2>
      <p>
        Le réflexe le plus fréquent — et le plus contre-productif — est de chercher le coupable :
        « C'est qui qui a commencé ? » Cette question transforme chaque dispute en procès, et le
        « coupable » désigné ressort humilié. Voici les trois réflexes qui fonctionnent :
      </p>
      <ul>
        <li><strong>Accueillir l'émotion avant la règle :</strong> « Je vois que vous êtes tous les deux fâchés et que vous voulez le même jouet. » L'enfant qui se sent entendu baisse d'un cran avant même la solution.</li>
        <li><strong>Donner une mission de négociation :</strong> « Trouvez ensemble une solution où chacun gagne quelque chose, vous avez deux minutes. » La première fois, préparez-vous à les aider ; la dixième, ils négocient seuls.</li>
        <li><strong>La règle de la rotation pour les objets partagés :</strong> télécommande, vélo, tablette : « Aujourd'hui c'est toi, demain c'est toi. » Annoncée à l'avance, la règle supprime l'arbitrage du dernier moment — et donc la moitié des disputes.</li>
      </ul>
      <p>
        Deux exemples quotidiens, avec les paroles exactes :
      </p>
      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">La dispute du jouet</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          <em>« Je vois que vous voulez tous les deux le camion. Vous avez deux minutes pour trouver une solution où chacun gagne quelque chose. »</em> Si ça bloque : <em>« Je le garde cinq minutes, vous me proposez votre accord, et je le rends à celui qui a trouvé la solution. »</em> Ne dites jamais « donne-le à ton petit frère, il est plus petit » : c'est le meilleur moyen de fabriquer un aîné rancunier.
        </p>
      </div>
      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">La dispute de la télécommande</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          <em>« La règle de la maison : chacun choisit un programme à tour de rôle, et pendant le programme de l'autre, on regarde sans commenter. Qui veut commencer ? »</em> La règle fixe remplace la négociation à chaud — et la télévision devient un terrain d'entraînement à la patience, pas un champ de bataille.
        </p>
      </div>

      <h2>3 défis d'équipe à réaliser à 2 ou plus</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">1. La mission 'Escape Game de la Maison'</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à la fratrie une mission commune : résoudre une énigme familiale en 20 minutes pour débloquer le goûter. L'un doit calculer un code chiffré (logique), l'autre doit retrouver un objet caché dans un parcours d'obstacles (spatial/corporel). Impossible à réussir seul : la coopération devient la seule stratégie gagnante.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. La réalisation du Journal de Famille</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Confiez à l'un le rôle d'illustrateur/photographe et à l'autre le rôle de rédacteur des événements de la semaine. Chacun brille dans sa spécialité sans faire de l'ombre à son frère ou sa sœur — et le journal terminé est signé des deux, exposé au salon.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. Le spectacle / stand de vente commun</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Invitez-les à organiser ensemble une petite présentation pour la famille ou une petite vente au quartier (jus, pâtisseries). L'objectif commun les oblige à négocier les rôles et à partager le succès final — on n'écrase pas son coéquipier quand le résultat est signé à deux.
        </p>
      </div>

      <h2>3 réflexes parentaux pour installer la paix durable</h2>
      <ul>
        <li><strong>Valoriser la coopération :</strong> Récompensez l'entraide spontanée plutôt que le travail individuel isolé. « J'ai vu que tu as aidé ta sœur à ranger sans qu'on te le demande — c'est exactement l'esprit d'équipe. »</li>
        <li><strong>Créer des moments individuels :</strong> Accordez 15 minutes d'attention exclusive à chaque enfant de temps en temps. La jalousie naît du manque, pas de l'excès de présence.</li>
        <li><strong>Responsabiliser les aînés sans les écraser :</strong> Donner un rôle de mentor bienveillant plutôt qu'un rôle d'autorité policière. Un aîné qui « surveille » son cadet devient un tyran ; un aîné qui lui apprend un jeu devient un allié.</li>
      </ul>

      <h2>Foire aux questions sur la gestion de la fratrie</h2>
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

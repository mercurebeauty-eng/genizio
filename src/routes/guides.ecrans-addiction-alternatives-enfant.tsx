import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/ecrans-addiction-alternatives-enfant";

const FAQ = [
  {
    question: "Comment réduire le temps d'écran d'un enfant sans déclencher une crise ?",
    answer:
      "Ne coupez rien d'un coup : c'est le meilleur moyen de déclencher la crise et de faire replonger l'enfant quelques jours plus tard. Réduisez par paliers d'environ 10 % chaque semaine — comme le sevrage en élevage, où l'on remplace petit à petit le lait par de l'aliment dur pour ne pas brusquer l'organisme. À chaque palier, remplacez le temps retiré par une activité concrète plus stimulante que l'écran : un défi manuel, une création, une enquête. Quand l'enfant fabrique un objet réel ou relève un défi en famille, son cerveau produit une satisfaction d'accomplissement bien plus durable que celle du jeu vidéo ou de la vidéo en boucle.",
  },
  {
    question: "Faut-il supprimer les écrans d'un seul coup pour sevrer son enfant ?",
    answer:
      "Non. Un arrêt brutal plonge l'enfant dans un vide total : il passe d'une stimulation forte à rien, d'où les crises, les pleurs et les négociations interminables. Et ce qui est retiré d'un coup est souvent repris en cachette — c'est le phénomène du « yoyo ». L'objectif n'est pas d'arriver à zéro écran, mais à un usage raisonné : la plupart des familles visent une à deux heures par jour maximum, avec des moments sans écran non négociables (repas, devoirs, nuit). On y arrive progressivement, palier par palier.",
  },
  {
    question: "Comment aborder le sujet des écrans avec mon enfant sans qu'il se braque ?",
    answer:
      "En écoutant d'abord, au lieu d'annoncer un règlement. Posez des questions sincères : « Qu'est-ce que tu aimes le plus quand tu joues ? », « Avec qui tu joues ? », « Qu'est-ce que tu ressens quand on éteint ? ». L'enfant qui se sent écouté comprend pourquoi on veut changer les choses ; l'enfant à qui on impose une interdiction se braque. Ensuite, négociez ensemble l'accord : c'est lui qui propose d'abord ses idées (quelle activité remplacerait tel jeu, à quel moment éteindre), vous validez, et vous affichez l'accord écrit à la maison. Un enfant s'engage dix fois mieux dans une règle qu'il a contribué à construire.",
  },
  {
    question: "À partir de quel âge faut-il limiter les écrans chez l'enfant ?",
    answer:
      "Dès 3 ans, l'OMS recommande moins d'une heure par jour. Entre 6 et 12 ans, l'enjeu principal est de préserver la capacité de concentration prolongée, la motricité fine et l'envie de créer par soi-même plutôt que de rester simple spectateur. C'est la tranche d'âge où les habitudes numériques se fixent durablement — et où un sevrage progressif fait toute la différence pour la suite.",
  },
  {
    question: "Mon enfant dit qu'il s'ennuie dès qu'on éteint les écrans, que faire ?",
    answer:
      "L'ennui est le déclencheur naturel de la créativité — ne le comblez pas avec un écran de remplacement. Proposez plutôt une amorce concrète : « Essaie d'extraire la couleur d'une fleur » ou « Fabrique un piège à bille avec du carton ». Dès que les mains sont en action, l'envie d'écran disparaît en quelques minutes. Pendant la phase de sevrage, gardez toujours une activité de remplacement prête pour le moment où l'écran s'éteint.",
  },
  {
    question: "Les écrans sont-ils vraiment dangereux pour les enfants ?",
    answer:
      "Le problème n'est pas l'écran en soi, mais le temps passif qu'il remplace : jeu libre, exploration manuelle, interactions sociales, ennui créatif. Un enfant qui passe 4 heures par jour sur une tablette ne développe pas les mêmes compétences qu'un enfant qui bricole, cuisine ou explore son quartier. L'objectif n'est pas de supprimer les écrans, mais de rééquilibrer — et la discussion avec l'enfant, puis un sevrage progressif, sont les deux meilleurs moyens d'y arriver sans conflit.",
  },
];

export const Route = createFileRoute("/guides/ecrans-addiction-alternatives-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant accro aux écrans : 5 étapes pour décrocher sans crise",
      description:
        "Votre enfant passe trop de temps sur les écrans ? Découvrez une méthode de sevrage progressif sans conflit et 15 alternatives captivantes dans le monde réel.",
      path: PATH,
      image: "/guides/og-ecrans.jpg",
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
            { name: "Écrans & alternatives enfant", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Mon enfant est accro aux écrans : comment réduire le temps d'écran en douceur, sans crise",
            description:
              "Guide parental complet pour sevrer son enfant des écrans par paliers progressifs : négociation d'accord, rituels et activités stimulantes du monde réel.",
            path: PATH,
            image: "/guides/og-ecrans.jpg",
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
      eyebrow="Écrans & Créativité"
      title="Mon enfant est accro aux écrans : comment réduire le temps d'écran en douceur, sans crise"
      intro="Votre enfant réclame la tablette dès le réveil et la crise éclate chaque soir quand vous l'éteignez ? Ce n'est pas un caprice : son cerveau s'est habitué à une stimulation rapide et facile. La bonne nouvelle, c'est qu'on peut le sevrer — sans punition, sans conflit, et sans culpabilité. Deux étapes font toute la différence : d'abord lui en parler, ensuite changer progressivement, palier par palier, en lui proposant des activités qui captent la même énergie, mais dans le monde réel."
      updated="26 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
        { label: "18 activités manuelles (4-12 ans)", to: "/guides/activites-manuelles-enfant" },
        { label: "Canaliser un enfant agité", to: "/guides/enfant-agite-concentration" },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
        { label: "Gestion de la colère et frustration", to: "/guides/gestion-colere-emotions-enfant" },
      ]}
    >
      <img
        src="/guides/og-ecrans.jpg"
        alt="Enfant africain construisant une maquette en carton à la maison, absorbé par son activité sans écran"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <MedicalDisclaimer>
        <strong>Note éducative :</strong> Ce guide propose des activités concrètes et des repères
        éducatifs pour accompagner votre enfant au quotidien. En cas de dépendance sévère aux écrans
        ou de troubles du comportement, consultez votre pédiatre ou un spécialiste en addictologie.
      </MedicalDisclaimer>

      <h2>Pourquoi interdire les écrans d'un coup ne marche pas</h2>
      <p>
        Les jeux vidéo, les vidéos YouTube et les réseaux sociaux sont conçus pour capter l'attention
        le plus longtemps possible. Chaque notification ou vidéo suivante déclenche une micro-décharge de dopamine dans le cerveau. C'est le même mécanisme d'addiction comportementale qu'une machine à sous : imprévisible, rapide et hautement stimulant.
      </p>
      <p>
        Quand vous éteignez brusquement la tablette ou la télévision, l'enfant passe d'un état de <strong>sur-stimulation</strong> à un vide sensoriel total. D'où la tempête émotionnelle, les pleurs et la négociation agressive (découvrez notre guide sur la{" "}
        <a href="/guides/gestion-colere-emotions-enfant">gestion de la colère et des crises chez l'enfant</a>). Ce n'est pas de la provocation délibérée, mais une réaction neurobiologique de manque.
      </p>
      <p>
        La solution durable consiste à appliquer une méthode de <strong>sevrage progressif par le faire</strong> : on remplace petit à petit 10 % du temps d'écran par des activités du monde réel qui nourrissent ses{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence naturelles</a>.
      </p>

      <h2>Parler avec son enfant avant d'imposer des règles</h2>
      <p>
        Avant d'instaurer des restrictions, asseyez-vous avec votre enfant. Imposer une règle unilatérale déclenche un réflexe de rébellion. En appliquant les principes de la{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>, vous transformez l'interdiction en accord mutuel :
      </p>
      <ul>
        <li>
          <strong>« Qu'est-ce qui te plaît le plus dans ce jeu ou cette vidéo ? »</strong> — Sa réponse révèle le besoin sous-jacent : construire, explorer, défier, rigoler avec des amis.
        </li>
        <li>
          <strong>« Qu'est-ce que tu ressens dans ton corps quand on éteint ? »</strong> — L'aider à identifier son agitation motrice (retrouvez nos conseils pour un{" "}
          <a href="/guides/enfant-agite-concentration">enfant qui a du mal à se concentrer</a>).
        </li>
        <li>
          <strong>« Comment pourrions-nous fabriquer ce projet en vrai ? »</strong> — L'inviter à devenir créateur plutôt que spectateur (lisez notre guide sur la{" "}
          <a href="/guides/ecrans-tiktok-youtube-talent-ecriture-realisation">transformation des enfants de spectateurs à créateurs</a>).
        </li>
      </ul>
      <p>
        Rédigez ensuite un contrat familial visible. Développez son sens de l'engagement grâce à nos rituels pour{" "}
        <a href="/guides/autonomie-responsabilite-maison">rendre son enfant autonome et responsable à la maison</a>.
      </p>

      <h2>Le changement progressif : le sevrage en douceur, palier par palier</h2>
      <p>
        Descendez par paliers d'environ 10 % de temps d'écran chaque semaine. Si votre enfant passe 2 heures par jour sur les écrans :
      </p>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[520px] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">Semaine</th>
              <th className="px-4 py-3">Temps d'écran</th>
              <th className="px-4 py-3">Ce qui remplace le temps retiré</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3 font-bold">Semaine 1</td>
              <td className="px-4 py-3">2 h → 1 h 50</td>
              <td className="px-4 py-3">
                Le défi « Minecraft Réel » (bricolage issu de nos{" "}
                <a href="/guides/activites-manuelles-enfant">activités manuelles récup</a>)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">Semaine 2</td>
              <td className="px-4 py-3">1 h 50 → 1 h 40</td>
              <td className="px-4 py-3">Le reportage photo du quartier (15 min)</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">Semaine 3</td>
              <td className="px-4 py-3">1 h 40 → 1 h 30</td>
              <td className="px-4 py-3">
                Expériences scientifiques de cuisine (issues de nos{" "}
                <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a>)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">Semaine 4</td>
              <td className="px-4 py-3">1 h 30 → 1 h 15</td>
              <td className="px-4 py-3">Projet créatif libre en famille</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">Semaine 5+</td>
              <td className="px-4 py-3">1 h maximum</td>
              <td className="px-4 py-3">Consolidation : contrat respecté, célébration des victoires</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3 activités concrètes pour remplacer les écrans dès ce soir</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Le défi « Minecraft Réel » — Construire en 3D
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à votre enfant des cartons d'emballage, des ciseaux, du ruban adhésif et un défi clair : <em>« Construis la maquette de ta forteresse idéale avec un pont-levis qui fonctionne. »</em> Le plaisir physique de l'assemblage remplace directement les blocs virtuels.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Le reportage photo et vidéo créatif
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Confiez-lui un smartphone en mode caméra pour interviewer un grand-parent, photographier 5 insectes du jardin ou créer un mini-tutoriel de cuisine. L'enfant passe du statut de spectateur passif à celui de réalisateur actif.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Le laboratoire secret de la maison
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Bicarbonate, vinaigre, huile, épices : réalisez une réaction chimique effervescente ou une lampe à lave maison. L'effet « waouh » procure la même intensité émotionnelle qu'un jeu vidéo, avec la fierté d'avoir expérimenté soi-même.
        </p>
      </div>

      <h2>Rituels pour maintenir l'équilibre au quotidien</h2>
      <ul>
        <li>
          <strong>Le sablier ou timer physique :</strong> Plus neutre que la voix du parent, il évite les querelles d'autorité.
        </li>
        <li>
          <strong>La règle des 5 minutes d'avertissement :</strong> <em>« Dans 5 minutes, on sauvegarde et on éteint pour préparer le dîner ensemble. »</em>
        </li>
        <li>
          <strong>La boîte à écrans pendant les repas et la nuit :</strong> Les écrans restent hors des chambres pour préserver un sommeil réparateur.
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio transforme l'énergie numérique des enfants en réalisations réelles. L'application propose des défis du monde réel (bricolage, écriture, logique, cuisine, nature). En prenant en photo ses créations terminées, l'enfant accumule des badges d'accomplissement et remplit son Passeport de Talents.
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

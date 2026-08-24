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
      title: "Accro aux écrans ? Activités sans écran + sevrage en douceur",
      description:
        "Votre enfant ne décroche pas de la tablette ? Parlez-en avec lui, puis réduisez le temps d'écran progressivement, sans crise ni conflit. Méthode et activités testées (6-12 ans).",
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
              "Guide pratique pour les parents d'enfants de 6 à 12 ans : discuter avec son enfant, puis réduire les écrans par paliers progressifs, en remplaçant chaque palier par des activités concrètes qui captent vraiment leur attention.",
            path: PATH,
            image: "/guides/og-ecrans.jpg",
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
      eyebrow="Écrans & Créativité"
      title="Mon enfant est accro aux écrans : comment réduire le temps d'écran en douceur, sans crise"
      intro="Votre enfant réclame la tablette dès le réveil et la crise éclate chaque soir quand vous l'éteignez ? Ce n'est pas un caprice : son cerveau s'est habitué à une stimulation rapide et facile. La bonne nouvelle, c'est qu'on peut le sevrer — sans punition, sans conflit, et sans culpabilité. Deux étapes font toute la différence : d'abord lui en parler, ensuite changer progressivement, palier par palier, en lui proposant des activités qui captent la même énergie, mais dans le monde réel."
      updated="14 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "L'IA pour aider son enfant à apprendre", to: "/guides/ia-apprentissage-enfant" },
        { label: "Activités manuelles (4-12 ans)", to: "/guides/activites-manuelles-enfant" },
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
        Les jeux vidéo, les vidéos YouTube et les applications sont conçus pour capter l'attention
        le plus longtemps possible. Chaque niveau réussi, chaque vidéo suivante déclenche une petite
        décharge de plaisir dans le cerveau. C'est le même mécanisme que celui d'une machine à sous
        : imprévisible, rapide, addictif.
      </p>
      <p>
        Quand vous éteignez brusquement la tablette, l'enfant passe d'un état de{" "}
        <strong>sur-stimulation</strong> à un vide total. D'où la crise, les pleurs, la négociation
        interminable. Ce n'est pas de la mauvaise volonté — c'est une réaction normale de son
        système nerveux. Et ce qui est retiré d'un coup est souvent repris en cachette quelques
        jours plus tard : c'est le <strong>phénomène du yoyo</strong>, qui épuise les parents et
        fait perdre confiance à l'enfant.
      </p>
      <p>
        La solution n'est ni d'interdire, ni de laisser faire, mais de{" "}
        <strong>changer progressivement</strong>. C'est exactement le principe du sevrage en élevage
        : on ne retire jamais le lait d'un coup à un jeune animal — on remplace petit à petit, 10 %
        d'aliment dur et le reste de lait, puis un peu plus chaque semaine, jusqu'à l'équilibre. On
        fait pareil avec les écrans, pour ne pas mettre l'organisme de l'enfant à rude épreuve.
      </p>

      <h2>Parler avec son enfant avant de toucher aux écrans</h2>
      <p>
        Avant de changer quoi que ce soit, il faut <strong>discuter</strong>. Beaucoup de parents
        annoncent une décision (« à partir de demain, une heure par jour ! ») et se heurtent à un
        mur. L'enfant ne se braque pas parce qu'il est « accro » : il se braque parce qu'on touche à
        quelque chose qu'il aime, sans lui demander son avis.
      </p>
      <p>Posez-lui de vraies questions, sans jugement et sans sermon :</p>
      <ul>
        <li>
          <strong>« Qu'est-ce que tu aimes le plus quand tu joues ? »</strong> — la réponse révèle
          ce qu'il faut remplacer : le défi, la construction, l'histoire, l'action…
        </li>
        <li>
          <strong>« Avec qui tu joues ? »</strong> — si l'écran remplace des copains, l'activité de
          remplacement devra être sociale ; si c'est un refuge, elle devra être rassurante.
        </li>
        <li>
          <strong>« Qu'est-ce que tu ressens quand on éteint ? »</strong> — l'enfant qui met des
          mots sur sa frustration comprend mieux pourquoi vous voulez changer les choses.
        </li>
      </ul>
      <p>
        Ensuite, <strong>négociez l'accord ensemble</strong>. Laissez l'enfant proposer d'abord :
        quelle activité remplacerait tel jeu, à quel moment il éteint lui-même, quelle récompense de
        confiance il gagne (choisir le repas du dimanche, une sortie…). Vous validez, vous écrivez
        l'accord, vous l'affichez. Un enfant s'engage dix fois mieux dans une règle qu'il a
        contribué à construire — et la discussion que vous ouvrez aujourd'hui est le socle de tous
        les changements qui suivent.
      </p>

      <h2>Le changement progressif : le sevrage en douceur, palier par palier</h2>
      <p>
        Une fois l'accord trouvé, on ne réduit pas tout d'un coup : on descend{" "}
        <strong>par paliers d'environ 10 % par semaine</strong>. Si votre enfant passe 2 heures par
        jour sur les écrans, cela donne un sevrage en douceur sur 4 à 6 semaines :
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
              <td className="px-4 py-3 font-bold">1</td>
              <td className="px-4 py-3">2 h → 1 h 50</td>
              <td className="px-4 py-3">Le défi « Minecraft Réel » (cartons, construction)</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">2</td>
              <td className="px-4 py-3">1 h 50 → 1 h 40</td>
              <td className="px-4 py-3">Le reportage photo avec votre téléphone, 15 min</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">3</td>
              <td className="px-4 py-3">1 h 40 → 1 h 30</td>
              <td className="px-4 py-3">Le laboratoire secret de la cuisine</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">4</td>
              <td className="px-4 py-3">1 h 30 → 1 h 15</td>
              <td className="px-4 py-3">Une activité au choix de l'enfant (il décide seul)</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">5-6</td>
              <td className="px-4 py-3">1 h 15 → 1 h maximum</td>
              <td className="px-4 py-3">
                Consolidation : l'accord reste affiché, on fête la régularité
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Le rythme importe plus que la quantité : tant que l'enfant encaisse bien un palier (pas de
        crise majeure, pas de repli), on descend au palier suivant. S'il régresse, on reste une
        semaine de plus au même niveau. <strong>La régularité compte plus que la vitesse</strong> —
        c'est elle qui transforme l'habitude, pas la fermeté d'un jour.
      </p>
      <p>
        À chaque palier, le temps retiré est <strong>remplacé</strong>, jamais laissé vide. C'est ce
        qu'on appelle le <strong>sevrage par le faire</strong> : on ne retire pas l'écran, on le
        rend inutile. Voici trois activités de remplacement qui fonctionnent particulièrement bien
        pour les 6-12 ans.
      </p>

      <h2>3 activités sans écran pour remplacer chaque palier</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. Le défi « Minecraft Réel » — Construire avec ses mains
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à votre enfant des cartons d'emballage, des ciseaux, du ruban adhésif et un défi
          clair :{" "}
          <em>
            « Construis la maquette de ta chambre idéale avec 3 meubles qui tiennent debout. »
          </em>{" "}
          Le plaisir de la construction en 3D remplace directement les blocs virtuels de Minecraft
          ou Roblox.
        </p>
        <p className="text-sm text-amber-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant mobilise son intelligence spatiale et sa
          motricité fine. Le résultat est tangible — il peut le montrer, le garder, le
          perfectionner. C'est bien plus gratifiant qu'un score qui disparaît quand on ferme
          l'application.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Le reportage photo — Utiliser l'écran autrement
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Si votre enfant adore les vidéos YouTube, retournez la situation : confiez-lui le
          téléphone <strong>uniquement en mode appareil photo</strong> pour une mission de 15
          minutes. Réaliser un reportage photo légendé sur un métier du quartier, les plantes du
          jardin ou la préparation du dîner.
        </p>
        <p className="text-sm text-sky-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant passe de consommateur passif à créateur
          actif. Il observe, cadre, rédige des légendes. Il développe son intelligence verbale et sa
          curiosité sociale — tout en utilisant l'outil qu'il adore.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. Le laboratoire secret de la cuisine — La science à portée de main
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Proposez une expérience de chimie culinaire avec ce que vous avez dans le placard :
          presser un citron, verser du bicarbonate de soude, observer la réaction effervescente,
          mesurer les volumes et créer une limonade maison aromatisée. Ajoutez du curcuma pour voir
          le changement de couleur.
        </p>
        <p className="text-sm text-emerald-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant endosse le rôle de chercheur : il formule
          une hypothèse, teste, observe un résultat visible immédiatement. C'est le même ressort que
          le jeu vidéo — la récompense instantanée — mais dans le monde réel, avec un apprentissage
          qui reste.
        </p>
      </div>

      <h2>Comment limiter le temps d'écran sans conflit au quotidien</h2>
      <ul>
        <li>
          <strong>Le contrat visuel plutôt que la parole :</strong> Un sablier de 30 minutes ou une
          alarme visuelle sur la tablette fonctionne mieux que dix rappels oraux. L'enfant voit le
          temps défiler et se prépare mentalement à la transition.
        </li>
        <li>
          <strong>Prévenir 5 minutes avant :</strong>{" "}
          <em>
            « Il te reste 5 minutes pour finir ton niveau, ensuite on passe au défi bricolage. »
          </em>{" "}
          Cette simple phrase réduit considérablement les crises parce que l'enfant ne subit plus la
          coupure — il la voit venir.
        </li>
        <li>
          <strong>Valoriser ce qui est fait sans écran :</strong> Exposez les créations de votre
          enfant dans le salon, photographiez-les pour un « cahier de famille ». Quand l'effort réel
          est reconnu publiquement, l'envie de créer l'emporte progressivement sur l'envie de
          scroller.
        </li>
        <li>
          <strong>Créer un rituel de transition :</strong> Associez systématiquement la fin de
          l'écran à un moment agréable — goûter ensemble, histoire à voix haute, sortie au parc.
          L'enfant n'associera plus « fin d'écran » à « punition », mais à « début de quelque chose
          de bien ».
        </li>
        <li>
          <strong>Fêter chaque palier :</strong> À la fin de chaque semaine de sevrage tenue,
          marquez le coup avec l'enfant (sortie, plat qu'il choisit, visite). Le changement
          progressif devient alors une aventure commune, pas une privation.
        </li>
      </ul>

      <h2>Foire aux questions — temps d'écran et sevrage progressif</h2>
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

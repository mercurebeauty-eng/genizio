import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/ecrans-addiction-alternatives-enfant";

const FAQ = [
  {
    question: "Comment réduire le temps d'écran d'un enfant sans déclencher une crise ?",
    answer:
      "La méthode la plus efficace consiste à ne pas interdire brutalement l'écran, mais à proposer une activité concrète plus stimulante que ce que l'écran offre — un défi manuel, une création, une enquête. Quand l'enfant fabrique un objet réel ou relève un défi en famille, son cerveau produit une satisfaction d'accomplissement bien plus durable que celle du jeu vidéo ou de la vidéo en boucle.",
  },
  {
    question: "À partir de quel âge faut-il limiter les écrans chez l'enfant ?",
    answer:
      "Dès 3 ans, l'OMS recommande moins d'une heure par jour. Entre 6 et 12 ans, l'enjeu principal est de préserver la capacité de concentration prolongée, la motricité fine et l'envie de créer par soi-même plutôt que de rester simple spectateur. C'est la tranche d'âge où les habitudes numériques se fixent durablement.",
  },
  {
    question: "Mon enfant dit qu'il s'ennuie dès qu'on éteint les écrans, que faire ?",
    answer:
      "L'ennui est le déclencheur naturel de la créativité — ne le comblez pas avec un écran de remplacement. Proposez plutôt une amorce concrète : 'Essaie d'extraire la couleur d'une fleur' ou 'Fabrique un piège à bille avec du carton'. Dès que les mains sont en action, l'envie d'écran disparaît en quelques minutes.",
  },
  {
    question: "Les écrans sont-ils vraiment dangereux pour les enfants ?",
    answer:
      "Le problème n'est pas l'écran en soi, mais le temps passif qu'il remplace : jeu libre, exploration manuelle, interactions sociales, ennui créatif. Un enfant qui passe 4 heures par jour sur une tablette ne développe pas les mêmes compétences qu'un enfant qui bricole, cuisine ou explore son quartier. L'objectif n'est pas de supprimer les écrans, mais de rééquilibrer.",
  },
];

export const Route = createFileRoute("/guides/ecrans-addiction-alternatives-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant accro aux écrans ? 3 activités sans écran (6-12 ans)",
      description:
        "Votre enfant ne décroche pas de la tablette ? Découvrez 3 activités concrètes pour remplacer les écrans sans crise ni conflit, testées pour les 6-12 ans.",
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
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Mon enfant est accro aux écrans : 3 activités concrètes pour décrocher sans crise",
            description:
              "Guide pratique pour les parents d'enfants de 6 à 12 ans : comment remplacer le temps d'écran par des activités manuelles, créatives et scientifiques qui captent vraiment leur attention.",
            path: PATH,
            image: "/guides/og-ecrans.jpg",
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
      eyebrow="Écrans & Créativité"
      title="Mon enfant est accro aux écrans : 3 activités concrètes pour décrocher sans crise"
      intro="Votre enfant réclame la tablette dès le réveil et la crise éclate chaque soir quand vous l'éteignez ? Ce n'est pas un caprice : son cerveau s'est habitué à une stimulation rapide et facile. La bonne nouvelle, c'est qu'on peut remplacer cette habitude — sans punition, sans conflit, et sans culpabilité — en lui proposant des activités qui captent la même énergie, mais dans le monde réel."
      updated="14 août 2026"
      readingTime="7 min"
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
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <MedicalDisclaimer>
        <strong>Note éducative :</strong> Ce guide propose des activités concrètes et des repères éducatifs pour accompagner votre enfant au quotidien. En cas de dépendance sévère aux écrans ou de troubles du comportement, consultez votre pédiatre ou un spécialiste en addictologie.
      </MedicalDisclaimer>

      <h2>Pourquoi interdire les écrans ne marche pas (et quoi faire à la place)</h2>
      <p>
        Les jeux vidéo, les vidéos YouTube et les applications sont conçus pour capter l'attention le plus longtemps possible. Chaque niveau réussi, chaque vidéo suivante déclenche une petite décharge de plaisir dans le cerveau. C'est le même mécanisme que celui d'une machine à sous : imprévisible, rapide, addictif.
      </p>
      <p>
        Quand vous éteignez brusquement la tablette, l'enfant passe d'un état de <strong>sur-stimulation</strong> à un vide total. D'où la crise, les pleurs, la négociation interminable. Ce n'est pas de la mauvaise volonté — c'est une réaction normale de son système nerveux.
      </p>
      <p>
        La solution n'est pas d'interdire, mais de <strong>remplacer</strong>. Si vous proposez une activité qui demande autant d'engagement que l'écran — mais avec les mains, le corps, les sens — l'attention de votre enfant bascule naturellement. C'est ce qu'on appelle le <strong>sevrage par le faire</strong> : on ne retire pas l'écran, on le rend inutile.
      </p>

      <h2>3 activités sans écran à tester ce soir avec votre enfant</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">1. Le défi « Minecraft Réel » — Construire avec ses mains</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à votre enfant des cartons d'emballage, des ciseaux, du ruban adhésif et un défi clair : <em>« Construis la maquette de ta chambre idéale avec 3 meubles qui tiennent debout. »</em> Le plaisir de la construction en 3D remplace directement les blocs virtuels de Minecraft ou Roblox.
        </p>
        <p className="text-sm text-amber-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant mobilise son intelligence spatiale et sa motricité fine. Le résultat est tangible — il peut le montrer, le garder, le perfectionner. C'est bien plus gratifiant qu'un score qui disparaît quand on ferme l'application.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. Le reportage photo — Utiliser l'écran autrement</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Si votre enfant adore les vidéos YouTube, retournez la situation : confiez-lui le téléphone <strong>uniquement en mode appareil photo</strong> pour une mission de 15 minutes. Réaliser un reportage photo légendé sur un métier du quartier, les plantes du jardin ou la préparation du dîner.
        </p>
        <p className="text-sm text-sky-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant passe de consommateur passif à créateur actif. Il observe, cadre, rédige des légendes. Il développe son intelligence verbale et sa curiosité sociale — tout en utilisant l'outil qu'il adore.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. Le laboratoire secret de la cuisine — La science à portée de main</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Proposez une expérience de chimie culinaire avec ce que vous avez dans le placard : presser un citron, verser du bicarbonate de soude, observer la réaction effervescente, mesurer les volumes et créer une limonade maison aromatisée. Ajoutez du curcuma pour voir le changement de couleur.
        </p>
        <p className="text-sm text-emerald-900/80 leading-relaxed mt-2">
          <strong>Pourquoi ça marche :</strong> L'enfant endosse le rôle de chercheur : il formule une hypothèse, teste, observe un résultat visible immédiatement. C'est le même ressort que le jeu vidéo — la récompense instantanée — mais dans le monde réel, avec un apprentissage qui reste.
        </p>
      </div>

      <h2>Comment limiter le temps d'écran sans conflit au quotidien</h2>
      <ul>
        <li><strong>Le contrat visuel plutôt que la parole :</strong> Un sablier de 30 minutes ou une alarme visuelle sur la tablette fonctionne mieux que dix rappels oraux. L'enfant voit le temps défiler et se prépare mentalement à la transition.</li>
        <li><strong>Prévenir 5 minutes avant :</strong> <em>« Il te reste 5 minutes pour finir ton niveau, ensuite on passe au défi bricolage. »</em> Cette simple phrase réduit considérablement les crises parce que l'enfant ne subit plus la coupure — il la voit venir.</li>
        <li><strong>Valoriser ce qui est fait sans écran :</strong> Exposez les créations de votre enfant dans le salon, photographiez-les pour un « portfolio familial ». Quand l'effort réel est reconnu publiquement, l'envie de créer l'emporte progressivement sur l'envie de scroller.</li>
        <li><strong>Créer un rituel de transition :</strong> Associez systématiquement la fin de l'écran à un moment agréable — goûter ensemble, histoire à voix haute, sortie au parc. L'enfant n'associera plus « fin d'écran » à « punition », mais à « début de quelque chose de bien ».</li>
      </ul>

      <h2>Foire aux questions — temps d'écran et alternatives</h2>
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

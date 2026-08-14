import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/activites-educatives-enfant";

const FAQ = [
  {
    question: "Quelles activités éducatives faire à la maison avec un enfant de 6 à 12 ans ?",
    answer:
      "Les plus formatrices sont celles qui produisent un résultat visible avec du matériel du quotidien : fabriquer un arrosage automatique avec des bouteilles percées, construire un pont en bâtonnets qui tient sans colle, calculer le prix de revient d'un jus de bissap puis le vendre, teindre un tissu avec des pigments d'hibiscus, interviewer un artisan du quartier et en faire un reportage photo. Chacune mobilise plusieurs formes d'intelligence et laisse une trace concrète dont l'enfant est fier — c'est cette trace, plus que l'activité elle-même, qui construit la confiance.",
  },
  {
    question: "Quels jeux éducatifs sans écran proposer à un enfant ?",
    answer:
      "Les jeux les plus riches sur le plan éducatif sont souvent ceux qui n'ont pas été conçus comme éducatifs : construction libre, cuisine avec pesée et conversion, jeux de stratégie à deux, parcours d'obstacles chronométrés, marchand avec de la vraie monnaie. Ils demandent peu de matériel et sollicitent à la fois la logique, la motricité, la négociation et la planification. L'important est que l'enfant décide de sa méthode plutôt que d'exécuter une procédure.",
  },
  {
    question: "Que faire pendant les vacances quand l'enfant s'ennuie et réclame les écrans ?",
    answer:
      "Les vacances sont le moment idéal pour les activités sans écran, à condition de ne pas les présenter comme un « programme » : proposez un défi par jour, à heure fixe (le matin ou après la sieste), et laissez l'enfant choisir parmi deux ou trois options. Un grand projet de vacances — une maquette du quartier, un journal de vacances illustré, un stand de jus qui fonctionne toute la semaine — tient un enfant plusieurs jours. Et ne remplissez pas chaque minute : l'ennui fait partie du processus, c'est lui qui déclenche l'imagination. Prévoyez une activité courte toujours prête (bouteilles, cartons, monnaie) pour les moments creux.",
  },
  {
    question: "Combien de temps doit durer une activité éducative ?",
    answer:
      "Cela dépend beaucoup plus de l'âge et du format que d'une règle générale. En pratique : 15 à 20 minutes suffisent pour un enfant de 5 à 7 ans, 30 à 45 minutes conviennent de 8 à 11 ans, et un projet peut s'étaler sur plusieurs jours à partir de 12 ans. Entre deux devoirs, 10 minutes d'activité manuelle suffisent pour couper l'ennui et relancer la concentration. Le meilleur indicateur reste l'enfant lui-même : une activité qu'il prolonge spontanément est bien calibrée ; une activité qu'il abandonne à mi-parcours est souvent trop longue, trop abstraite, ou trop dirigée.",
  },
  {
    question: "Comment savoir si une activité a vraiment appris quelque chose à mon enfant ?",
    answer:
      "Trois signes fiables, tous observables sans test : il explique spontanément à quelqu'un d'autre ce qu'il a fait ; il réutilise la technique dans un autre contexte quelques jours plus tard ; il propose une variante ou une amélioration de lui-même. Ces trois comportements indiquent que la compétence a été intégrée, pas seulement exécutée. À l'inverse, un enfant qui a bien réalisé l'activité mais ne sait pas dire à quoi elle servait a surtout suivi des instructions.",
  },
];

const ACTIVITIES = [
  {
    intelligence: "Logique & mathématiques",
    items: [
      "Calculer le prix de revient d'une recette, puis fixer un prix de vente et vérifier le bénéfice réel",
      "Construire un pont en bâtonnets qui supporte un poids, sans colle ni clous",
      "Mesurer l'ombre d'un bâton toutes les heures et en déduire la course du soleil",
      "Créer un code secret à substitution et échanger des messages chiffrés",
    ],
  },
  {
    intelligence: "Sciences & observation",
    items: [
      "Fabriquer un arrosage goutte-à-goutte avec des bouteilles percées et régler le débit",
      "Faire pousser la même graine dans quatre conditions différentes et comparer",
      "Construire un baromètre avec une bouteille, de l'eau colorée et une paille",
      "Extraire des pigments de fleurs d'hibiscus et teindre un tissu",
    ],
  },
  {
    intelligence: "Langage & expression",
    items: [
      "Rédiger et prononcer un discours de 2 minutes pour convaincre la famille de trier les déchets",
      "Interviewer un artisan du quartier et en faire un reportage photo légendé",
      "Inventer la suite d'une histoire connue et la raconter à voix haute",
      "Tenir un carnet de bord illustré d'un projet sur une semaine",
    ],
  },
  {
    intelligence: "Corps & espace",
    items: [
      "Concevoir un parcours d'obstacles, se chronométrer et optimiser son score",
      "Dessiner le plan de sa maison à l'échelle, pièce par pièce",
      "Reproduire une chorégraphie puis en inventer la suite",
      "Construire une maquette de son quartier en matériaux de récupération",
    ],
  },
  {
    intelligence: "Social & entreprendre",
    items: [
      "Organiser un petit marché avec de la vraie monnaie et rendre la monnaie juste",
      "Monter un kiosque à jus, créer le logo et gérer les ventes d'un après-midi",
      "Animer un jeu pour des enfants plus jeunes et adapter les règles à leur âge",
      "Négocier et rédiger une charte des règles de la maison avec ses frères et sœurs",
    ],
  },
  {
    intelligence: "Artisanat & création",
    items: [
      "Cuisiner une recette complète du début à la fin, achats compris",
      "Réparer un objet cassé plutôt que le remplacer",
      "Coudre ou assembler un masque, un costume, un accessoire",
      "Fabriquer un instrument de musique et en tirer plusieurs notes distinctes",
    ],
  },
];

export const Route = createFileRoute("/guides/activites-educatives-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "24 activités éducatives sans écran à la maison (6-12 ans)",
      description:
        "24 activités éducatives sans écran avec du matériel du quotidien, pour occuper l'enfant à la maison, entre deux devoirs ou pendant les vacances.",
      path: PATH,
      image: "/guides/og-activites.jpg",
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
            { name: "Activités éducatives", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "24 activités éducatives sans écran à faire à la maison avec un enfant de 6 à 12 ans",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-activites.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Activités éducatives pour enfants" },
            { "@type": "Thing", name: "Jeux éducatifs" },
            { "@type": "Thing", name: "Apprentissage par projet" },
          ],
        }),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Activités & jeux"
      title="24 activités éducatives sans écran à faire à la maison avec un enfant de 6 à 12 ans"
      intro="Pas de matériel coûteux, pas d'écran, pas de fiche à imprimer. Des activités qui produisent un résultat visible — et qui, mises bout à bout, révèlent ce que votre enfant sait faire. Pour le soir des devoirs, le week-end ou les vacances."
      updated="14 août 2026"
      readingTime="8 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "Motiver un adolescent (12-16 ans)", to: "/guides/defis-pour-adolescents" },
        { label: "Activités manuelles (4-12 ans)", to: "/guides/activites-manuelles-enfant" },
      ]}
    >
      <img
        src="/guides/og-activites.jpg"
        alt="Famille africaine engagée dans des activités éducatives manuelles à la maison"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Pourquoi le résultat visible change tout</h2>
      <p>
        Une activité qui se termine par un objet, une photo, un plat ou un score tient un enfant
        beaucoup plus longtemps qu'une consigne abstraite. Il ne s'agit pas de motivation par la
        récompense : c'est que le résultat rend l'effort <strong>lisible</strong>. L'enfant voit ce
        qu'il a produit, peut le montrer, peut l'améliorer.
      </p>
      <p>
        C'est aussi ce qui rend l'activité observable pour le parent. Une fiche d'exercices remplie
        ne dit presque rien de l'enfant. Un pont en bâtonnets qui s'effondre trois fois avant de
        tenir en dit beaucoup : sur sa persévérance, sa méthode, sa façon de réagir à l'échec.
      </p>

      <h2>Les activités, classées par forme d'intelligence</h2>
      <p>
        Le classement ci-dessous suit les{" "}
        <a href="/guides/intelligences-multiples-gardner">9 intelligences de Howard Gardner</a>.
        L'intérêt n'est pas de cantonner l'enfant à une catégorie, mais l'inverse : repérer celles
        que vous ne lui proposez jamais, et y aller.
      </p>

      {ACTIVITIES.map((group) => (
        <div key={group.intelligence}>
          <h3>{group.intelligence}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Comment choisir la bonne activité pour votre enfant</h2>
      <p>Trois critères suffisent, dans cet ordre :</p>
      <ol>
        <li>
          <strong>Le temps réellement disponible.</strong> Une activité de deux heures lancée à
          18h30 un jeudi ne finira pas. Mieux vaut un mini-défi de 15 minutes terminé qu'un projet
          ambitieux abandonné.
        </li>
        <li>
          <strong>Ce qu'il y a à la maison.</strong> Une activité qui suppose un achat est une
          activité qui n'aura pas lieu. Les meilleures utilisent des bouteilles, du carton, de la
          farine, des bâtonnets.
        </li>
        <li>
          <strong>La passerelle.</strong> Partez de ce qu'il aime déjà pour l'emmener ailleurs. Un
          enfant passionné de foot peut mesurer des angles de tir : on entre par le sport, on sort
          par la géométrie.
        </li>
      </ol>

      <h2>Ce qu'il ne faut pas faire</h2>
      <ul>
        <li><strong>Corriger pendant.</strong> Laissez l'erreur se produire : c'est là que l'apprentissage a lieu.</li>
        <li><strong>Finir à sa place.</strong> Un résultat imparfait mais fait par lui vaut mieux qu'un bel objet fait par vous.</li>
        <li><strong>Enchaîner.</strong> Une activité par jour, terminée, vaut mieux que trois commencées.</li>
        <li><strong>Transformer en évaluation.</strong> Dès qu'il y a une note, l'enfant optimise pour la note et arrête d'explorer.</li>
      </ul>

      <h2>10 minutes d'activité entre deux devoirs</h2>
      <p>
        Le moment le plus difficile pour un enfant, c'est la bascule entre l'école et les devoirs —
        et entre deux exercices longs. Dix minutes d'activité manuelle coupent l'ennui, remettent le
        corps en mouvement et relancent la concentration :
      </p>
      <ul>
        <li><strong>Le chronomètre inversé :</strong> « Je te donne 10 minutes pour construire la tour la plus haute avec ce que tu trouves dans la cuisine. » On photographie le résultat, on range, on reprend les devoirs.</li>
        <li><strong>La monnaie du jour :</strong> comptez la monnaie de la journée ensemble, à voix haute — 3 minutes de calcul réel valent une page d'exercices.</li>
        <li><strong>Le tirage surprise :</strong> un bocal avec des défis courts écrits sur des papiers (« nomme 5 fruits qui poussent dans notre région », « raconte ta journée en 3 phrases »). L'enfant tire un papier, répond, et retourne travailler.</li>
      </ul>
      <p>
        La règle : <strong>court, terminé, rangé</strong>. Dix minutes qui finissent par une photo ou
        une case cochée laissent l'enfant avec le sentiment d'avoir réussi — et les devoirs d'après
        se font dans un meilleur état d'esprit.
      </p>

      <h2>Garder une trace</h2>
      <p>
        Prises isolément, ces activités sont de bons moments. Mises bout à bout et documentées,
        elles deviennent une cartographie : on voit apparaître ce vers quoi l'enfant revient
        toujours, ce qu'il évite, ce qui a progressé en six mois.
      </p>
      <p>
        C'est exactement ce que fait Génizio : l'application génère des défis de ce type adaptés à
        l'âge, à la ville et aux centres d'intérêt de l'enfant, le parent photographie le résultat,
        et la carte des talents se construit à partir des réalisations réelles.
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  howToJsonLd,
} from "@/lib/seo";

const PATH = "/guides/activites-educatives-enfant";

const FAQ = [
  {
    question: "Quelles activités éducatives faire à la maison avec un enfant de 6 à 12 ans ?",
    answer:
      "Celles qui laissent une trace concrète : un système d'arrosage en bouteilles, un pont en bâtonnets sans colle, ou le calcul du prix de vente d'un gâteau maison. L'enfant mobilise ses compétences manuelles et logiques avec fierté.",
  },
  {
    question: "Quelle est la différence d'activités entre 6-8 ans et 9-12 ans ?",
    answer:
      "À 6-8 ans : des défis sensoriels de 15 minutes. À 9-12 ans : des projets autonomes sur plusieurs jours (journal de maison, petite vente, énigmes).",
  },
  {
    question: "Quels jeux éducatifs sans écran proposer à la maison ?",
    answer:
      "Du carton libre, la cuisine avec conversions de grammes, des jeux de stratégie ou un mini-marché à monnaie réelle. Ils développent le raisonnement logique sans surcharge numérique.",
  },
  {
    question: "Que faire pendant les vacances quand l'enfant s'ennuie et réclame les écrans ?",
    answer:
      "Un seul défi par jour à heure fixe suffit largement. Laissez ensuite l'ennui jouer son rôle : c'est le grand moteur de l'imagination enfantine quand on ne remplit pas chaque créneau à sa place.",
  },
  {
    question: "Comment 10 minutes d'activité relancent-elles la concentration entre deux devoirs ?",
    answer:
      "Une pause motrice courte (bâtir une tour, trier des objets) oxygène le cerveau et détend les yeux sans le piège addictif d'une vidéo.",
  },
];

const ACTIVITIES = [
  {
    intelligence: "Logique & mathématiques",
    age: "6-12 ans",
    items: [
      "Calculer le prix de revient d'une recette familiale, fixer un prix de vente et calculer le bénéfice net",
      "Construire un pont en bâtonnets de bois qui supporte 1 kg sans aucune colle",
      "Mesurer l'ombre d'un bâton toutes les heures pour tracer la trajectoire solaire",
      "Créer un alphabet chiffré à substitution et s'échanger des énigmes en famille",
    ],
  },
  {
    intelligence: "Sciences & observation",
    age: "6-12 ans",
    items: [
      "Fabriquer un système d'arrosage goutte-à-goutte avec des bouteilles recyclées et étalonner le débit",
      "Faire germer 4 graines identiques dans 4 substrats différents (coton, terre, sable, eau) et noter les écarts",
      "Construire un baromètre maison avec un bocal, un ballon de baudruche et une paille",
      "Extraire des pigments naturels de fleurs ou d'épices (curcuma, hibiscus) pour fabriquer de la peinture",
    ],
  },
  {
    intelligence: "Créativité & travail manuel",
    age: "6-12 ans",
    items: [
      "Fabriquer une balance à fléau avec un cintre, de la ficelle et deux gobelets pour comparer des masses",
      "Dessiner le plan d'architecte à l'échelle de la chambre ou du salon avec une règle et un mètre",
      "Concevoir un jeu de société complet (plateau, règles, pions, cartes) et y jouer en famille",
      "Créer une animation en stop-motion (dessins successifs) d'un personnage en papier",
    ],
  },
  {
    intelligence: "Expression & langue",
    age: "6-12 ans",
    items: [
      "Interviewer un parent ou grand-parent sur son enfance et rédiger son portrait en 1 page",
      "Écrire la suite alternative d'un conte traditionnel et l'interpréter devant la famille",
      "Créer le journal d'actualités de la maison avec 3 rubriques (météo, exploit de la semaine, interview)",
      "Inventer 5 charades ou rébus logiques et les faire deviner au dîner",
    ],
  },
  {
    intelligence: "Social & coopération",
    age: "6-12 ans",
    items: [
      "Organiser une mini-vente de limonade ou gâteaux pour financer un livre ou un projet familial",
      "Établir avec la fratrie la charte des responsabilités de la chambre et l'afficher",
      "Guider un parent les yeux bandés à travers un parcours d'obstacles uniquement à la voix",
      "Créer un jeu de cartes des émotions et jouer à mimer chaque situation vécue dans la journée",
    ],
  },
  {
    intelligence: "Musique & rythme",
    age: "6-12 ans",
    items: [
      "Créer une gamme musicale avec 6 verres remplis de niveaux d'eau différents",
      "Composer un hymne familial de 4 vers sur un rythme régulier frappé sur la table",
      "Reconnaître à l'aveugle 8 bruits du quotidien enregistrés dans la maison",
      "Fabriquer un instrument de percussion ou à cordes et jouer un rythme régulier",
    ],
  },
];

export const Route = createFileRoute("/guides/activites-educatives-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Activités éducatives pour les 6-12 ans à la maison",
      description:
        "24 activités éducatives sans écran pour enfants de 6 à 12 ans : sciences du quotidien, calcul réel et défis créatifs faciles à la maison.",
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
            { name: "Activités éducatives 6-12 ans", path: PATH },
          ]),
        ),
        jsonLdScript(
          howToJsonLd({
            name: "Défi 10 min : Le Système d'arrosage goutte-à-goutte maison (6-12 ans)",
            description:
              "Une expérience scientifique sans écran avec des bouteilles recyclées pour comprendre le débit et la pression à la maison.",
            steps: [
              {
                name: "Perçage de précision",
                text: "Percez 2 micro-trous au fond d'une bouteille plastique à l'aide d'une pointe ou d'une épingle chauffée sous supervision adulte.",
              },
              {
                name: "Étalonnage du débit",
                text: "Remplissez la bouteille d'eau, vissez le bouchon plus ou moins fort et comptez le nombre de gouttes par minute pour régler le débit.",
              },
              {
                name: "Installation et observation",
                text: "Plantez le goulot au pied d'une plante en pot et mesurez l'humidité du sol après 24 heures.",
              },
            ],
          }),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "24 activités éducatives sans écran pour enfants de 6 à 12 ans à la maison",
            description:
              "Guide complet d'activités éducatives maison pour les 6 à 12 ans : expériences scientifiques simples, calcul réel, créativité manuelle et défis sans écran.",
            path: PATH,
            image: "/guides/og-activites.jpg",
            datePublished: "2026-07-27",
            dateModified: "2026-08-27",
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
      eyebrow="Activités & jeux"
      title="24 activités éducatives sans écran à faire à la maison avec un enfant de 6 à 12 ans"
      intro="Pas de matériel coûteux, pas d'écran, pas de fiche à imprimer. Des activités qui produisent un résultat visible — et qui, mises bout à bout, révèlent ce que votre enfant sait faire. Pour le soir des devoirs, le week-end ou les vacances."
      updated="27 août 2026"
      readingTime="9 min"
      path={PATH}
      related={[
        { label: "18 activités manuelles (4-12 ans)", to: "/guides/activites-manuelles-enfant" },
        {
          label: "Kits scientifiques vs maison",
          to: "/guides/jouets-educatifs-kits-scientifiques-placards-maison",
        },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
      ]}
    >
      <img
        src="/guides/og-activites.jpg"
        alt="Famille africaine engagée dans des activités éducatives manuelles à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi le résultat visible transforme l'apprentissage</h2>
      <p>
        Une activité qui aboutit à un objet réel, un plat ou un score capte l'attention bien plus
        vite qu'une consigne abstraite. Pas besoin de carotte ni de bâton. Le résultat rend l'effort{" "}
        <strong>lisible et tangible</strong>. L'enfant voit ce qu'il a bâti de ses mains. Il en tire
        une fierté authentique.
      </p>
      <p>
        Pour les parents, l'expérience est tout aussi éclairante. Une fiche d'exercices scolaires
        remplie sous la contrainte ne dit presque rien du tempérament d'un jeune. Un pont en
        bâtonnets qui s'effondre trois fois avant de tenir debout en dit infiniment plus sur sa
        persévérance et son ingéniosité face à l'erreur (voir nos conseils pour{" "}
        <a href="/guides/enfant-agite-concentration">
          canaliser l'énergie d'un enfant agité par l'action
        </a>
        ).
      </p>

      <h2>Adapter les activités selon l'âge : 6-8 ans vs 9-12 ans</h2>
      <p>
        Pour qu'une activité éducative fonctionne à la maison, le niveau de défi doit correspondre
        précisément à la maturité de l'enfant :
      </p>
      <ul>
        <li>
          <strong>Pour les 6 à 8 ans (CP - CE2) :</strong> Privilégiez les micro-défis de 15 à 20
          minutes basés sur la motricité fine, la manipulation directe et l'observation immédiate. À
          cet âge, l'enfant a besoin de voir la réaction physique rapide (germination, pesée,
          réaction colorée). N'hésitez pas à alterner avec des{" "}
          <a href="/guides/activites-manuelles-enfant">ateliers manuels et de bricolage créatif</a>.
        </li>
        <li>
          <strong>Pour les 9 à 12 ans (CM1 - 6e/5e) :</strong> L'enfant est capable de concevoir et
          de piloter de vrais micro-projets sur plusieurs jours (création d'un petit stand
          commercial, écriture d'une gazette de famille, énigmes mathématiques). Il cherche
          l'autonomie et aime être traité en partenaire de projet plutôt qu'en simple exécutant.
        </li>
      </ul>

      <h2>Les 24 activités, classées par forme d'intelligence</h2>
      <p>
        Le classement ci-dessous s'appuie sur la théorie des{" "}
        <a href="/guides/intelligences-multiples-gardner">9 intelligences d'Howard Gardner</a>.
        L'intérêt n'est jamais d'enfermer l'enfant dans une case, mais au contraire de varier les
        plaisirs et d'explorer les formes d'intelligence moins sollicitées par le cadre scolaire
        classique.
      </p>

      {ACTIVITIES.map((group) => (
        <div
          key={group.intelligence}
          className="my-6 rounded-2xl border border-ink/10 bg-surface p-5"
        >
          <h3 className="text-xl font-bold text-ink">
            {group.intelligence}{" "}
            <span className="text-xs font-normal text-ink/60">({group.age})</span>
          </h3>
          <ul className="mt-3 space-y-2">
            {group.items.map((item) => (
              <li key={item} className="text-ink/80">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Comment choisir la bonne activité sans surcharger votre quotidien</h2>
      <p>Trois critères simples suffisent pour ne pas transformer l'activité en corvée :</p>
      <ol>
        <li>
          <strong>Le temps réellement disponible.</strong> Une activité de deux heures lancée un
          soir de semaine à 18h30 ne mènera qu'à de l'agacement. Mieux vaut un mini-défi de 15
          minutes bouclé avec le sourire qu'un grand projet abandonné en larmes.
        </li>
        <li>
          <strong>Ce qu'il y a déjà dans vos placards.</strong> Une activité qui nécessite d'aller
          acheter du matériel spécifique est une activité qui n'aura jamais lieu. Les meilleures
          découvertes se font avec du carton, des bouteilles vides, des graines, de la farine ou de
          la ficelle.
        </li>
        <li>
          <strong>La passerelle d'intérêt.</strong> Partez toujours de ce que l'enfant adore déjà.
          Un enfant passionné de jeux vidéo peut concevoir les règles sur papier d'un jeu de plateau
          : vous partez de sa passion numérique pour l'amener vers une création concrète sans écran
          (voir aussi notre guide sur le{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">sevrage des écrans en douceur</a>).
        </li>
      </ol>

      <h2>Les 4 pièges fréquents à éviter</h2>
      <ul>
        <li>
          <strong>Corriger pendant l'effort.</strong> Laissez l'erreur se produire : c'est
          précisément dans le moment où la tour tombe que le cerveau cherche une solution.
        </li>
        <li>
          <strong>Finir à sa place.</strong> Un bricolage imparfait mais réalisé à 100 % par
          l'enfant renforce son sentiment de compétence. Un bel objet fait par l'adulte ne lui
          apprend rien.
        </li>
        <li>
          <strong>Enchaîner trop d'activités.</strong> Un seul défi mené à son terme par jour est
          amplement suffisant. Laissez du temps libre pour l'ennui constructif.
        </li>
        <li>
          <strong>Transformer le jeu en évaluation scolaire.</strong> Dès qu'une note ou un jugement
          de valeur apparaît, l'enfant se met en retrait et bride sa créativité.
        </li>
      </ul>

      <h2>Le rituel des « 10 minutes d'activité » entre deux devoirs</h2>
      <p>
        Le moment le plus difficile pour un enfant après une journée d'école, c'est la rupture
        d'attention entre deux exercices théoriques. Dix minutes d'activité manuelle suffisent pour
        oxygéner le cerveau, relâcher les tensions musculaires et relancer la concentration :
      </p>
      <ul>
        <li>
          <strong>Le défi chronométré inversé :</strong> « Tu as 10 minutes pour construire
          l'édifice le plus stable avec les ustensiles de cuisine. » On prend une photo souvenir, on
          range en 2 minutes, et l'on reprend les devoirs dans un état d'esprit détendu.
        </li>
        <li>
          <strong>La caisse du jour :</strong> Compter ensemble la monnaie du marché ou vérifier une
          addition à voix haute — 3 minutes de calcul utile et réel valent une demi-heure de fiches
          abstraites.
        </li>
        <li>
          <strong>Le bocal à défis surprises :</strong> Un bocal contenant des papiers pliés (« cite
          5 objets d'une couleur précise », « récite une énigme »). L'enfant en tire un au sort pour
          marquer une pause stimulante.
        </li>
      </ul>

      <h2>Garder une trace pour révéler les talents naturels de votre enfant</h2>
      <p>
        Prises isolément, ces activités sont d'excellents moments de partage familial. Mais
        lorsqu'elles sont consignées et documentées dans le temps, elles constituent une véritable
        cartographie des forces de votre enfant : on observe vers quoi il se tourne spontanément,
        comment il résout les imprévus et ce qui le passionne profondément.
      </p>
      <p>
        C'est toute la mission de Génizio : proposer des défis concrets du quotidien, photographier
        les réalisations réelles et construire le passeport d'intelligences de votre enfant sans
        test théorique réducteur. Vous pouvez également explorer notre analyse sur les{" "}
        <a href="/guides/test-de-personnalite-enfant-talents">
          tests de personnalité pour enfants et la découverte des talents réels
        </a>
        .
      </p>

      <h2>Questions fréquentes (FAQ)</h2>
      {FAQ.map((item) => (
        <div key={item.question} className="my-5 border-b border-ink/10 pb-4">
          <h3 className="text-lg font-bold text-ink">{item.question}</h3>
          <p className="mt-2 text-ink/80">{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}

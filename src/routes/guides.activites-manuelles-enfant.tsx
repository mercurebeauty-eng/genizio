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

const PATH = "/guides/activites-manuelles-enfant";

const FAQ = [
  {
    question:
      "Quelles sont les meilleures activités manuelles pour un enfant de 4 ans (maternelle) ?",
    answer:
      "À 4 ans, misez sur la motricité fine sans chercher la perfection : modelage de pâte à sel, déchirage et collage de papier de soie, enfilage de macaronis ou animaux en rouleaux de carton. L'essentiel est de manipuler librement.",
  },
  {
    question: "Quelles activités manuelles faciles faire avec un enfant de 6 à 12 ans ?",
    answer:
      "Passez aux projets d'assemblage : boîte à compartiments, maquette de pont suspendu, instrument acoustique en carton ou teinture naturelle.",
  },
  {
    question: "Pourquoi le travail manuel est-il essentiel pour le cerveau de l'enfant ?",
    answer:
      "Le travail des mains active des circuits neuronaux majeurs reliés à la coordination œil-main et à l'écriture. Selon les neurosciences et la théorie des intelligences multiples, transformer une matière brute stimule directement l'intelligence spatiale et offre un sentiment d'accomplissement concret qu'aucun écran ne procure.",
  },
  {
    question: "Comment organiser un atelier bricolage à la maison sans rien dépenser ?",
    answer:
      "Rassemblez une boîte d'emballages propres (bouchons, rouleaux, ficelles) et posez une paire de ciseaux. L'enfant invente à partir du stock.",
  },
  {
    question: "Comment valoriser les créations de son enfant avec Génizio ?",
    answer:
      "Photographiez sa réalisation dans l'application : Génizio identifie les compétences motrices et créatives mobilisées pour enrichir son Passeport de Talents et suggérer un nouveau défi.",
  },
];

const BY_AGE = [
  {
    age: "4 à 6 ans (Maternelle - Motricité fine & Découverte)",
    items: [
      "Collage texturé : déchirer et assembler des papiers colorés pour créer un paysage",
      "Modelage en pâte à sel maison (farine, eau, sel) : empreintes de feuilles et figurines",
      "Collier de perles géantes : enfiler des macaronis ou boutons sur une ficelle rigide",
      "Peinture végétale aux doigts : tester des pigments naturels (betterave, café, curcuma)",
      "Animaux en carton : transformer des rouleaux de papier en papillons, lions ou fusées",
      "Bouteille sensorielle magique : eau, paillettes, riz et bouchons colorés",
    ],
  },
  {
    age: "7 à 9 ans (CP à CM1 - Précision & Logique d'assemblage)",
    items: [
      "Boîte à crayons compartimentée en carton rigide et papier kraft",
      "Tressage et cordage : confectionner des bracelets d'amitié ou sous-verres en ficelle",
      "Couture débutante : coudre une pochette en feutrine ou tissu recyclé avec une aiguille plastique",
      "Masque en papier mâché (eau, colle de farine et bandes de journal)",
      "Mobile d'équilibre aérien à partir de branches d'arbres et de formes géométriques",
      "Tampons personnalisés gravés dans des bouchons en liège ou pommes de terre",
    ],
  },
  {
    age: "10 à 12 ans (CM2 et Collège - Ingénierie & Projets Utiles)",
    items: [
      "Maquette de pont en carton ou pont suspendu capable de supporter un poids réel",
      "Fabrication d'un instrument de musique acoustique (balafon, tambour, guitare en boîte)",
      "Teinture textile naturelle (technique du Tie and Dye avec pigments d'oignon ou avocat)",
      "Réparation d'un objet du quotidien (recoller un jouet, recoudre un bouton, fabriquer une pièce de rechange)",
      "Création d'un jeu de société complet (plateau en bois/carton, pions sculptés, livret de règles)",
      "Mini-marché artisanal à la maison pour exposer et valoriser ses créations",
    ],
  },
];

export const Route = createFileRoute("/guides/activites-manuelles-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "18 activités manuelles faciles à la maison (4-12 ans)",
      description:
        "18 activités manuelles faciles et sans écran pour enfants de 4 à 12 ans : bricolage créatif, motricité fine et recyclage à faire à la maison.",
      path: PATH,
      image: "/guides/og-manuelles.jpg",
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
            { name: "Activités manuelles enfant", path: PATH },
          ]),
        ),
        jsonLdScript(
          howToJsonLd({
            name: "Défi 10 min : Le Circuit à billes vertical en carton recyclé (4-12 ans)",
            description:
              "Un atelier de bricolage d'ingénierie simple utilisant des rouleaux de carton et du ruban adhésif sur une porte ou un mur.",
            steps: [
              {
                name: "Découpe des goulottes",
                text: "Fendez 3 rouleaux d'essuie-tout ou de papier toilette en deux dans le sens de la longueur pour former des gouttières.",
              },
              {
                name: "Fixation en pente",
                text: "Fixez les segments avec du scotch repositionnable sur une porte en créant une pente en zigzag.",
              },
              {
                name: "Test de gravité",
                text: "Lâchez une bille ou une petite balle au sommet et ajustez les angles de descente pour qu'elle atteigne la boîte d'arrivée sans tomber.",
              },
            ],
          }),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "18 activités manuelles faciles à faire à la maison avec son enfant (4-12 ans)",
            description:
              "Guide complet des activités manuelles pour enfants de 4 à 12 ans : bricolage sans écran, motricité fine, matériel de récupération et valorisation des talents.",
            path: PATH,
            image: "/guides/og-manuelles.jpg",
            datePublished: "2026-08-10",
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
      eyebrow="Activités & Bricolage"
      title="18 activités manuelles faciles à faire à la maison avec son enfant (4-12 ans)"
      intro="Couper, coller, assembler, modeler, réparer : le travail des mains n'est pas un simple passe-temps pour occuper un après-midi pluvieux. C'est l'un des moteurs les plus puissants du développement cérébral et de l'autonomie de l'enfant. Voici 18 idées concrètes, adaptées par tranche d'âge de 4 à 12 ans, réalisables sans matériel coûteux."
      updated="27 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
        {
          label: "Kits scientifiques vs placards",
          to: "/guides/jouets-educatifs-kits-scientifiques-placards-maison",
        },
        {
          label: "Éveiller la créativité et le réel",
          to: "/guides/quelle-librairie-choisir-lieux-creativite-enfant",
        },
        {
          label: "Les 9 formes d'intelligence (Gardner)",
          to: "/guides/intelligences-multiples-gardner",
        },
      ]}
    >
      <img
        src="/guides/og-manuelles.jpg"
        alt="Main d'enfant fabriquant une création manuelle avec du matériel de récupération"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi les activités manuelles sont indispensables au cerveau de l'enfant</h2>
      <p>
        Face à l'omniprésence des tablettes, où un simple glissement de doigt remplace l'effort
        physique, les neurosciences rappellent une vérité :{" "}
        <strong>le cerveau humain apprend d'abord par la manipulation de la matière</strong>.
      </p>
      <p>
        En découpant du carton, en dosant la colle ou en tressant de la ficelle, l'enfant active des
        circuits moteurs fins qui conditionnent la tenue du crayon et l'écriture. Dans la grille des{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de Gardner</a>, le
        bricolage nourrit directement l'intelligence spatiale.
      </p>
      <p>
        Mieux encore : fabriquer un objet réel reste le moyen le plus efficace pour{" "}
        <a href="/guides/ecrans-addiction-alternatives-enfant">
          sevrer un enfant des écrans sans crise
        </a>
        . Devant une création concrète, l'attention se pose d'elle-même.
      </p>

      <h2>18 activités manuelles classées par tranche d'âge</h2>
      <p>
        Chaque tranche d'âge correspond à un stade d'autonomie motrice bien défini. Vous pouvez
        également combiner ces idées avec nos{" "}
        <a href="/guides/activites-educatives-enfant">24 activités éducatives à la maison</a>.
      </p>

      <div className="my-8 space-y-6">
        {BY_AGE.map((group) => (
          <div
            key={group.age}
            className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-xs"
          >
            <h3 className="text-xl font-bold text-ink">{group.age}</h3>
            <ul className="mt-4 space-y-2 text-sm text-ink/85">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>Focus : Les activités manuelles pour un enfant de 4 ans (Maternelle)</h2>
      <p>
        À 4 ans, l'enfant affine la synchronisation de ses deux mains. La clé tient en un mot :
        simplicité.
      </p>
      <ul>
        <li>
          <strong>La pâte à sel magique :</strong> 2 verres de farine, 1 verre de sel fin, 1 verre
          d'eau tiède. Pétrir la matière apaise les tensions nerveuses (un réflexe utile pour{" "}
          <a href="/guides/gestion-colere-emotions-enfant">canaliser la frustration</a>) avant de
          sculpter des formes simples.
        </li>
        <li>
          <strong>Le collage de papier de soie :</strong> Déchirer avec les doigts entraîne les
          muscles des pouces et index.
        </li>
        <li>
          <strong>Le tri et enfilage de perles :</strong> Développe l'attention des tout-petits qui
          peinent à se poser (voir nos repères pour un{" "}
          <a href="/guides/enfant-agite-concentration">enfant qui a du mal à se concentrer</a>).
        </li>
      </ul>

      <h2>3 ateliers pas à pas à faire avec du matériel de récupération</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          1. La boîte à secrets compartimentée (4-8 ans, 25 min)
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          <strong>Matériel :</strong> Une boîte à chaussures, 3 rouleaux de carton coupés en deux,
          colle, magazines usés.
          <br />
          <strong>Étapes :</strong> 1. L'enfant colle les rouleaux à l'intérieur pour créer des
          compartiments secrets. 2. Il décore l'extérieur avec des collages de ses héros ou animaux
          préférés. 3. Cette boîte devient son espace d'
          <a href="/guides/autonomie-responsabilite-maison" className="underline font-semibold">
            autonomie et de rangement
          </a>{" "}
          pour ses trésors.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          2. Le balafon / xylophone en bois et carton (7-10 ans, 30 min)
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          <strong>Matériel :</strong> Une boîte en carton allongée, 5 baguettes de bois (ou crayons)
          de longueurs différentes, élastiques.
          <br />
          <strong>Étapes :</strong> 1. Tendre les élastiques autour de la boîte. 2. Glisser les
          baguettes dessous en les espaçant du plus court au plus long. 3. L'enfant teste les sons
          émis en frappant avec un bâtonnet : c'est une initiation vivante à l'intelligence musicale
          et à la physique acoustique.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          3. La maquette de pont suspendu (9-12 ans, 45 min)
        </h3>
        <p className="text-sm text-emerald-950 text-base mb-2 font-bold">
          <strong>Matériel :</strong> Carton fort, ficelle, colle forte ou pistolet basse
          température, ciseaux.
          <br />
          <strong>Étapes :</strong> 1. Tracer et découper deux piliers solides. 2. Relier les
          piliers avec un tablier de carton suspendu par des haubans en ficelle. 3. Tester la
          résistance du pont en y posant des petites voitures : l'enfant apprend par l'essai-erreur
          comme un véritable ingénieur.
        </p>
      </div>

      <h2>Comment installer l'atelier à la maison sans désordre permanent</h2>
      <ul>
        <li>
          <strong>La Boîte Trésor :</strong> Une grande boîte où vous jetez bouchons, emballages
          propres, ficelles et chutes de papier. L'enfant sait où piocher en totale indépendance.
        </li>
        <li>
          <strong>La nappe de bricolage cirée :</strong> Une simple nappe plastique pliée que l'on
          déplie en 5 secondes sur la table de la cuisine pour protéger la surface.
        </li>
        <li>
          <strong>La règle d'or du parent :</strong> Ne finissez jamais le travail à la place de
          l'enfant. Un résultat imparfait mais conçu à 100 % par lui génère infiniment plus d'estime
          de soi qu'un chef-d'œuvre terminé par un adulte.
        </li>
      </ul>

      <h2>Ce que le bricolage révèle des talents cachés de votre enfant</h2>
      <p>
        Quand un enfant construit, observez son comportement : est-il méthodique ou spontané ?
        Abandonne-t-il dès que la colle lâche ou cherche-t-il une autre solution ? Cette observation
        en dit beaucoup plus sur ses capacités que n'importe quel test théorique (consultez notre
        analyse sur les{" "}
        <a href="/guides/test-de-personnalite-enfant-talents">tests de personnalité pour enfants</a>{" "}
        ou sur le{" "}
        <a href="/guides/potentiel-haut-potentiel-enfant">repérage des enfants à haut potentiel</a>
        ).
      </p>
      <p>
        Avec <strong>Génizio</strong>, chaque création manuelle devient une brique vivante de son
        passeport de compétences. Photographiez simplement sa réalisation : notre système identifie
        ses progrès et lui suggère le prochain défi stimulant.
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

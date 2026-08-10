import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/activites-manuelles-enfant";

const FAQ = [
  {
    question: "Quelles activités manuelles faire avec un enfant de 4 à 12 ans ?",
    answer:
      "Les plus formatrices utilisent du matériel que vous avez déjà : déchirer, découper, coller, plier, nouer, modeler, coudre à la main, tresser, peindre avec des pigments naturels, assembler des objets de récupération. Ce qui compte n'est pas la complexité mais la régularité : un atelier de 20 à 30 minutes plusieurs fois par semaine développe la motricité fine, la concentration et le plaisir de finir ce qu'on a commencé.",
  },
  {
    question: "Les activités manuelles sont-elles vraiment utiles pour le développement de l'enfant ?",
    answer:
      "Oui, sur plusieurs plans à la fois. La motricité fine (couper, nouer, enfiler) prépare directement l'écriture et la précision du geste. Une activité manuelle qui se termine par un objet demande de planifier, de suivre des étapes, de tolérer l'erreur et de recommencer — ce sont des compétences exécutives transférables à l'école. Enfin, un résultat visible et manipulable construit la confiance en soi d'une façon qu'aucun exercice abstrait ne peut égaler.",
  },
  {
    question: "Comment occuper un enfant avec des activités manuelles sans dépenser d'argent ?",
    answer:
      "Le matériel le plus riche est le plus courant : carton, bouteilles en plastique, bouchons, tissus usés, ficelle, farine et eau pour la pâte, feuilles et fleurs pour les pigments, papier journal. Dressez une boîte « trésor » où l'enfant range ce qu'il veut réutiliser, et laissez-le choisir son projet dedans. L'argent n'est pas un facteur : c'est l'autonomie de choix et la liberté d'expérimenter qui font la qualité de l'activité.",
  },
  {
    question: "Comment Génizio utilise-t-il les activités manuelles ?",
    answer:
      "Génizio génère des défis manuels adaptés à l'âge, aux centres d'intérêt et au matériel disponible à la maison de chaque enfant. Quand l'enfant termine un défi, le parent photographie le résultat, et la carte des talents de l'enfant se met à jour à partir de cette réalisation réelle — jamais d'un questionnaire. Les activités manuelles y occupent une place centrale parce qu'elles laissent une preuve visible de ce dont l'enfant est capable.",
  },
];

export const Route = createFileRoute("/guides/activites-manuelles-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Activités manuelles pour enfants : 15 idées (4-12 ans)",
      description:
        "15 activités manuelles pour enfant à faire à la maison avec du matériel du quotidien : ce que chacune développe, et ce qu'elle révèle.",
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
            { name: "Activités manuelles", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Activités manuelles pour enfants : 15 idées concrètes (4-12 ans)",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-manuelles.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-10",
          about: [
            { "@type": "Thing", name: "Activités manuelles pour enfants" },
            { "@type": "Thing", name: "Bricolage enfant" },
            { "@type": "Thing", name: "Motricité fine" },
            { "@type": "Thing", name: "Activités sans écran" },
          ],
        }),
      ],
    };
  },
  component: Guide,
});

const BY_AGE = [
  {
    age: "4 à 6 ans",
    items: [
      "Déchirer et coller des papiers de couleurs pour composer une scène (collage)",
      "Enfiler des grosses perles ou des pâtes sur un fil pour créer un collier",
      "Modeler des formes avec de la pâte à sel (farine, eau, sel)",
      "Peindre avec les doigts et des pigments naturels (hibiscus, curcuma, charbon)",
      "Décorer une boîte à chaussures avec des bouchons, tissus et boutons",
    ],
  },
  {
    age: "7 à 9 ans",
    items: [
      "Construire un objet utile en carton : boîte à crayons, porte-revues, cadre photo",
      "Coudre à la main un petit coussin ou un étui avec une aiguille en plastique",
      "Tresser un bracelet ou un cordage avec de la ficelle et des perles",
      "Faire du papier mâché pour créer un masque ou un bol",
      "Monter un petit mobile à partir de branches et d'objets de récupération",
    ],
  },
  {
    age: "10 à 12 ans",
    items: [
      "Réparer un objet cassé (vêtement, jouet, petit appareil) au lieu de le jeter",
      "Concevoir et fabriquer une maquette : pont, cabane miniature, quartier",
      "Teindre un tissu avec des pigments naturels extraits soi-même",
      "Construire un instrument de musique (balafon en bois, tambour, guitare en carton)",
      "Organiser et vendre ses créations lors d'un petit marché familial",
    ],
  },
];

function Guide() {
  return (
    <GuideLayout
      eyebrow="Activités & jeux"
      title="Activités manuelles pour enfants : 15 idées concrètes (4-12 ans)"
      intro="Couper, coller, nouer, modeler, réparer : les activités manuelles ne sont pas de simples occupations. Elles développent des compétences que l'école ne mesure pas — et elles laissent une trace visible de ce que l'enfant sait faire. Voici 15 idées à la portée de toutes les maisons."
      updated="10 août 2026"
      readingTime="7 min"
      related={[
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Réduire les écrans sans crise", to: "/guides/ecrans-addiction-alternatives-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
      ]}
    >
      <img
        src="/guides/og-manuelles.jpg"
        alt="Main d'enfant fabriquant une création manuelle avec du matériel de récupération"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Pourquoi les activités manuelles comptent vraiment</h2>
      <p>
        Une activité manuelle mobilise bien plus qu'une paire de mains. Découper en suivant un
        tracé, enfiler des perles, nouer un fil : autant de gestes qui entraînent la{" "}
        <strong>motricité fine</strong>, celle-là même qui prépare l'écriture. Mais le bénéfice va
        plus loin.
      </p>
      <p>
        Une activité qui se termine par un objet oblige l'enfant à <strong>planifier</strong> (par
        où commencer ?), à <strong>suivre des étapes</strong>, à <strong>tolérer l'erreur</strong>{" "}
        (la pièce tombe, la colle ne prend pas) et à <strong>recommencer</strong>. Ce sont des
        compétences exécutives — les mêmes que celles qui font réussir à l'école — mais elles
        s'entraînent ici sans note, sans pression, avec les mains.
      </p>
      <p>
        Enfin, il y a la confiance. Un exercice de cahier rempli disparaît. Une boîte décorée, un
        collier ou une maquette restent : l'enfant peut la montrer, la donner, la garder. Cette
        preuve visible de ce qu'il sait faire est un des leviers de confiance les plus directs qui
        existent.
      </p>

      <h2>15 activités classées par âge</h2>
      <p>
        Le classement par âge est indicatif : un enfant de 9 ans peut aimer une activité de la
        tranche au-dessus si elle l'intéresse. L'important est que l'enfant choisisse et finisse.
      </p>

      {BY_AGE.map((group) => (
        <div key={group.age}>
          <h3>{group.age}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Comment installer l'atelier sans se ruiner</h2>
      <ul>
        <li>
          <strong>La boîte « trésor ».</strong> Un carton où l'enfant range lui-même ce qu'il veut
          réutiliser : bouchons, tissus, rouleaux, bouteilles, boutons. C'est son magasin, il
          décide.
        </li>
        <li>
          <strong>Un coin fixe.</strong> Même une petite table avec une boîte de ciseaux, colle et
          papier vaut mieux qu'un atelier complet sorti à chaque fois. L'enfant se met au travail
          seul quand le matériel est accessible.
        </li>
        <li>
          <strong>Un rituel régulier.</strong> Un créneau fixe (« samedi matin, atelier ») ancre
          l'habitude mieux que des moments improvisés.
        </li>
        <li>
          <strong>Résister à la tentation de finir à sa place.</strong> Un résultat imparfait mais
          fait par lui construit plus qu'un bel objet fait par vous.
        </li>
      </ul>

      <h2>Ce qu'un enfant qui crée révèle de lui</h2>
      <p>
        Les activités manuelles sont aussi une fenêtre d'observation. Face à un objet qui ne tient
        pas : est-ce qu'il s'arrête, qu'il insiste, qu'il change de méthode ? Est-ce qu'il demande
        de l'aide ou préfère chercher seul ? Ces informations, notées sur quelques semaines,
        en disent plus sur son <strong>mode d'apprentissage</strong> que bien des questionnaires.
      </p>
      <p>
        C'est précisément ce que Génizio observe : les défis manuels qu'il propose à chaque enfant
        sont choisis selon son âge, ses centres d'intérêt et le matériel disponible à la maison, et
        la carte de ses talents se construit à partir des réalisations photographiées — jamais d'un
        questionnaire rempli par le parent.
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

import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";

const PATH = "/guides/discipline-positive-sans-punition";

const FAQ = [
  {
    question: "Comment se faire obéir sans crier ni frapper ?",
    answer:
      "Trois étapes suffisent souvent : accueillir l'émotion d'abord (« tu es en colère parce que je coupe la télévision »), rappeler la limite ensuite (« le cadre est : pas d'écran après 19 h »), et appliquer une conséquence logique plutôt qu'une punition arbitraire (« on ne regarde pas la télé ce soir, on le fera demain »). Si vous sentez que vous allez crier, mettez-vous en pause avant d'agir : un parent calme est une condition, pas un luxe. La régularité compte plus que la sévérité : une limite appliquée dix fois avec calme est plus efficace qu'une limite criée une fois.",
  },
  {
    question: "Qu'est-ce que la discipline positive exactement ?",
    answer:
      "C'est une approche éducative fondée sur une observation simple : un enfant se comporte mieux quand il se sent compris et capable, et non quand il a peur. En pratique, elle combine trois choses : des limites claires et stables, des conséquences liées à l'acte plutôt que des punitions humiliantes, et des outils qui rendent l'enfant acteur de ses choix. Elle n'est ni permissive (tout est permis) ni punitive : elle vise à enseigner, pas à faire souffrir.",
  },
  {
    question: "La discipline positive, est-ce laisser l'enfant faire ce qu'il veut ?",
    answer:
      "Non, c'est l'inverse de l'abandon éducatif. Elle insiste au contraire sur des limites fermes, mais posées sans humiliation. La différence avec l'éducation classique tient au comment : on ne punit pas pour faire peur, on associe l'enfant à des conséquences qu'il peut comprendre (« tu as déchiré le livre, tu le répareras »), et on lui offre des choix dans un cadre décidé par l'adulte (« tu ranges maintenant ou dans cinq minutes ? »). L'autorité reste celle du parent ; c'est sa forme qui change.",
  },
  {
    question: "La fessée est-elle une bonne façon de faire obéir ?",
    answer:
      "Non. La fessée fait obéir sur le moment, mais elle apprend à l'enfant que la force règle les problèmes et que les adultes peuvent frapper quand ils sont en colère. Un enfant qui a peur de son parent obéit en apparence, mais il n'apprend ni la règle ni le respect — il apprend à éviter d'être pris. Il existe des alternatives qui font obéir aussi vite et qui apprennent en plus : la conséquence logique, le choix limité, le temps de recul. Et contrairement à ce qu'on croit, un enfant qui n'est jamais frappé ne devient pas plus indiscipliné : il devient plus capable de comprendre les règles.",
  },
  {
    question: "À partir de quel âge la discipline positive fonctionne-t-elle ?",
    answer:
      "Dès que l'enfant comprend des mots simples, vers 2-3 ans, les principes de base s'appliquent : nommer l'émotion, offrir deux choix limités, prévenir avant de changer d'activité. De 4 à 8 ans, on ajoute les conséquences logiques et la réparation. De 9 à 12 ans, l'essentiel devient la négociation des règles dans un cadre fixe, et à l'adolescence, la co-construction des limites. Le principe commun à tous les âges : plus l'enfant participe aux règles, plus il les respecte.",
  },
  {
    question: "La discipline positive est-elle en lien avec Génizio ?",
    answer:
      "Génizio s'appuie sur le même socle : donner à l'enfant des projets concrets à sa mesure, le laisser faire des choix, et valoriser ce qu'il a réellement accompli plutôt que de le comparer ou de l'étiqueter. Les défis de l'application sont conçus comme des responsabilités confiées, pas des récompenses : l'enfant choisit, agit, et la carte de ses talents se construit à partir de ses réalisations réelles.",
  },
];

export const Route = createFileRoute("/guides/discipline-positive-sans-punition")({
  head: () => {
    const meta = pageMeta({
      title: "Discipline positive : se faire obéir sans crier ni punir",
      description:
        "Comment poser des limites fermes sans crier ni fessée ? Découvrez les 4 étapes de la discipline positive et les conséquences logiques bienveillantes.",
      path: PATH,
      image: "/guides/og-discipline.jpg",
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
            { name: "Discipline positive sans punition", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Discipline positive : comment poser des limites et se faire obéir sans crier ni frapper",
          description:
            "Guide complet d'éducation bienveillante et ferme : se faire obéir sans fessée, conséquences logiques, choix limités et autorité parentale respectueuse.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-discipline.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-26",
          about: [
            { "@type": "Thing", name: "Discipline positive" },
            { "@type": "Thing", name: "Éducation sans violence" },
            { "@type": "Thing", name: "Autorité parentale" },
            { "@type": "Thing", name: "Conséquences logiques" },
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
      eyebrow="Éducation & Limites"
      title="Discipline positive : comment poser des limites et se faire obéir sans crier ni frapper"
      intro="Crier fonctionne quelques minutes, puis il faut crier plus fort. La fessée fait obéir sur le moment, puis installe la peur ou la rancœur. Il existe une autre voie, solide et respectueuse : l'autorité ferme posée sans humiliation, qui responsabilise l'enfant au lieu de le briser. Voici comment l'appliquer au quotidien avec des techniques éprouvées."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Rendre son enfant autonome sans crier",
          to: "/guides/autonomie-responsabilite-maison",
        },
        { label: "Gérer la colère de son enfant", to: "/guides/gestion-colere-emotions-enfant" },
        {
          label: "Disputes frères et sœurs : coopérer",
          to: "/guides/fratrie-rivalite-cooperation",
        },
        { label: "Canaliser un enfant agité", to: "/guides/enfant-agite-concentration" },
        { label: "Réduire les écrans sans conflit", to: "/guides/ecrans-addiction-alternatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-discipline.jpg"
        alt="Parent posant une limite avec bienveillance et fermeté à son enfant à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Ce que « poser des limites » veut dire</h2>
      <p>
        L'autorité parentale n'a pas besoin de passer par la violence ou l'humiliation (fessée, menaces, injures, moqueries). Quand un enfant obéit uniquement sous l'effet de la peur, il n'apprend pas la valeur de la règle : il apprend seulement à ruser pour ne pas se faire attraper.
      </p>
      <p>
        Les limites doivent être <strong>fermes sur le fond et respectueuses sur la forme</strong>. C'est l'essence même de la discipline positive, qui s'inscrit parfaitement dans la tradition des familles bienveillantes (découvrez notre réflexion sur l'
        <a href="/guides/education-enfants-afrique-francophone">éducation des talents en Afrique et dans la diaspora</a>).
      </p>

      <h2>Comprendre avant de sévir : la question qui désamorce les crises</h2>
      <p>
        Face à une provocation ou un refus d'obéir, la première question à se poser n'est pas « quelle punition infliger ? », mais <strong>« quel est le besoin non comblé de mon enfant ? »</strong> :
      </p>
      <ul>
        <li>
          <strong>Un besoin de décharge motrice :</strong> Un enfant qui refuse de faire ses devoirs a souvent besoin de bouger 10 minutes avant (consultez nos conseils pour un{" "}
          <a href="/guides/enfant-agite-concentration">enfant inattentif ou qui ne tient pas en place</a>).
        </li>
        <li>
          <strong>Un trop-plein émotionnel :</strong> Une tempête de cris cache souvent une grande frustration ou un sentiment d'impuissance (appliquez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour calmer la colère de l'enfant</a>).
        </li>
        <li>
          <strong>Un besoin d'attention ou de rivalité fraternelle :</strong> Des bêtises répétées pour capter le regard des parents (lisez nos solutions pour{" "}
          <a href="/guides/fratrie-rivalite-cooperation">apaiser les conflits entre frères et sœurs</a>).
        </li>
      </ul>

      <h2>Quatre techniques concrètes qui remplacent les punitions</h2>
      <ol className="space-y-4 my-6">
        <li>
          <strong>1. Les choix limités :</strong> Offrez deux options acceptables pour vous : <em>« Tu préfères ranger tes jouets maintenant ou dans 5 minutes après avoir sonné le minuteur ? »</em> L'enfant exerce son pouvoir de décision à l'intérieur d'un cadre fixé.
        </li>
        <li>
          <strong>2. Les conséquences logiques :</strong> La conséquence découle directement de l'acte, sans colère : <em>« Tu as renversé de l'eau, prends le chiffon pour éponger. »</em> La conséquence logique enseigne la responsabilité, là où la punition arbitraire (« privé de dessert ») ne génère que du ressentiment.
        </li>
        <li>
          <strong>3. La réparation relationnelle :</strong> Lorsqu'un mot blessant ou un geste violent a eu lieu, demandez à l'enfant de réparer : présenter une excuse sincère, consoler son frère ou lui prêter son jouet favori.
        </li>
        <li>
          <strong>4. Le contrat d'accord familial :</strong> Pour les sujets sensibles comme les jeux vidéo ou les devoirs, co-construisez les règles à l'avance en suivant notre protocole pour{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">réduire le temps d'écran sans crise</a> et nos rituels pour{" "}
          <a href="/guides/autonomie-responsabilite-maison">rendre l'enfant autonome à la maison</a>.
        </li>
      </ol>

      <h2>Des situations réelles, des paroles exactes</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          Au magasin : l'enfant fait une crise pour un bonbon ou jouet
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          <em>« Tu as très envie de ce jouet, je comprends ta déception. Aujourd'hui, nous achetons uniquement ce qui est sur notre liste. Tu peux le noter sur ta liste d'anniversaire. »</em> Accroupissez-vous à sa hauteur, maintenez la limite avec calme sans céder.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">
          À la maison : il refuse catégoriquement d'éteindre sa tablette
        </h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          <em>« Le temps convenu est terminé. Tu éteins toi-même maintenant, ou bien je range la tablette pour aujourd'hui et demain ? »</em> S'il refuse, appliquez la conséquence calmement, sans crier.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">
          À l'école : mauvaise note ou mot dans le carnet
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Écoutez d'abord sa version. Ne doublez pas la punition par des cris à la maison. Cherchez la cause et responsabilisez-le pour réparer avec l'enseignant (découvrez comment{" "}
          <a href="/guides/reussite-scolaire-aider-enfant" className="underline font-semibold">aider son enfant à réussir à l'école sans stress</a>).
        </p>
      </div>

      <h2>Les pièges majeurs qui fragilisent l'autorité</h2>
      <ul>
        <li>
          <strong>Menacer sans appliquer :</strong> Une menace non exécutée apprend à l'enfant que vos paroles n'ont aucun poids.
        </li>
        <li>
          <strong>Humilier devant des témoins :</strong> Réprimander un enfant devant ses camarades ou des proches génère de la honte destructrice. Corrigez toujours en tête-à-tête, valorisez en public.
        </li>
        <li>
          <strong>Comparer avec les autres :</strong> <em>« Regarde ton frère, lui est sage »</em> détruit l'estime de soi et alimente la jalousie.
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio applique les principes de la discipline positive à travers la valorisation des réussites. Chaque défi relevé par votre enfant met en lumière ses talents réels (intelligences multiples, créativité, sens pratique) et renforce sa motivation intrinsèque.
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

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
      "Accueillez l'émotion d'abord (« tu es furieux parce qu'on éteint »), rappelez le cadre avec calme (« la règle est : pas d'écran après 19 h »), et appliquez une conséquence logique sans hausser la voix. La constance prime sur l'intensité.",
  },
  {
    question: "Qu'est-ce que la discipline positive exactement ?",
    answer:
      "C'est une éducation ferme et bienveillante qui remplace la peur par la responsabilité : des limites claires, zéro humiliation, et des conséquences directes.",
  },
  {
    question: "La discipline positive, est-ce laisser l'enfant faire ce qu'il veut ?",
    answer:
      "Non, c'est l'inverse du laxisme. Les règles restent non négociables, mais elles sont appliquées sans cris. L'adulte garde l'autorité tout en apprenant à l'enfant à réparer ses erreurs.",
  },
  {
    question: "La fessée est-elle une bonne façon de faire obéir ?",
    answer:
      "Non. Elle stoppe l'action sur l'instant mais enseigne que la force physique résout les désaccords. Un enfant qui craint les coups apprend à mentir pour ne pas être pris ; un enfant guidé par des conséquences logiques apprend le sens du respect mutuel.",
  },
  {
    question: "À partir de quel âge la discipline positive fonctionne-t-elle ?",
    answer:
      "Dès 2-3 ans avec des choix simples. De 6 à 10 ans, on consolide les conséquences logiques et l'autonomie. Plus l'enfant participe à l'élaboration des règles, mieux il les applique.",
  },
  {
    question: "La discipline positive est-elle en lien avec Génizio ?",
    answer:
      "Totalement. Génizio confie des responsabilités pratiques à l'enfant : chaque défi réussi nourrit sa confiance intérieure sans recourir à des punitions ou du chantage.",
  },
];

export const Route = createFileRoute("/guides/discipline-positive-sans-punition")({
  head: () => {
    const meta = pageMeta({
      title: "Discipline positive : se faire obéir sans crier ni punir",
      description:
        "Comment poser des limites fermes sans crier ni fessée ? Les 4 étapes de la discipline positive et les conséquences logiques bienveillantes.",
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
        L'autorité parentale n'a pas besoin de passer par la violence ou l'humiliation. Frapper ou insulter apprend seulement à ruser. Rien de plus.
      </p>
      <p>
        Les limites doivent être <strong>fermes sur le fond et respectueuses sur la forme</strong>. C'est l'essence même de la discipline positive, qui s'accorde avec les valeurs des familles bienveillantes (voir notre réflexion sur l'
        <a href="/guides/education-enfants-afrique-francophone">éducation des talents en Afrique et dans la diaspora</a>).
      </p>

      <h2>Comprendre avant de sévir : la question qui désamorce les crises</h2>
      <p>
        Face à un refus d'obéir, demandez-vous d'abord : <strong>« quel est le besoin réel non comblé ? »</strong>
      </p>
      <ul>
        <li>
          <strong>Un besoin de décharge motrice :</strong> Un enfant qui rechigne devant ses devoirs a souvent besoin de courir 10 minutes (voir nos repères pour un{" "}
          <a href="/guides/enfant-agite-concentration">enfant inattentif ou qui ne tient pas en place</a>).
        </li>
        <li>
          <strong>Un trop-plein émotionnel :</strong> Les cris cachent souvent de la fatigue ou de l'impuissance (appliquez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour calmer la colère</a>).
        </li>
        <li>
          <strong>Un appel d'attention :</strong> Des bêtises ciblées pour capter le regard parental (lisez nos solutions pour{" "}
          <a href="/guides/fratrie-rivalite-cooperation">apaiser les rivalités entre frères et sœurs</a>).
        </li>
      </ul>

      <h2>Quatre techniques concrètes qui remplacent les punitions</h2>
      <ol className="space-y-4 my-6">
        <li>
          <strong>1. Les choix limités :</strong> Offrez deux options acceptables : <em>« Tu préfères ranger tes jouets maintenant ou dans 5 minutes après le minuteur ? »</em> L'enfant décide à l'intérieur d'un cadre posé.
        </li>
        <li>
          <strong>2. Les conséquences logiques :</strong> La conséquence découle de l'acte : <em>« Tu as renversé l'eau, prends le chiffon pour éponger. »</em> La conséquence enseigne la responsabilité sans rancœur.
        </li>
        <li>
          <strong>3. La réparation :</strong> Lorsqu'un mot blessant a eu lieu, demandez à l'enfant de réparer : une excuse sincère ou un geste de réconciliation.
        </li>
        <li>
          <strong>4. Le contrat familial :</strong> Pour les écrans ou les devoirs, fixez les règles en amont en suivant notre méthode pour{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">réduire les écrans sans crise</a> et nos rituels pour{" "}
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
          Écoutez d'abord sa version. Ne doublez pas la sanction par des cris. Cherchez la cause et responsabilisez-le pour réparer avec l'enseignant (voir comment{" "}
          <a href="/guides/reussite-scolaire-aider-enfant" className="underline font-semibold">aider son enfant à réussir à l'école sans stress</a>).
        </p>
      </div>

      <h2>Les pièges majeurs qui fragilisent l'autorité</h2>
      <ul>
        <li>
          <strong>Menacer sans appliquer :</strong> Une menace non exécutée apprend à l'enfant que vos paroles n'ont aucun poids.
        </li>
        <li>
          <strong>Humilier devant des témoins :</strong> Réprimander un enfant en public crée de la honte. Corrigez en tête-à-tête, encouragez devant les autres.
        </li>
        <li>
          <strong>Comparer avec les autres :</strong> <em>« Regarde ton frère, lui est sage »</em> détruit l'estime de soi et alimente la jalousie.
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio applique ces principes par l'action pratique. Chaque défi relevé par votre enfant révèle ses talents réels (intelligences multiples, créativité, sens manuel) et renforce son autonomie.
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

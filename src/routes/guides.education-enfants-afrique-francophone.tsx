import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/education-enfants-afrique-francophone";

const FAQ = [
  {
    question: "Comment révéler le potentiel d'un enfant sans accès à des activités extrascolaires organisées ?",
    answer:
      "L'essentiel du potentiel d'un enfant se révèle avec ce qu'il a déjà sous la main, pas avec un abonnement à un club coûteux. Un enfant qui aide à tenir les comptes d'un petit commerce familial développe une intelligence entrepreneuriale réelle. Un enfant qui négocie entre cousins développe une intelligence sociale réelle. Le manque d'activités structurées à l'occidentale n'est pas un manque de potentiel — c'est souvent un potentiel qui se développe ailleurs, moins visible parce qu'il n'a pas de diplôme ou de club associé.",
  },
  {
    question: "Le multilinguisme freine-t-il ou aide-t-il le développement d'un enfant ?",
    answer:
      "La recherche en psychologie du développement est aujourd'hui assez nette sur ce point : grandir avec plusieurs langues (langue locale, français, parfois une troisième) n'est pas un handicap cognitif, et serait plutôt associé à une meilleure flexibilité mentale et à une capacité accrue à basculer d'un cadre de pensée à un autre. Un enfant qui parle deux ou trois langues à la maison ne part pas avec un retard à combler, mais avec une compétence cognitive supplémentaire, rarement reconnue comme telle par l'école.",
  },
  {
    question: "Comment accompagner un enfant de la diaspora qui grandit loin du pays d'origine ?",
    answer:
      "Les familles de la diaspora vivent souvent une tension particulière : transmettre une culture et une langue d'origine tout en réussissant dans le système éducatif du pays d'accueil. Sur le plan du potentiel, le principe reste le même que partout : observer ce que l'enfant fait spontanément et bien, plutôt que de comparer son parcours à celui d'un enfant resté au pays ou à celui d'un enfant du pays d'accueil. Le parrainage à distance (offrir une saison Génizio à un enfant en Côte d'Ivoire ou au Sénégal depuis l'étranger) est une des façons dont Génizio permet de rester engagé concrètement malgré la distance.",
  },
  {
    question: "Génizio fonctionne-t-il avec une connexion internet limitée ?",
    answer:
      "L'application nécessite une connexion pour générer les défis et enregistrer les preuves de réalisation, mais chaque défi, une fois reçu, se réalise ensuite hors ligne avec du matériel du quotidien — les défis sont conçus pour ne jamais dépendre d'un achat spécifique. Le contact humain (questions, accompagnement) passe par WhatsApp, déjà largement utilisé dans la zone.",
  },
];

export const Route = createFileRoute("/guides/education-enfants-afrique-francophone")({
  head: () => {
    const meta = pageMeta({
      title: "Révéler le potentiel d'un enfant en Afrique francophone",
      description:
        "Ce que l'éducation en Côte d'Ivoire, au Sénégal et dans la diaspora a de spécifique, et comment révéler le potentiel d'un enfant avec ce qu'on a à la maison.",
      path: PATH,
      image: "/guides/og-afrique.jpg",
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
            { name: "Afrique francophone", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Révéler le potentiel d'un enfant en Afrique francophone et dans la diaspora",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-afrique.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-08",
          about: [
            { "@type": "Thing", name: "Éducation en Afrique francophone" },
            { "@type": "Thing", name: "Développement du potentiel de l'enfant" },
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
      eyebrow="Afrique & diaspora"
      title="Révéler le potentiel d'un enfant en Afrique francophone et dans la diaspora"
      intro="La plupart des contenus sur le développement de l'enfant sont écrits pour un contexte occidental — écoles bien dotées, clubs extrascolaires à chaque coin de rue. Voici une lecture pensée depuis la Côte d'Ivoire, le Sénégal et la diaspora."
      updated="8 août 2026"
      readingTime="8 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "Les intelligences multiples de Gardner", to: "/guides/intelligences-multiples-gardner" },
        { label: "30 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-afrique.jpg"
        alt="Famille et enfants apprenant ensemble dans une cour de maison en Afrique francophone"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Un contexte différent, pas un contexte en manque</h2>
      <p>
        La plupart des guides sur le développement de l'enfant supposent un accès facile à des
        activités extrascolaires organisées : cours de musique, club de robotique, atelier d'art le
        mercredi après-midi. Ce n'est pas la réalité de la majorité des familles en Côte d'Ivoire, au
        Sénégal, ou plus largement en Afrique francophone — et ce n'est pas non plus, en soi, un
        problème à résoudre à tout prix. C'est un contexte différent, avec ses propres forces, qui
        mérite d'être regardé pour ce qu'il est plutôt que comparé en creux à un modèle occidental.
      </p>

      <h2>Des formes de potentiel qui se développent hors des sentiers classiques</h2>
      <p>
        Un enfant qui grandit dans une famille tenant un petit commerce apprend, souvent sans qu'on
        le lui enseigne formellement, à évaluer la valeur d'un objet, à négocier, à gérer un petit
        stock. C'est très exactement ce que la théorie des intelligences multiples de Gardner range
        sous l'<strong>intelligence entrepreneuriale</strong> — détaillée dans{" "}
        <a href="/guides/intelligences-multiples-gardner">notre guide sur les 9 intelligences</a>.
        Cette compétence ne figure sur aucun bulletin scolaire, mais elle est réelle, transférable, et
        recherchée plus tard dans la vie professionnelle.
      </p>
      <p>
        De la même manière, un enfant qui grandit entouré de cousins, de voisins et d'une famille
        élargie très présente développe souvent une intelligence sociale précoce : il apprend à
        s'ajuster à des adultes différents, à désamorcer des tensions entre enfants d'âges variés, à
        se faire une place dans un groupe nombreux. Ce sont des compétences réelles, simplement
        acquises ailleurs que dans un club structuré.
      </p>

      <h2>Le multilinguisme : une force cognitive, pas un retard à combler</h2>
      <p>
        Beaucoup d'enfants de la région grandissent avec deux, parfois trois langues : une langue
        locale à la maison, le français à l'école, parfois une troisième au contact d'autres
        communautés. L'école a parfois tendance à traiter cela comme une source de confusion. La
        recherche sur le bilinguisme précoce va plutôt dans le sens inverse : les enfants
        multilingues développent tôt une flexibilité cognitive — la capacité à basculer rapidement
        d'un système de règles à un autre — qui reste utile bien au-delà du langage.
      </p>

      <h2>La diaspora : accompagner à distance sans comparer à distance</h2>
      <p>
        Pour les familles de la diaspora, la question se double souvent d'une tension entre
        transmission culturelle et intégration dans le pays d'accueil. Le principe reste le même que
        partout ailleurs : observer ce que l'enfant fait réellement et bien, plutôt que de le mesurer
        à l'aune d'un enfant resté au pays ou d'un enfant du pays d'accueil — les deux comparaisons
        sont également trompeuses, parce qu'aucun des deux ne partage exactement son contexte.
      </p>
      <p>
        C'est aussi pour cette raison que Génizio propose un{" "}
        <a href="/parrainage">parrainage à distance</a> : offrir une saison de défis à un enfant en
        Côte d'Ivoire ou au Sénégal depuis l'étranger, pour rester engagé concrètement dans son
        développement malgré la distance géographique.
      </p>

      <h2>Ce que Génizio a conçu pour ce contexte précis</h2>
      <p>
        Génizio n'a pas été pensé pour un contexte occidental puis adapté après coup. Chaque défi est
        construit pour se réaliser avec du matériel déjà présent à la maison — jamais avec un achat
        obligatoire — précisément parce que l'accès à du matériel spécialisé n'est pas uniforme d'une
        famille à l'autre. Le contact humain passe par WhatsApp plutôt que par un centre d'appel ou un
        chat intégré, parce que c'est déjà l'outil que les familles de la zone utilisent au quotidien.
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

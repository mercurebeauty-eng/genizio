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

const PATH = "/guides/education-enfants-afrique-francophone";

const FAQ = [
  {
    question:
      "Comment révéler le potentiel d'un enfant sans accès à des activités extrascolaires organisées ?",
    answer:
      "L'essentiel du potentiel d'un enfant se révèle avec ce qu'il a déjà sous la main, pas avec un abonnement à un club coûteux. Un enfant qui aide à tenir les comptes d'un petit commerce familial développe un esprit d'initiative et le sens des chiffres. Un enfant qui négocie entre cousins développe une intelligence sociale réelle. Le manque d'activités structurées à l'occidentale n'est pas un manque de potentiel — c'est souvent un potentiel qui se développe ailleurs, moins visible parce qu'il n'a pas de diplôme ou de club associé. Le carnet des petites réussites, l'enquête du quartier et l'heure du conte inversée décrits dans ce guide sont trois méthodes gratuites pour le faire apparaître.",
  },
  {
    question: "Le multilinguisme freine-t-il ou aide-t-il le développement d'un enfant ?",
    answer:
      "La recherche en psychologie du développement est aujourd'hui assez nette sur ce point : grandir avec plusieurs langues (langue locale, français, parfois une troisième) n'est pas un handicap cognitif, et serait plutôt associé à une meilleure flexibilité mentale et à une capacité accrue à basculer d'un cadre de pensée à un autre. Un enfant qui parle deux ou trois langues à la maison ne part pas avec un retard à combler, mais avec une compétence cognitive supplémentaire, rarement reconnue comme telle par l'école.",
  },
  {
    question:
      "Comment aider mon enfant à réussir à l'école quand les classes sont surchargées et qu'il n'y a pas de suivi à la maison ?",
    answer:
      "D'abord, ne pas transformer la pression scolaire en pression familiale : l'enfant n'est pas responsable de la taille de sa classe. Ensuite, viser des rituels courts et réguliers plutôt que de longues heures : 20 minutes de devoirs à heure fixe, avec une question posée à l'enfant (« qu'as-tu appris aujourd'hui ? ») qui l'oblige à reformuler. Si l'école coranique ou religieuse occupe une partie de la journée, c'est un atout de discipline et de mémorisation — pas un concurrent des devoirs. Et ce que l'école ne peut pas donner, la maison peut le compenser autrement : le carnet des petites réussites montre à l'enfant qu'il progresse, même quand les notes ne le disent pas.",
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
      title: "Développer les talents de son enfant en Afrique (sans argent)",
      description:
        "3 méthodes gratuites pour révéler les talents de votre enfant avec les moyens du bord : carnet des réussites, enquête du quartier, heure du conte inversée. Côte d'Ivoire, Sénégal, diaspora.",
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
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline:
            "Comment développer les talents de son enfant en Afrique avec les moyens du bord",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-afrique.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Éducation en Afrique francophone" },
            { "@type": "Thing", name: "Développement du potentiel de l'enfant" },
            { "@type": "Thing", name: "Activités sans argent" },
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
      title="Comment développer les talents de son enfant en Afrique avec les moyens du bord"
      intro="Pas de club de robotique, pas d'atelier d'art le mercredi, des classes chargées et peu de suivi : pourtant, votre enfant développe des talents tous les jours — au marché, entre cousins, dans la cour, à l'école coranique. Voici 3 méthodes gratuites, avec ce que vous avez déjà à la maison, pour les faire apparaître et les faire grandir."
      updated="14 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Les intelligences multiples de Gardner",
          to: "/guides/intelligences-multiples-gardner",
        },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-afrique.jpg"
        alt="Famille et enfants apprenant ensemble dans une cour de maison en Afrique francophone"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Un contexte différent, pas un contexte en manque</h2>
      <p>
        La plupart des guides sur le développement de l'enfant supposent un accès facile à des
        activités extrascolaires organisées : cours de musique, club de robotique, atelier d'art le
        mercredi après-midi. Ce n'est pas la réalité de la majorité des familles en Côte d'Ivoire,
        au Sénégal, ou plus largement en Afrique francophone — et ce n'est pas non plus, en soi, un
        problème à résoudre à tout prix. C'est un contexte différent, avec ses propres forces : la
        famille élargie, le petit commerce, les responsabilités confiées tôt, le multilinguisme.
        L'objectif n'est pas de copier un modèle occidental, mais de{" "}
        <strong>faire apparaître ce qui se développe déjà sous vos yeux</strong>.
      </p>

      <h2>Méthode 1 — Le carnet des petites réussites</h2>
      <p>
        Prenez un cahier — même un vieux cahier de classe en reste — et notez, chaque semaine, une
        réussite concrète de votre enfant. Pas une note : un fait.{" "}
        <em>« Aujourd'hui, il a calculé la monnaie au marché sans se tromper »</em>,{" "}
        <em>« elle a aidé sa petite sœur à s'habiller sans qu'on le lui demande »</em>,{" "}
        <em>« il a récité sa sourate sans hésiter »</em>. Lisez le carnet ensemble un soir par
        semaine.
      </p>
      <p>
        <strong>Pourquoi ça marche :</strong> dans des classes surchargées, un enfant n'entend
        parler de lui qu'à travers les notes et les reproches. Le carnet lui montre qu'il progresse
        ailleurs — et il crée le réflexe d'observation chez le parent : on finit par voir ce que
        l'enfant fait bien, au lieu de ne voir que ce qu'il rate. C'est aussi la base d'une
        conversation avec le maître ou la maîtresse : vous arrivez avec des faits, pas avec des
        plaintes.
      </p>

      <h2>Méthode 2 — L'enquête du quartier</h2>
      <p>
        Chaque semaine, confiez à votre enfant une « mission d'enquête » sur le quartier, à préparer
        puis à raconter : <em>« Demande au vendeur de fruits comment il choisit ses mangues »</em>,{" "}
        <em>« Compte les métiers qu'on croise entre la maison et l'école »</em>,{" "}
        <em>« Demande à tonton ce qu'il faisait comme travaux à ton âge »</em>. L'enfant doit
        ensuite vous faire son rapport — à l'oral, ou dans son carnet.
      </p>
      <p>
        <strong>Pourquoi ça marche :</strong> l'enquête transforme le quartier en terrain
        d'apprentissage. Elle développe la curiosité, l'observation, le vocabulaire et l'aisance à
        parler avec des adultes — des compétences que l'école ne mesure pas, mais qui servent toute
        la vie. Et elle valorise les savoirs locaux : l'enfant découvre que les métiers et les
        savoir-faire autour de lui valent la peine d'être compris.
      </p>

      <h2>Méthode 3 — L'heure du conte inversée</h2>
      <p>
        Dans nos cultures, l'adulte raconte et l'enfant écoute. Une fois par semaine, inversez les
        rôles : c'est l'enfant qui raconte — une histoire qu'il a inventée, ce qu'il a appris en
        classe, un événement de sa journée — et l'adulte écoute sans corriger, puis pose des
        questions. Dix minutes suffisent, au moment du repas ou avant le coucher.
      </p>
      <p>
        <strong>Pourquoi ça marche :</strong> raconter oblige l'enfant à organiser ses idées, à
        choisir ses mots, à tenir l'attention d'un auditeur : c'est de la prise de parole en
        conditions réelles. Les enfants qui racontent régulièrement à la maison arrivent plus à
        l'aise devant un exposé ou une récitation. Et vous, parent, vous apprenez à écouter — ce qui
        change la qualité de toute la relation.
      </p>

      <h2>Le multilinguisme : une force cognitive, pas un retard à combler</h2>
      <p>
        Beaucoup d'enfants de la région grandissent avec deux, parfois trois langues : une langue
        locale à la maison, le français à l'école, parfois une troisième au contact d'autres
        communautés. L'école a parfois tendance à traiter cela comme une source de confusion. La
        recherche sur le bilinguisme précoce va plutôt dans le sens inverse : les enfants
        multilingues développent tôt une flexibilité cognitive — la capacité à basculer rapidement
        d'un système de règles à un autre — qui reste utile bien au-delà du langage. Ne freinez pas
        la langue de la maison pour « aider » le français de l'école : les deux se renforcent.
      </p>

      <h2>Réussir à l'école quand la classe est surchargée</h2>
      <p>
        La réalité de beaucoup de classes en Afrique francophone : 60, 80, parfois 100 élèves pour
        un enseignant. Dans ce contexte, l'enfant qui réussit n'est pas celui qui est le plus « doué
        », c'est souvent celui qui a <strong>un rituel de travail à la maison</strong> : même heure,
        même table, 20 à 30 minutes, chaque soir. Ajoutez la question rituelle — « qu'as-tu appris
        aujourd'hui ? » — qui oblige l'enfant à reformuler sa leçon : reformuler, c'est comprendre.
      </p>
      <p>
        Et si l'enfant fréquente une école coranique ou religieuse en plus de l'école publique,
        considérez cela comme un atout, pas une charge : la mémorisation, la discipline et le
        respect des horaires qu'elle exerce se transfèrent aux devoirs. La pression scolaire existe
        ; elle ne doit pas devenir de la pression familiale. Le carnet des réussites est là pour
        rappeler à tous — et d'abord à l'enfant — qu'il vaut plus que ses notes.
      </p>

      <h2>La diaspora : accompagner à distance sans comparer à distance</h2>
      <p>
        Pour les familles de la diaspora, la question se double souvent d'une tension entre
        transmission culturelle et intégration dans le pays d'accueil. Le principe reste le même que
        partout ailleurs : observer ce que l'enfant fait réellement et bien, plutôt que de le
        mesurer à l'aune d'un enfant resté au pays ou d'un enfant du pays d'accueil — les deux
        comparaisons sont également trompeuses, parce qu'aucun des deux ne partage exactement son
        contexte.
      </p>
      <p>
        C'est aussi pour cette raison que Génizio propose un{" "}
        <a href="/parrainage">parrainage à distance</a> : offrir une saison de défis à un enfant en
        Côte d'Ivoire ou au Sénégal depuis l'étranger, pour rester engagé concrètement dans son
        développement malgré la distance géographique.
      </p>

      <h2>Ce que Génizio a conçu pour ce contexte précis</h2>
      <p>
        Génizio n'a pas été pensé pour un contexte occidental puis adapté après coup. Chaque défi
        est construit pour se réaliser avec du matériel déjà présent à la maison — jamais avec un
        achat obligatoire — précisément parce que l'accès à du matériel spécialisé n'est pas
        uniforme d'une famille à l'autre. Le contact humain passe par WhatsApp plutôt que par un
        centre d'appel ou un chat intégré, parce que c'est déjà l'outil que les familles de la zone
        utilisent au quotidien.
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

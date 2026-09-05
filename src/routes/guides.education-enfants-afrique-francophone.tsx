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
      title: "Développer les talents de son enfant en Afrique et Diaspora",
      description:
        "3 méthodes gratuites pour révéler le potentiel et les talents de votre enfant en Afrique et dans la diaspora, avec les moyens du bord et sans budget.",
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
            { name: "Éducation Afrique francophone & Diaspora", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline:
            "Comment développer les talents de son enfant en Afrique avec les moyens du bord",
          description:
            "Méthodes concrètes et gratuites pour révéler les intelligences et les talents des enfants en Afrique francophone et dans la diaspora avec les ressources locales.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-afrique.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-26",
          about: [
            { "@type": "Thing", name: "Éducation en Afrique francophone" },
            { "@type": "Thing", name: "Développement du potentiel de l'enfant" },
            { "@type": "Thing", name: "Activités sans argent" },
            { "@type": "Thing", name: "Diaspora africaine" },
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
      eyebrow="Afrique & Diaspora"
      title="Comment développer les talents de son enfant en Afrique avec les moyens du bord"
      intro="Pas besoin de clubs coûteux ni de matériel sophistiqué : votre enfant développe des compétences d'exception tous les jours — au marché, entre cousins, dans la cour et à l'école. Voici 3 méthodes gratuites et éprouvées, avec les moyens du bord, pour révéler ses talents uniques."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        { label: "18 activités manuelles récup", to: "/guides/activites-manuelles-enfant" },
        { label: "24 activités éducatives sans écran", to: "/guides/activites-educatives-enfant" },
        { label: "Réussite scolaire sans stress", to: "/guides/reussite-scolaire-aider-enfant" },
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

      <h2>Un contexte riche de forces propres</h2>
      <p>
        La plupart des guides éducatifs classiques supposent l'accès à des infrastructures
        onéreuses. La réalité en Côte d'Ivoire, au Sénégal, au Cameroun ou dans la diaspora possède
        ses propres richesses : la solidarité communautaire, le commerce de proximité, la
        débrouillardise pratique et le bilinguisme.
      </p>
      <p>
        Ces expériences nourrissent directement les{" "}
        <a href="/guides/intelligences-multiples-gardner">9 formes d'intelligence de l'enfant</a>{" "}
        (intelligence interpersonnelle, logico-mathématique et naturaliste).
      </p>

      <h2>Méthode 1 — Le carnet des petites réussites</h2>
      <p>
        Prenez un cahier et notez chaque semaine une prouesse concrète :{" "}
        <em>« A calculé la monnaie au marché »</em>, <em>« A réparé son jouet avec du fil »</em>,{" "}
        <em>« A raconté une histoire avec éloquence »</em>.
      </p>
      <p>
        Ce carnet valorise l'effort et responsabilise l'enfant en appliquant les principes de la{" "}
        <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>.
      </p>

      <h2>Méthode 2 — L'enquête du quartier et les défis pratiques</h2>
      <p>
        Confiez-lui des missions d'observation dans son environnement : interviewer un artisan,
        classifier 5 types de plantes du quartier ou construire un objet à partir de notre sélection
        d'
        <a href="/guides/activites-manuelles-enfant">activités manuelles et de bricolage récup</a>.
      </p>
      <p>
        Cette démarche développe l'esprit d'initiative et l'
        <a href="/guides/autonomie-responsabilite-maison">autonomie au quotidien</a>.
      </p>

      <h2>Méthode 3 — L'heure du conte inversée</h2>
      <p>
        Une fois par semaine, inversez la tradition : demandez à votre enfant de raconter son conte
        ou de vous expliquer ce qu'il a appris. Cet exercice d'éloquence développe sa confiance et
        stimule sa curiosité (explorez aussi nos{" "}
        <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a>).
      </p>

      <h2>Réussir à l'école malgré les classes surchargées</h2>
      <p>
        Dans une classe nombreuse (60 à 100 élèves), le suivi personnalisé se fait à la maison par
        des rituels courts de 20 minutes et une écoute active. Consultez notre méthodologie complète
        pour{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">
          aider son enfant à réussir à l'école sans stress
        </a>
        .
      </p>

      <h2>La diaspora : accompagner et transmettre</h2>
      <p>
        Pour les familles de la diaspora, l'équilibre entre racines culturelles et exigence scolaire
        nécessite un regard bienveillant sur les forces réelles de l'enfant (lisez nos repères pour{" "}
        <a href="/guides/potentiel-haut-potentiel-enfant">
          détecter le haut potentiel chez l'enfant
        </a>
        ).
      </p>
      <p>
        Génizio permet également aux familles de la diaspora de parrainer à distance le parcours
        d'un enfant au pays via notre programme de parrainage solidaire.
      </p>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio a été pensé dès le départ pour fonctionner avec les réalités de terrain : des défis
        stimulants réalisables avec des matériaux du quotidien, sans obligation d'achat, et un suivi
        interactif via WhatsApp.
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

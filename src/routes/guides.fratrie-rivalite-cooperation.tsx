import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/fratrie-rivalite-cooperation";

const FAQ = [
  {
    question: "Pourquoi les frères et sœurs se disputent-ils si souvent pour des détails ?",
    answer:
      "La rivalité entre frères et sœurs est une quête d'attention, de territoire et d'affirmation d'identité au sein de la famille. Lorsque chaque enfant a l'impression d'être comparé ou d'évoluer dans le même registre, la compétition s'intensifie.",
  },
  {
    question: "Comment arrêter les comparaisons involontaires entre enfants ?",
    answer:
      "Évitez les formulations du type 'Prends exemple sur ton frère'. Célébrez chaque enfant dans son profil d'intelligences propre. Quand chacun se sait reconnu dans sa singularité, l'envie d'écraser l'autre s'estompe naturellement.",
  },
  {
    question: "Que faire lors d'une dispute pour que les enfants apprennent à négocier ?",
    answer:
      "Ne jouez pas le rôle du juge ou du policier qui désigne le coupable. Donnez-leur pour règle : 'Trouvez ensemble une solution où chacun gagne quelque chose' et laissez-les rédiger un accord avant de valider la reprise du jeu.",
  },
];

export const Route = createFileRoute("/guides/fratrie-rivalite-cooperation")({
  head: () => {
    const meta = pageMeta({
      title: "Rivalité frères et sœurs : transformer les disputes en coopération (5-12 ans)",
      description:
        "Comment apaiser les tensions dans la fratrie et développer l'entraide grâce à des projets collaboratifs basés sur la complémentarité des talents.",
      path: PATH,
      image: "/guides/og-fratrie.jpg",
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
            { name: "Fratrie & Coopération", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Rivalité dans la fratrie : transformer les disputes en projets de coopération",
            description:
              "Méthode pour développer l'intelligence interpersonnelle et l'esprit d'équipe chez les frères et sœurs.",
            path: PATH,
            image: "/guides/og-fratrie.jpg",
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
      eyebrow="Fratrie & Coopération"
      title="Rivalité dans la fratrie : transformer les disputes en projets de coopération"
      intro="Les conflits entre frères et sœurs fatiguent énormément les parents. Pourtant, la fratrie est le tout premier laboratoire d'intelligence sociale. En remplaçant la compétition par des projets coopératifs où les talents de chacun se complètent, on transforme les disputes en esprit d'équipe."
      updated="8 août 2026"
      readingTime="5 min"
    >
      <img
        src="/guides/og-fratrie.jpg"
        alt="Frère et sœur collaborant joyeusement sur un projet créatif commun"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi la comparaison est le pire ennemi de la paix familiale</h2>
      <p>
        Dans beaucoup de familles, les enfants sont comparés sans qu'on s'en rende compte : l'un est vu comme "l'intellectuel", l'autre comme "le créatif" ou "le turbulent". Cette étiquette pousse les enfants à s'affronter pour obtenir l'exclusivité de l'attention parentale.
      </p>
      <p>
        Grâce aux 9 intelligences de Howard Gardner, on apprend à montrer à l'enfant que **chaque être humain possède une combinaison unique de forces**. L'aîné a peut-être une intelligence logique plus avancée, tandis que le cadet fait preuve d'une intelligence kinezthésique ou sociale remarquable. Ils ne sont pas rivaux : ils sont **coéquipiers**.
      </p>

      <h2>3 défis d'équipe à réaliser à 2 ou plus</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">1. La mission 'Escape Game de la Maison'</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à la fratrie une mission commune : résoudre une énigme familiale en 20 minutes pour débloquer le goûté. L'un doit calculer un code chiffré (logique), l'autre doit retrouver un objet caché dans un parcours d'obstacles (spatial/corporel).
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. La réalisation du Journal de Famille</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Confiez à l'un le rôle d'illustrateur/photographe et à l'autre le rôle de rédacteur des événements de la semaine. Chacun brille dans sa spécialité sans faire de l'ombre à son frère ou sa sœur.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. Le spectacle / stand de vente commun</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Invitez-les à organiser ensemble une petite présentation pour la famille. L'objectif commun les oblige à négocier les rôles et à partager le succès final.
        </p>
      </div>

      <h2>3 réflexes parentaux pour installer la paix durable</h2>
      <ul>
        <li><strong>Valoriser la coopération :</strong> Récompensez l'entraide spontanée plutôt que le travail individuel isolé.</li>
        <li><strong>Créer des moments individuels :</strong> Accordez 15 minutes d'attention exclusive à chaque enfant de temps en temps.</li>
        <li><strong>Responsabiliser les aînés sans les écraser :</strong> Donner un rôle de mentor bienveillant plutôt qu'un rôle d'autorité policière.</li>
      </ul>

      <h2>Foire aux questions sur la gestion de la fratrie</h2>
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

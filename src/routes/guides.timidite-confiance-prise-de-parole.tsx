import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/timidite-confiance-prise-de-parole";

const FAQ = [
  {
    question: "Comment savoir si mon enfant est timide ou simplement d'intelligence intrapersonnelle ?",
    answer:
      "La réserve n'est pas une faiblesse. Un enfant doté d'une forte intelligence intrapersonnelle préfère analyser, observer et réfléchir avant de s'exprimer. La timidité ne devient un frein que si l'enfant souffre de ne pas réussir à formuler ses besoins ou d'interagir avec les autres.",
  },
  {
    question: "Doit-on forcer un enfant timide à dire bonjour ou à parler en public ?",
    answer:
      "Forcer un enfant bloque ses facultés d'expression et renforce le sentiment de honte. Il est préférable de lui donner un rôle actif intermédiaire (ex. distribuer des verres, montrer un dessin) qui facilite le contact social sans la pression du discours direct.",
  },
  {
    question: "Combien de temps faut-il pour qu'un enfant prenne confiance en lui à l'oral ?",
    answer:
      "La confiance s'acquiert par petits succès répétés dans un cadre sécurisant. En 3 à 4 semaines de petits défis d'expression à la maison, les enfants développent une meilleure aisance verbale et apprennent à porter leur voix sans crainte.",
  },
];

export const Route = createFileRoute("/guides/timidite-confiance-prise-de-parole")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant timide : 4 activités pour libérer la parole (6-12 ans)",
      description:
        "Comment aider un enfant réservé à prendre confiance en lui et s'exprimer avec aisance sans le forcer ni le mettre mal à l'aise.",
      path: PATH,
      image: "/guides/og-timidite.jpg",
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
            { name: "Timidité & Confiance", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Enfant timide ou réservé : 4 activités pour développer l'assurance orale",
            description:
              "Méthodes douces et activités concrètes pour stimuler la confiance et la prise de parole chez l'enfant.",
            path: PATH,
            image: "/guides/og-timidite.jpg",
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
      eyebrow="Confiance & Expression"
      title="Enfant timide ou réservé : 4 activités pour développer son assurance sans le forcer"
      intro="La timidité chez l'enfant est souvent perçue comme un obstacle à corriger. En réalité, un enfant réservé possède généralement un sens aigu de l'observation et une réflexion profonde. L'objectif n'est pas de le transformer en extraverti, mais de lui donner les clés pour porter sa voix quand il le souhaite."
      updated="8 août 2026"
      readingTime="5 min"
    >
      <img
        src="/guides/og-timidite.jpg"
        alt="Jeune fille s'exprimant joyeusement avec assurance devant sa famille"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Re-framing : La réserve est un super-pouvoir d'analyse</h2>
      <p>
        Dans la théorie des intelligences multiples de Howard Gardner, l'intelligence <strong>intrapersonnelle</strong> correspond à la capacité de bien se connaître, d'analyser ses propres émotions et d'observer son environnement. Les enfants d'apparence "timide" sont très souvent des observateurs hors-pair.
      </p>
      <p>
        Au lieu de lui répéter <em>"Ne sois pas timide"</em> (ce qui augmente l'anxiété sociale), valorisez son calme et donnez-lui des outils ludiques pour transmettre sa pensée.
      </p>

      <h2>4 exercices ludiques à réaliser à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">1. Le Journaliste de la Maison (Role-Playing)</h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Armé d'un faux micro (un stylo ou une cuillère en bois), l'enfant a pour mission d'interviewer un membre de la famille sur son souvenir d'enfance le plus drôle. Le rôle de journaliste lui donne une fonction protectrice : ce n'est pas lui qui s'expose, c'est lui qui pose les questions.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">2. Le Discours de 1 Minute (La Boîte à Sujets)</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Tirez au sort un objet du quotidien (une chaussure, une banane, un cahier). L'enfant a 1 minute pour convaincre la famille que cet objet est magique. Le côté absurde du sujet désamorce la peur d'être jugé.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">3. Le Théâtre d'Ombres ou de Marionnettes</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          Derrière un drap ou une boîte en carton découpée, l'enfant raconte une histoire courte. La marionnette sert d'écran protecteur : l'enfant s'exprime avec puissance sans subir le regard direct des auditeurs.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">4. L'Hôte d'Accueil de la Famille</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Lorsqu'un invité ou un proche arrive à la maison, confiez à votre enfant une responsabilité bien définie : proposer un verre d'eau ou installer le visiteur. Une tâche concrète réduit la gêne des premiers instants.
        </p>
      </div>

      <h2>Comment encourager les progrès sans sur-réagir</h2>
      <ul>
        <li><strong>Féliciter la tentative, pas le résultat :</strong> <em>"J'ai aimé la clarté de ton explication"</em> plutôt que <em>"Tu vois, ce n'était pas dur !"</em></li>
        <li><strong>Ne jamais parler à sa place :</strong> Laissez-lui quelques secondes de silence pour rassembler ses idées avant de répondre pour lui.</li>
        <li><strong>Valoriser ses réalisations tangibles :</strong> Son portfolio de défis est la meilleure preuve de son talent.</li>
      </ul>

      <h2>Foire aux questions sur la timidité chez l'enfant</h2>
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

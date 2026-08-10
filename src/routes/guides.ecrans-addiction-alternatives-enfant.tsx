import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/ecrans-addiction-alternatives-enfant";

const FAQ = [
  {
    question: "Comment réduire le temps d'écran d'un enfant sans déclencher une crise ?",
    answer:
      "La méthode la plus efficace ne consiste pas à interdire ou confisquer brutalement l'écran, mais à remplacer la stimulation passive par une expérience concrète plus gratifiante (défi manuel, création, enquête). Quand l'enfant fabrique un objet réel ou réussit un défi en famille, le cerveau sécrète une dopamine d'accomplissement bien plus satisfaisante que la dopamine virtuelle des jeux ou des vidéos.",
  },
  {
    question: "À partir de quel âge la gestion des écrans devient-elle prioritaire ?",
    answer:
      "Dès 5 à 6 ans, l'exposition répétée aux écrans peut réduire le temps d'exploration motrice et d'interaction verbale. Entre 7 et 12 ans, l'enjeu principal est de préserver la capacité de concentration prolongée et l'envie de créer par soi-même plutôt que d'être simple spectateur.",
  },
  {
    question: "Que faire si mon enfant dit qu'il s'ennuie sans écran ?",
    answer:
      "L'ennui est le déclencheur naturel de la créativité. Au lieu de lui fournir une solution immédiate ou un écran, proposez-lui une amorce d'investigation : 'Essaie d'extraire la couleur d'une feuille d'hibiscus' ou 'Fabrique un piège à bille avec du carton'. Dès que les mains sont en action, l'envie d'écran s'efface.",
  },
];

export const Route = createFileRoute("/guides/ecrans-addiction-alternatives-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Réduire les écrans sans crise : 3 alternatives (6-12 ans)",
      description:
        "Comment canaliser l'attrait des écrans chez l'enfant en transformant le jeu virtuel en défis de création réelle à la maison.",
      path: PATH,
      image: "/guides/og-ecrans.jpg",
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
            { name: "Gestion des Écrans", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Réduire les écrans chez l'enfant sans crise : la méthode des défis réels",
            description:
              "Guide complet pour remplacer la fascination virtuelle par des projets d'action concrets fondés sur les intelligences multiples.",
            path: PATH,
            image: "/guides/og-ecrans.jpg",
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
      eyebrow="Écrans & Créativité"
      title="Réduire les écrans sans crise : transformer la fascination virtuelle en action réelle"
      intro="La crise au moment d'éteindre la télévision ou la tablette n'est pas un refus d'autorité : c'est un choc dopaminergique. Pour sevrer un enfant sans conflit répétitif, il faut lui proposer une alternative qui stimule le même désir d'accomplissement, mais dans le monde réel."
      updated="8 août 2026"
      readingTime="6 min"
      related={[
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        { label: "L'IA pour aider son enfant à apprendre", to: "/guides/ia-apprentissage-enfant" },
        { label: "Activités manuelles (4-12 ans)", to: "/guides/activites-manuelles-enfant" },
      ]}
    >
      <img
        src="/guides/og-ecrans.jpg"
        alt="Enfant africain construisant une maquette en carton à la maison sans écran"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <MedicalDisclaimer>
        <strong>Note éducative :</strong> Ce guide propose des leviers pédagogiques et d'action créative pour accompagner la parentalité au quotidien. En cas de troubles sévères du comportement ou d'addiction numérique handicapante, consultez un pédiatre ou un spécialiste.
      </MedicalDisclaimer>

      <h2>Pourquoi le simple 'Éteins ta tablette !' ne fonctionne jamais</h2>
      <p>
        Les applications mobiles et les jeux vidéo sont conçus avec des boucles de récompense très courtes : chaque niveau réussi ou vidéo suivante libère une dose instantanée de satisfaction. Quand vous éteignez brutalement l'appareil, l'esprit de l'enfant passe brusquement d'un état de sur-stimulation à un vide total.
      </p>
      <p>
        Le secret ne réside pas dans la privation punitive, mais dans la <strong>transition par le faire</strong>. Si vous proposez à votre enfant un défi où il devient le héros créateur dans le monde physique, son attention bascule spontanément.
      </p>

      <h2>Les 3 alternatives concrètes à tester ce soir</h2>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">1. Le défi du 'Minecraft Réel' (Intelligence Spatiale & Manuel)</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Donnez à votre enfant des cartons d'emballage, des ciseaux et du ruban adhésif. Donnez-lui pour mission d'architecte : <em>"Construis le plan de ta chambre idéale en miniature avec 3 meubles fonctionnels."</em> Le plaisir de la construction en 3D remplace directement les blocs virtuels.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-sky-50 p-5 border border-sky-200">
        <h3 className="font-bold text-sky-950 text-base mb-2">2. Le Reportage d'Enquêteur (Intelligence Verbale & Sociale)</h3>
        <p className="text-sm text-sky-900 leading-relaxed">
          S'il aime regarder des vidéos YouTube de démonstration, confiez-lui le téléphone <strong>uniquement en mode appareil photo</strong> pour une mission de 15 minutes : réaliser un reportage photo légendé sur un métier du quartier ou sur la préparation d'un plat familial.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. Le Laboratoire Secret de la Cuisine (Intelligence Logique)</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Proposez une expérience de chimie culinaire : extraire le jus d'un citron, observer la réaction avec du bicarbonate de soude, mesurer les volumes et créer une limonade maison aromatisée. L'enfant passe d'un état de consommateur passif à un état de chercheur actif.
        </p>
      </div>

      <h2>Comment fixer un cadre clair sans négociation sans fin</h2>
      <ul>
        <li><strong>Instaurer le contrat visuel :</strong> Utilisez un sablier ou une alarme visuelle plutôt qu'un rappel oral répété toutes les 5 minutes.</li>
        <li><strong>Prévenir avant de couper :</strong> <em>"Il te reste 5 minutes pour terminer ton niveau, puis nous passons au défi bricolage."</em></li>
        <li><strong>Valoriser le résultat réel :</strong> Accordez une place d'honneur aux réalisations physiques de votre enfant dans le salon ou sur son portfolio.</li>
      </ul>

      <h2>Foire aux questions sur la gestion des écrans</h2>
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

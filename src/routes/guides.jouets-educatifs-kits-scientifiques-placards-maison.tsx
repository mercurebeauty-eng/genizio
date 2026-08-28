import { createFileRoute } from "@tanstack/react-router";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
} from "@/lib/seo";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, FlaskConical, Recycle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/jouets-educatifs-kits-scientifiques-placards-maison";

const FAQ = [
  {
    question: "Les kits scientifiques et jeux éducatifs du commerce sont-ils inutiles ?",
    answer:
      "Ils ne sont pas inutiles, mais ils sont souvent limités : ils fonctionnent comme une 'recette pré-mâchée' où l'enfant suit un mode d'emploi sans réelle liberté de concevoir. Une fois l'expérience terminée, la boîte finit au placard. Les matériaux ouverts (carton, plastique récupéré, élastiques, vinaigre) obligent l'enfant à réfléchir par lui-même, à tester, à rater et à recommencer.",
  },
  {
    question: "Quelles expériences scientifiques simples peut-on faire sans rien acheter ?",
    answer:
      "Le volcan au bicarbonate et vinaigre (réaction acido-basique), le filtre à eau maison avec des graviers, du sable et du charbon (filtration physique), le pont en carton capable de supporter 2 kg (résistance des structures), ou la catapulte en bâtonnets et élastiques (énergie potentielle et cinétique).",
  },
  {
    question: "Comment encourager un enfant qui n'a pas l'habitude de bricoler ?",
    answer:
      "Commencez par un défi court avec un objectif très drôle ou spectaculaire (ex : 'Faire rouler une bille du haut de la table jusqu'au salon sans qu'elle touche le sol'). Participez au début pour amorcer la dynamique, puis laissez-le trouver les solutions techniques.",
  },
];

export const Route = createFileRoute("/guides/jouets-educatifs-kits-scientifiques-placards-maison")({
  head: () => {
    const meta = pageMeta({
      title: "Kits scientifiques vs Maison : Éveiller l'enfant au réel",
      description:
        "Découvrez pourquoi les objets de votre cuisine développent mieux l'ingéniosité scientifique de votre enfant que les kits éducatifs coûteux.",
      path: PATH,
      image: "/guides/og-jouets-placards.jpg",
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
            { name: "Sciences & Expériences maison", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Jouets éducatifs et kits scientifiques : pourquoi ce que vous avez dans vos placards développe mieux l'ingéniosité",
            description:
              "Comment les objets du quotidien, sans notice ni plastique, surpassent les jouets dits 'éducatifs' pour développer la résolution de problèmes chez l'enfant.",
            path: PATH,
            image: "/guides/og-jouets-placards.jpg",
            datePublished: "2026-08-24",
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
      eyebrow="Sciences & Bricolage"
      title="Jouets éducatifs et kits scientifiques : pourquoi ce que vous avez dans vos placards développe mieux l'ingéniosité"
      intro="Chaque anniversaire apporte la tentation d'acheter une grosse boîte de 'kit scientifique' ou un 'jouet éducatif' onéreux. Pourtant, ces jeux finissent souvent délaissés après 30 minutes : ils demandent d'exécuter une notice fermée au lieu d'inventer. Voici pourquoi les matériaux bruts de votre cuisine et de vos placards forgent de bien meilleurs esprits scientifiques."
      updated="27 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "15 activités manuelles récup",
          to: "/guides/activites-manuelles-enfant",
        },
        {
          label: "24 activités sans écran",
          to: "/guides/activites-educatives-enfant",
        },
        {
          label: "Pratique avant théorie avec l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        {
          label: "Éveil culturel et créativité",
          to: "/guides/quelle-librairie-choisir-lieux-creativite-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-jouets-placards.jpg"
        alt="Deux enfants africains riant aux éclats en construisant un circuit de billes et une station de filtration avec des cartons et bouteilles"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Le piège des « kits fermés » versus le génie des « matériaux ouverts »</h2>
      <p>
        Dans un kit commercial, tout est prédécoupé et standardisé. Si l'enfant modifie une étape, l'expérience échoue. Il apprend à exécuter, pas à chercher.
      </p>
      <p>
        À l'inverse, face à du carton, de la ficelle ou des bouteilles recyclées (comme dans nos{" "}
        <a href="/guides/activites-manuelles-enfant">activités manuelles et bricolages maison</a>) :
      </p>
      <ul>
        <li>Il n'y a pas de mauvaise réponse prédéfinie.</li>
        <li>L'enfant teste les lois de la gravité, adapte les découpes et muscle ses{" "}
        <a href="/guides/intelligences-multiples-gardner">intelligences spatiale et kinesthésique</a>.</li>
        <li>Chaque réussite procure une fierté authentique issue de son propre raisonnement.</li>
      </ul>

      <h2>2. Les 4 grands défis scientifiques des placards</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Recycle className="h-5 w-5 text-brand" />
            1. Le Défi de l'Ingénieur : Le Pont Poids-Lourd
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : 2 feuilles de carton et du scotch. Mission : Construire un pont suspendu capable de soutenir une bouteille d'eau d'un litre.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand" />
            2. Le Défi du Chimiste : La Lampe à Lave Maison
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Bouteille, eau, huile et comprimé effervescent. Découverte de la densité des liquides et des réactions acido-basiques.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Package className="h-5 w-5 text-brand" />
            3. Le Défi du Physicien : Le Sauvetage de l'Œuf
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Un œuf cru, pailles, sacs plastiques. Mission : Concevoir un parachute amortisseur pour un lâcher de 2 mètres.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            4. Le Défi Hydraulique : La Station de Filtration
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Bouteille coupée, coton, sable et graviers. Observation de la porosité et de la décantation physique.
          </p>
        </div>
      </div>

      <h2>3. Ce que cela change dans son rapport à l'école</h2>
      <p>
        Un enfant qui a construit un pont en carton comprend intuitivement les forces physiques et la géométrie des triangles (découvrez pourquoi{" "}
        <a href="/guides/pratique-avant-theorie-apprentissage-ia">la pratique doit toujours précéder la théorie à l'ère de l'IA</a>).
      </p>
      <p>
        Pour stimuler la curiosité de votre enfant au quotidien, explorez également nos{" "}
        <a href="/guides/activites-educatives-enfant">24 activités éducatives à faire à la maison</a> ainsi que nos conseils d'
        <a href="/guides/quelle-librairie-choisir-lieux-creativite-enfant">éveil culturel et choix de librairies</a>.
      </p>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Transformez votre salon en atelier avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio fournit aux familles des centaines de missions scientifiques et créatives faisables avec les objets du quotidien, guidées pas à pas par <strong>Naya</strong>.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all">
            <Link to="/auth">
              Lancer une mission scientifique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all">
            <Link to="/guides/activites-manuelles-enfant">
              Explorer les activités manuelles
            </Link>
          </Button>
        </div>
      </div>

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
export default Route;

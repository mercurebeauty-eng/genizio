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
      title: "Jeux éducatifs et kits scientifiques : pourquoi vos placards font 10 fois mieux",
      description:
        "Avant d'acheter un kit scientifique ou un jouet éducatif coûteux, découvrez comment les matériaux de la maison développent une vraie ingéniosité.",
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
            { name: "Jeux éducatifs & Sciences maison", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Jouets éducatifs et kits scientifiques : pourquoi ce que vous avez dans vos placards développe mieux l'ingéniosité",
            description:
              "Pourquoi les jouets éducatifs rigides brident l'imagination et comment 4 expériences scientifiques maison gratuites développent le vrai esprit d'inventeur.",
            path: PATH,
            image: "/guides/og-jouets-placards.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-08-24",
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
      intro="Chaque anniversaire ou fête apporte la même tentation : acheter une grosse boîte de 'kit scientifique' ou un 'jouet éducatif intelligent' à 25 000 FCFA ou 40 €. Pourtant, la plupart de ces jeux finissent délaissés après 30 minutes d'utilisation. La raison est simple : ils demandent d'exécuter une notice pré-écrite au lieu d'inventer. Voici pourquoi les matériaux bruts de votre maison forgent les meilleurs esprits scientifiques."
      updated="24 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "Activités manuelles pour enfants (15 idées)",
          to: "/guides/activites-manuelles-enfant",
        },
        {
          label: "24 activités éducatives sans écran",
          to: "/guides/activites-educatives-enfant",
        },
        {
          label: "Pratique avant théorie à l'ère de l'IA",
          to: "/guides/pratique-avant-theorie-apprentissage-ia",
        },
        {
          label: "Quelle librairie choisir pour son enfant",
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
        Dans un kit commercial, tout est prédécoupé, calibré et standardisé. Si l'enfant essaie de modifier une étape, l'expérience ne fonctionne plus. Il apprend donc à obéir, pas à chercher.
      </p>
      <p>
        À l'inverse, face à une boîte en carton, une ficelle et une bouteille vide (ce que les pédagogues appellent des <em>loose parts</em> ou matériaux ouverts) :
      </p>
      <ul>
        <li>Il n'y a pas de mauvaise réponse prédéfinie.</li>
        <li>L'enfant doit imaginer la forme, tester les frottements, adapter les découpes et résoudre les imprévus.</li>
        <li>Chaque réussite procure une fierté 10 fois plus intense parce qu'elle provient de son propre raisonnement.</li>
      </ul>

      <h2>2. Les 4 grands défis scientifiques des placards</h2>

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Recycle className="h-5 w-5 text-brand" />
            1. Le Défi de l'Ingénieur : Le Pont Poids-Lourd
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : 2 feuilles de papier ou carton et du scotch. Mission : Construire un pont suspendu entre deux chaises capable de soutenir une bouteille d'eau pleine d'un litre.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand" />
            2. Le Défi du Chimiste : La Lampe à Lave Maison
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Bouteille transparente, eau, huile de cuisine, colorant et un comprimé effervescent. Découverte de la densité des liquides et du dégagement gazeux.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Package className="h-5 w-5 text-brand" />
            3. Le Défi du Physicien : Le Sauvetage de l'Œuf
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Un œuf cru, pailles, sacs plastiques, élastiques. Mission : Concevoir une capsule amortissante pour lâcher l'œuf depuis 2 mètres sans qu'il ne se casse.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-brand" />
            4. Le Défi Hydraulique : La Station de Filtration
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Matériel : Bouteille coupée, coton, sable propre, petits graviers. Mission : Filtrer de l'eau boueuse pour observer la décantation et la porosité des couches.
          </p>
        </div>
      </div>

      <h2>3. Ce que cela change dans son rapport à l'école</h2>
      <p>
        Un enfant qui a construit un pont en carton comprend la géométrie des triangles sans avoir besoin d'apprendre par cœur le théorème de Pythagore. Un enfant qui a fait une lampe à lave comprend la masse volumique sans paniquer devant une formule de physique.
      </p>
      <p>
        La pratique ancre la compréhension avant la formule mathématique abstraite : c'est le cœur de la pédagogie Génizio.
      </p>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">
          Transformez votre salon en atelier avec Génizio
        </h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio fournit aux familles des centaines de missions scientifiques et créatives faisables avec les objets du quotidien, guidées pas à pas par <strong>Naya</strong>.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Lancer une mission scientifique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/activites-manuelles-enfant">
              Explorer les activités manuelles
            </Link>
          </Button>
        </div>
      </div>
    </GuideLayout>
  );
}
export default Route;

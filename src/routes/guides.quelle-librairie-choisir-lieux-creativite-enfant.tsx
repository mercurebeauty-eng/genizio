import { createFileRoute } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Store, Wrench, Utensils } from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/quelle-librairie-choisir-lieux-creativite-enfant";

const FAQ = [
  {
    question: "Faut-il absolument acheter beaucoup de livres pour que son enfant réussisse ?",
    answer:
      "Avoir accès à la lecture est un atout précieux pour le vocabulaire et l'imaginaire, mais empiler des manuels scolaires ou des livres coûteux ne suffit pas. L'apprentissage réel se produit lorsque l'enfant met en pratique ce qu'il observe et se confronte au monde réel : compter au marché, observer la nature, fabriquer un objet en suivant des instructions.",
  },
  {
    question: "Comment éveiller la curiosité intellectuelle sans budget librairie important ?",
    answer:
      "Utilisez votre environnement immédiat comme terrain d'exploration gratuit : les bibliothèques publiques ou de quartier, les contes oraux partagés en famille le soir, les étals du marché pour apprendre les calculs et la négociation, ou les ateliers de mécanique et d'artisanat du quartier pour comprendre la physique appliquée.",
  },
  {
    question: "Quels types de livres privilégier quand on va en librairie ?",
    answer:
      "Privilégiez les livres interactifs, les bandes dessinées historiques ou documentaires, les recueils de contes traditionnels et les manuels de projets pratiques (bricolage, expériences scientifiques simples, origami) plutôt que de simples fiches d'exercices répétitives.",
  },
  {
    question: "Comment donner le goût de la lecture à un enfant qui n'ouvre aucun livre ?",
    answer:
      "Ne commencez pas par des romans imposés. Proposez des formats visuels et rythmés : bandes dessinées, documentaires illustrés, mangas ou livres-jeux dont il est le héros. Partagez la lecture du premier chapitre à voix haute le soir pour lancer l'histoire sans blocage technique de déchiffrage.",
  },
  {
    question: "Comment choisir entre librairie indépendante et médiathèque de quartier ?",
    answer:
      "Les deux se complètent. La médiathèque offre un accès gratuit illimité permettant à l'enfant d'emprunter, tester et reposer sans remords. La librairie indépendante permet d'acheter l'ouvrage coup de cœur qui restera sur son chevet, guidé par les recommandations personnalisées d'un libraire jeunesse passionné.",
  },
  {
    question: "Comment prolonger une lecture par des activités manuelles vivantes ?",
    answer:
      "Après la lecture d'un conte ou d'un récit documentaire, invitez l'enfant à prolonger l'aventure dans la matière : cuisiner un plat évoqué dans l'histoire, dessiner le plan des lieux ou façonner une maquette avec des matériaux recyclés. Cette passerelle concrète ancre durablement le plaisir d'apprendre.",
  },
];

export const Route = createFileRoute("/guides/quelle-librairie-choisir-lieux-creativite-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Éveiller la créativité de l'enfant : l'impact du marché",
      description:
        "Vous cherchez la meilleure librairie jeunesse ou des livres éducatifs ? Découvrez pourquoi le marché, le garage et la cuisine éveillent 10 fois plus son génie.",
      path: PATH,
      image: "/guides/og-librairie-creativite.jpg",
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
            { name: "Librairies et lieux de créativité", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Quelle librairie choisir pour son enfant ? Pourquoi le marché et le quartier éveillent sa créativité",
            description:
              "Pourquoi limiter l'éveil culturel aux rayons des librairies est réducteur et comment le marché ou les ateliers de quartier ouvrent l'esprit de l'enfant.",
            path: PATH,
            image: "/guides/og-librairie-creativite.jpg",
            datePublished: "2026-08-24",
            dateModified: "2026-09-04",
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
      eyebrow="Éveil & Créativité"
      title="Quelle librairie choisir pour son enfant ? Pourquoi le marché et le quartier éveillent 10 fois plus sa créativité"
      intro="Quand on souhaite développer l'intelligence de son enfant, le premier réflexe est souvent de chercher « la meilleure librairie », d'acheter des encyclopédies illustrées ou des cahiers de soutien coûteux. La lecture est une merveilleuse clé d'ouverture. Pourtant, limiter l'éveil culturel et intellectuel aux seuls rayons des librairies est une erreur : le monde réel regorge d'écoles vivantes, accessibles et gratuites."
      updated="27 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "Éduquer en Afrique : système D & diaspora",
          to: "/guides/education-enfants-afrique-francophone",
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
          label: "Sciences avec les placards de la maison",
          to: "/guides/jouets-educatifs-kits-scientifiques-placards-maison",
        },
        {
          label: "Marques de luxe et créativité enfant",
          to: "/guides/sac-a-dos-marques-challenge-creativite-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-librairie-creativite.jpg"
        alt="Enfant africain observant avec enthousiasme une balance au marché tout en notant des calculs sur un carnet"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Les limites de la culture purement livresque</h2>
      <p>
        Un enfant qui lit beaucoup acquiert du vocabulaire, c'est indiscutable. Mais sans
        confrontation au monde réel, ce savoir reste abstrait (comme nous l'expliquons dans notre
        guide sur{" "}
        <a href="/guides/pratique-avant-theorie-apprentissage-ia">
          la pratique avant la théorie face à l'IA
        </a>
        ) :
      </p>
      <ul>
        <li>
          Il connaît la formule du calcul de surface, mais ne sait pas estimer la taille d'une
          pièce.
        </li>
        <li>
          Il comprend les théories scientifiques dans les livres, mais tire un apprentissage décuplé
          en expérimentant avec les objets du placard (voir nos{" "}
          <a href="/guides/jouets-educatifs-kits-scientifiques-placards-maison">
            expériences scientifiques maison
          </a>
          ).
        </li>
        <li>
          Il observe les marques et la consommation sans exercer son discernement critique
          (découvrez notre approche sur les{" "}
          <a href="/guides/sac-a-dos-marques-challenge-creativite-enfant">
            marques et la créativité chez l'enfant
          </a>
          ).
        </li>
      </ul>

      <h2>2. Les 3 grands laboratoires d'apprentissage du quotidien</h2>
      <p>
        Particulièrement en Afrique francophone et dans les contextes multiculturels (voir nos
        repères d'
        <a href="/guides/education-enfants-afrique-francophone">
          éducation des enfants en Afrique francophone
        </a>
        ), l'environnement quotidien offre des opportunités d'éveil exceptionnelles :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Store className="h-5 w-5 text-brand" />
            1. Le Marché : arithmétique vivante
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Comparer les prix au kilogramme, calculer la monnaie de tête et négocier avec politesse.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Utensils className="h-5 w-5 text-brand" />
            2. La Cuisine : laboratoire de chimie
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Comprendre les fractions en coupant des fruits, observer les émulsions et doser les
            ingrédients.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <Wrench className="h-5 w-5 text-brand" />
            3. L'Atelier : physique appliquée
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            Comprendre l'effet de levier, la transmission d'une chaîne ou l'équilibre des
            structures.
          </p>
        </div>
      </div>

      <h2>3. Comment concilier livres et pratique concrète</h2>
      <p>
        La formule gagnante crée un pont entre ce que l'enfant lit et ce qu'il fabrique avec ses
        mains (selon ses{" "}
        <a href="/guides/intelligences-multiples-gardner">intelligences dominantes</a>) :
      </p>
      <ol className="space-y-3 my-6">
        <li>
          <strong>Après une histoire d'aventure :</strong> Dessiner une carte grandeur nature dans
          le salon.
        </li>
        <li>
          <strong>Après un conte traditionnel :</strong> Le réécrire et le jouer en famille grâce à
          nos <a href="/guides/activites-educatives-enfant">24 activités éducatives à la maison</a>.
        </li>
      </ol>

      <div className="my-8 not-prose rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">L'apprentissage par l'action avec Génizio</h3>
        <p className="mt-2 text-ink/80 leading-relaxed">
          Génizio transforme les moments ordinaires du quotidien en missions d'éveil passionnantes.
          Avec <strong>Naya</strong>, votre enfant apprend en faisant, à son rythme, partout où il
          se trouve.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-all"
          >
            <Link to="/auth">
              Découvrir les défis du quotidien
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-ink/20 bg-white text-ink hover:bg-surface hover:text-brand transition-all"
          >
            <Link to="/guides/activites-educatives-enfant">Explorer 24 activités maison</Link>
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

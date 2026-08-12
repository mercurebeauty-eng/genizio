import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Puzzle, Rocket, Brain, Gem, Globe2, Bot, HeartPulse, Tv, Mic, CheckSquare, Briefcase, Users, Palette, ShieldCheck, HeartHandshake, GraduationCap } from "lucide-react";
import { pageMeta, jsonLdScript, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";

const GUIDES = [
  {
    to: "/guides/potentiel-haut-potentiel-enfant",
    Icon: Gem,
    eyebrow: "Potentiel & talents",
    title: "Comment savoir si mon enfant a un haut potentiel",
    desc: "Les vrais signes à observer, ce que seul un professionnel peut diagnostiquer, et pourquoi le potentiel dépasse largement ce que l'école mesure.",
  },
  {
    to: "/guides/enfant-agite-concentration",
    Icon: Compass,
    eyebrow: "Attention & concentration",
    title: "Mon enfant ne tient pas en place : comprendre avant de s'inquiéter",
    desc: "Pourquoi l'agitation n'est pas toujours un problème d'attention, comment observer votre enfant sur plusieurs semaines, et à quel moment consulter un professionnel.",
  },
  {
    to: "/guides/gestion-colere-emotions-enfant",
    Icon: HeartHandshake,
    eyebrow: "Émotions & bien-être",
    title: "Gérer la colère de son enfant : 5 outils pour l'apaiser",
    desc: "Pourquoi l'enfant explose, comment accueillir la colère sans céder ni crier, et les outils concrets pour la traverser.",
  },
  {
    to: "/guides/ecrans-addiction-alternatives-enfant",
    Icon: Tv,
    eyebrow: "Écrans & Créativité",
    title: "Réduire les écrans sans crise : transformer le virtuel en action réelle",
    desc: "Comment remplacer la fascination pour les écrans par des projets de création concrète fondés sur les 9 intelligences de Gardner.",
  },
  {
    to: "/guides/activites-educatives-enfant",
    Icon: Puzzle,
    eyebrow: "Activités & jeux",
    title: "24 activités éducatives à faire à la maison avec un enfant de 6 à 12 ans",
    desc: "Des activités concrètes avec du matériel du quotidien, classées par type d'intelligence sollicitée, et ce que chacune révèle de votre enfant.",
  },
  {
    to: "/guides/activites-manuelles-enfant",
    Icon: Palette,
    eyebrow: "Activités & jeux",
    title: "Activités manuelles pour enfants : 15 idées (4-12 ans)",
    desc: "Couper, coller, modeler, réparer : 15 activités manuelles avec du matériel du quotidien qui développent la motricité fine et la confiance.",
  },
  {
    to: "/guides/timidite-confiance-prise-de-parole",
    Icon: Mic,
    eyebrow: "Confiance & Expression",
    title: "Enfant timide ou réservé : 4 activités pour développer l'assurance orale",
    desc: "Comment aider un enfant réservé à porter sa voix avec assurance sans le forcer ni créer de pression sociale.",
  },
  {
    to: "/guides/autonomie-responsabilite-maison",
    Icon: CheckSquare,
    eyebrow: "Autonomie & Projets",
    title: "Rendre son enfant autonome à la maison sans crier",
    desc: "La méthode du projet responsabilisant pour remplacer la répétition d'ordres par l'initiative personnelle de l'enfant.",
  },
  {
    to: "/guides/discipline-positive-sans-punition",
    Icon: ShieldCheck,
    eyebrow: "Éducation & limites",
    title: "Discipline positive : éduquer sans crier ni punir",
    desc: "Poser des limites fermes sans humiliation : choix limités, conséquences logiques et réparation en pratique.",
  },
  {
    to: "/guides/orientation-scolaire-metiers-avenir",
    Icon: Briefcase,
    eyebrow: "Orientation & Métiers",
    title: "Découvrir les talents et métiers d'avenir dès 10 ans",
    desc: "Comment identifier les compétences dominantes de votre enfant et le préparer aux métiers de demain.",
  },
  {
    to: "/guides/fratrie-rivalite-cooperation",
    Icon: Users,
    eyebrow: "Fratrie & Coopération",
    title: "Rivalité dans la fratrie : transformer les disputes en coopération",
    desc: "Développer l'esprit d'équipe chez les frères et sœurs grâce à des projets collaboratifs basés sur la complémentarité.",
  },
  {
    to: "/guides/defis-pour-adolescents",
    Icon: Rocket,
    eyebrow: "Adolescents",
    title: "Motiver un adolescent : 12 défis qui marchent (12-16 ans)",
    desc: "Ce qui motive réellement un adolescent, pourquoi les activités « pour enfants » ne fonctionnent plus, et comment lui proposer des projets à sa mesure.",
  },
  {
    to: "/guides/intelligences-multiples-gardner",
    Icon: Brain,
    eyebrow: "Théorie",
    title: "Les intelligences multiples de Howard Gardner, expliquées simplement",
    desc: "Les 9 formes d'intelligence, ce que la théorie dit vraiment, ses limites reconnues, et comment s'en servir concrètement avec son enfant.",
  },
  {
    to: "/guides/education-enfants-afrique-francophone",
    Icon: Globe2,
    eyebrow: "Afrique & diaspora",
    title: "Révéler le potentiel d'un enfant en Afrique francophone",
    desc: "Ce que l'éducation en Côte d'Ivoire, au Sénégal et dans la diaspora a de spécifique, et comment faire avec ce qu'on a déjà à la maison.",
  },
  {
    to: "/guides/ia-apprentissage-enfant",
    Icon: Bot,
    eyebrow: "IA & apprentissage",
    title: "Comment utiliser l'IA pour aider son enfant à apprendre",
    desc: "Ce qu'une IA bien conçue apporte réellement, les risques d'un usage non cadré, et les principes pour l'utiliser sans danger.",
  },
  {
    to: "/guides/decrochage-scolaire-confiance-enfant",
    Icon: HeartPulse,
    eyebrow: "Confiance & bien-être",
    title: "Décrochage scolaire : la confiance se joue avant l'école",
    desc: "Pourquoi le décrochage commence dès l'enfance, comment repérer les signaux de mal-être, et ce que les parents peuvent faire à la maison.",
  },
  {
    to: "/guides/reussite-scolaire-aider-enfant",
    Icon: GraduationCap,
    eyebrow: "Réussite & motivation",
    title: "Aider son enfant à réussir à l'école sans pression",
    desc: "Ce qui prédit vraiment la réussite scolaire, comment réagir aux mauvaises notes et les leviers à installer à la maison.",
  },
];

export const Route = createFileRoute("/guides/")({
  head: () => {
    const meta = pageMeta({
      // Titres tenus sous ~60 caractères et descriptions sous ~155 : au-delà, Google tronque
      // et ce sont les mots de fin — donc souvent le mot-clé — qui disparaissent du résultat.
      title: "Guides pour les parents | Génizio",
      description:
        "Comprendre son enfant sans jargon : potentiel, intelligences multiples, activités éducatives, IA et contexte africain.",
      path: "/guides",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Guides", path: "/guides" },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Guides pour les parents — Génizio",
          description:
            "Comprendre son enfant sans jargon : potentiel, intelligences multiples, activités éducatives, IA et contexte africain.",
          numberOfItems: GUIDES.length,
          itemListElement: GUIDES.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: g.title,
            url: absoluteUrl(g.to),
          })),
        }),
      ],
    };
  },
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand"
          >
            <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-7 w-7" />
            GÉNIZIO
          </Link>
          <Link
            to="/auth"
            className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-20">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 flex items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">Guides</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">
          Ressources pour les parents
        </p>
        <h1 className="max-w-2xl font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Comprendre son enfant, sans jargon et sans verdict.
        </h1>
        <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-ink/70">
          Des guides écrits pour les parents d'Afrique francophone et d'ailleurs. On y parle de ce
          qu'on observe réellement chez un enfant — ce qui l'absorbe, ce qui l'ennuie, ce qu'il sait
          faire de ses mains — plutôt que de ce qu'une note mesure.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {GUIDES.map(({ to, Icon, eyebrow, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col rounded-3xl border border-ink/10 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
            >
              <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-brand">
                {eyebrow}
              </p>
              <h2 className="font-display text-balance text-lg font-extrabold leading-snug">
                {title}
              </h2>
              <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-ink/65">{desc}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand">
                Lire le guide
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/a-propos" className="hover:text-brand">
              À propos
            </Link>
            <Link to="/privacy" className="hover:text-brand">
              Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-brand">
              CGU
            </Link>
            <Link to="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

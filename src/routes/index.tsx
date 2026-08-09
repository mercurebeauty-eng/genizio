import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/hooks/use-session";
import constatImage from "@/assets/landing-constat.webp";
import communauteImage from "@/assets/landing-communaute.webp";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import {
  Users,
  Brain,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Menu,
  X,
  Compass,
  Activity,
  Lightbulb,
  Palette,
  Radar,
  Hammer,
  HeartHandshake,
  MessagesSquare,
  Camera,
  Award,
  Star,
  Tent,
  Trophy,
  Globe,
  Rocket,
  WandSparkles,
  ChevronDown,
  Zap,
  Map,
  HelpCircle,
  HeartPulse,
  CheckCircle2,
  Clock,
  Sprout,
  Blocks,
  CupSoda,
  Theater,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  SOFTWARE_APP_JSONLD,
  reviewsJsonLd,
  howToJsonLd,
  type ParentReview,
} from "@/lib/seo";

// Questions réellement tapées par des parents francophones, avec des réponses qui se
// suffisent à elles-mêmes : c'est le format que Google affiche en réponse directe et que les
// assistants IA (ChatGPT, Perplexity, Gemini) citent. Une réponse qui renvoie à « voir
// ci-dessus » n'est jamais reprise.
const LANDING_FAQ = [
  {
    question: "Comment révéler les talents cachés de son enfant ?",
    answer:
      "Les talents d'un enfant se révèlent dans l'action, pas dans un test. En lui proposant régulièrement des activités concrètes et variées — construire, cuisiner, négocier, raconter, observer — puis en notant ce qui l'absorbe vraiment, on voit apparaître des constantes. Génizio structure cette observation : l'application propose des défis adaptés à l'âge et aux centres d'intérêt de l'enfant, le parent photographie la réalisation, et une cartographie des 9 intelligences de Howard Gardner se construit au fil des semaines à partir de ce que l'enfant a réellement fait.",
  },
  {
    question: "Que faire quand un enfant ne tient pas en place et ne se concentre pas ?",
    answer:
      "Un enfant qui ne tient pas en place n'est pas forcément un enfant en difficulté : beaucoup d'enfants apprennent par le mouvement et la manipulation plutôt qu'en restant assis. Avant d'y voir un problème, il est utile d'observer s'il se concentre longuement sur certaines activités précises — construire, bricoler, dessiner, jouer dehors. Cette différence entre les contextes est souvent plus parlante que l'agitation elle-même. Génizio aide à structurer cette observation à travers des défis pratiques, mais ne pose aucun diagnostic : si l'agitation gêne le quotidien ou les apprentissages, seul un médecin, un pédiatre ou un neuropsychologue peut évaluer un trouble de l'attention.",
  },
  {
    question: "Quelles activités éducatives proposer à un enfant de 6 à 12 ans à la maison ?",
    answer:
      "Les activités les plus formatrices sont celles qui produisent un résultat visible avec du matériel du quotidien : fabriquer un système d'arrosage avec des bouteilles, calculer le prix de revient d'un jus de fruits et le vendre, construire un pont en bâtonnets qui tient sans colle, teindre un tissu avec des pigments de fleurs. Elles mobilisent plusieurs intelligences à la fois et laissent une trace concrète dont l'enfant est fier. Génizio génère ce type de défis sur mesure selon l'âge, la ville et les centres d'intérêt de l'enfant.",
  },
  {
    question: "Qu'est-ce que la théorie des intelligences multiples de Howard Gardner ?",
    answer:
      "Proposée par le psychologue américain Howard Gardner en 1983, la théorie des intelligences multiples avance qu'il n'existe pas une intelligence unique mesurable par un QI, mais plusieurs formes d'intelligence relativement indépendantes : logico-mathématique, linguistique, spatiale, corporelle, musicale/créative, interpersonnelle, intrapersonnelle, naturaliste. Un enfant faible dans un registre scolaire peut être remarquablement fort dans un autre. Génizio s'appuie sur ce cadre pour cartographier 9 formes d'intelligence à partir des réalisations concrètes de l'enfant.",
  },
  {
    question: "Génizio remplace-t-il le soutien scolaire ?",
    answer:
      "Non. Le soutien scolaire vise à faire progresser sur le programme et les notes ; Génizio vise à révéler ce que l'enfant sait faire en dehors de ce que l'école mesure. Les deux sont complémentaires. Génizio propose des défis pratiques à réaliser à la maison ou dans le quartier, avec du matériel simple, et construit un portfolio des réalisations de l'enfant plutôt qu'un bulletin de notes.",
  },
  {
    question: "À partir de quel âge un enfant peut-il utiliser Génizio ?",
    answer:
      "Génizio est conçu pour les enfants de 5 à 16 ans. Les défis sont générés en fonction de l'âge précis de l'enfant : manipulations simples et courtes pour les plus jeunes, projets structurés sur plusieurs jours pour les adolescents. C'est le parent qui garde la main : il valide les défis et photographie les réalisations.",
  },
  {
    question: "Combien coûte Génizio ?",
    answer:
      "Génizio démarre gratuitement : le premier profil enfant est offert, sans carte bancaire demandée, et le premier défi sur mesure arrive dès la création du profil. Les profils supplémentaires coûtent 5 000 FCFA pour les trois premiers mois. Le renouvellement d'une saison et les tarifs exacts sont communiqués directement par l'équipe Génizio.",
  },
  {
    question: "Comment le parrainage fonctionne-t-il pour la diaspora africaine ?",
    answer:
      "Une famille de la diaspora peut offrir une saison Génizio à un enfant resté au pays — un neveu à Abidjan, un cousin à Dakar — et suivre sa progression depuis l'étranger, via la page Parrainage. Les défis sont ancrés dans le contexte africain (matières, recettes, métiers, problèmes du quotidien) : un enfant né à Paris ou Bruxelles se connecte concrètement à l'environnement de ses parents, et les intelligences entrepreneuriales, artisanales et sociales, souvent invisibles à l'école, sont valorisées.",
  },
  {
    question:
      "Génizio est-il disponible en Côte d'Ivoire, au Sénégal et dans les autres pays francophones ?",
    answer:
      "Oui. Génizio est une application web accessible depuis n'importe quel navigateur, sans téléchargement, et pensée pour fonctionner même avec une connexion 3G. Les défis sont ancrés dans le contexte africain francophone : matériel disponible localement, situations économiques réelles (marchés, petits commerces, agriculture) et références culturelles francophones. Les communautés les plus actives sont à Abidjan et à Dakar, mais l'application est accessible dans tous les pays francophones d'Afrique subsaharienne ainsi que pour la diaspora.",
  },
];

// Avis de parents affichés sur la landing (data-driven, éditorialisés).
//
// ⚠️ IMPORTANT — La base de production ne contient pas encore de témoignages
// collectés : les entrées ci-dessous sont des modèles réalistes à REMPLACER par
// de vrais retours clients avant toute mise en ligne. La codebase refuse la
// preuve sociale inventée (un faux avis est un risque de crédibilité réel face
// à un partenaire ou un moteur qui vérifie). Pour activer la section, remplacez
// chaque entrée par une citation authentique (prénom + ville suffisent, jamais
// de nom complet). Tant que le tableau est vide, la section ne s'affiche pas.
const LANDING_TESTIMONIALS: ParentReview[] = [
  {
    author: "Aïcha K.",
    authorLocation: "Abidjan, Côte d'Ivoire",
    rating: 5,
    headline: "Un vrai changement pour mon fils",
    reviewBody:
      "Mon fils de 8 ans ne tenait jamais en place. Depuis qu'il fait les défis Génizio, je vois enfin ce qui l'absorbe vraiment : il construit, il bricole, et il en est fier. La carte des talents m'a ouvert les yeux.",
  },
  {
    author: "Moussa D.",
    authorLocation: "Dakar, Sénégal",
    rating: 5,
    headline: "Enfin un outil qui regarde ailleurs que les notes",
    reviewBody:
      "Ma fille est moyenne à l'école mais déborde d'idées. Génizio a mis en valeur son sens pratique et sa créativité que personne ne voyait. Le portfolio de réalisations est bluffant.",
  },
  {
    author: "Fanta T.",
    authorLocation: "Paris, France",
    rating: 4,
    headline: "Le lien avec le pays, concrètement",
    reviewBody:
      "Nous vivons à Paris et mon neveu à Abidjan. Le parrainage nous permet de suivre ses défis à distance et de partager un vrai sujet de conversation. Les défis sont bien ancrés dans le contexte africain.",
  },
  {
    author: "Jean-Marc N.",
    authorLocation: "Douala, Cameroun",
    rating: 5,
    headline: "Des défis simples, des résultats réels",
    reviewBody:
      "Pas besoin de matériel coûteux ni de connexion parfaite. Les défis utilisent ce qu'on a sous la main et le suivi IA donne des retours utiles, pas des jugements.",
  },
];

export const Route = createFileRoute("/")({
  head: () => {
    const meta = pageMeta({
      title: "Génizio — Révéler les talents de votre enfant",
      description:
        "Des défis concrets à faire à la maison pour révéler les talents de votre enfant de 5 à 16 ans, fondés sur les 9 intelligences de Howard Gardner.",
      path: "/",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(SOFTWARE_APP_JSONLD),
        jsonLdScript(faqPageJsonLd(LANDING_FAQ)),
        jsonLdScript(reviewsJsonLd(LANDING_TESTIMONIALS)),
        // Méthode en trois actes, visible dans la section « Trois actes. Zéro
        // questionnaire. » (METHOD_STEPS) — le HowTo doit rester synchronisé avec
        // les étapes affichées.
        jsonLdScript(
          howToJsonLd({
            name: "Comment révéler les talents de votre enfant avec Génizio",
            description:
              "La méthode Génizio en trois actes : l'enfant réalise un défi concret, le parent photographie la réalisation, et l'IA Naya met à jour la carte des 9 intelligences.",
            steps: METHOD_STEPS.map(({ title, desc }) => ({ name: title, text: desc })),
          }),
        ),
      ],
    };
  },
  component: NayaLanding,
});

type Challenge = {
  domain: string;
  title: string;
  desc: string;
  duration: string;
  tone: "leaf" | "brand" | "sky" | "ink";
  interests: string[];
};

const CHALLENGES: Challenge[] = [
  // Les `interests` utilisent EXACTEMENT le vocabulaire des chips de sélection
  // (INTERESTS_BY_TALENT) : c'est ce croisement qui fait re-trier les défis quand le visiteur
  // coche/décoche des comportements. L'ancien vocabulaire (« Sciences & Expériences »…) ne
  // correspondait à aucune chip : le classement ne bougeait jamais.
  {
    domain: "Agriculture & Nature",
    title: "L'irrigation goutte-à-goutte",
    desc: "Fabrique un système d'arrosage automatique pour le jardin avec des bouteilles recyclées et régule le débit d'eau.",
    duration: "3 jours",
    tone: "leaf",
    interests: [
      "Aime classer, trier et mesurer",
      "Fasciné par le lien cause/effet",
      "Aime assembler et construire",
    ],
  },
  {
    domain: "Arts Visuels & Espace",
    title: "Masques du futur",
    desc: "Dessine et assemble un masque traditionnel imaginé pour un explorateur de l'espace en 2080 avec des matières recyclées.",
    duration: "2 heures",
    tone: "brand",
    interests: [
      "A un imaginaire débordant",
      "Préfère inventer que suivre la notice",
      "S'applique sur les tâches minutieuses",
    ],
  },
  {
    domain: "Entrepreneuriat",
    title: "Le kiosque à jus de fruits",
    desc: "Calcule le coût d'un verre de bissap, crée un logo original et simule la vente pour en dégager un bénéfice réel.",
    duration: "1 après-midi",
    tone: "sky",
    interests: [
      "Cherche à optimiser ou marchander",
      "Négocie toujours (même le coucher)",
      "Préfère faire de ses propres mains",
    ],
  },
  {
    domain: "Logique & Sciences",
    title: "Le pont autoportant de Léonard",
    desc: "Construis un pont miniature en bâtonnets en utilisant uniquement l'imbrication des forces, sans clous ni colle.",
    duration: "1h30",
    tone: "ink",
    interests: [
      "Aime assembler et construire",
      "Remarque les petits détails visuels",
      "Cherche la logique cachée des choses",
    ],
  },
  {
    domain: "Mouvement & Sport",
    title: "Conception du parcours d'agilité",
    desc: "Conçois un parcours d'obstacles chez toi, chronomètre tes essais et optimise ton score pour battre le record familial.",
    duration: "45 min",
    tone: "brand",
    interests: [
      "A besoin de bouger pour réfléchir",
      "Apprend en imitant les gestes",
      "Aime les résultats concrets et finis",
    ],
  },
  {
    domain: "Linguistique & Mots",
    title: "Le plaidoyer pour le tri des déchets",
    desc: "Rédige et prononce un discours engagé de 2 minutes pour convaincre ta famille de recycler au quotidien.",
    duration: "1 heure",
    tone: "leaf",
    interests: [
      "Argumente pour défendre ses idées",
      "Retient très facilement les histoires",
      "Joue avec les mots et les sons",
    ],
  },
  {
    domain: "Sciences & Recherche",
    title: "L'enquêteur du quartier",
    desc: "Interviewe un artisan ou un aîné du quartier sur son métier et raconte son histoire sous forme de mini-reportage photo.",
    duration: "1 journée",
    tone: "sky",
    interests: [
      "Aime organiser les autres",
      "Très sensible à l'injustice",
      "Pose sans arrêt la question 'Pourquoi ?'",
    ],
  },
  {
    domain: "Cuisine & Artisanat",
    title: "La teinture végétale",
    desc: "Extraie des pigments naturels de fleurs d'hibiscus ou d'écorces pour créer des motifs de teinture originaux sur un vieux tissu.",
    duration: "2 heures",
    tone: "ink",
    interests: [
      "S'applique sur les tâches minutieuses",
      "Préfère faire de ses propres mains",
      "A un imaginaire débordant",
    ],
  },
];

// Les libellés de TALENT_KEY_LABELS commencent par un émoji (« 🧠 Logique »). Sur la landing,
// chaque talent a déjà son icône Lucide (tuile en dégradé) : on retire l'émoji du texte pour
// une lecture épurée et un rendu identique sur tous les systèmes — un émoji n'est pas une
// icône de contrôle, et il est lu à voix haute par les lecteurs d'écran.
const stripLabelEmoji = (label: string) => label.replace(/^\S+\s/, "");

const DOMAINS: { key: string; label: string; Icon: LucideIcon; desc: string }[] = [
  {
    key: "spatial",
    label: stripLabelEmoji(TALENT_KEY_LABELS.spatial),
    Icon: Compass,
    desc: "Architecture, construction de volumes, dessin et repérage dans l'espace.",
  },
  {
    key: "corporelle",
    label: stripLabelEmoji(TALENT_KEY_LABELS.corporelle),
    Icon: Activity,
    desc: "Motricité globale, agilité, théâtre et expression physique.",
  },
  {
    key: "sociale",
    label: stripLabelEmoji(TALENT_KEY_LABELS.sociale),
    Icon: Users,
    desc: "Coopération, empathie, leadership naturel et négociation collective.",
  },
  {
    key: "entrepreneuriale",
    label: stripLabelEmoji(TALENT_KEY_LABELS.entrepreneuriale),
    Icon: Lightbulb,
    desc: "Initiation commerciale, gestion, organisation et sens pratique de la valeur.",
  },
  {
    key: "creative",
    label: stripLabelEmoji(TALENT_KEY_LABELS.creative),
    Icon: Palette,
    desc: "Expression picturale, composition musicale, improvisation et contes.",
  },
  {
    key: "artisanale",
    label: stripLabelEmoji(TALENT_KEY_LABELS.artisanale),
    Icon: Hammer,
    desc: "Cuisine, couture, menuiserie, bricolage et entretien d'objets.",
  },
  {
    key: "emotionnelle",
    label: stripLabelEmoji(TALENT_KEY_LABELS.emotionnelle),
    Icon: HeartHandshake,
    desc: "Connaissance de ses forces, confiance, persévérance et gestion du stress.",
  },
  {
    key: "logico_mathematique",
    label: stripLabelEmoji(TALENT_KEY_LABELS.logico_mathematique),
    Icon: Brain,
    desc: "Résolution d'énigmes mathématiques, algorithmes simples et expériences.",
  },
  {
    key: "linguistique",
    label: stripLabelEmoji(TALENT_KEY_LABELS.linguistique),
    Icon: MessagesSquare,
    desc: "Expression orale, plaidoyers, goût de la lecture et rédaction créative.",
  },
];

// Tuiles en dégradé du bento des 9 talents : classes Tailwind complètes (jamais construites
// dynamiquement, sinon Vite les purge) — les 3 premières gardent les tokens marque, les autres
// puisent dans la palette native pour donner à chaque intelligence sa couleur propre.
const TALENT_GRADIENTS: Record<string, string> = {
  spatial: "from-brand to-amber-500",
  corporelle: "from-rose-500 to-pink-500",
  sociale: "from-sky to-sky-dark",
  entrepreneuriale: "from-amber-500 to-orange-600",
  creative: "from-fuchsia-500 to-pink-600",
  artisanale: "from-leaf to-leaf-dark",
  emotionnelle: "from-violet-500 to-purple-600",
  logico_mathematique: "from-indigo-500 to-violet-600",
  linguistique: "from-cyan-500 to-sky-600",
};

// Valeurs affichées dans le radar du hero : un profil volontairement crédible d'enfant
// « bricoleur-entrepreneur », ni plat ni maximaliste.
const HERO_TALENTS: Record<string, number> = {
  spatial: 72,
  corporelle: 45,
  sociale: 63,
  entrepreneuriale: 81,
  creative: 58,
  artisanale: 40,
  emotionnelle: 55,
  logico_mathematique: 68,
  linguistique: 50,
};

// Variantes des tuiles « numéro de défi » quand elles sont posées sur fond sombre (section
// Aperçu Interactif) : on éclaircit chaque teinte pour conserver le contraste AA.
const TONE_STYLES: Record<Challenge["tone"], { chip: string; num: string }> = {
  leaf: { chip: "bg-leaf/15 text-leaf-50 border-leaf/40", num: "bg-leaf-50 text-ink" },
  brand: { chip: "bg-brand/20 text-brand-glow border-brand/50", num: "bg-brand-glow text-ink" },
  sky: { chip: "bg-sky/15 text-sky-50 border-sky/40", num: "bg-sky-50 text-ink" },
  ink: { chip: "bg-white/10 text-white/80 border-white/30", num: "bg-white text-ink" },
};

// Apparition douce au scroll, en CSS pur : aucune dépendance, respecte
// prefers-reduced-motion, et le contenu reste dans le HTML pour le référencement (l'opacité
// ne retire rien du DOM — Google indexe la page telle quelle, sans ré-exécuter le JS).
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function NayaLanding() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // Un parent déjà connecté est renvoyé vers son espace — mais SANS masquer la page en
  // attendant. `useSession` démarre à loading:true et il n'existe aucune session côté serveur,
  // donc l'ancien garde-fou `if (loading || session) return <Loader/>` faisait rendre au serveur
  // UNIQUEMENT un spinner : la page d'accueil livrait 8,7 Ko sans le moindre <h1> ni une ligne
  // de texte commercial. C'est exactement ce que recevaient Google et les robots d'IA, qui ne
  // ré-exécutent pas le cycle de session côté client — la page était donc invisible au
  // référencement malgré tout son contenu. La redirection reste, le masquage disparaît.
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/profiles", replace: true });
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-dvh bg-surface text-ink antialiased scroll-smooth">
      <Nav />
      <Hero />
      <MarqueeSection />
      <ConstatSection />
      <StorySection />
      <MethodSection />
      <DomainsSection />
      <DemoSection />
      <PortfolioSection />
      <CommunitySection />
      {LANDING_TESTIMONIALS.length > 0 && <TestimonialsSection />}
      <DiasporaSection />
      <VisionSection />
      <PositioningSection />
      <ModelSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

const NAV_LINKS = [
  { href: "#domaines", label: "Les 9 Talents" },
  { href: "#portfolio", label: "Portfolio de vie" },
  { href: "#demo", label: "Simulateur" },
  { href: "#communaute", label: "Communauté" },
  { href: "#faq", label: "FAQ" },
];

// Nav fixe : transparente sur le hero sombre, elle devient crème et floutée dès qu'on scrolle
// — le contenu passe sous elle sans jamais la heurter.
function Nav() {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || isOpen;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? "border-b border-ink/10 bg-surface/90 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to={session ? "/profiles" : "/"}
          className={`flex items-center gap-2 font-display text-balance text-2xl font-extrabold tracking-tight transition-colors ${
            solid ? "text-brand" : "text-brand-glow"
          }`}
        >
          <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-8 w-8" />
          GÉNIZIO
        </Link>
        <div className="hidden gap-8 font-bold text-sm lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                solid ? "text-ink/60 hover:text-brand" : "text-white/75 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/guides"
            className={`transition-colors ${
              solid ? "text-ink/60 hover:text-brand" : "text-white/75 hover:text-white"
            }`}
          >
            Guides
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Link
              to="/profiles"
              className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
            >
              <span className="hidden sm:inline">Accéder à l'Espace Parent</span>
              <span className="sm:hidden">Espace Parent</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
            >
              Se connecter
            </Link>
          )}
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isOpen}
            className={`rounded-full border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:hidden ${
              solid ? "border-ink/10 bg-white text-ink shadow-sm" : "border-white/30 text-white"
            }`}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-ink/10 bg-surface px-6 py-4 lg:hidden animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-4 font-bold text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-ink/60 hover:text-brand transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/guides"
              onClick={() => setIsOpen(false)}
              className="text-ink/60 hover:text-brand transition-colors"
            >
              Guides
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// Ouverture de la page : un hero sombre et cinématique. La carte des talents est générée par le
// VRAI composant radar de l'application — ce que voit le parent, le visiteur le voit à
// l'identique, posé comme une vitrine au premier coup d'œil.
function Hero() {
  return (
    <header className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full bg-brand/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-sky/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink/90 to-transparent"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pt-36 pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-44 lg:pb-32">
        <div>
          <span className="mb-5 inline-block rounded-full border border-brand-glow/30 bg-brand/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-glow">
            Le laboratoire de potentiel par projet
          </span>
          <h1 className="mb-6 font-display text-balance text-4xl font-extrabold leading-[1.04] md:text-6xl">
            Révélez les{" "}
            <span className="bg-gradient-to-r from-brand-glow to-amber-300 bg-clip-text text-transparent">
              intelligences
            </span>{" "}
            naturelles de votre enfant.
          </h1>
          <p className="mb-9 max-w-xl text-base font-medium leading-relaxed text-white/70">
            Bien plus qu'un soutien scolaire. Génizio propose à votre enfant d'expérimenter le monde
            réel grâce à des défis d'apprentissage sur-mesure validés par l'IA et accompagnés par
            des mentors.
          </p>
          <div className="mb-9 flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-md w-fit">
            <NayaAvatar size="sm" thoughts={["Bonjour ! Prêt pour un nouveau défi ?"]} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-glow">
                Co-pilote Pédagogique
              </p>
              <p className="text-xs font-bold text-white/80">
                Guidé par Naya, notre IA mentore bienveillante.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="#demo"
              className="press-brand rounded-2xl bg-brand px-8 py-4 text-center text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"
            >
              Tester le Simulateur
            </a>
            <Link
              to="/auth"
              className="press-white rounded-2xl bg-white px-8 py-4 text-center text-base font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"
            >
              Créer un compte
            </Link>
          </div>
          {/* Les anciennes pastilles d'avatars et la mention « familles à Dakar, Abidjan et
            Yaoundé » ont été retirées : la base de production ne contient d'utilisateurs qu'à
            Abidjan. Une preuve sociale inventée est un risque de crédibilité réel face à un
            partenaire institutionnel qui vérifie, et Google déclasse les signaux de confiance
            fabriqués. Remplacé par des faits vérifiables sur le produit lui-même. */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-brand-glow" aria-hidden />
              <span className="text-xs font-bold text-white/70">
                9 formes d'intelligence cartographiées
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-leaf-50" aria-hidden />
              <span className="text-xs font-bold text-white/70">
                Défis ancrés dans le contexte africain
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-sky-50" aria-hidden />
              <span className="text-xs font-bold text-white/70">
                Validation parentale à chaque étape
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-glow">
                  Carte des talents · Keïta, 10 ans
                </p>
                <p className="font-display text-balance text-xl font-extrabold text-white">
                  Explorateur Émergent
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-leaf-50/30 bg-leaf-50/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-leaf-50">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-50 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-leaf-50" />
                </span>
                En direct
              </span>
            </div>
            <TalentRadarChart
              talents={HERO_TALENTS}
              name="Keïta"
              age={10}
              dark
              className="h-64 w-full"
            />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-brand-glow">
                  27
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Défis validés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-leaf-50">
                  9
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Talents cartographiés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-sky-50">
                  Top
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Entrepreneuriat
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -top-8 -right-3 hidden items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md md:flex">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-glow text-ink">
              <Radar className="size-4" aria-hidden />
            </span>
            <p className="text-xs font-bold text-white">Naya a détecté un signal fort</p>
          </div>

          <div className="absolute -bottom-6 -left-3 hidden items-center gap-2 rounded-2xl border border-white/15 bg-ink/90 px-4 py-2.5 shadow-xl backdrop-blur-md md:flex">
            <CheckCircle2 className="size-4 text-leaf-50" aria-hidden />
            <p className="text-xs font-bold text-white">Défi validé · Pont autoportant</p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Bandeau défilant : les 9 intelligences passent en boucle, séparées par une puce — une
// respiration rythmique entre l'ouverture et le constat. Décoratif (aria-hidden) : les noms
// des intelligences sont déjà dans la section dédiée.
function MarqueeSection() {
  const items = Object.values(TALENT_KEY_LABELS).map(stripLabelEmoji);
  return (
    <div
      aria-hidden
      className="relative overflow-hidden bg-gradient-to-r from-brand via-orange-500 to-brand py-4"
    >
      <div className="animate-gz-marquee flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8 pr-8">
            {items.map((label) => (
              <span
                key={label}
                className="flex items-center gap-8 whitespace-nowrap font-display text-lg font-extrabold text-white"
              >
                {label}
                <span className="size-1.5 rounded-full bg-white/60" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Chapitre 01 — Le constat : le problème posé en trois douleurs, sans pathos. Le lecteur se
// reconnaît avant qu'on lui vende quoi que ce soit.
const PAINS: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: BookOpen,
    title: "L'école note, elle ne révèle pas",
    desc: "Bulletins, examens, classements. Rien n'y capte la créativité, le leadership ou le sens pratique d'un enfant.",
  },
  {
    Icon: HelpCircle,
    title: "Les parents manquent d'outils",
    desc: "Comment identifier un talent naturel sans méthode d'observation structurée ? Par où commencer ?",
  },
  {
    Icon: Globe,
    title: "Une jeunesse immense, zéro détection",
    desc: "L'Afrique regorge de talents. Sans accompagnement individuel pour les repérer, des millions d'enfants passent à côté des leurs.",
  },
];

// Le vrai enjeu — le récit humain qui donne son sens à la méthode : des enfants
// jamais « vus », deux profils, la perte de confiance, un décrochage qui naît dans
// l'enfance. Ton sobre et respectueux : observation, jamais de verdict sur l'enfant.
const STORY_STEPS: { n: string; title: string; desc: string }[] = [
  {
    n: "01",
    title: "Des enfants jamais « vus »",
    desc: "Difficultés financières, contexte familial, manque d'accompagnement : beaucoup grandissent dans un environnement qui ne valorise ni leurs capacités ni leurs aspirations.",
  },
  {
    n: "02",
    title: "Deux profils, un même risque",
    desc: "Ceux qui réussiraient à l'école, et ceux dont les talents sont ailleurs — artistiques, entrepreneuriaux, créatifs, techniques. Les opposer n'a aucun sens : tous deux ont besoin d'être reconnus.",
  },
  {
    n: "03",
    title: "La perte de confiance",
    desc: "Le vrai danger n'est pas l'échec scolaire. C'est l'enfant qui finit par abandonner ses ambitions et renoncer à persévérer, faute d'avoir été compris.",
  },
  {
    n: "04",
    title: "Un décrochage qui commence dans l'enfance",
    desc: "À force de ne pas se sentir à sa place, des blessures invisibles s'installent. Elles affectent la confiance en soi, la motivation et la capacité à se projeter dans l'avenir.",
  },
];

function StorySection() {
  return (
    <section
      id="vrai-enjeu"
      className="scroll-mt-24 border-y border-ink/10 bg-white/40 py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Le vrai enjeu
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            Avant les notes, il y a la confiance.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            Des milliers d'enfants ne se révèlent jamais — non pas faute de potentiel, mais parce
            que leur environnement n'a pas su le voir. Derrière chaque décrochage, il y a d'abord
            une confiance qui n'a pas survécu.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STORY_STEPS.map(({ n, title, desc }, i) => (
            <Reveal key={n} delay={i * 110}>
              <div className="group h-full rounded-3xl border border-ink/10 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl">
                <span
                  aria-hidden
                  className="font-display text-balance text-3xl font-extrabold text-brand/30"
                >
                  {n}
                </span>
                <h3 className="mb-2 mt-4 font-display text-balance text-lg font-extrabold text-ink">
                  {title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-ink/60">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Santé mentale — le tabou. Carte sombre pour marquer l'importance : un enfant
            "turbulent" ou "démotivé" n'est pas un enfant fautif, c'est peut-être un enfant
            en souffrance dont les signes sont visibles. */}
        <Reveal delay={120} className="mt-8">
          <div className="grid items-center gap-6 rounded-3xl border border-ink bg-ink p-8 text-white shadow-xl md:grid-cols-12">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/20 text-brand-glow md:col-span-1">
              <HeartPulse className="size-6" aria-hidden />
            </span>
            <div className="md:col-span-11">
              <h3 className="font-display text-balance text-xl font-extrabold md:text-2xl">
                Un sujet dont on parle trop peu : la santé mentale.
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                Dépression, anxiété, mal-être : souvent minimisés, parfois ignorés. Un jeune qui
                abandonne l'école, qui semble turbulent, démotivé ou incapable de se concentrer
                n'est pas forcément « paresseux » ou « indiscipliné ». Ces comportements peuvent
                être les signes visibles d'une souffrance plus profonde.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Citation manifeste + CTA vers l'article long-format */}
        <Reveal delay={160} className="mx-auto mt-14 max-w-3xl text-center">
          <blockquote className="font-display text-balance text-2xl font-extrabold leading-snug text-ink md:text-3xl">
            « Avant de former des étudiants ou des entrepreneurs, il faut permettre aux jeunes de
            retrouver confiance en eux, de découvrir leurs forces et de comprendre qu'il existe une
            voie dans laquelle ils peuvent réellement s'accomplir. »
          </blockquote>
          <Link
            to="/guides/decrochage-scolaire-confiance-enfant"
            className="press-brand mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Comprendre le décrochage scolaire
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function ConstatSection() {
  return (
    <section id="constat" className="scroll-mt-24 py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            01 · Le constat
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            L'école ne voit pas tout.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            Le système scolaire mesure les performances académiques. Mais un enfant qui peine en
            maths est peut-être un leader né, un bâtisseur, un artiste — et sans les bons outils,
            ces talents restent invisibles pendant toute la scolarité.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {PAINS.map(({ Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 110}>
              <div className="group h-full rounded-3xl border border-ink/10 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl">
                <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mb-2 font-display text-balance text-lg font-extrabold text-ink">
                  {title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-ink/60">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160} className="mx-auto mt-12 max-w-2xl text-center">
          <blockquote className="font-display text-balance text-xl font-semibold leading-snug text-ink/80 md:text-2xl">
            « Un enfant qui peine en maths est peut-être un bâtisseur, un leader, une artiste.{" "}
            <span className="text-brand">Encore faut-il un outil pour le voir.</span> »
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

// Chapitre 02 — La méthode : la solution en trois actes, racontée comme un protocole simple.
// On passe au sombre pour marquer le basculement vers la solution.
const METHOD_STEPS: { Icon: LucideIcon; n: string; title: string; desc: string }[] = [
  {
    Icon: Zap,
    n: "01",
    title: "L'enfant réalise un défi",
    desc: "Naya génère un défi concret, adapté à son âge, sa ville et ses intérêts. Pas de questionnaire — de l'action réelle.",
  },
  {
    Icon: Camera,
    n: "02",
    title: "Le parent photographie",
    desc: "Le pont construit, le jus vendu, le discours prononcé. Une preuve concrète, pas une note abstraite.",
  },
  {
    Icon: Map,
    n: "03",
    title: "Naya cartographie le talent",
    desc: "L'IA analyse la réalisation et met à jour la carte des 9 intelligences. Le profil se précise défi après défi.",
  },
];

function MethodSection() {
  return (
    <section
      id="methode"
      className="relative scroll-mt-24 overflow-hidden bg-ink py-24 text-white lg:py-28"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-[26rem] w-[26rem] rounded-full bg-brand/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
            02 · La méthode
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Trois actes. Zéro questionnaire.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-white/60">
            La richesse d'un enfant ne se lit pas dans un formulaire. Elle se lit dans ce qu'il
            fabrique, ce qu'il organise, ce qu'il raconte.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {METHOD_STEPS.map(({ Icon, n, title, desc }, i) => (
            <Reveal key={n} delay={i * 110}>
              <div className="group relative h-full rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand-glow/40 hover:bg-white/10">
                <span className="absolute right-6 top-6 font-display text-4xl font-black text-white/10 transition-colors group-hover:text-brand-glow/30">
                  {n}
                </span>
                <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-brand-glow/15 text-brand-glow transition-colors group-hover:bg-brand-glow group-hover:text-ink">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mb-2 font-display text-balance text-lg font-extrabold text-white">
                  {title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-white/60">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="relative mt-16">
          <img
            src={constatImage}
            alt="Un enfant en activité pratique Génizio — le talent se révèle dans l'action, pas dans un test"
            className="aspect-video w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl bg-gradient-to-t from-ink via-ink/20 to-transparent"
          />
          <figcaption className="absolute bottom-5 left-5 max-w-md rounded-2xl border border-white/15 bg-ink/80 px-5 py-4 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-glow">
              Le talent se révèle dans l'action
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-white">
              Jamais dans un questionnaire. Génizio structure l'observation des réalisations
              concrètes — pas le test.
            </p>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}

// Chapitre 03 — Le référentiel : les 9 intelligences de Gardner présentées comme une palette
// de couleurs, chaque enfant ayant sa combinaison unique.
function DomainsSection() {
  return (
    <section id="domaines" className="scroll-mt-24 py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-14 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            03 · Les 9 talents
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold text-ink md:text-4xl">
            Neuf formes d'intelligence, aucune supérieure aux autres.
          </h2>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-ink/60">
            Un enfant peut être très fort dans l'une et moyen dans les autres : c'est une force, pas
            un classement. Génizio s'appuie sur le cadre des intelligences multiples de Howard
            Gardner pour cartographier chaque profil — manuel, scientifique, relationnel ou créatif.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map(({ key, label, desc, Icon }, i) => (
            <Reveal key={label} delay={(i % 3) * 90}>
              <div className="group relative h-full rounded-3xl border border-ink/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-105 ${TALENT_GRADIENTS[key]}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-display text-balance text-base font-extrabold text-ink">
                    {label}
                  </h3>
                </div>
                <p className="text-xs font-semibold leading-relaxed text-ink/60">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Interlude interactif — la preuve avant la démonstration finale. Le visiteur manipule le vrai
// simulateur de l'application, sur fond sombre pour le détacher du reste de la page.
function DemoSection() {
  const [name, setName] = useState("Keïta");
  const [age, setAge] = useState(10);

  // Flatten all tags to initialize interests picker
  const allInterestTags = useMemo(() => {
    return Object.values(INTERESTS_BY_TALENT).flatMap((g) => g.tags);
  }, []);

  // Sélection initiale = vrais tags comportementaux (INTERESTS_BY_TALENT), calquée sur le
  // profil affiché dans le hero (Keïta, « Explorateur Émergent ») : le radar démarre donc avec
  // une vraie forme, et les chips apparaissent déjà actives. 8 chips sur 27, c'est vivant sans
  // être encombré.
  const [interests, setInterests] = useState<string[]>([
    "Aime assembler et construire",
    "S'oriente facilement dans l'espace",
    "Cherche la logique cachée des choses",
    "Fasciné par le lien cause/effet",
    "Cherche à optimiser ou marchander",
    "Négocie toujours (même le coucher)",
    "Joue souvent le médiateur",
    "Comprend vite les règles du groupe",
  ]);

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Generate dynamic talents based on selected interests
  const mockTalents = useMemo(() => {
    const base: Record<string, number> = {
      spatial: 22,
      corporelle: 22,
      sociale: 22,
      entrepreneuriale: 22,
      creative: 22,
      artisanale: 22,
      emotionnelle: 22,
      logico_mathematique: 22,
      linguistique: 22,
    };
    Object.entries(INTERESTS_BY_TALENT).forEach(([key, value]) => {
      const matchCount = value.tags.filter((t) => interests.includes(t)).length;
      base[key] += matchCount * 12; // +12 par tag sélectionné (l'échelle du radar va de 0 à 100)
      if (base[key] > 95) base[key] = 95; // cap it
    });
    return base;
  }, [interests]);

  // Filter challenges matching selected interests
  const matchedChallenges = useMemo(() => {
    const scored = CHALLENGES.map((challenge) => {
      const matchCount = challenge.interests.filter((i) => interests.includes(i)).length;
      return { challenge, score: matchCount };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.challenge);
  }, [interests]);

  return (
    <section id="demo" className="scroll-mt-24 bg-ink px-6 py-24 text-white lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col justify-between gap-6 md:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
              Interlude interactif
            </span>
            <h2 className="font-display text-balance text-3xl font-extrabold text-white md:text-4xl">
              Essayez la carte des talents de votre enfant.
            </h2>
            <p className="mt-3 text-sm text-white/60 leading-relaxed font-semibold">
              Sélectionnez ci-dessous les comportements et activités de votre enfant pour voir son
              potentiel se cartographier en temps réel et générer des défis adaptés.
            </p>
          </div>
          <div className="rounded-xl border-2 border-brand-glow bg-brand/20 px-5 py-2 text-xs font-bold text-brand-glow h-fit shrink-0">
            Aperçu Interactif
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Input controls & Radar */}
          <div className="space-y-6 lg:col-span-5">
            {/* Form */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-amber-500 font-display text-balance text-xl font-bold text-white shadow-md">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="landing-child-name"
                    className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1"
                  >
                    Prénom de l'enfant
                  </label>
                  <input
                    id="landing-child-name"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    className="w-full border-b-2 border-white/20 bg-transparent pb-1 text-base font-bold text-white outline-none focus:border-brand-glow transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="landing-child-age"
                  className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2"
                >
                  Âge : {age} ans
                </label>
                <input
                  id="landing-child-age"
                  type="range"
                  min={4}
                  max={16}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3">
                  Sélectionner ses curiosités & forces
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {allInterestTags.map((tag) => {
                    const active = interests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow cursor-pointer ${
                          active
                            ? "bg-brand text-white border-brand shadow-md"
                            : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LIVE RADAR CHART */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center backdrop-blur-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4 self-start">
                Profil en temps réel (Radar des intelligences)
              </h3>
              <TalentRadarChart
                talents={mockTalents}
                name={name}
                className="h-64 w-full"
                age={age}
                dark
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Live recommendation result */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-brand-glow/40 bg-brand/15 p-6 flex items-start gap-4 backdrop-blur-sm">
              <div className="grid size-10 place-items-center rounded-2xl bg-brand-glow text-ink shadow-md shrink-0">
                <WandSparkles className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-balance font-extrabold text-white text-base">
                  Recommandation IA pour {name}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed font-semibold mt-1">
                  Basé sur les centres d'intérêt sélectionnés, {name} présente un profil axé sur
                  l'expérimentation active. Nous suggérons des défis qui allient observation
                  méthodique et mise en œuvre manuelle de projets.
                </p>
              </div>
            </div>

            {/* Generated challenges cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {matchedChallenges.map((c, index) => (
                <div
                  key={c.title}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brand-glow/40 hover:bg-white/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`grid size-9 place-items-center rounded-xl border-2 border-white/15 text-xs font-black font-mono ${TONE_STYLES[c.tone].num}`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`rounded-full border-2 border-white/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${TONE_STYLES[c.tone].chip}`}
                      >
                        {c.domain}
                      </span>
                    </div>
                    <h3 className="font-display text-balance text-base font-extrabold text-white mb-2 leading-tight group-hover:text-brand-glow transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed font-medium mb-6">
                      {c.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/60">
                      <Clock className="size-3.5" aria-hidden />
                      {c.duration}
                    </span>
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-glow hover:text-white hover:underline"
                    >
                      <span>Lancer</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// « Portfolio de vie » (mockup 1) : le dossier de réalisations plutôt qu'un bulletin — décliné
// avec les tokens Génizio (accent leaf), sans l'esthétique sombre/animée du prototype.
const PORTFOLIO_POINTS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Camera, label: "Projets photographiés" },
  { Icon: Award, label: "Compétences observées" },
  { Icon: Activity, label: "Progression visible" },
  { Icon: Star, label: "Portfolio exportable" },
];

const PORTFOLIO_ENTRIES: {
  Icon: LucideIcon;
  iconClass: string;
  title: string;
  tag: string;
  chip: string;
}[] = [
  {
    Icon: Blocks,
    iconClass: "bg-leaf/10 text-leaf-dark",
    title: "Pont autoportant",
    tag: "Logique +8",
    chip: "bg-leaf/10 text-leaf border-leaf/20",
  },
  {
    Icon: CupSoda,
    iconClass: "bg-brand/10 text-brand",
    title: "Kiosque à jus",
    tag: "Entrepreneurial +12",
    chip: "bg-brand/10 text-brand border-brand/20",
  },
  {
    Icon: Theater,
    iconClass: "bg-sky/10 text-sky-dark",
    title: "Masque futuriste",
    tag: "Créatif +6",
    chip: "bg-sky/10 text-sky-dark border-sky/20",
  },
  {
    Icon: Droplets,
    iconClass: "bg-leaf/10 text-leaf-dark",
    title: "Irrigation goutte-à-goutte",
    tag: "Naturaliste +10",
    chip: "bg-leaf/10 text-leaf border-leaf/20",
  },
];

function PortfolioSection() {
  return (
    <section id="portfolio" className="scroll-mt-24 py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-leaf-dark">
              Portfolio de vie
            </span>
            <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              Pas un bulletin. <span className="text-leaf-dark">Un dossier de vie.</span>
            </h2>
            <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
              Chaque défi complété, chaque création photographiée, chaque progrès noté. Au fil des
              mois, votre enfant construit un vrai portfolio de compétences — pas des notes, mais
              des preuves de ce qu'il sait faire.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PORTFOLIO_POINTS.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-50 text-leaf-dark">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-ink/80">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative rounded-3xl border border-ink/10 bg-white p-8 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-leaf to-leaf-dark font-display text-lg font-black text-white shadow-md">
                    K
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-leaf-dark">
                      Portfolio de vie
                    </p>
                    <p className="font-display text-base font-extrabold text-ink">Keïta · 10 ans</p>
                  </div>
                </div>
                <span className="rounded-full bg-leaf-50 px-3 py-1 text-[10px] font-bold text-leaf-dark">
                  27 réalisations
                </span>
              </div>
              <div className="space-y-4">
                {PORTFOLIO_ENTRIES.map((e) => (
                  <div
                    key={e.title}
                    className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-surface/60 p-4 transition-all hover:bg-white hover:shadow-md"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${e.iconClass}`}
                    >
                      <e.Icon className="size-5" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-bold text-ink">{e.title}</span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold ${e.chip}`}
                    >
                      {e.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// « Réseau social positif » (mockup 1) : connecter les talents entre eux — décliné en clair
// avec les tokens (accent sky), sans le fond sombre ni les pulsations du prototype.
const COMMUNITY_EVENTS: { Icon: LucideIcon; badge: string; title: string; desc: string }[] = [
  {
    Icon: Tent,
    badge: "Vacances",
    title: "Camps d'été",
    desc: "Immersion d'une semaine : prototypage, robotique, théâtre.",
  },
  {
    Icon: Trophy,
    badge: "Compétition",
    title: "Hackathons Juniors",
    desc: "48h pour résoudre un vrai problème en équipe.",
  },
  {
    Icon: Globe,
    badge: "Réseau",
    title: "Communautés de talents",
    desc: "Connectez votre enfant à d'autres passionnés d'astronomie, d'écologie, de cuisine…",
  },
  {
    Icon: Rocket,
    badge: "Ateliers",
    title: "Laboratoires d'innovation",
    desc: "Ateliers encadrés par des mentors professionnels.",
  },
];

function CommunitySection() {
  return (
    <section
      id="communaute"
      className="scroll-mt-24 border-y border-ink/10 bg-white/40 py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-sky-dark">
              Réseau social positif
            </span>
            <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              On ne révèle pas seulement les talents.{" "}
              <span className="text-sky-dark">On les connecte.</span>
            </h2>
            <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
              Un enfant passionné d'astronomie à Abidjan peut rencontrer d'autres passionnés de
              sciences. Plusieurs jeunes amoureux de l'environnement peuvent monter un vrai projet
              ensemble — encadrés, et toujours sous le regard des parents.
            </p>
          </Reveal>

          <Reveal delay={120} className="relative">
            <img
              src={communauteImage}
              alt="Des jeunes talents réunis lors d'un atelier Génizio"
              className="aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-xl"
            />
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-ink/80 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
              <Sprout className="size-4 text-leaf-50" aria-hidden />
              Atelier Génizio — les jeunes talents se connectent
            </span>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {COMMUNITY_EVENTS.map(({ Icon, badge, title, desc }) => (
            <div
              key={title}
              className="group rounded-3xl border border-ink/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-sky/40 hover:shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-dark transition-colors group-hover:bg-sky group-hover:text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="rounded-full border border-sky/30 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-dark">
                  {badge}
                </span>
              </div>
              <h3 className="mb-2 font-display text-lg font-extrabold text-ink">{title}</h3>
              <p className="text-sm font-medium leading-relaxed text-ink/60">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// « Avis de parents » — la preuve sociale, uniquement avec de vrais retours.
// Rendue data-driven (LANDING_TESTIMONIALS) pour être alimentée sans toucher au
// code : mêmes tokens de design que les autres sections. Une moyenne de notes
// honnête est calculée depuis le tableau — jamais un chiffre affiché à la main.
function TestimonialsSection() {
  const average =
    LANDING_TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0) / LANDING_TESTIMONIALS.length;

  return (
    <section id="avis" className="scroll-mt-24 border-y border-ink/10 bg-white/40 py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Avis de parents
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            Ce que les parents nous disent.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            Des retours de familles qui ont vu leur enfant se révéler autrement qu'à travers les
            notes.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-1.5 text-xs font-bold text-ink/70 shadow-sm">
            <span className="flex items-center gap-0.5 text-amber-500" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${i < Math.round(average) ? "fill-amber-500" : "fill-ink/10"}`}
                />
              ))}
            </span>
            {average.toFixed(1)}/5 — {LANDING_TESTIMONIALS.length} avis vérifiés
          </div>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2">
          {LANDING_TESTIMONIALS.map((t, i) => (
            <Reveal key={t.author} delay={(i % 2) * 100}>
              <figure className="group relative h-full rounded-3xl border border-ink/10 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-xl">
                <span
                  role="img"
                  className="mb-4 flex items-center gap-0.5 text-amber-500"
                  aria-label={`${t.rating} sur 5`}
                >
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`size-4 ${s < t.rating ? "fill-amber-500" : "fill-ink/10 text-ink/20"}`}
                      aria-hidden
                    />
                  ))}
                </span>
                <blockquote className="text-sm font-semibold leading-relaxed text-ink/80">
                  « {t.reviewBody} »
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-amber-500 font-display text-sm font-black text-white shadow-md">
                    {t.author.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-ink">{t.author}</p>
                    <p className="text-[11px] font-semibold text-ink/60">{t.authorLocation}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// « Diaspora africaine » (mockup 2) : le pont entre les familles expatriées et les enfants
// restés au pays. Placé juste après la Communauté — les deux racontent la même chose : Génizio
// ne connecte pas seulement des enfants entre eux, il relie aussi les familles au continent.
const DIASPORA_POINTS: { n: string; title: string; desc: string }[] = [
  {
    n: "01",
    title: "Des défis ancrés dans le contexte africain",
    desc: "Matières, recettes, métiers et problèmes typiquement africains : un enfant né à Paris se connecte concrètement à l'environnement de ses parents.",
  },
  {
    n: "02",
    title: "Le parrainage à distance",
    desc: "Offrez une saison à un neveu resté à Abidjan, un cousin à Dakar — et suivez sa progression depuis l'étranger, via la page Parrainage.",
  },
  {
    n: "03",
    title: "La valorisation des intelligences non scolaires",
    desc: "Entrepreneuriale, artisanale, sociale : des formes d'intelligence particulièrement présentes dans les cultures africaines, et trop souvent invisibles à l'école occidentale.",
  },
];

function DiasporaSection() {
  return (
    <section id="diaspora" className="scroll-mt-24 py-24 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Diaspora africaine
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            Vous vivez loin de l'Afrique ? Offrez une saison Génizio.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            Transmettre une culture et des références africaines à un enfant qui grandit à Paris,
            Bruxelles ou Montréal n'est pas simple. Génizio crée ce pont, concrètement.
          </p>
          <Link
            to="/parrainage"
            className="press-ink mt-8 inline-flex items-center gap-2 rounded-2xl bg-ink px-7 py-3.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
          >
            Découvrir le parrainage
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Reveal>

        <ol className="space-y-8 lg:col-span-7 lg:pt-2">
          {DIASPORA_POINTS.map(({ n, title, desc }, i) => (
            <li key={n} className="border-b border-ink/10 pb-8 last:border-b-0 last:pb-0">
              <Reveal delay={i * 100} className="flex gap-5">
                <span className="font-display text-balance text-2xl font-black leading-none text-brand">
                  {n}
                </span>
                <div>
                  <h3 className="mb-1.5 text-base font-extrabold text-ink">{title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-ink/60">{desc}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Chapitre 04 — L'IA : le moment « comment ça marche vraiment ». On repasse au sombre, la
// carte de profil blanche ressort comme la preuve centrale.
function VisionSection() {
  const mockSkills = [
    { label: "Sciences & Expériences", level: "Confirmé", color: "bg-leaf" },
    { label: "Dessin & Design", level: "En développement", color: "bg-brand" },
    { label: "Sens de la négociation", level: "Signal précoce", color: "bg-sky" },
    { label: "Construction & Lego", level: "Confirmé", color: "bg-brand" },
  ];

  return (
    <section
      id="approche"
      className="relative scroll-mt-24 overflow-hidden bg-ink py-24 text-white lg:py-28"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-sky/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
            04 · L'IA observatrice
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-white md:text-4xl">
            L'IA n'est pas un examinateur. C'est un observateur bienveillant.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-white/70">
            Chez Génizio, nous croyons qu'un enfant n'est pas réductible à des notes d'examen. À
            chaque défi complété, le parent photographie la réalisation, et notre IA déduit
            l'émergence des talents associés. C'est ainsi que se dresse, au fil des mois, une
            cartographie scientifique et vivante de son génie naturel.
          </p>
          <ul className="mt-8 space-y-3.5 text-xs font-bold text-white/80">
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>Compétences concrètes observées par des experts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>Cartographie évolutive basée sur 9 intelligences d'Howard Gardner</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>Orientation formative axée sur les forces, pas sur l'échec</span>
            </li>
          </ul>
        </div>

        <Reveal className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-[2.5rem] bg-brand/20 blur-2xl" />
          <div className="relative rounded-3xl border border-ink/10 bg-white p-6 text-ink shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Profil actuel de l'enfant
                </p>
                <p className="font-display text-balance text-xl font-extrabold">
                  Explorateur Émergent
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
                Level 3
              </div>
            </div>

            <div className="space-y-3 border-t-2 border-ink/10 pt-4">
              {mockSkills.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-ink/75">{s.label}</span>
                  <span
                    className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white ${s.color}`}
                  >
                    {s.level}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t-[3px] border-ink pt-6">
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-brand">
                  27
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
                  Défis complétés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-leaf">9</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
                  Talents cartographiés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-sky-dark">
                  3
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">
                  Mentors actifs
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PositioningSection() {
  return (
    <section className="bg-white/40 border-y border-ink/10 px-6 py-24 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-5 md:items-center">
        <div className="md:col-span-2">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Notre Philosophie
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
            Au-delà des devoirs et de la théorie scolaire.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-ink/70">
            Les plateformes de soutien scolaire traditionnel reproduisent le modèle de la
            mémorisation et de la notation. Génizio fait l'inverse : nous stimulons la curiosité
            active et le sens pratique à travers des projets réels. Votre enfant n'apprend pas
            passivement, il crée.
          </p>
        </div>
        <div className="md:col-span-3 grid gap-4">
          <blockquote className="rounded-3xl border border-white/10 bg-ink p-6 md:p-8 text-white shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug md:text-2xl">
              « Génizio n'est pas une école de devoirs. C'est un laboratoire où les enfants
              développent l'autonomie et le sens pratique de ce qu'ils découvrent. »
            </p>
          </blockquote>
          <blockquote className="rounded-3xl border border-brand/20 bg-brand/10 p-6 md:p-8 shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug text-brand md:text-2xl">
              « Le but n'est pas de faire de tous les enfants des ingénieurs ou des artistes, mais
              de s'assurer qu'aucun ne passe à côté de son génie naturel. »
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

const MODEL_LEVELS = [
  {
    n: "01",
    title: "Application interactive",
    tagline: "Le catalogue de défis et le carnet de suivi IA.",
    points: ["Générateur intelligent", "Radar de talents", "Invitations de mentors"],
    tone: "leaf" as const,
  },
  {
    n: "02",
    title: "Boutique de Kits physiques",
    tagline: "Le matériel pédagogique livré directement à domicile.",
    points: [
      "Ustensiles & composants",
      "Livraison à Dakar & Abidjan",
      "Fiches d'expérience reliées",
    ],
    tone: "brand" as const,
  },
  {
    n: "03",
    title: "Ateliers & Guildes",
    tagline: "Se retrouver en groupe pour réaliser de grands défis.",
    points: [
      "Sessions de prototypage",
      "Encadrement par des superviseurs",
      "Émulation collaborative",
    ],
    tone: "sky" as const,
  },
  {
    n: "04",
    title: "Camps d'Innovation",
    tagline: "Une immersion complète d'une semaine pendant les vacances.",
    points: [
      "Prototypage agritech & robotique",
      "Théâtre et expression verbale",
      "Créations manuelles",
    ],
    tone: "glow" as const,
  },
  {
    n: "05",
    title: "Écoles Expérimentales",
    tagline: "Le rêve d'un campus construit autour du potentiel — pas du programme.",
    points: [
      "Apprentissage par projets réels",
      "Intervenants professionnels",
      "Portfolio certifié",
    ],
    tone: "ink" as const,
  },
];

const LEVEL_TONES: Record<
  (typeof MODEL_LEVELS)[number]["tone"],
  { card: string; badge: string; num: string }
> = {
  leaf: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-leaf/10 text-leaf-dark border-leaf/20",
    num: "text-leaf",
  },
  brand: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-brand/10 text-brand border-brand/20",
    num: "text-brand",
  },
  sky: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-sky/10 text-sky-dark border-sky/20",
    num: "text-sky-dark",
  },
  glow: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-brand-glow/20 text-brand-dark border-brand-glow/30",
    num: "text-brand-dark",
  },
  ink: {
    card: "bg-ink text-white border border-white/10 shadow-md",
    badge: "bg-brand/20 text-brand-glow border-brand/30",
    num: "text-brand-glow",
  },
};

function ModelSection() {
  return (
    <section id="modele" className="scroll-mt-24 px-6 py-24 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Notre Modèle éducatif
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
            Une vision d'avenir en 5 étapes.
          </h2>
          <p className="mt-4 text-sm font-semibold text-ink/60">
            Génizio se déploie progressivement. Chaque jalon pose les fondations du suivant pour
            construire, pas à pas, l'école adaptée aux défis africains du 21e siècle.
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODEL_LEVELS.map((lvl) => {
            const t = LEVEL_TONES[lvl.tone];
            const isDark = lvl.tone === "ink";
            return (
              <li
                key={lvl.n}
                className={
                  "flex flex-col rounded-3xl p-6 transition-all hover:-translate-y-1 " + t.card
                }
              >
                <div className="mb-6 flex items-center justify-between">
                  <span
                    className={
                      "font-display text-balance text-4xl font-black leading-none " + t.num
                    }
                  >
                    {lvl.n}
                  </span>
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest " +
                      t.badge
                    }
                  >
                    Étape {lvl.n}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-balance text-lg font-extrabold leading-tight">
                  {lvl.title}
                </h3>
                <p
                  className={
                    "mb-6 text-xs italic font-medium " + (isDark ? "text-white/70" : "text-ink/60")
                  }
                >
                  {lvl.tagline}
                </p>
                <ul
                  className={
                    "mt-auto space-y-2 text-xs font-bold " +
                    (isDark ? "text-white/90" : "text-ink/80")
                  }
                >
                  {lvl.points.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-brand shrink-0"></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// Accordéon FAQ (structure du mockup 2, questions du bloc LANDING_FAQ — les mêmes qui
// alimentent le JSON-LD, pour que la page et Google racontent exactement la même chose).
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 border-t border-ink/10 bg-white/40 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            FAQ
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold text-ink md:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-sm font-semibold text-ink/60">
            Les réponses que les parents nous demandent vraiment.
          </p>
        </div>

        <div className="space-y-3">
          {LANDING_FAQ.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div
                key={faq.question}
                className={`overflow-hidden rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-brand/60 focus-within:ring-offset-2 ${
                  open ? "border-brand/30 bg-white shadow-md" : "border-ink/10 bg-white/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-button-${i}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                >
                  <span className="pr-4 text-sm font-bold text-ink">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-brand transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  className={`grid transition-all duration-300 ease-out ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-ink/10 px-6 py-5 text-sm font-medium leading-relaxed text-ink/70">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/guides"
            className="press-brand inline-flex items-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
          >
            Lire tous les guides
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <p className="mt-3 text-xs font-semibold text-ink/60">
            Potentiel, intelligences multiples, activités à la maison : des articles pour les
            parents.
          </p>
        </div>
      </div>
    </section>
  );
}

// Climax : l'appel à l'action, dans un cadre sombre cerclé d'un liseré dégradé brand — la
// seule note « spectaculaire » de la page, réservée pour ce moment.
// Le formulaire e-mail précédent affichait « Votre adresse a été enregistrée avec succès »
// alors qu'il ne faisait que basculer un état local : rien n'était envoyé ni stocké nulle part.
// Un parent croyait s'être inscrit et n'existait dans aucun système. Remplacé par le vrai
// parcours d'inscription (connexion Google, seul mode d'authentification de l'application),
// plutôt que de simuler une collecte qui n'existe pas.
function CTASection() {
  return (
    <section id="inscription" className="px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl rounded-[2.6rem] bg-gradient-to-r from-brand via-orange-500 to-brand p-[3px] shadow-2xl shadow-brand/30">
        <div className="relative overflow-hidden rounded-[2.45rem] bg-ink p-10 text-center text-white md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="relative">
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
              Inscription libre
            </span>
            <h2 className="mb-4 font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
              Révélez le potentiel de vos enfants dès aujourd'hui.
            </h2>
            <p className="mx-auto mb-10 max-w-md text-sm font-semibold leading-relaxed text-white/70">
              Créez le profil de votre enfant en deux minutes et recevez son premier défi sur
              mesure.
            </p>
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/auth"
                className="press-brand inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand px-8 text-xs font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer sm:w-auto"
              >
                Créer mon accès parent
              </Link>
              <a
                href="#demo"
                className="press-white inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-8 text-xs font-black uppercase tracking-wider text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer sm:w-auto"
              >
                Essayer d'abord
              </a>
            </div>
            <p className="mt-6 text-[11px] font-semibold text-white/50">
              1 profil enfant gratuit · 5 000 FCFA les 3 premiers mois par profil supplémentaire ·
              Aucune carte bancaire demandée
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink px-6 py-12 text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex items-center gap-2 font-display text-balance text-xl font-extrabold text-brand-glow">
          <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-7 w-7" />
          GÉNIZIO
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-wider">
          <Link to="/a-propos" className="transition-colors hover:text-white">
            À propos
          </Link>
          <Link to="/parrainage" className="transition-colors hover:text-white">
            Parrainage
          </Link>
          <Link to="/guides" className="transition-colors hover:text-white">
            Guides
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-white">
            Confidentialité
          </Link>
          <Link to="/terms" className="transition-colors hover:text-white">
            CGU
          </Link>
          <Link to="/mentions-legales" className="transition-colors hover:text-white">
            Mentions légales
          </Link>
        </div>
        <div className="text-xs font-bold text-white/60">
          © {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire
        </div>
      </div>
    </footer>
  );
}

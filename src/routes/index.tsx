import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { listPublishedTestimonials } from "@/lib/testimonials.functions";
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
  howToJsonLd,
  type ParentReview,
} from "@/lib/seo";

// Questions réellement tapées par des parents francophones, avec des réponses qui se
// suffisent à elles-mêmes : c'est le format que Google affiche en réponse directe et que les
// assistants IA (ChatGPT, Perplexity, Gemini) citent. Une réponse qui renvoie à « voir
// ci-dessus » n'est jamais reprise. La propriété optionnelle `link` ajoute un renvoi sous la
// réponse (affiché dans l'accordéon, ignoré du JSON-LD FAQ).
const LANDING_FAQ: {
  question: string;
  answer: string;
  link?: { to: "/tarifs"; label: string };
}[] = [
  {
    question: "Pourquoi préparer son enfant dès aujourd'hui aux mutations de l'IA ?",
    answer:
      "L'intelligence artificielle transforme en profondeur le monde du travail : elle rédige, code, calcule et manipule des connaissances théoriques en quelques secondes. Ce qui fera la valeur rare et durable d'un être humain, ce sont l'esprit critique, le jugement, l'ingéniosité pratique, la capacité à formuler les bons problèmes et l'audace de construire. Attendre les études supérieures pour développer ces compétences expose à des filières saturées ou obsolètes. Génizio entraîne ces réflexes humains clés dès l'enfance à travers des défis concrets et un accompagnement avec l'IA Naya.",
  },
  {
    question:
      "Comment fonctionne le renversement pédagogique de Génizio (pratique d'abord, théorie ensuite) ?",
    answer:
      "Le modèle scolaire traditionnel impose souvent de longues heures de théorie abstraite avant une pratique rare. Génizio inverse l'équation : l'enfant commence par une confrontation directe au réel (construire un système d'irrigation, concevoir un jeu, organiser une mini-vente). C'est en butant sur des contraintes réelles et en itérant qu'il ressent le besoin naturel d'aller chercher les principes mathématiques, physiques ou linguistiques. La théorie devient ainsi un instrument d'action puissant plutôt qu'une corvée abstraite.",
  },
  {
    question: "Comment révéler les talents uniques de son enfant face à la concurrence scolaire ?",
    answer:
      "À l'école, des milliers d'élèves suivent le même programme et obtiennent des diplômes uniformes. Pour émerger et trouver sa voie, un enfant doit découvrir ses singularités. Génizio propose des défis pratiques variés qui mobilisent les 9 intelligences de Howard Gardner (spatiale, entrepreneuriale, artisanale, relationnelle, logique, etc.). En observant comment l'enfant résout des situations inédites, l'application et l'IA Naya dressent une cartographie vivante de ses véritables forces.",
  },
  {
    question:
      "Que faire quand un enfant ne tient pas en place et peine dans le cadre purement théorique ?",
    answer:
      "Un enfant qui a besoin de bouger ou qui décroche face à un cours magistral possède souvent une intelligence corporelle, spatiale ou entrepreneuriale remarquable. Dans un système où l'IA gère la théorie, ces profils axés sur l'action et la création concrète sont appelés à exceller. Génizio leur offre un terrain d'expression où leur énergie est canalisée dans des réalisations valorisantes (sans poser de diagnostic médical, réservé aux professionnels de santé).",
  },
  {
    question: "Quelles activités éducatives proposer à un enfant de 5 à 16 ans à la maison ?",
    answer:
      "Les activités les plus formatrices sont celles qui produisent un résultat visible avec du matériel du quotidien : fabriquer un système d'arrosage avec des bouteilles, calculer le prix de revient d'un jus de fruits et le vendre, construire un pont en bâtonnets qui tient sans colle, teindre un tissu avec des pigments de fleurs. Elles mobilisent plusieurs intelligences à la fois et laissent une trace concrète dont l'enfant est fier. Génizio génère ce type de défis sur mesure selon l'âge, la ville et les centres d'intérêt de l'enfant.",
  },
  {
    question: "Qu'est-ce que la théorie des intelligences multiples de Howard Gardner ?",
    answer:
      "Proposée par le psychologue Howard Gardner, cette théorie démontre qu'il n'existe pas une intelligence unique mesurable par un QI, mais un bouquet de 9 formes d'intelligence : spatiale, entrepreneuriale, artisanale, logico-mathématique, linguistique, corporelle, créative/musicale, sociale et émotionnelle. Génizio s'appuie sur ce cadre pour valoriser chaque enfant dans sa globalité.",
  },
  {
    question: "Génizio remplace-t-il l'école ou le soutien scolaire ?",
    answer:
      "Non, Génizio complète l'école sans s'y opposer. L'école transmet le savoir académique indispensable. Génizio apprend à mobiliser ce savoir face au monde réel, à expérimenter et à développer des méta-compétences (résolution de problèmes, collaboration, jugement, esprit d'initiative).",
  },
  {
    question: "À partir de quel âge un enfant peut-il utiliser Génizio ?",
    answer:
      "Génizio est conçu pour les enfants de 5 à 16 ans. Les défis sont générés en fonction de l'âge précis de l'enfant : manipulations simples et courtes pour les plus jeunes, projets structurés sur plusieurs jours pour les adolescents. C'est le parent qui garde la main : il valide les défis et photographie les réalisations.",
  },
  {
    question: "Combien coûte Génizio ?",
    answer:
      "Génizio démarre gratuitement : le premier profil enfant est offert, sans carte bancaire demandée, et le premier défi sur mesure arrive dès la création du profil. Les profils supplémentaires coûtent 5 000 FCFA pour les trois premiers mois du compte, puis 15 000 FCFA par mois. L'abonnement famille couvre jusqu'à 5 profils, le Passeport d'Excellence se paie en une fois et les kits pédagogiques sont vendus à l'unité. Tous les plans, produits et tarifs détaillés figurent sur la page Tarifs.",
    link: { to: "/tarifs", label: "Voir tous les tarifs" },
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

// Avis de parents affichés sur la landing : la preuve sociale est désormais
// RÉELLE — les témoignages sont collectés dans l'application (espace parent,
// après un défi validé) et publiés dans parent_testimonials. La section se
// charge au montage (TestimonialsSection) et ne montre que les retours consentis
// + publiés (RLS). Aucun contenu rédigé, jamais : un faux avis est un risque de
// crédibilité réel face à un partenaire ou un moteur qui vérifie.

export const Route = createFileRoute("/")({
  head: () => {
    const meta = pageMeta({
      title: "Génizio — Préparer votre enfant à l'ère de l'IA & révéler ses forces",
      description:
        "Dans un monde où l'IA gère la théorie, développez l'ingéniosité pratique, la résolution de problèmes et l'esprit critique de votre enfant (5-16 ans) grâce à des défis réels et au compagnon IA Naya.",
      path: "/",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(SOFTWARE_APP_JSONLD),
        jsonLdScript(faqPageJsonLd(LANDING_FAQ)),
        // Les avis réels étant chargés côté client (parent_testimonials), le
        // JSON-LD statique du head ne peut pas les porter — l'agrégat des avis
        // serait vide et pénaliserait le SEO (reviewCount 0). On ne l'émet pas
        // ici : Google et les assistants lisent la section visible de la page,
        // alimentée par les vrais témoignages.
        // Méthode en trois actes, visible dans la section « Trois actes. Zéro
        // questionnaire. » (METHOD_STEPS) — le HowTo doit rester synchronisé avec
        // les étapes affichées.
        jsonLdScript(
          howToJsonLd({
            name: "Comment préparer son enfant aux compétences de demain avec Génizio",
            description:
              "La méthode Génizio en trois actes : l'enfant réalise un défi concret confronté au réel, le parent photographie la réalisation, et l'IA Naya cartographie l'évolution de ses aptitudes.",
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
      <TestimonialsSection />
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
  { href: "#domaines", label: "9 intelligences" },
  { href: "#portfolio", label: "Portfolio de vie" },
  { href: "#demo", label: "Exemple" },
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
          <img
            src="/favicon-96x96.png"
            alt="Logo Génizio"
            width="32"
            height="32"
            className="h-8 w-8"
          />
          GÉNIZIO
        </Link>
        <div className="hidden gap-8 font-bold text-sm lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                solid ? "text-ink/70 hover:text-brand" : "text-white/85 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/guides"
            className={`transition-colors ${
              solid ? "text-ink/70 hover:text-brand" : "text-white/85 hover:text-white"
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
                className="text-ink/70 hover:text-brand transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/guides"
              onClick={() => setIsOpen(false)}
              className="text-ink/70 hover:text-brand transition-colors"
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
            L'ère de l'IA transforme le monde · Préparez l'avenir
          </span>
          <h1 className="mb-6 font-display text-balance text-4xl font-extrabold leading-[1.04] md:text-6xl">
            L'école prépare aux examens.{" "}
            <span className="bg-gradient-to-r from-brand-glow to-amber-300 bg-clip-text text-transparent">
              Génizio prépare au monde qui arrive.
            </span>
          </h1>
          <p className="mb-9 max-w-xl text-base font-medium leading-relaxed text-white/85">
            Le marché du travail change à toute vitesse. Dans un monde où l'IA gère la théorie, ce
            sont l'ingéniosité pratique, la résolution de problèmes et l'esprit critique qui feront
            la différence. Ne laissez pas votre enfant suivre des filières d'hier : entraînez dès
            aujourd'hui ses compétences réelles face au monde.
          </p>
          <div className="mb-9 flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-md w-fit">
            <NayaAvatar size="sm" thoughts={["Bonjour ! Prêt pour un nouveau défi ?"]} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-glow">
                Co-pilote d'Entraînement Intellectuel
              </p>
              <p className="text-xs font-bold text-white/80">
                Guidé par Naya, notre IA qui aiguise l'esprit critique et l'action.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              to="/auth"
              className="press-brand rounded-2xl bg-brand px-8 py-4 text-center text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"
            >
              Créer mon compte gratuit
            </Link>
            <a
              href="#demo"
              className="press-white rounded-2xl bg-white px-8 py-4 text-center text-base font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"
            >
              Tester un défi pratique
            </a>
          </div>
          {/* Points clés différenciants */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-brand-glow" aria-hidden />
              <span className="text-xs font-bold text-white/85">
                Confrontation au réel avant la théorie
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-leaf-50" aria-hidden />
              <span className="text-xs font-bold text-white/85">
                Revanche des intelligences pratiques
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-sky-50" aria-hidden />
              <span className="text-xs font-bold text-white/85">
                Hybridation & apprentissage avec l'IA
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
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 text-balance">
                  Défis validés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-leaf-50">
                  9
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 text-balance">
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
            <p className="text-xs font-bold text-white">Naya a repéré un progrès marquant</p>
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

// Chapitre 01 — Le constat : le décalage historique entre l'école d'hier et l'ère de l'IA.
const PAINS: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: BookOpen,
    title: "L'illusion du diplôme uniforme",
    desc: "Des milliers d'élèves décrochent le même diplôme pour des filières saturées. Sans compétences distinctives réelles, le risque d'impasse professionnelle est massif.",
  },
  {
    Icon: Brain,
    title: "La théorie banalisée par l'IA",
    desc: "Rédiger, traduire, coder une fonction ou restituer une leçon : l'IA l'exécute en secondes. La vraie valeur humaine se déplace vers l'esprit critique, la décision et la création.",
  },
  {
    Icon: Globe,
    title: "L'urgence du virage pratique",
    desc: "Attendre les études supérieures pour confronter son savoir au réel est trop tard. L'enfant doit apprendre en faisant dès aujourd'hui pour donner du sens à la théorie.",
  },
];

// Le vrai enjeu — Le changement de paradigme pédagogique et la revanche des intelligences pratiques.
const STORY_STEPS: { n: string; title: string; desc: string }[] = [
  {
    n: "01",
    title: "Partir de la friction du réel",
    desc: "C'est en manipulant, en construisant et en se heurtant à la réalité physique ou économique que l'enfant développe une véritable intelligence situationnelle.",
  },
  {
    n: "02",
    title: "Susciter la soif de théorie",
    desc: "Quand un enfant cherche à faire tenir son pont ou vendre son produit, il comprend pourquoi les maths et la logique existent. La théorie devient un outil, plus une punition.",
  },
  {
    n: "03",
    title: "La revanche des profils atypiques",
    desc: "Ceux que l'école pénalisait (trop manuels, commerçants, spatiaux ou agités) détiennent les qualités d'action et d'adaptation dont l'économie de demain a besoin.",
  },
  {
    n: "04",
    title: "Des architectes, pas des exécutants",
    desc: "Ne formons pas des exécutants que les algorithmes remplaceront. Formons des esprits capables d'identifier les vrais problèmes et d'orchestrer l'IA pour bâtir.",
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
            Le changement de paradigme
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            Partir du réel pour donner soif de théorie.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            Le modèle hérité imposait l'abstrait avant une pratique rare et tardive. Génizio
            renverse l'équation : c'est en se confrontant au concret que l'enfant comprend pourquoi
            il apprend et développe sa singularité.
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
                <p className="text-sm font-medium leading-relaxed text-ink/70">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Confiance & Santé mentale — Préserver l'estime de soi face au carcan académique */}
        <Reveal delay={120} className="mt-8">
          <div className="grid items-center gap-6 rounded-3xl border border-ink bg-ink p-8 text-white shadow-xl md:grid-cols-12">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/20 text-brand-glow md:col-span-1">
              <HeartPulse className="size-6" aria-hidden />
            </span>
            <div className="md:col-span-11">
              <h3 className="font-display text-balance text-xl font-extrabold md:text-2xl">
                Ne pas confondre difficulté scolaire et manque de potentiel.
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                Des milliers d'enfants perdent confiance ou décrochent simplement parce que leurs
                talents naturels (spatiaux, entrepreneuriaux, artisanaux, relationnels) sont ignorés
                par le cadre académique classique. Leur redonner le goût de l'action réelle, c'est
                leur redonner foi en leur capacité à réussir.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Citation manifeste + CTA */}
        <Reveal delay={160} className="mx-auto mt-14 max-w-3xl text-center">
          <blockquote className="font-display text-balance text-2xl font-extrabold leading-snug text-ink md:text-3xl">
            « À l'école, on demande : "Qu'est-ce que ton enfant a retenu ?". Génizio pose la vraie
            question d'avenir : "Que sait-il accomplir lorsque personne ne lui donne la réponse ?" »
          </blockquote>
          <Link
            to="/guides/pratique-avant-theorie-apprentissage-ia"
            className="press-brand mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Découvrir pourquoi la pratique doit précéder la théorie
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
            Le monde change. L'école forme encore aux métiers d'hier.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
            L'école uniformise pour délivrer des diplômes identiques. Mais avec l'essor de l'IA et
            la mutation du marché mondial, la mémorisation ne protège plus : ce sont la singularité,
            l'ingéniosité pratique et l'adaptabilité qui feront la différence.
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
                <p className="text-sm font-medium leading-relaxed text-ink/70">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140} className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-sm font-semibold leading-relaxed text-ink/70">
            Qu'est-ce que mon enfant aime réellement ? Comment réfléchit-il ? Dans quoi est-il
            naturellement fort ? Dans quoi doit-il progresser ? La plupart des parents se posent
            ces questions sans pouvoir y répondre. Génizio y répond par l'observation de ses
            réalisations — pas par un test.
          </p>
        </Reveal>

        <Reveal delay={160} className="mx-auto mt-12 max-w-2xl text-center">
          <blockquote className="font-display text-balance text-xl font-semibold leading-snug text-ink/80 md:text-2xl">
            « Ne manquez pas le virage : tout comme l'informatique s'est imposée partout,{" "}
            <span className="text-brand">
              les compétences humaines distinctives et l'hybridation avec l'IA
            </span>{" "}
            décideront de qui sera acteur ou spectateur de demain. »
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
    title: "L'enfant affronte un défi réel",
    desc: "Naya génère un projet pratique adapté à son âge et son environnement (fabriquer, négocier, concevoir, tester). Pas de QCM : une confrontation directe au réel.",
  },
  {
    Icon: Camera,
    n: "02",
    title: "Le parent valide la preuve",
    desc: "Le pont autoportant, le produit commercialisé, le discours argumenté. Une réalisation tangible photographiée, pas une note abstraite sur du papier.",
  },
  {
    Icon: Map,
    n: "03",
    title: "Naya cartographie le potentiel",
    desc: "L'IA analyse les démarches et affine la cartographie dynamique des 9 intelligences. Les forces distinctives de l'enfant émergent projet après projet.",
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
            Trois actes. Zéro questionnaire abstrait.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-relaxed text-white/85">
            L'intelligence d'un enfant ne s'évalue pas en cochant des cases. Elle se révèle dans ce
            qu'il fabrique, ce qu'il organise, ce qu'il résout. Chaque défi lui fait vivre{" "}
            <span className="text-brand-glow">pourquoi le savoir est utile</span> — transformant
            l'apprentissage en pouvoir d'action.
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
                <p className="text-sm font-medium leading-relaxed text-white/80">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="relative mt-16">
          <img
            src={constatImage}
            alt="Un enfant en activité pratique Génizio — le talent se révèle dans l'action, pas dans un test"
            width="1280"
            height="720"
            loading="lazy"
            decoding="async"
            className="aspect-video w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl bg-gradient-to-t from-ink via-ink/20 to-transparent"
          />
          <figcaption className="absolute bottom-5 left-5 max-w-md rounded-2xl border border-white/15 bg-ink/80 px-5 py-4 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-glow">
              La preuve par la réalisation
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-white">
              L'enfant part de la pratique, résout les blocages du monde réel et bâtit des
              compétences durables.
            </p>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}

// Chapitre 03 — Le référentiel : les 9 intelligences de Gardner
function DomainsSection() {
  return (
    <section id="domaines" className="scroll-mt-24 py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-14 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            03 · Les 9 intelligences
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold text-ink md:text-4xl">
            Le capital humain que l'IA ne remplacera jamais.
          </h2>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-ink/70">
            L'intelligence spatiale, entrepreneuriale, artisanale, relationnelle ou stratégique :
            autant de dimensions fondamentales que les examens classiques ignorent. Génizio s'appuie
            sur les 9 intelligences d'Howard Gardner pour cartographier le profil complet de chaque
            enfant et cultiver ses atouts maîtres.
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
                <p className="text-xs font-semibold leading-relaxed text-ink/70">{desc}</p>
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
            <p className="mt-3 text-sm text-white/85 leading-relaxed font-semibold">
              Sélectionnez ci-dessous les comportements et activités de votre enfant pour voir son
              profil se construire en temps réel — et générer des défis adaptés à ses forces.
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
                    className="block text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1"
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
                  className="block text-[10px] font-bold uppercase tracking-widest text-white/80 mb-2"
                >
                  Âge : {age} ans
                </label>
                <input
                  id="landing-child-age"
                  type="range"
                  min={5}
                  max={16}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="landing-child-interests"
                  className="block text-[10px] font-bold uppercase tracking-widest text-white/80 mb-3"
                >
                  Sélectionner ses curiosités & forces
                </label>
                <div
                  id="landing-child-interests"
                  className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1"
                  role="group"
                  aria-label="Sélectionner les curiosités et forces de l'enfant"
                >
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-4 self-start">
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
                <p className="text-xs text-white/80 leading-relaxed font-semibold mt-1">
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
                    <p className="text-xs text-white/80 leading-relaxed font-medium mb-6">
                      {c.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/80">
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
              On ne se contente pas d'observer.{" "}
              <span className="text-sky-dark">On accompagne, on développe.</span>
            </h2>
            <p className="mt-5 text-sm font-semibold leading-relaxed text-ink/70">
              Un enfant passionné d'astronomie à Abidjan peut rencontrer d'autres passionnés de
              sciences. Plusieurs jeunes amoureux de l'environnement peuvent monter un vrai projet
              ensemble — encadrés par des mentors, et toujours sous le regard des parents.
            </p>
          </Reveal>

          <Reveal delay={120} className="relative">
            <img
              src={communauteImage}
              alt="Des jeunes talents réunis lors d'un atelier Génizio"
              width="1280"
              height="720"
              loading="lazy"
              decoding="async"
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
              <p className="text-sm font-medium leading-relaxed text-ink/70">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// « Avis de parents » — la preuve sociale, UNIQUEMENT avec de vrais retours.
// Les témoignages sont collectés dans l'application (espace parent, après un défi
// validé) et publiés dans parent_testimonials. La section se charge au montage :
// seuls les témoignages consentis + publiés sont visibles (RLS), jamais de
// contenu rédigé. Une moyenne honnête est calculée depuis les données réelles.
function TestimonialsSection() {
  const [reviews, setReviews] = useState<ParentReview[]>([]);
  const listTestimonials = useServerFn(listPublishedTestimonials);

  useEffect(() => {
    let cancelled = false;
    listTestimonials()
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .catch((err) => console.error("Chargement des témoignages:", err));
    return () => {
      cancelled = true;
    };
  }, [listTestimonials]);

  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, t) => sum + t.rating, 0) / reviews.length;

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
            Des retours donnés par les familles directement dans l'application — après avoir vu leur
            enfant se révéler autrement qu'à travers les notes.
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
            {average.toFixed(1)}/5 — {reviews.length} avis de parents
          </div>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2">
          {reviews.map((t, i) => {
            const childrenCount = t.childrenCount ?? 0;
            const challengesCompleted = t.challengesCompleted ?? 0;
            return (
              <Reveal key={`${t.author}-${i}`} delay={(i % 2) * 100}>
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
                  <figcaption className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-amber-500 font-display text-sm font-black text-white shadow-md">
                      {t.author.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-ink">{t.author}</p>
                      <p className="text-[11px] font-semibold text-ink/70">{t.authorLocation}</p>
                    </div>
                    {/* La nature de l'émetteur : un avis de parent n'a pas la même
                      valeur qu'un avis de mentor — on la rend visible. */}
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        t.senderType === "mentor"
                          ? "border-sky/30 bg-sky-50 text-sky-dark"
                          : "border-brand/25 bg-brand/10 text-brand"
                      }`}
                    >
                      {t.senderType === "mentor" ? "Avis de mentor" : "Avis de parent"}
                    </span>
                    {/* Les petits détails factuels qui donnent de la valeur à l'avis :
                      le témoignage vient d'un parent réel, avec un vrai usage. */}
                    <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                      {childrenCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-surface px-2.5 py-1 text-[10px] font-bold text-ink/60">
                          <Users className="size-3 text-brand" aria-hidden />
                          {childrenCount} enfant{childrenCount > 1 ? "s" : ""} inscrit
                          {childrenCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {challengesCompleted > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-surface px-2.5 py-1 text-[10px] font-bold text-ink/60">
                          <Trophy className="size-3 text-leaf" aria-hidden />
                          {challengesCompleted} défi{challengesCompleted > 1 ? "s" : ""} validé
                          {challengesCompleted > 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
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
              <div
                style={{ transitionDelay: `${i * 100}ms` }}
                className="flex gap-5 transition-all duration-700 ease-out motion-reduce:transition-none"
              >
                <span className="font-display text-balance text-2xl font-black leading-none text-brand">
                  {n}
                </span>
                <div>
                  <h3 className="mb-1.5 text-base font-extrabold text-ink">{title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-ink/70">{desc}</p>
                </div>
              </div>
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
    { label: "Résolution de problèmes", level: "Confirmé", color: "bg-leaf" },
    { label: "Sens de l'initiative & Vente", level: "En développement", color: "bg-brand" },
    { label: "Raisonnement spatial & 3D", level: "Signal précoce", color: "bg-sky" },
    { label: "Collaboration avec l'IA Naya", level: "Confirmé", color: "bg-brand" },
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
            04 · L'IA Partenaire d'entraînement
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Naya ne fait pas les devoirs à sa place. Elle muscle son esprit critique.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-white/85">
            L'IA ne doit pas remplacer l'effort intellectuel de votre enfant : elle doit en devenir
            le multiplicateur. Avec Naya, l'enfant apprend à formuler les bons problèmes, tester ses
            idées, surmonter l'échec et bâtir des projets concrets. À chaque réalisation validée par
            les parents, la cartographie de ses forces réelles s'affine.
          </p>
          <ul className="mt-8 space-y-3.5 text-xs font-bold text-white/80">
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>Hybridation précoce : apprendre à collaborer avec l'IA pour créer</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>Cartographie évolutive fondée sur les 9 intelligences d'Howard Gardner</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-lg bg-brand-glow/20 text-brand-glow">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <span>
                Orientation prospective : préparer l'employabilité et les forces réelles de demain
              </span>
            </li>
          </ul>
        </div>

        <Reveal className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-[2.5rem] bg-brand/20 blur-2xl" />
          <div className="relative rounded-3xl border border-ink/10 bg-white p-6 text-ink shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Cartographie dynamique du potentiel
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
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/70 text-balance">
                  Défis réels validés
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-leaf">9</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/70 text-balance">
                  Intelligences suivies
                </div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-sky-dark">
                  3
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/70 text-balance">
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
            L'école transmet le savoir. Génizio apprend à le mobiliser.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-ink/70">
            Les plateformes de soutien scolaire reproduisent souvent le modèle passif de la
            mémorisation et de la restitution. Génizio prend le contre-pied : nous entraînons la
            curiosité active, l'autonomie et le sens pratique à travers des projets réels. Votre
            enfant n'est plus un exécutant : il devient l'architecte de ses propres solutions.
          </p>
        </div>
        <div className="md:col-span-3 grid gap-4">
          <blockquote className="rounded-3xl border border-white/10 bg-ink p-6 md:p-8 text-white shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug md:text-2xl">
              « Génizio n'est pas une école de devoirs. C'est un laboratoire d'action où les enfants
              développent l'audace, le jugement et le sens pratique face au monde réel. »
            </p>
          </blockquote>
          <blockquote className="rounded-3xl border border-brand/20 bg-brand/10 p-6 md:p-8 shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug text-brand md:text-2xl">
              « Dans un monde où l'IA exécute la théorie, la véritable réussite n'est pas d'avoir
              toutes les réponses mémorisées, mais de savoir quoi faire face à une situation
              inédite. »
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
    points: ["Sessions de prototypage", "Encadrement par des mentors", "Émulation collaborative"],
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
    tagline: "Le rêve d'un campus construit autour du développement de chaque enfant — pas du programme.",
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
    badge: "bg-leaf/20 text-leaf-dark border-leaf/30",
    num: "text-leaf-dark",
  },
  brand: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-brand/15 text-brand-dark border-brand/25",
    num: "text-brand-dark",
  },
  sky: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-sky/15 text-sky-dark border-sky/25",
    num: "text-sky-dark",
  },
  glow: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-brand-glow/25 text-brand-dark border-brand-glow/35",
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
          <p className="mt-4 text-sm font-semibold text-ink/70">
            Génizio se déploie progressivement pour bâtir, pas à pas, l'infrastructure éducative
            adaptée aux défis du 21e siècle et à l'essor de l'intelligence artificielle.
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
                      "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest " +
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
                    "mb-6 text-xs italic font-medium " + (isDark ? "text-white/80" : "text-ink/70")
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
    <section id="faq" className="scroll-mt-24 border-t border-ink/10 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            FAQ
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold text-ink md:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-sm font-semibold text-ink/70">
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
                    <div className="border-t border-ink/10 px-6 py-5">
                      <p className="text-sm font-medium leading-relaxed text-ink/70">
                        {faq.answer}
                      </p>
                      {faq.link && (
                        <Link
                          to={faq.link.to}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand underline hover:text-ink"
                        >
                          {faq.link.label}
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      )}
                    </div>
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
          <p className="mt-3 text-xs font-semibold text-ink/70">
            Confiance en soi, réussite scolaire, intelligences multiples, activités à la maison :
            des articles écrits pour les parents.
          </p>
        </div>
      </div>
    </section>
  );
}

// Climax : l'appel à l'action
function CTASection() {
  return (
    <section id="inscription" className="px-6 py-16 lg:py-20">
      <div className="mx-auto max-w-4xl rounded-[2.6rem] bg-gradient-to-r from-brand via-orange-500 to-brand p-[3px] shadow-2xl shadow-brand/30">
        <div className="relative overflow-hidden rounded-[2.45rem] bg-ink p-8 text-center text-white sm:p-10 md:p-14">
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
              Préparez son avenir dès aujourd'hui
            </span>
            <h2 className="mb-4 font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
              Ne laissez pas votre enfant commencer demain avec les outils d'hier.
            </h2>
            <p className="mx-auto mb-10 max-w-md text-sm font-semibold leading-relaxed text-white/85">
              Créez son profil gratuitement en deux minutes et recevez son premier défi pratique
              pour tester ses réflexes face au réel.
            </p>
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/auth"
                className="press-brand inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand px-8 text-xs font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer sm:w-auto"
              >
                Créer mon accès parent gratuit
              </Link>
              <a
                href="#demo"
                className="press-white inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-8 text-xs font-black uppercase tracking-wider text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer sm:w-auto"
              >
                Tester un défi d'abord
              </a>
            </div>
            <p className="mt-6 text-[11px] font-semibold text-white/50">
              1 profil enfant gratuit · forfait famille 5 000 → 15 000 F/mois · paliers de +5
              enfants au même tarif · Accompagnement humain par un mentor (12 séances × 5 000
              F/mois/enfant) · Aucune carte bancaire demandée
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink px-6 py-12 text-white/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex items-center gap-2 font-display text-balance text-xl font-extrabold text-brand-glow">
          <img
            src="/favicon-96x96.png"
            alt="Logo Génizio"
            width="28"
            height="28"
            className="h-7 w-7"
          />
          GÉNIZIO
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-wider">
          <Link to="/a-propos" className="transition-colors hover:text-white">
            À propos
          </Link>
          <Link to="/tarifs" className="transition-colors hover:text-white">
            Tarifs
          </Link>
          <Link to="/parrainage" className="transition-colors hover:text-white">
            Parrainage
          </Link>
          <Link to="/guides" className="transition-colors hover:text-white">
            Guides
          </Link>
          <Link to="/remboursements" className="transition-colors hover:text-white">
            Remboursements
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
        <div className="text-xs font-bold text-white/80">
          © {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire
        </div>
      </div>
    </footer>
  );
}

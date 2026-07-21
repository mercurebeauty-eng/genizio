import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import heroChild from "@/assets/hero-child.jpg";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { Users, Brain, ShoppingBag, Award, Sparkles, BookOpen, Star, HelpCircle, ArrowRight, ShieldCheck, Menu, X } from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/")({
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
  {
    domain: "Agriculture & Nature",
    title: "L'irrigation goutte-à-goutte",
    desc: "Fabrique un système d'arrosage automatique pour le jardin avec des bouteilles recyclées et régule le débit d'eau.",
    duration: "3 jours",
    tone: "leaf",
    interests: ["Orientation & Exploration", "Sciences & Expériences", "Bricolage manuel"],
  },
  {
    domain: "Arts Visuels & Espace",
    title: "Masques du futur",
    desc: "Dessine et assemble un masque traditionnel imaginé pour un explorateur de l'espace en 2080 avec des matières recyclées.",
    duration: "2 heures",
    tone: "brand",
    interests: ["Dessin & Design", "Bricolage créatif", "Invente des histoires"],
  },
  {
    domain: "Entrepreneuriat",
    title: "Le kiosque à jus de fruits",
    desc: "Calcule le coût d'un verre de bissap, crée un logo original et simule la vente pour en dégager un bénéfice réel.",
    duration: "1 après-midi",
    tone: "sky",
    interests: ["Aime vendre / échanger", "Curieux du commerce", "Cuisine", "Dessin & Design"],
  },
  {
    domain: "Logique & Sciences",
    title: "Le pont autoportant de Léonard",
    desc: "Construis un pont miniature en bâtonnets en utilisant uniquement l'imbrication des forces, sans clous ni colle.",
    duration: "1h30",
    tone: "ink",
    interests: ["Construction & Lego", "Sciences & Expériences", "Jeux de stratégie"],
  },
  {
    domain: "Mouvement & Sport",
    title: "Conception du parcours d'agilité",
    desc: "Conçois un parcours d'obstacles chez toi, chronomètre tes essais et optimise ton score pour battre le record familial.",
    duration: "45 min",
    tone: "brand",
    interests: ["Sport & Mouvement", "Danse", "Bricolage manuel"],
  },
  {
    domain: "Linguistique & Mots",
    title: "Le plaidoyer pour le tri des déchets",
    desc: "Rédige et prononce un discours engagé de 2 minutes pour convaincre ta famille de recycler au quotidien.",
    duration: "1 heure",
    tone: "leaf",
    interests: ["Prise de parole en public", "Écriture & Poésie", "Aime parler & raconter"],
  },
  {
    domain: "Sciences & Recherche",
    title: "L'enquêteur du quartier",
    desc: "Interviewe un artisan ou un aîné du quartier sur son métier et raconte son histoire sous forme de mini-reportage photo.",
    duration: "1 journée",
    tone: "sky",
    interests: ["Aime parler & raconter", "Aime jouer en groupe", "Aide les autres"],
  },
  {
    domain: "Cuisine & Artisanat",
    title: "La teinture végétale",
    desc: "Extraie des pigments naturels de fleurs d'hibiscus ou d'écorces pour créer des motifs de teinture originaux sur un vieux tissu.",
    duration: "2 heures",
    tone: "ink",
    interests: ["Cuisine", "Travaux manuels", "Bricolage créatif"],
  },
];

const DOMAINS = [
  { key: "spatial", label: "Spatiale & Visuelle", icon: "🏗️", desc: "Architecture, construction de volumes, dessin et repérage dans l'espace." },
  { key: "corporelle", label: "Corporelle & Mouvement", icon: "⚽", desc: "Motricité globale, agilité, théâtre et expression physique." },
  { key: "sociale", label: "Sociale & Relations", icon: "🤝", desc: "Coopération, empathie, leadership naturel et négociation collective." },
  { key: "entrepreneuriale", label: "Entreprendre & Projets", icon: "💡", desc: "Initiation commerciale, gestion, organisation et sens pratique de la valeur." },
  { key: "creative", label: "Créative & Artistique", icon: "🎨", desc: "Expression picturale, composition musicale, improvisation et contes." },
  { key: "artisanale", label: "Artisanale & Manuelle", icon: "🪵", desc: "Cuisine, couture, menuiserie, bricolage et entretien d'objets." },
  { key: "emotionnelle", label: "Émotionnelle & Soi", icon: "❤️", desc: "Connaissance de ses forces, confiance, persévérance et gestion du stress." },
  { key: "logico_mathematique", label: "Logique & Sciences", icon: "🔬", desc: "Résolution d'énigmes mathématiques, algorithmes simples et expériences." },
  { key: "linguistique", label: "Linguistique & Mots", icon: "🗣️", desc: "Expression orale, plaidoyers, goût de la lecture et rédaction créative." },
];

const TONE_STYLES: Record<Challenge["tone"], { chip: string; num: string }> = {
  leaf: { chip: "bg-leaf/10 text-leaf border-leaf/20", num: "bg-leaf text-white" },
  brand: { chip: "bg-brand/10 text-brand border-brand/20", num: "bg-brand text-white" },
  sky: { chip: "bg-sky/10 text-sky border-sky/20", num: "bg-sky text-white" },
  ink: { chip: "bg-ink/10 text-ink border-ink/20", num: "bg-ink text-white" },
};

function NayaLanding() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/profiles", replace: true });
    }
  }, [session, loading, navigate]);

  if (loading || session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <Nav />
      <Hero />
      <DomainsSection />
      <DemoSection />
      <VisionSection />
      <PositioningSection />
      <ModelSection />
      <CTASection />
      <Footer />
    </div>
  );
}

const NAV_LINKS = [
  { href: "#approche", label: "L'approche" },
  { href: "#domaines", label: "Les 9 Talents" },
  { href: "#demo", label: "Simulateur" },
  { href: "#modele", label: "Vision 5 Niveaux" },
];

function Nav() {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/10 bg-surface/90 backdrop-blur-md transition-all shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to={session ? "/profiles" : "/"} className="flex items-center gap-2 font-display text-balance text-2xl font-extrabold tracking-tight text-brand">
          <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
          GÉNIZIO
        </Link>
        <div className="hidden gap-8 font-bold text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-ink/60 hover:text-brand transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Link
              to="/profiles"
              className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">Accéder à l'Espace Parent</span>
              <span className="sm:hidden">Espace Parent</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
            >
              Se connecter
            </Link>
          )}
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isOpen}
            className="rounded-full border border-ink/10 bg-white p-2 shadow-sm md:hidden"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-ink/10 bg-surface px-6 py-4 md:hidden animate-in slide-in-from-top-5 duration-200">
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
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* Background Aura Gradient Blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-20 h-96 w-96 rounded-full bg-sky/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-24 ">
        <div>
          <span className="mb-4 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand/20">
            Le laboratoire de potentiel par projet
          </span>
          <h1 className="mb-6 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl text-ink">
            Révélez les <span className="text-brand">intelligences</span> naturelles de votre enfant.
          </h1>
          <p className="mb-8 text-base font-medium leading-relaxed text-ink/70">
            Bien plus qu'un soutien scolaire. Génizio propose à votre enfant d'expérimenter le monde réel grâce à des défis d'apprentissage sur-mesure validés par l'IA et accompagnés par des mentors.
          </p>
          <div className="mb-8 flex items-center gap-3.5 rounded-2xl border border-ink/10 bg-white/90 p-4 shadow-md backdrop-blur-md w-fit">
            <NayaAvatar size="sm" thoughts={["Bonjour ! Prêt pour un nouveau défi ?"]} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand">Co-pilote Pédagogique</p>
              <p className="text-xs font-bold text-ink/75">Guidé par Naya, notre IA mentore bienveillante.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 ">
            <a
              href="#demo"
              className="press-brand rounded-2xl bg-brand px-8 py-4 text-center text-base font-bold text-white cursor-pointer"
            >
              Tester le Simulateur
            </a>
            <Link
              to="/auth"
              className="press-white rounded-2xl border border-ink/10 bg-white px-8 py-4 text-center text-base font-bold text-ink cursor-pointer"
            >
              Créer un compte
            </Link>
          </div>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="size-8 rounded-full border-2 border-ink bg-brand" />
            <div className="size-8 rounded-full border-2 border-ink bg-leaf" />
            <div className="size-8 rounded-full border-2 border-ink bg-sky" />
            <div className="size-8 rounded-full border-2 border-ink bg-ink" />
          </div>
          <span className="text-xs font-bold text-ink/60 uppercase tracking-wide">
            Rejoint par des familles à Dakar, Abidjan et Yaoundé
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-4 -rotate-1 rounded-[3rem] bg-brand/10 border-2 border-dashed border-brand/20"
        />
        <img
          src={heroChild}
          alt="Activité d'expérimentation pratique Génizio"
          width={1200}
          height={1200}
          className="relative aspect-square w-full rotate-1 rounded-3xl border border-ink/10 object-cover shadow-xl transition-transform hover:rotate-0"
        />
        <div className="absolute -bottom-6 -left-6 hidden max-w-[280px] rounded-2xl border border-ink/10 bg-white/95 p-5 shadow-lg backdrop-blur-md md:block">
          <p className="text-xs font-bold italic leading-relaxed text-ink/80">
            « Avec les défis d'entrepreneuriat et de sciences, ma fille de 9 ans a appris à concevoir des projets réels au lieu de juste réciter ses leçons. »
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand">— Aminata, Abidjan</p>
        </div>
      </div>
      </div>
    </header>
  );
}

function DomainsSection() {
  return (
    <section id="domaines" className="border-y border-ink/10 bg-white/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Cadre Théorique (Gardner)
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold md:text-4xl text-ink">
            Les 9 formes d'intelligence.
          </h2>
          <p className="mt-3 text-sm font-semibold text-ink/60">
            Génizio s'appuie sur la théorie des intelligences multiples de Howard Gardner pour valoriser tous les profils de talents : manuel, scientifique, relationnel ou créatif.
          </p>
        </div>

        <div className="grid gap-4  ">
          {DOMAINS.map((d) => (
            <div
              key={d.label}
              className="group relative rounded-2xl border border-ink/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{d.icon}</span>
                <h3 className="font-display text-balance text-base font-extrabold text-ink">{d.label}</h3>
              </div>
              <p className="text-xs text-ink/60 leading-relaxed font-semibold">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [name, setName] = useState("Keïta");
  const [age, setAge] = useState(10);
  
  // Flatten all tags to initialize interests picker
  const allInterestTags = useMemo(() => {
    return Object.values(INTERESTS_BY_TALENT).flatMap(g => g.tags);
  }, []);

  const [interests, setInterests] = useState<string[]>([
    "Sciences & Expériences",
    "Dessin & Peinture",
    "Construction & Lego"
  ]);

  const toggleInterest = (tag: string) => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Generate dynamic talents based on selected interests
  const mockTalents = useMemo(() => {
    const base: Record<string, number> = {
      spatial: 15,
      corporelle: 15,
      sociale: 15,
      entrepreneuriale: 15,
      creative: 15,
      artisanale: 15,
      emotionnelle: 15,
      logico_mathematique: 15,
      linguistique: 15,
    };
    Object.entries(INTERESTS_BY_TALENT).forEach(([key, value]) => {
      const matchCount = value.tags.filter(t => interests.includes(t)).length;
      base[key] += matchCount * 8; // 8 points per selected interest tag (gradual progression)
      if (base[key] > 95) base[key] = 95; // cap it
    });
    return base;
  }, [interests]);

  // Filter challenges matching selected interests
  const matchedChallenges = useMemo(() => {
    const scored = CHALLENGES.map((challenge) => {
      const matchCount = challenge.interests.filter(i => interests.includes(i)).length;
      return { challenge, score: matchCount };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map(s => s.challenge);
  }, [interests]);

  return (
    <section id="demo" className="bg-ink px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col justify-between gap-6  md:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
              Outil interactif de démonstration
            </span>
            <h2 className="font-display text-balance text-3xl font-extrabold text-white md:text-4xl">
              Simulez la Carte des Talents de votre enfant.
            </h2>
            <p className="mt-3 text-sm text-white/60 leading-relaxed font-semibold">
              Sélectionnez ci-dessous les comportements et activités de votre enfant pour voir son potentiel se cartographier en temps réel et générer des défis adaptés.
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
            <div className="rounded-3xl border-2 border-white/20 bg-white/5 p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-xl border-2 border-brand bg-brand/20 font-display text-balance text-xl font-bold text-brand-glow">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Prénom de l'enfant</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    className="w-full border-b-2 border-white/20 bg-transparent pb-1 text-base font-bold text-white outline-none focus:border-brand transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
                  Âge : {age} ans
                </label>
                <input
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
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
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
            <div className="rounded-3xl border-2 border-white/20 bg-white/5 p-6 flex flex-col items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4 self-start">
                Profil en temps réel (Radar des intelligences)
              </h4>
              <TalentRadarChart talents={mockTalents} name={name} className="h-64 w-full" age={age} dark />
            </div>

          </div>

          {/* RIGHT COLUMN: Live recommendation result */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border-2 border-brand/50 bg-brand/10 p-6 flex items-start gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-brand/20 border border-brand text-brand-glow shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h4 className="font-display text-balance font-extrabold text-white text-base">Recommandation IA pour {name}</h4>
                <p className="text-xs text-white/70 leading-relaxed font-semibold mt-1">
                  Basé sur les centres d'intérêt sélectionnés, {name} présente un profil axé sur l'expérimentation active. Nous suggérons des défis qui allient observation méthodique et mise en œuvre manuelle de projets.
                </p>
              </div>
            </div>

            {/* Generated challenges cards */}
            <div className="grid gap-4 ">
              {matchedChallenges.map((c, index) => (
                <div
                  key={c.title}
                  className="group rounded-3xl border border-ink/10 bg-white p-5 text-ink shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`grid size-9 place-items-center rounded-xl border-2 border-ink text-xs font-black font-mono ${TONE_STYLES[c.tone].num}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${TONE_STYLES[c.tone].chip}`}>
                        {c.domain}
                      </span>
                    </div>
                    <h4 className="font-display text-balance text-base font-extrabold text-ink mb-2 leading-tight group-hover:text-brand transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-xs text-ink/60 leading-relaxed font-medium mb-6">
                      {c.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-ink/5 pt-3 mt-4">
                    <span className="text-[10px] font-bold text-ink/60">⏱ {c.duration}</span>
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-dark hover:underline"
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

function VisionSection() {
  const mockSkills = [
    { label: "Sciences & Expériences", level: "Confirmé", color: "bg-leaf" },
    { label: "Dessin & Design", level: "En développement", color: "bg-brand" },
    { label: "Sens de la négociation", level: "Signal précoce", color: "bg-sky" },
    { label: "Construction & Lego", level: "Confirmé", color: "bg-brand" },
  ];

  return (
    <section id="approche" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-16 ">
        <div>
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Un portfolio vivant de réussites
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
            L'IA n'est pas un examinateur. C'est un observateur bienveillant.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-ink/70">
            Chez Génizio, nous croyons qu'un enfant n'est pas réductible à des notes d'examen. À chaque défi complété, le parent photographie la réalisation, et notre IA déduit l'émergence des talents associés. C'est ainsi que se dresse, au fil des mois, une cartographie scientifique et vivante de son génie naturel.
          </p>
          <ul className="mt-8 space-y-3.5 text-xs font-bold text-ink/80">
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-xl bg-brand/10 border-2 border-ink text-brand font-black">
                ✓
              </span>
              <span>Compétences concrètes observées par des experts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-xl bg-brand/10 border-2 border-ink text-brand font-black">
                ✓
              </span>
              <span>Cartographie évolutive basée sur 9 intelligences d'Howard Gardner</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-xl bg-brand/10 border-2 border-ink text-brand font-black">
                ✓
              </span>
              <span>Orientation formative axée sur les forces, pas sur l'échec</span>
            </li>
          </ul>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-3xl bg-brand/5 blur-2xl border-2 border-brand/10" />
          <div className="relative rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Profil actuel de l'enfant
                </p>
                <p className="font-display text-balance text-xl font-extrabold">Explorateur Émergent</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl border-2 border-dashed border-ink text-xs font-bold bg-stone-50">
                Level 3
              </div>
            </div>

            <div className="space-y-3 border-t-2 border-ink/10 pt-4">
              {mockSkills.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink/75">{s.label}</span>
                  <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white ${s.color}`}>
                    {s.level}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t-[3px] border-ink pt-6">
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-brand">27</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">Défis complétés</div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-leaf">9</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">Talents cartographiés</div>
              </div>
              <div className="text-center">
                <div className="font-display text-balance text-2xl font-extrabold text-sky">3</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60">Mentors actifs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PositioningSection() {
  return (
    <section className="bg-white/40 border-y-[3px] border-ink px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12  md:items-center">
        <div className="md:col-span-2">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Notre Philosophie
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
            Au-delà des devoirs et de la théorie scolaire.
          </h2>
          <p className="mt-6 text-sm font-semibold leading-relaxed text-ink/70">
            Les plateformes de soutien scolaire traditionnel reproduisent le modèle de la mémorisation et de la notation. Génizio fait l'inverse : nous stimulons la curiosité active et le sens pratique à travers des projets réels. Votre enfant n'apprend pas passivement, il crée.
          </p>
        </div>
        <div className="md:col-span-3 grid gap-4">
          <blockquote className="rounded-3xl border border-white/10 bg-ink p-6 md:p-8 text-white shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug md:text-2xl">
              « Génizio n'est pas une école de devoirs. C'est un laboratoire où les enfants développent l'autonomie et le sens pratique de ce qu'ils découvrent. »
            </p>
          </blockquote>
          <blockquote className="rounded-3xl border border-ink/10 bg-brand/10 p-6 md:p-8 shadow-xl">
            <p className="font-display text-balance text-xl font-extrabold leading-snug text-brand md:text-2xl">
              « Le but n'est pas de faire de tous les enfants des ingénieurs ou des artistes, mais de s'assurer qu'aucun ne passe à côté de son génie naturel. »
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
    points: ["Ustensiles & composants", "Livraison à Dakar & Abidjan", "Fiches d'expérience reliées"],
    tone: "brand" as const,
  },
  {
    n: "03",
    title: "Ateliers & Guildes",
    tagline: "Se retrouver en groupe pour réaliser de grands défis.",
    points: ["Sessions de prototypage", "Encadrement par des superviseurs", "Émulation collaborative"],
    tone: "sky" as const,
  },
  {
    n: "04",
    title: "Camps de d'Innovation",
    tagline: "Une immersion complète d'une semaine pendant les vacances.",
    points: ["Prototypage agritech & robotique", "Théâtre et expression verbale", "Créations manuelles"],
    tone: "glow" as const,
  },
  {
    n: "05",
    title: "Écoles Expérimentales",
    tagline: "Le rêve d'un campus construit autour du potentiel — pas du programme.",
    points: ["Apprentissage par projets réels", "Intervenants professionnels", "Portfolio certifié"],
    tone: "ink" as const,
  },
];

const LEVEL_TONES: Record<
  (typeof MODEL_LEVELS)[number]["tone"],
  { card: string; badge: string; num: string }
> = {
  leaf: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-leaf/10 text-leaf border-leaf/20",
    num: "text-leaf",
  },
  brand: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-brand/10 text-brand border-brand/20",
    num: "text-brand",
  },
  sky: {
    card: "bg-white border border-ink/10 shadow-md",
    badge: "bg-sky/10 text-sky border-sky/20",
    num: "text-sky",
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
    <section id="modele" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Notre Modèle éducatif
          </span>
          <h2 className="font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
            Une vision d'avenir en 5 étapes.
          </h2>
          <p className="mt-4 text-sm font-semibold text-ink/60">
            Génizio se déploie progressivement. Chaque jalon pose les fondations du suivant pour construire, pas à pas, l'école adaptée aux défis africains du 21e siècle.
          </p>
        </div>

        <ol className="grid gap-6  ">
          {MODEL_LEVELS.map((lvl) => {
            const t = LEVEL_TONES[lvl.tone];
            const isDark = lvl.tone === "ink";
            return (
              <li
                key={lvl.n}
                className={
                  "flex flex-col rounded-3xl p-6 transition-all hover:-translate-y-0.5 " +
                  t.card
                }
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className={"font-display text-balance text-4xl font-black leading-none " + t.num}>
                    {lvl.n}
                  </span>
                  <span className={"rounded-full border-2 border-ink px-3 py-1 text-[9px] font-black uppercase tracking-widest " + t.badge}>
                    Étape {lvl.n}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-balance text-lg font-extrabold leading-tight">{lvl.title}</h3>
                <p className={"mb-6 text-xs italic font-medium " + (isDark ? "text-white/70" : "text-ink/60")}>
                  {lvl.tagline}
                </p>
                <ul className={"mt-auto space-y-2 text-xs font-bold " + (isDark ? "text-white/90" : "text-ink/80")}>
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

function CTASection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  
  return (
    <section id="inscription" className="px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-white/10 bg-ink p-10 text-center text-white shadow-xl md:p-14">
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
          Inscription libre
        </span>
        <h2 className="mb-4 font-display text-balance text-3xl font-extrabold leading-tight md:text-4xl">
          Révélez le potentiel de vos enfants dès aujourd'hui.
        </h2>
        <p className="mx-auto mb-10 max-w-md text-sm text-white/70 font-semibold leading-relaxed">
          Rejoignez les parents précurseurs qui façonnent avec nous le développement éducatif de la nouvelle génération.
        </p>
        {sent ? (
          <div className="mx-auto max-w-md rounded-2xl border-2 border-brand-glow bg-brand/10 px-6 py-4 font-bold text-brand-glow">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="size-5" />
              <span>Merci ! Votre adresse a été enregistrée avec succès.</span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSent(true);
            }}
            className="mx-auto flex max-w-md flex-col gap-3 "
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="h-12 flex-1 rounded-2xl border-2 border-white/30 bg-white/10 px-4 text-xs font-bold text-white placeholder:text-white/60 outline-none focus:border-brand transition-all"
              aria-label="Adresse email"
            />
            <button
              type="submit"
              className="press-brand h-12 rounded-2xl bg-brand px-8 text-xs font-black uppercase tracking-wider text-white cursor-pointer shrink-0"
            >
              Créer mon accès parent
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-[3px] border-ink px-6 py-12 bg-white/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 ">
        <div className="flex items-center gap-2 font-display text-balance text-xl font-extrabold text-brand">
          <img src="/favicon-96x96.png" alt="" className="h-7 w-7" />
          GÉNIZIO
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-ink/60 uppercase tracking-wider">
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
        <div className="text-xs font-bold text-ink/60">
          © 2026 Génizio — Dakar · Abidjan · Yaoundé
        </div>
      </div>
    </footer>
  );
}

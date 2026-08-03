import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSession } from "@/hooks/use-session";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import {
  Users, Brain, Sparkles, BookOpen, Star, ArrowRight,
  ShieldCheck, Menu, X, Compass, Activity, Lightbulb, Palette, Hammer, HeartHandshake,
  MessagesSquare, Zap, Globe, Trophy, CheckCircle2, ArrowDown, ChevronDown, Rocket,
} from "lucide-react";
import { pageMeta, jsonLdScript, faqPageJsonLd, SOFTWARE_APP_JSONLD } from "@/lib/seo";
import {
  motion, useInView, AnimatePresence, useScroll, useTransform,
} from "framer-motion";

/* ============================================================
   ANIMATION HELPERS
   ============================================================ */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RevealLine({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ scaleX: 0 }}
      animate={inView ? { scaleX: 1 } : {}}
      transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`h-px bg-gradient-to-r from-brand/30 via-leaf/30 to-sky/30 origin-left ${className}`}
    />
  );
}

function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   DATA
   ============================================================ */
const TALENTS = [
  { icon: Compass, label: "Spatiale", color: "from-brand to-brand-light", desc: "Architecture, construction, dessin" },
  { icon: Activity, label: "Corporelle", color: "from-rose-500 to-pink-400", desc: "Agilité, théâtre, expression" },
  { icon: Users, label: "Sociale", color: "from-sky to-sky-light", desc: "Leadership, empathie" },
  { icon: Lightbulb, label: "Entrepreneuriale", color: "from-gold to-brand-light", desc: "Commerce, gestion" },
  { icon: Palette, label: "Créative", color: "from-violet to-violet-light", desc: "Peinture, musique, contes" },
  { icon: Hammer, label: "Artisanale", color: "from-leaf to-leaf-light", desc: "Cuisine, couture, bricolage" },
  { icon: HeartHandshake, label: "Émotionnelle", color: "from-sky to-violet-light", desc: "Confiance, persévérance" },
  { icon: Brain, label: "Logico-mathématique", color: "from-brand-dark to-brand", desc: "Énigmes, algorithmes" },
  { icon: MessagesSquare, label: "Linguistique", color: "from-gold to-brand", desc: "Plaidoyer, lecture, écriture" },
];

type ToneKey = "leaf" | "brand" | "sky" | "ink" | "violet";

const ACCENT: Record<ToneKey, { chip: string }> = {
  leaf: { chip: "bg-leaf/10 text-leaf border-leaf/20" },
  brand: { chip: "bg-brand/10 text-brand border-brand/20" },
  sky: { chip: "bg-sky/10 text-sky border-sky/20" },
  ink: { chip: "bg-ink/10 text-ink border-ink/20" },
  violet: { chip: "bg-violet/10 text-violet border-violet/20" },
};

type Challenge = {
  domain: string; title: string; desc: string; duration: string;
  color: string; accent: ToneKey;
};

const CHALLENGES: Challenge[] = [
  { domain: "Agriculture & Nature", title: "L'irrigation goutte-à-goutte", desc: "Fabrique un système d'arrosage automatique avec des bouteilles recyclées.", duration: "3 jours", color: "from-leaf to-leaf-light", accent: "leaf" },
  { domain: "Arts Visuels", title: "Masques du futur", desc: "Dessine un masque pour un explorateur de l'espace en 2080.", duration: "2 heures", color: "from-brand to-brand-light", accent: "brand" },
  { domain: "Entrepreneuriat", title: "Le kiosque à jus de fruits", desc: "Calcule le coût d'un bissap, crée un logo, simule la vente.", duration: "1 après-midi", color: "from-sky to-sky-light", accent: "sky" },
  { domain: "Logique & Sciences", title: "Le pont autoportant", desc: "Construis un pont miniature en bâtonnets, sans clous ni colle.", duration: "1h30", color: "from-ink to-ink-light", accent: "ink" },
];

const STEPS = [
  { num: "01", title: "L'enfant fait", desc: "Un défi concret, adapté à son âge et son contexte. Pas un questionnaire — le premier pas de sa trajectoire.", color: "from-brand to-brand-light" },
  { num: "02", title: "Naya observe", desc: "L'IA analyse la réalisation, pas le résultat. Comment il pense, ce qui l'absorbe — les jalons de la trajectoire.", color: "from-violet to-violet-light" },
  { num: "03", title: "La trajectoire se dessine", desc: "Le chemin le plus court entre aujourd'hui et demain se construit, défi après défi. Pas un bulletin — une trajectoire.", color: "from-leaf to-leaf-light" },
];

const VISION = [
  { n: "01", title: "Application interactive", tagline: "Le catalogue de défis et le carnet de suivi IA.", points: ["Générateur intelligent", "Radar de talents", "Invitations de mentors"], color: "from-leaf to-leaf-light", accent: "leaf" as ToneKey },
  { n: "02", title: "Boutique de Kits physiques", tagline: "Le matériel pédagogique livré à domicile.", points: ["Ustensiles & composants", "Livraison à Dakar & Abidjan", "Fiches d'expérience"], color: "from-brand to-brand-light", accent: "brand" as ToneKey },
  { n: "03", title: "Ateliers & Guildes", tagline: "Se retrouver en groupe pour de grands défis.", points: ["Sessions de prototypage", "Encadrement par des superviseurs", "Émulation collaborative"], color: "from-sky to-sky-light", accent: "sky" as ToneKey },
  { n: "04", title: "Camps d'Innovation", tagline: "Une immersion complète pendant les vacances.", points: ["Agritech & robotique", "Théâtre et expression verbale", "Créations manuelles"], color: "from-violet to-violet-light", accent: "violet" as ToneKey },
  { n: "05", title: "Écoles Expérimentales", tagline: "Le rêve d'un campus construit autour du potentiel.", points: ["Projets réels", "Intervenants professionnels", "Portfolio certifié"], color: "from-ink to-ink-light", accent: "ink" as ToneKey },
];

/* ============================================================
   LANDING FAQ
   ============================================================ */
const LANDING_FAQ = [
  { question: "Comment révéler les talents cachés de son enfant ?", answer: "Les talents d'un enfant se révèlent dans l'action, pas dans un test. En lui proposant régulièrement des activités concrètes et variées — construire, cuisiner, négocier, raconter, observer — puis en notant ce qui l'absorbe vraiment, on voit apparaître des constantes. Génizio structure cette observation à travers des défis adaptés à l'âge et aux centres d'intérêt de l'enfant." },
  { question: "Génizio est-il une plateforme de formation ?", answer: "Non. Génizio est une fabrique de trajectoires. Une formation vous apprend quelque chose ; une trajectoire vous mène quelque part. Le soutien scolaire vise à faire progresser sur le programme et les notes ; Génizio trace le chemin le plus court entre ce que votre enfant est aujourd'hui et ce qu'il peut devenir. Les deux sont complémentaires." },
  { question: "À partir de quel âge ?", answer: "Génizio est conçu pour les enfants de 3 à 16 ans. Les défis sont générés en fonction de l'âge précis de l'enfant : manipulations simples pour les plus jeunes, projets structurés sur plusieurs jours pour les adolescents." },
  { question: "Qu'est-ce que l'IA Naya ?", answer: "Naya est une IA qui génère des défis intelligents, adapte leur difficulté, accompagne les parents et construit progressivement une carte du potentiel de l'enfant. Elle reste concrète et propose des activités réellement réalisables." },
];

/* ============================================================
   ROUTE
   ============================================================ */
export const Route = createFileRoute("/")(({
  head: () => {
    const meta = pageMeta({
      title: "Génizio — Révéler les talents de votre enfant",
      description: "Des défis concrets à faire à la maison pour révéler les talents de votre enfant de 5 à 16 ans, fondés sur les 9 intelligences de Howard Gardner.",
      path: "/",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(SOFTWARE_APP_JSONLD),
        jsonLdScript(faqPageJsonLd(LANDING_FAQ)),
      ],
    };
  },
  component: NayaLanding,
} as any));

/* ============================================================
   NAV
   ============================================================ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useSession();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white/80 backdrop-blur-2xl border-b border-ink/[0.04] shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:py-5">
        <a href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-gold">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-brand">GÉNIZIO</span>
        </a>

        <div className="hidden items-center gap-10 lg:flex">
          {[
            { href: "#probleme", label: "Le problème" },
            { href: "#solution", label: "La solution" },
            { href: "#defis", label: "Les défis" },
            { href: "#vision", label: "Vision" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-semibold text-ink/45 transition-colors hover:text-ink/80 relative after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-brand after:to-gold after:rounded-full after:scale-x-0 after:origin-left after:transition-transform after:duration-400 hover:after:scale-x-100"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {session ? (
            <Link
              to="/profiles"
              className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-ink-light"
            >
              Mon espace →
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-[13px] font-semibold text-ink/50 hover:text-ink/80 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/auth"
                className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-ink-light"
              >
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-xl p-2 text-ink/60 transition-colors hover:bg-ink/5 lg:hidden"
          aria-label="Menu"
        >
          {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-ink/5 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-5 px-6 py-8">
              {[
                { href: "#probleme", label: "Le problème" },
                { href: "#solution", label: "La solution" },
                { href: "#defis", label: "Les défis" },
                { href: "#vision", label: "Vision" },
              ].map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-base font-semibold text-ink/50 hover:text-brand">
                  {l.label}
                </a>
              ))}
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-6 py-3 text-center text-sm font-bold text-white"
              >
                Commencer gratuitement
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, 80]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Warm background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#f4eee1,#e7ddca,#FDF8F3)]" />
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(30,41,59,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(30,41,59,0.018) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-[500px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.08)" }} />
      <div className="pointer-events-none absolute top-1/2 -right-32 size-[400px] rounded-full blur-[120px]" style={{ background: "rgba(16,185,129,0.06)" }} />

      <motion.div style={{ opacity, y }} className="relative z-10 mx-auto max-w-7xl px-6 w-full pt-24 pb-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <Reveal delay={0.2}>
              <span className="mb-6 inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-ink/30">
                Fabrique de trajectoires
              </span>
            </Reveal>

            <Reveal delay={0.4}>
              <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
                <span className="text-ink">Le chemin le plus court</span>
                <br />
                <span className="text-ink">vers une situation</span>
                <br />
                <span className="text-brand">meilleure.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.6}>
              <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-ink/45 md:text-xl lg:mx-0">
                Pas une formation. Une trajectoire — entre aujourd&apos;hui et ce que votre enfant peut devenir.
              </p>
            </Reveal>

            <Reveal delay={0.8}>
              <div className="mt-10 flex flex-col items-center gap-8 lg:items-start">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-8 py-4 text-sm font-bold text-white transition-all hover:bg-ink-light hover:shadow-lg hover:shadow-ink/10"
                >
                  Tracer la trajectoire
                  <ArrowRight className="size-4" />
                </Link>
                <NayaAvatar
                  size="sm"
                  thoughts={["Je cherche le chemin le plus court pour ton enfant.", "Chaque défi affine la trajectoire.", "Le talent se révèle dans l'action."]}
                />
              </div>
            </Reveal>

            <Reveal delay={1.0}>
              <div className="mt-12 flex items-center justify-center gap-8 text-ink/25 lg:justify-start">
                {[
                  { icon: Compass, text: "Trajectoires personnalisées" },
                  { icon: ShieldCheck, text: "Validation parentale" },
                  { icon: Brain, text: "9 intelligences" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <item.icon className="size-3.5" />
                    <span className="text-[11px] font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: Hero image */}
          <Reveal delay={0.5} className="relative">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-[3rem] blur-2xl" style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.08),transparent,rgba(16,185,129,0.06))" }} />
              <div className="relative overflow-hidden rounded-3xl border border-ink/[0.06] shadow-2xl shadow-ink/5">
                <img
                  src="/trajectory-hero.jpg"
                  alt="Un enfant africain concentré en train de construire, révélant ses talents"
                  className="h-auto w-full object-cover aspect-[4/3]"
                />
              </div>
              <div className="absolute -bottom-3 left-6 rounded-xl border border-ink/[0.06] bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <p className="text-[11px] font-bold text-ink/60">
                  Aujourd&apos;hui <span className="mx-1.5 text-brand">→</span> Demain
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16 text-center"
        >
          <a href="#probleme" className="inline-flex flex-col items-center gap-2 text-ink/15 transition-colors hover:text-brand/40">
            <span className="text-[10px] font-bold uppercase tracking-widest">Découvrir</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="size-4" />
            </motion.div>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ============================================================
   PROBLEM SECTION
   ============================================================ */
function ProblemSection() {
  return (
    <section id="probleme" className="relative py-32 md:py-40 bg-white">
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(30,41,59,0.04) 1px,transparent 1px)", backgroundSize: "24px 24px", opacity: 0.3 }} />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/25">
            Le problème
          </span>
        </Reveal>

        <Reveal delay={0.15}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-ink md:text-5xl lg:text-6xl">
            L&apos;école mesure les notes.
            <br />
            <span className="text-ink/30">Mais votre enfant n&apos;est pas une note — il est une trajectoire.</span>
          </h2>
        </Reveal>

        <RevealLine delay={0.3} className="my-16" />

        <div className="grid gap-16 md:grid-cols-2">
          <Reveal delay={0.2}>
            <div className="space-y-6">
              {[
                "Le système scolaire mesure surtout les performances académiques",
                "Des millions d'enfants passent toute leur jeunesse sans découvrir leurs véritables talents",
                "Les parents manquent d'outils pour comprendre les forces naturelles de leurs enfants",
                "L'Afrique possède une jeunesse immense mais très peu de solutions pour développer les talents individuellement",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/8">
                    <div className="size-1.5 rounded-full bg-brand" />
                  </div>
                  <p className="text-base leading-relaxed text-ink/50">{text}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl blur-2xl" style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.05),rgba(16,185,129,0.05))" }} />
              <div className="relative overflow-hidden rounded-3xl border border-ink/[0.06] bg-surface">
                <img
                  src="/trajectory-hero.jpg"
                  alt="La trajectoire entre aujourd'hui et demain"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 max-w-[280px] rounded-2xl border border-ink/[0.06] bg-white/95 p-5 shadow-lg backdrop-blur-md">
                <p className="font-display text-sm font-bold leading-snug text-ink">
                  Un enfant possède déjà sa <span className="text-brand">trajectoire</span> — il suffit de la révéler.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-brand" />
                  <span className="text-[10px] font-semibold text-ink/25">La conviction fondatrice de Génizio</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   SOLUTION — 9 intelligences
   ============================================================ */
function SolutionSection() {
  return (
    <section id="solution" className="relative py-32 md:py-40 bg-surface">
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(30,41,59,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(30,41,59,0.018) 1px,transparent 1px)", backgroundSize: "80px 80px", opacity: 0.4 }} />
      <div className="pointer-events-none absolute top-0 right-0 size-[500px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.04)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 size-[400px] rounded-full blur-[120px]" style={{ background: "rgba(16,185,129,0.04)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-leaf">
            La révélation — Howard Gardner
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-ink md:text-5xl">
            9 intelligences.
            <br />
            <span className="text-ink/30">9 trajectoires possibles.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/40">
            Un enfant faible dans un registre scolaire peut être remarquablement fort dans un autre.
            Génizio cartographie les 9 formes d&apos;intelligence — pour tracer la trajectoire la plus juste, à partir de ce que l&apos;enfant fait, pas d&apos;un questionnaire.
          </p>
        </Reveal>

        <RevealLine delay={0.3} className="my-16" />

        <Stagger className="grid gap-4 sm:grid-cols-3">
          {TALENTS.map((t) => (
            <StaggerItem key={t.label}>
              <div className="group flex items-start gap-3.5 rounded-2xl p-5 bg-white border border-ink/[0.06] transition-all duration-400 hover:border-brand/20 hover:shadow-[0_12px_40px_rgba(249,115,22,0.06),0_2px_8px_rgba(0,0,0,0.03)] hover:-translate-y-[3px]">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} transition-transform duration-500 group-hover:scale-110`}>
                  <t.icon className="size-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">{t.label}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/35">{t.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function HowItWorks() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden" style={{ background: "#1E293B" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.01) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.06)" }} />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-brand-glow">
            Comment la trajectoire se construit
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-white md:text-5xl">
            L&apos;enfant fait. Naya observe.
            <br />
            <span className="text-white/30">La trajectoire se dessine.</span>
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-16 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={0.2 + i * 0.15}>
              <div className="relative">
                <div className={`mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color}`}>
                  <span className="font-display text-xl font-bold text-white">{step.num}</span>
                </div>
                <h3 className="mb-3 font-display text-2xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{step.desc}</p>
                {i < 2 && (
                  <div className="absolute top-7 left-[calc(100%+1.25rem)] hidden h-px w-12 md:block" style={{ background: "linear-gradient(90deg,rgba(255,255,255,0.1),transparent)" }} />
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.5}>
          <div className="mt-20 rounded-3xl border border-white/[0.06] p-8 md:p-10" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <NayaAvatar
                size="lg"
                thoughts={[
                  "Je trace la trajectoire de ton enfant !",
                  "J'observe comment il pense et agit.",
                  "Chaque défi est un jalon sur le chemin.",
                ]}
              />
              <div>
                <h3 className="font-display text-xl font-bold text-white">Naya — votre architecte de trajectoires</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/40">
                  Pas une IA qui répond aux questions. Une IA qui trace le chemin le plus court entre ce que votre enfant est aujourd&apos;hui
                  et ce qu&apos;il peut devenir. Elle génère des défis intelligents, adapte leur difficulté,
                  accompagne les parents et construit progressivement la trajectoire de votre enfant.
                  Naya reste concrète, évite les idées fantaisistes et propose des activités réellement réalisables.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   SIMULATOR
   ============================================================ */
const INTERESTS_DEMO: Record<string, { tags: string[] }> = {
  spatial: { tags: ["Construction & Lego", "Dessin & Design", "Orientation & Exploration"] },
  corporelle: { tags: ["Sport & Mouvement", "Danse", "Bricolage manuel"] },
  sociale: { tags: ["Aime jouer en groupe", "Aide les autres", "Aime parler & raconter"] },
  entrepreneuriale: { tags: ["Aime vendre / échanger", "Curieux du commerce", "Cuisine"] },
  creative: { tags: ["Dessin & Design", "Bricolage créatif", "Invente des histoires"] },
  artisanale: { tags: ["Cuisine", "Travaux manuels", "Bricolage créatif"] },
  emotionnelle: { tags: ["Aide les autres", "Invente des histoires", "Prise de parole en public"] },
  logico_mathematique: { tags: ["Sciences & Expériences", "Jeux de stratégie", "Construction & Lego"] },
  linguistique: { tags: ["Prise de parole en public", "Écriture & Poésie", "Aime parler & raconter"] },
};

const ALL_TAGS = Object.values(INTERESTS_DEMO).flatMap((g) => g.tags);
const UNIQUE_TAGS = [...new Set(ALL_TAGS)];

const CHALLENGE_MAP: Record<string, string[]> = {
  "L'irrigation goutte-à-goutte": ["Orientation & Exploration", "Sciences & Expériences", "Bricolage manuel"],
  "Masques du futur": ["Dessin & Design", "Bricolage créatif", "Invente des histoires"],
  "Le kiosque à jus de fruits": ["Aime vendre / échanger", "Curieux du commerce", "Cuisine", "Dessin & Design"],
  "Le pont autoportant": ["Construction & Lego", "Sciences & Expériences", "Jeux de stratégie"],
};

function SimulatorSection() {
  const [name, setName] = useState("Keïta");
  const [age, setAge] = useState(10);
  const [interests, setInterests] = useState<string[]>(["Sciences & Expériences", "Dessin & Design", "Construction & Lego"]);
  const navigate = useNavigate();

  const toggleInterest = (tag: string) => {
    setInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const talentScores = useMemo(() => {
    const base: Record<string, number> = {
      spatial: 15, corporelle: 15, sociale: 15, entrepreneuriale: 15,
      creative: 15, artisanale: 15, emotionnelle: 15, logico_mathematique: 15, linguistique: 15,
    };
    Object.entries(INTERESTS_DEMO).forEach(([key, value]) => {
      const matchCount = value.tags.filter((t) => interests.includes(t)).length;
      base[key] += matchCount * 8;
      if (base[key] > 95) base[key] = 95;
    });
    return base;
  }, [interests]);

  const matchedChallenges = useMemo(() => {
    return CHALLENGES.map((c) => {
      const ci = CHALLENGE_MAP[c.title] || [];
      const score = ci.filter((t) => interests.includes(t)).length;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [interests]);

  return (
    <section id="simulateur" className="relative py-32 md:py-40 overflow-hidden" style={{ background: "#1E293B" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.01) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div className="pointer-events-none absolute top-0 right-0 size-[500px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.06)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 size-[400px] rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.06)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-brand-glow">
            Simulateur interactif
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-white md:text-5xl">
            Voyez la trajectoire
            <br />
            <span className="text-white/30">se dessiner en temps réel.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-12">
          {/* Controls */}
          <div className="space-y-6 lg:col-span-5">
            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-white/[0.06] p-6 space-y-6" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light font-display text-xl font-bold text-white">
                    {name.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                      Prénom de l&apos;enfant
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 20))}
                      className="w-full border-b border-white/15 bg-transparent pb-1 text-base font-bold text-white outline-none transition-colors focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Âge : {age} ans
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={16}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full accent-brand cursor-pointer"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Sélectionnez ses curiosités & forces
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                    {UNIQUE_TAGS.map((tag) => {
                      const active = interests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? "bg-brand text-white border-brand shadow-md shadow-brand/20"
                              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="rounded-2xl border border-brand/20 p-5 flex items-start gap-4" style={{ background: "rgba(249,115,22,0.1)" }}>
                <NayaAvatar
                  size="sm"
                  thoughts={[
                    interests.length === 0
                      ? "Sélectionnez les curiosités de votre enfant !"
                      : `Trajectoire de ${name} en cours de construction...`,
                    "Chaque sélection affine le chemin.",
                    "Je cherche le parcours le plus court vers l'épanouissement.",
                  ]}
                />
                <div>
                  <h4 className="font-display text-sm font-bold text-white">Trajectoire de {name}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    {interests.length === 0
                      ? "Sélectionnez les centres d'intérêt de votre enfant pour voir sa trajectoire se dessiner."
                      : `Basé sur les ${interests.length} centres d'intérêt sélectionnés, la trajectoire de ${name} est axée sur l'expérimentation active. Nous suggérons des défis qui allient observation et mise en œuvre manuelle — chaque étape le rapproche de son potentiel.`}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Radar + Results */}
          <div className="space-y-6 lg:col-span-7">
            <Reveal delay={0.25}>
              <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "rgba(255,255,255,0.03)" }}>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Radar des intelligences — {name}, {age} ans
                </h4>
                <TalentRadarChart
                  talents={talentScores}
                  name={name}
                  age={age}
                  dark
                  className="h-72 w-full"
                />
              </div>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="grid gap-4 sm:grid-cols-3">
                {matchedChallenges.map((c) => {
                  const a = ACCENT[c.accent] || ACCENT.brand;
                  return (
                    <div key={c.title} className="rounded-2xl border border-white/[0.06] p-4 flex flex-col" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${a.chip}`}>
                          {c.domain}
                        </span>
                        <span className="text-[10px] text-white/20">{c.duration}</span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-white mb-1">{c.title}</h4>
                      <p className="text-[11px] text-white/35 leading-relaxed flex-1">{c.desc}</p>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-glow">
                          Lancer <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHALLENGES
   ============================================================ */
function ChallengesSection() {
  return (
    <section id="defis" className="relative py-32 md:py-40 bg-surface">
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(30,41,59,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(30,41,59,0.018) 1px,transparent 1px)", backgroundSize: "80px 80px", opacity: 0.3 }} />
      <div className="pointer-events-none absolute top-1/2 left-0 size-[500px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.04)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            Défis concrets
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-ink md:text-5xl">
            Pas des QCM.
            <br />
            <span className="text-ink/30">Des projets réels.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/40">
            Chaque défi est ancré dans le contexte africain, adaptable à l&apos;âge de l&apos;enfant,
            et produit un résultat concret dont il est fier.
          </p>
        </Reveal>

        <RevealLine delay={0.3} className="my-16" />

        <Stagger className="grid gap-6 md:grid-cols-2">
          {CHALLENGES.map((c) => {
            const a = ACCENT[c.accent] || ACCENT.brand;
            return (
              <StaggerItem key={c.title}>
                <div className="group relative h-full overflow-hidden rounded-2xl p-6 bg-white border border-ink/[0.06] transition-all duration-400 hover:border-brand/20 hover:shadow-[0_12px_40px_rgba(249,115,22,0.06),0_2px_8px_rgba(0,0,0,0.03)] hover:-translate-y-[3px]">
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.color}`} />

                  <div className="mb-5 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${a.chip}`}>
                      <Zap className="size-3" />
                      {c.domain}
                    </span>
                    <span className="text-[11px] font-medium text-ink/25">{c.duration}</span>
                  </div>

                  <h3 className="mb-2 font-display text-xl font-bold text-ink transition-colors group-hover:text-brand">
                    {c.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink/40">{c.desc}</p>

                  <div className="mt-6 flex items-center justify-between border-t border-ink/[0.04] pt-4">
                    <span className="text-[11px] font-medium text-ink/20">Défi adaptatif</span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-brand transition-all group-hover:gap-2">
                      Lancer
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ============================================================
   VISION — 5 étapes
   ============================================================ */
function VisionSection() {
  return (
    <section id="vision" className="relative py-32 md:py-40 bg-white">
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(30,41,59,0.04) 1px,transparent 1px)", backgroundSize: "24px 24px", opacity: 0.25 }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-sky">
            La fabrique
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold leading-[1.15] text-ink md:text-5xl">
            5 étapes pour fabriquer
            <br />
            <span className="text-ink/30">des trajectoires en Afrique.</span>
          </h2>
        </Reveal>

        <RevealLine delay={0.2} className="my-16" />

        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VISION.map((lvl) => {
            const a = ACCENT[lvl.accent] || ACCENT.brand;
            const isDark = lvl.accent === "ink";
            return (
              <StaggerItem key={lvl.n}>
                <div className={`group relative h-full rounded-2xl p-6 transition-all duration-500 ${
                  isDark
                    ? "border border-white/[0.06] hover:border-brand/20 hover:shadow-lg hover:shadow-brand/8"
                    : "bg-white border border-ink/[0.06] hover:border-brand/20 hover:shadow-[0_12px_40px_rgba(249,115,22,0.06)] hover:-translate-y-[3px]"
                }`}
                style={isDark ? { background: "#1E293B" } : {}}>
                  <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r ${lvl.color}`} />

                  <div className="mb-4 flex items-center justify-between">
                    <span className={`font-display text-4xl font-bold ${isDark ? "text-white/6" : "text-ink/[0.04]"}`}>{lvl.n}</span>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${a.chip}`}>
                      Étape {lvl.n}
                    </span>
                  </div>

                  <h3 className={`mb-2 font-display text-lg font-bold ${isDark ? "text-white" : "text-ink"}`}>{lvl.title}</h3>
                  <p className={`mb-5 text-sm italic ${isDark ? "text-white/35" : "text-ink/35"}`}>{lvl.tagline}</p>

                  <ul className="space-y-2">
                    {lvl.points.map((p) => (
                      <li key={p} className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-white/60" : "text-ink/55"}`}>
                        <CheckCircle2 className="size-3.5 shrink-0 text-brand" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ============================================================
   FEATURES
   ============================================================ */
function FeaturesSection() {
  return (
    <section className="relative py-32 md:py-40 bg-surface">
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(30,41,59,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(30,41,59,0.018) 1px,transparent 1px)", backgroundSize: "80px 80px", opacity: 0.3 }} />
      <div className="pointer-events-none absolute top-0 right-0 size-[400px] rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.04)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="grid gap-20 md:grid-cols-2">
          <Reveal>
            <div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-brand-light">
                <Trophy className="size-6 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink">Journal de trajectoire</h3>
              <p className="mt-4 text-base leading-relaxed text-ink/45">
                Pas uniquement des notes et des diplômes. Chaque enfant construit progressivement le journal de sa trajectoire :
                projets réalisés, créations, vidéos, défis accomplis, compétences observées, progression — chaque jalon sur le chemin.
              </p>
              <div className="mt-6 space-y-3">
                {["Projets réalisés", "Créations & vidéos", "Compétences observées", "Progression vivante"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-brand" />
                    <span className="text-sm font-medium text-ink/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-sky-light">
                <Globe className="size-6 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold text-ink">Trajectoires croisées</h3>
              <p className="mt-4 text-base leading-relaxed text-ink/45">
                Un enfant passionné d&apos;astronomie à Abidjan peut rencontrer d&apos;autres enfants dont la trajectoire croise la sienne.
                Plusieurs jeunes passionnés d&apos;environnement peuvent être réunis pour créer un véritable projet.
                L&apos;application ne trace pas seulement des trajectoires individuelles — elle les connecte entre elles.
              </p>
              <div className="mt-6 space-y-3">
                {["Réseau social positif", "Concours & récompenses", "Bootcamps & ateliers", "Hackathons juniors"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-sky" />
                    <span className="text-sm font-medium text-ink/60">{item}</span>
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

/* ============================================================
   FAQ
   ============================================================ */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-32 md:py-40 bg-white">
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <Reveal>
          <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.2em] text-ink/25">
            Questions fréquentes
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
            Tout savoir sur les trajectoires Génizio.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-3">
          {LANDING_FAQ.map((faq, i) => (
            <Reveal key={i} delay={0.05 * i}>
              <div className="overflow-hidden rounded-2xl bg-white border border-ink/[0.06] transition-all duration-400 hover:border-brand/20 hover:shadow-[0_12px_40px_rgba(249,115,22,0.06),0_2px_8px_rgba(0,0,0,0.03)]">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <span className="font-display text-base font-bold text-ink pr-6">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-brand transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-sm leading-relaxed text-ink/45">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CTA
   ============================================================ */
function CTASection() {
  return (
    <section id="cta" className="relative py-32 md:py-40 bg-surface">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full blur-[120px]" style={{ background: "rgba(249,115,22,0.05)" }} />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-bold leading-[1.12] text-ink md:text-6xl">
            Votre enfant mérite
            <br />
            sa <span className="text-brand">trajectoire</span>.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-ink/40">
            Tracez la trajectoire de votre enfant en deux minutes et recevez son premier défi sur mesure.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-10 py-4 text-base font-bold text-white transition-all hover:bg-ink-light hover:shadow-lg hover:shadow-ink/10"
            >
              Tracer la trajectoire
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="mt-8 text-xs font-medium text-ink/20">
            Gratuit · Aucune carte bancaire demandée
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function LandingFooter() {
  return (
    <footer className="border-t border-ink/[0.04] bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-gold">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-bold text-brand">GÉNIZIO</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-semibold uppercase tracking-wider text-ink/20">
            <Link to="/a-propos" className="transition-colors hover:text-brand">À propos</Link>
            <Link to="/privacy" className="transition-colors hover:text-brand">Confidentialité</Link>
            <Link to="/terms" className="transition-colors hover:text-brand">CGU</Link>
            <Link to="/mentions-legales" className="transition-colors hover:text-brand">Mentions légales</Link>
          </div>

          <div className="text-[11px] font-medium text-ink/15">
            © {new Date().getFullYear()} Génizio — Abidjan, Côte d&apos;Ivoire
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function NayaLanding() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Nav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <SimulatorSection />
      <ChallengesSection />
      <VisionSection />
      <FeaturesSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}

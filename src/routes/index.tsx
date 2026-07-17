import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import heroChild from "@/assets/hero-child.jpg";
import { NayaAvatar } from "@/components/NayaAvatar";


export const Route = createFileRoute("/")({
  component: NayaLanding,
});

type Domain =
  | "Sciences"
  | "Architecture"
  | "Artisanat"
  | "Agriculture"
  | "Sport"
  | "Communication"
  | "Entrepreneuriat"
  | "Arts"
  | "Langues"
  | "Tech & IA";

type Challenge = {
  domain: Domain;
  title: string;
  desc: string;
  duration: string;
  tone: "leaf" | "brand" | "sky" | "ink";
  interests: string[];
};

const ALL_INTERESTS = [
  "Nature",
  "Machines",
  "Dessin",
  "Espace",
  "Sport",
  "Musique",
  "Cuisine",
  "Animaux",
  "Construction",
  "Langues",
] as const;

const CHALLENGES: Challenge[] = [
  {
    domain: "Agriculture",
    title: "L'irrigation goutte-à-goutte",
    desc: "Fabrique un système d'arrosage automatique pour le jardin avec des bouteilles recyclées.",
    duration: "3 jours",
    tone: "leaf",
    interests: ["Nature", "Construction"],
  },
  {
    domain: "Artisanat",
    title: "Masques du futur",
    desc: "Dessine un masque traditionnel imaginé pour un explorateur de l'espace en 2080.",
    duration: "2 heures",
    tone: "brand",
    interests: ["Dessin", "Espace"],
  },
  {
    domain: "Entrepreneuriat",
    title: "Le kiosque à jus",
    desc: "Calcule le coût d'un verre de bissap et fixe ton prix pour dégager un bénéfice.",
    duration: "1 après-midi",
    tone: "sky",
    interests: ["Cuisine"],
  },
  {
    domain: "Sciences",
    title: "Le pont autoportant",
    desc: "Construis un pont en bâtonnets capable de supporter un kilo au centre.",
    duration: "1h30",
    tone: "ink",
    interests: ["Construction", "Machines"],
  },
  {
    domain: "Sport",
    title: "Défi précision",
    desc: "Crée ton propre parcours et bats ton record de précision sur 10 essais.",
    duration: "45 min",
    tone: "brand",
    interests: ["Sport"],
  },
  {
    domain: "Communication",
    title: "L'interview du quartier",
    desc: "Interview un artisan de ton quartier et raconte son métier en 3 photos.",
    duration: "1 journée",
    tone: "leaf",
    interests: ["Langues"],
  },
  {
    domain: "Arts",
    title: "Le conte illustré",
    desc: "Écris un conte de 5 pages inspiré d'une légende locale et illustre-le.",
    duration: "1 semaine",
    tone: "sky",
    interests: ["Dessin", "Musique"],
  },
  {
    domain: "Tech & IA",
    title: "Prompt d'explorateur",
    desc: "Utilise une IA pour imaginer une ville durable, puis critique ses propositions.",
    duration: "1 heure",
    tone: "ink",
    interests: ["Machines", "Espace"],
  },
];

const DOMAINS: { name: Domain; icon: string }[] = [
  { name: "Sciences", icon: "🔬" },
  { name: "Architecture", icon: "🏛️" },
  { name: "Artisanat", icon: "🪵" },
  { name: "Agriculture", icon: "🌱" },
  { name: "Sport", icon: "⚽" },
  { name: "Communication", icon: "🎤" },
  { name: "Entrepreneuriat", icon: "💡" },
  { name: "Arts", icon: "🎨" },
  { name: "Langues", icon: "🗣️" },
  { name: "Tech & IA", icon: "🤖" },
];

const TONE_STYLES: Record<Challenge["tone"], { chip: string; num: string }> = {
  leaf: { chip: "bg-leaf/10 text-leaf", num: "bg-leaf/10 text-leaf" },
  brand: { chip: "bg-brand/10 text-brand", num: "bg-brand/10 text-brand" },
  sky: { chip: "bg-sky/10 text-sky", num: "bg-sky/10 text-sky" },
  ink: { chip: "bg-ink/10 text-ink", num: "bg-ink/10 text-ink" },
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
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="text-center font-bold text-ink/50">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
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

function Nav() {
  const { session } = useSession();
  return (
    <nav className="sticky top-0 z-50 border-b-[3px] border-ink bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to={session ? "/profiles" : "/"} className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-brand">
          <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
          GÉNIZIO
        </Link>
        <div className="hidden gap-8 font-medium md:flex">
          <a href="#approche" className="text-ink/70 transition-colors hover:text-brand">
            L'approche
          </a>
          <a href="#domaines" className="text-ink/70 transition-colors hover:text-brand">
            Domaines
          </a>
          <a href="#demo" className="text-ink/70 transition-colors hover:text-brand">
            Démo
          </a>
          <a href="#modele" className="text-ink/70 transition-colors hover:text-brand">
            Le projet
          </a>

        </div>
        {session ? (
          <Link
            to="/profiles"
            className="rounded-full border-[3px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-surface shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:bg-brand"
          >
            Mes profils
          </Link>
        ) : (
          <Link
            to="/auth"
            className="rounded-full border-[3px] border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-surface shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:bg-brand"
          >
            Se connecter
          </Link>
        )}
      </div>
    </nav>
  );
}


function Hero() {
  return (
    <header className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-24 md:grid-cols-2">
      <div>
        <span className="mb-6 inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-brand">
          Au-delà de l'école
        </span>
        <h1 className="mb-6 font-display text-5xl font-extrabold leading-[1.05] md:text-7xl">
          Révélez le <span className="text-brand">potentiel unique</span> de votre enfant.
        </h1>
        <p className="mb-6 max-w-lg text-lg leading-relaxed text-ink/70">
          Génizio transforme les curiosités naturelles des enfants africains en parcours d'apprentissage
          concrets grâce à une IA qui comprend leur environnement, leurs talents et leur rythme.
        </p>
        <div className="mb-8 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-white px-4 py-3 shadow-brutal-sm w-fit">
          <NayaAvatar size="sm" thoughts={["Je t'accompagne à chaque défi !"]} />
          <p className="text-sm font-bold text-ink">
            Guidé par <span className="text-brand">Naya</span>, votre mentor IA bienveillant.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#demo"
            className="rounded-2xl bg-brand px-8 py-4 text-center text-lg font-bold text-white shadow-brand transition-all hover:bg-brand-dark"
          >
            Commencer l'aventure
          </a>
          <a
            href="#approche"
            className="rounded-2xl border-[3px] border-ink bg-white px-8 py-4 text-center text-lg font-bold shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:bg-surface"
          >
            Voir une démo
          </a>
        </div>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="size-9 rounded-full border-2 border-surface bg-brand" />
            <div className="size-9 rounded-full border-2 border-surface bg-leaf" />
            <div className="size-9 rounded-full border-2 border-surface bg-sky" />
            <div className="size-9 rounded-full border-2 border-surface bg-ink" />
          </div>
          <span className="text-sm font-medium text-ink/60">
            +400 familles pionnières à Dakar, Abidjan & Yaoundé
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-6 -rotate-2 rounded-[3rem] bg-brand/10"
        />
        <img
          src={heroChild}
          alt="Un enfant construit une maquette en carton lors d'un défi Génizio"
          width={1200}
          height={1200}
          className="relative aspect-square w-full rotate-2 rounded-[2.5rem] border-[3px] border-ink object-cover shadow-brutal transition-transform hover:rotate-0"
        />
        <div className="absolute -bottom-6 -left-6 hidden max-w-[260px] rounded-2xl border-[3px] border-ink bg-white p-6 shadow-brutal md:block">
          <p className="text-sm font-medium italic leading-relaxed">
            « Grâce à Génizio, Moussa a découvert sa passion pour l'agritech à seulement 10 ans. »
          </p>
          <p className="mt-2 text-xs text-ink/50">— Fatou, Dakar</p>
        </div>
      </div>
    </header>
  );
}

function DomainsSection() {
  return (
    <section id="domaines" className="border-y-[3px] border-ink bg-white/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
              10 chemins d'excellence
            </span>
            <h2 className="font-display text-4xl font-extrabold md:text-5xl">
              Un terrain de jeu multidisciplinaire.
            </h2>
            <p className="mt-4 text-ink/70">
              Une exploration ancrée dans les réalités et les opportunités du continent — pas dans
              des manuels lointains.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {DOMAINS.map((d, i) => (
            <div
              key={d.name}
              className="group relative overflow-hidden rounded-2xl border-[3px] border-ink bg-white p-6 shadow-brutal-sm transition-all hover:-translate-y-1"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="mt-3 text-3xl">{d.icon}</div>
              <h3 className="mt-3 font-display text-base font-bold">{d.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [name, setName] = useState("Keïta");
  const [age, setAge] = useState(11);
  const [interests, setInterests] = useState<string[]>(["Nature", "Construction", "Dessin"]);

  const toggle = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const matched = useMemo(() => {
    const scored = CHALLENGES.map((c) => ({
      c,
      score: c.interests.filter((i) => interests.includes(i)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.c);
  }, [interests]);

  const topDomain = matched[0]?.domain ?? "Sciences";

  return (
    <section id="demo" className="bg-ink px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
              Simulateur de potentiel
            </span>
            <h2 className="font-display text-4xl font-extrabold text-white md:text-5xl">
              Le profil de talent, en direct.
            </h2>
            <p className="mt-4 text-lg italic text-white/60">
              Renseignez le profil de votre enfant — l'IA compose une sélection de défis
              personnalisés en temps réel.
            </p>
          </div>
          <div className="rounded-xl border-2 border-brand-glow bg-brand/20 px-6 py-3 font-bold text-brand-glow">
            Aperçu de la plateforme
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Profile config */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border-2 border-white/30 bg-white/5 p-8">
              <div className="mb-8 flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-full border-2 border-brand bg-brand/20 font-display text-2xl font-bold text-brand-glow">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    className="w-full border-b border-white/20 bg-transparent pb-1 text-xl font-bold text-white outline-none focus:border-brand"
                    aria-label="Prénom de l'enfant"
                  />
                  <p className="mt-1 text-sm text-white/40">{age} ans</p>
                </div>
              </div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
                Âge : {age} ans
              </label>
              <input
                type="range"
                min={5}
                max={16}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="mb-8 w-full accent-brand"
                aria-label="Âge de l'enfant"
              />

              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/40">
                Centres d'intérêt
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_INTERESTS.map((i) => {
                  const on = interests.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggle(i)}
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium transition-all " +
                        (on
                          ? "bg-brand text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20")
                      }
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-brand p-8">
              <h4 className="mb-2 font-bold text-white">Recommandation IA</h4>
              <p className="text-sm leading-relaxed text-white/90">
                {name || "Votre enfant"} montre une forte affinité pour{" "}
                <span className="font-bold">{topDomain}</span>. Le prochain défi devrait mêler
                observation concrète et création manuelle pour ancrer ses acquis.
              </p>
            </div>
          </div>

          {/* Generated challenges */}
          <div className="grid gap-6 md:grid-cols-2 lg:col-span-8">
            {matched.map((c, i) => (
              <div
                key={c.title}
                className="group rounded-3xl border-[3px] border-ink bg-white p-6 text-ink shadow-brutal-sm transition-all hover:-translate-y-1"
              >
                <div
                  className={
                    "mb-6 grid size-12 place-items-center rounded-2xl font-bold " +
                    TONE_STYLES[c.tone].num
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className={
                    "mb-4 inline-block rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-tight " +
                    TONE_STYLES[c.tone].chip
                  }
                >
                  {c.domain}
                </div>
                <h4 className="mb-3 font-display text-xl font-bold">{c.title}</h4>
                <p className="mb-6 text-sm text-ink/60">{c.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink/40">⏱ {c.duration}</span>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold transition-all group-hover:bg-ink group-hover:text-white"
                  >
                    Lancer →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VisionSection() {
  const skills = [
    { label: "Innovation Agricole", level: "Confirmé", color: "bg-leaf" },
    { label: "Arts Visuels", level: "En développement", color: "bg-brand" },
    { label: "Négociation", level: "Signal précoce", color: "bg-sky" },
    { label: "Construction", level: "Confirmé", color: "bg-brand-glow" },
  ];
  return (
    <section id="approche" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Un portfolio vivant
          </span>
          <h2 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            L'IA n'est pas un prof. C'est un observateur bienveillant.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/70">
            À chaque défi relevé, Naya documente : photos, croquis, auto-évaluation. Progressivement,
            une cartographie unique des forces de votre enfant émerge — bien plus riche qu'un
            bulletin scolaire.
          </p>
          <ul className="mt-8 space-y-3 text-sm font-medium">
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-brand/15 text-brand">
                ✓
              </span>
              Compétences validées par des mentors experts
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-brand/15 text-brand">
                ✓
              </span>
              Cartographie évolutive des talents
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-brand/15 text-brand">
                ✓
              </span>
              Orientation basée sur les réalisations, pas les notes
            </li>
          </ul>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-3xl bg-brand/5 blur-2xl" />
          <div className="relative rounded-3xl border-[3px] border-ink bg-white p-8 shadow-brutal">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Profil actuel
                </p>
                <p className="font-display text-2xl font-extrabold">Explorateur émergent</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-ink text-xs font-bold">
                +3
              </div>
            </div>

            <div className="space-y-3">
              {skills.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className={"rounded-full border-2 border-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white " + s.color}>
                    {s.level}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t-[3px] border-ink pt-6">
              <div className="text-center">
                <div className="font-display text-2xl font-extrabold text-brand">27</div>
                <div className="text-[10px] uppercase tracking-widest text-ink/50">Défis</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-extrabold text-leaf">8</div>
                <div className="text-[10px] uppercase tracking-widest text-ink/50">Domaines</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-extrabold text-sky">3</div>
                <div className="text-[10px] uppercase tracking-widest text-ink/50">Mentors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <section id="inscription" className="px-6 py-24">
      <div className="mx-auto max-w-3xl rounded-[2.5rem] border-[3px] border-ink bg-ink p-12 text-center text-white shadow-brutal md:p-16">
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-brand-glow">
          Lancement — Septembre 2026
        </span>
        <h2 className="mb-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
          Ouvrez le champ des possibles.
        </h2>
        <p className="mx-auto mb-10 max-w-md text-white/70">
          Rejoignez les premières familles qui construisent l'avenir de l'éducation africaine.
        </p>
        {sent ? (
          <div className="mx-auto max-w-md rounded-full bg-brand/20 px-6 py-4 font-medium text-brand-glow">
            Merci ! Nous vous écrivons très bientôt.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSent(true);
            }}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="h-12 flex-1 rounded-full border-2 border-white/40 bg-white/10 px-6 text-sm text-white placeholder:text-white/40 outline-none focus:border-brand"
              aria-label="Adresse email"
            />
            <button
              type="submit"
              className="h-12 rounded-full bg-brand px-8 text-sm font-bold text-white transition-all hover:bg-brand-dark"
            >
              M'inscrire
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function PositioningSection() {
  return (
    <section className="bg-white/60 border-y-[3px] border-ink px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-5 md:items-center">
        <div className="md:col-span-2">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Positionnement
          </span>
          <h2 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Pas une plateforme éducative.
          </h2>
          <p className="mt-6 text-lg text-ink/70">
            Ça, ça existe déjà. Génizio propose autre chose : un lieu où les enfants
            découvrent qui ils sont.
          </p>
        </div>
        <div className="md:col-span-3 grid gap-4">
          <blockquote className="rounded-3xl border-[3px] border-ink bg-ink p-8 text-white shadow-brutal">
            <p className="font-display text-2xl font-extrabold leading-snug md:text-3xl">
              « Le laboratoire de découverte des talents. »
            </p>
          </blockquote>
          <blockquote className="rounded-3xl border-[3px] border-ink bg-brand/10 p-8 shadow-brutal">
            <p className="font-display text-2xl font-extrabold leading-snug text-brand md:text-3xl">
              « L'endroit où les enfants découvrent qui ils sont. »
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

const MODEL_LEVELS: {
  n: string;
  title: string;
  tagline: string;
  points: string[];
  tone: "brand" | "leaf" | "sky" | "ink" | "glow";
}[] = [
  {
    n: "01",
    title: "Application gratuite",
    tagline: "La porte d'entrée pour toutes les familles.",
    points: ["Défis simples", "Accessible à tous", "Sans engagement"],
    tone: "leaf",
  },
  {
    n: "02",
    title: "Abonnement premium",
    tagline: "L'accompagnement IA au quotidien.",
    points: ["Défis avancés", "Suivi IA personnalisé", "Analyse des talents"],
    tone: "brand",
  },
  {
    n: "03",
    title: "Ateliers physiques",
    tagline: "Se rencontrer, construire, expérimenter.",
    points: ["Abidjan", "Bouaké", "Yamoussoukro"],
    tone: "sky",
  },
  {
    n: "04",
    title: "Camps de vacances",
    tagline: "Une semaine pour plonger dans un univers.",
    points: ["Ingénierie", "Entrepreneuriat", "Agriculture", "Art", "Sport"],
    tone: "glow",
  },
  {
    n: "05",
    title: "École expérimentale",
    tagline: "Le rêve initial. Une école construite autour du potentiel — pas autour du programme.",
    points: ["Pédagogie par projet", "Mentors experts", "Portfolio vivant"],
    tone: "ink",
  },
];

const LEVEL_TONES: Record<
  (typeof MODEL_LEVELS)[number]["tone"],
  { card: string; badge: string; num: string }
> = {
  leaf: {
    card: "bg-white border-[3px] border-ink shadow-brutal",
    badge: "bg-leaf/10 text-leaf",
    num: "text-leaf",
  },
  brand: {
    card: "bg-white border-[3px] border-ink shadow-brutal",
    badge: "bg-brand/10 text-brand",
    num: "text-brand",
  },
  sky: {
    card: "bg-white border-[3px] border-ink shadow-brutal",
    badge: "bg-sky/10 text-sky",
    num: "text-sky",
  },
  glow: {
    card: "bg-white border-[3px] border-ink shadow-brutal",
    badge: "bg-brand-glow/20 text-brand-dark",
    num: "text-brand-dark",
  },
  ink: {
    card: "bg-ink text-white border-[3px] border-ink shadow-brutal",
    badge: "bg-brand/20 text-brand-glow",
    num: "text-brand-glow",
  },
};

function ModelSection() {
  return (
    <section id="modele" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-brand">
            Le modèle · 5 niveaux
          </span>
          <h2 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            De l'application au campus.
          </h2>
          <p className="mt-4 text-lg text-ink/70">
            Génizio se construit par étapes. Chaque niveau finance et prépare le suivant —
            jusqu'à l'école dont nous rêvons.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODEL_LEVELS.map((lvl) => {
            const t = LEVEL_TONES[lvl.tone];
            const isDark = lvl.tone === "ink";
            return (
              <li
                key={lvl.n}
                className={
                  "flex flex-col rounded-3xl p-8 transition-all hover:-translate-y-1 " +
                  t.card
                }
              >
                <div className="mb-6 flex items-center justify-between">
                  <span
                    className={
                      "font-display text-5xl font-extrabold leading-none " + t.num
                    }
                  >
                    {lvl.n}
                  </span>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest " +
                      t.badge
                    }
                  >
                    Niveau {lvl.n}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-2xl font-extrabold">{lvl.title}</h3>
                <p
                  className={
                    "mb-6 text-sm italic " + (isDark ? "text-white/70" : "text-ink/60")
                  }
                >
                  {lvl.tagline}
                </p>
                <ul
                  className={
                    "mt-auto space-y-2 text-sm font-medium " +
                    (isDark ? "text-white/90" : "text-ink/80")
                  }
                >
                  {lvl.points.map((p) => (
                    <li key={p} className="flex items-center gap-3">
                      <span
                        className={
                          "grid size-5 place-items-center rounded-full text-[10px] font-bold " +
                          t.badge
                        }
                      >
                        →
                      </span>
                      {p}
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

function Footer() {

  return (
    <footer className="border-t-[3px] border-ink px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex items-center gap-2 font-display text-xl font-extrabold text-brand">
          <img src="/favicon-96x96.png" alt="" className="h-7 w-7" />
          GÉNIZIO
        </div>
        <div className="flex gap-8 text-sm font-medium text-ink/60">
          <a href="#" className="hover:text-brand">
            Confidentialité
          </a>
          <a href="#" className="hover:text-brand">
            Guide parents
          </a>
          <a href="#" className="hover:text-brand">
            Écoles partenaires
          </a>
        </div>
        <div className="text-xs text-ink/40">
          © 2026 Génizio — Dakar · Abidjan · Yaoundé
        </div>
      </div>
    </footer>
  );
}

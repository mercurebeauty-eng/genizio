import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSession } from "@/hooks/use-session";
import heroChild from "@/assets/hero-child.jpg";


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
    <nav className="sticky top-0 z-50 border-b border-ink/5 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="font-display text-2xl font-extrabold tracking-tight text-brand">
          NAYA
        </a>
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
        </div>
        {session ? (
          <Link
            to="/profiles"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface shadow-sm transition-all hover:bg-brand"
          >
            Mes profils
          </Link>
        ) : (
          <Link
            to="/auth"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface shadow-sm transition-all hover:bg-brand"
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
        <p className="mb-10 max-w-lg text-lg leading-relaxed text-ink/70">
          Naya transforme les curiosités naturelles des enfants africains en parcours d'apprentissage
          concrets grâce à une IA qui comprend leur environnement, leurs talents et leur rythme.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#demo"
            className="rounded-2xl bg-brand px-8 py-4 text-center text-lg font-bold text-white shadow-brand transition-all hover:bg-brand-dark"
          >
            Commencer l'aventure
          </a>
          <a
            href="#approche"
            className="rounded-2xl border-2 border-ink/10 px-8 py-4 text-center text-lg font-bold transition-all hover:bg-white"
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
          alt="Un enfant construit une maquette en carton lors d'un défi Naya"
          width={1200}
          height={1200}
          className="relative aspect-square w-full rotate-2 rounded-[2.5rem] object-cover shadow-soft transition-transform hover:rotate-0"
        />
        <div className="absolute -bottom-6 -left-6 hidden max-w-[260px] rounded-2xl border border-stone-100 bg-white p-6 shadow-soft md:block">
          <p className="text-sm font-medium italic leading-relaxed">
            « Grâce à Naya, Moussa a découvert sa passion pour l'agritech à seulement 10 ans. »
          </p>
          <p className="mt-2 text-xs text-ink/50">— Fatou, Dakar</p>
        </div>
      </div>
    </header>
  );
}

function DomainsSection() {
  return (
    <section id="domaines" className="border-y border-ink/5 bg-white/60 py-20">
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
              className="group relative overflow-hidden rounded-2xl bg-surface p-6 ring-1 ring-ink/5 transition-all hover:-translate-y-1 hover:ring-brand/30"
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
          <div className="rounded-xl border border-brand/30 bg-brand/20 px-6 py-3 font-bold text-brand-glow">
            Aperçu de la plateforme
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Profile config */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
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
                className="group rounded-3xl bg-white p-6 text-ink transition-all hover:-translate-y-1"
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
                    className="rounded-xl border-2 border-ink/5 px-4 py-2 text-sm font-bold transition-all group-hover:bg-ink group-hover:text-white"
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
    { label: "Innovation Agricole", pct: 85, color: "bg-leaf" },
    { label: "Arts Visuels", pct: 62, color: "bg-brand" },
    { label: "Négociation", pct: 45, color: "bg-sky" },
    { label: "Construction", pct: 71, color: "bg-brand-glow" },
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
          <div className="relative rounded-3xl bg-white p-8 shadow-soft ring-1 ring-ink/5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Profil actuel
                </p>
                <p className="font-display text-2xl font-extrabold">Explorateur émergent</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-brand/40 text-xs font-bold">
                +3
              </div>
            </div>

            <div className="space-y-5">
              {skills.map((s) => (
                <div key={s.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-ink/50">{s.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/5">
                    <div
                      className={"h-full rounded-full " + s.color}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-ink/5 pt-6">
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
      <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-ink p-12 text-center text-white shadow-soft md:p-16">
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
              className="h-12 flex-1 rounded-full border border-white/20 bg-white/10 px-6 text-sm text-white placeholder:text-white/40 outline-none focus:border-brand"
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

function Footer() {
  return (
    <footer className="border-t border-ink/5 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="font-display text-xl font-extrabold text-brand">NAYA</div>
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
          © 2026 Naya — Dakar · Abidjan · Yaoundé
        </div>
      </div>
    </footer>
  );
}

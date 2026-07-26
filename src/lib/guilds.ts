// ────────────────────────────────────────────────────────────
// GÉNIZIO — Système des Guildes
// Chaque enfant appartient à une Guilde déterminée par ses
// talents dominants. Cette bibliothèque centralise toute la
// logique de calcul et les métadonnées des Guildes.
// ────────────────────────────────────────────────────────────

export type GuildKey =
  | "batisseurs"
  | "inventeurs"
  | "explorateurs"
  | "createurs"
  | "strateges"
  | "protecteurs";

export type GuildInfo = {
  /** "aucune" is only ever used by NO_GUILD_YET below, never inside GUILDS. */
  key: GuildKey | "aucune";
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  /** Couleur CSS Tailwind pour le badge */
  color: string;
  /** Couleur de fond du badge */
  bgColor: string;
  /** Clés de talents (from talent-buckets.ts) associés à cette Guilde */
  talentKeys: string[];
};

export const GUILDS: Record<GuildKey, GuildInfo> = {
  batisseurs: {
    key: "batisseurs",
    name: "Les Bâtisseurs",
    emoji: "🏗️",
    tagline: "Construire le monde de demain",
    description: "Architecture, construction, ingénierie. Tu conçois, tu assembles, tu élèves (📐 Spatiale & 🪵 Artisanale).",
    color: "text-amber-800",
    bgColor: "bg-amber-100 border-amber-400",
    talentKeys: ["spatial", "artisanale"],
  },
  inventeurs: {
    key: "inventeurs",
    name: "Les Inventeurs",
    emoji: "⚙️",
    tagline: "Résoudre ce que personne n'a encore résolu",
    description: "Technologie, robotique, IA, innovation. Tu imagines, tu prototypes, tu innoves (🧠 Logique).",
    color: "text-violet-800",
    bgColor: "bg-violet-100 border-violet-400",
    talentKeys: ["logico_mathematique"],
  },
  explorateurs: {
    key: "explorateurs",
    name: "Les Explorateurs",
    emoji: "🔭",
    tagline: "Découvrir ce que le monde cache encore",
    description: "Sciences, nature, biologie, géographie. Tu observes, tu questionnes, tu découvres (🏃 Corporelle).",
    color: "text-sky-800",
    bgColor: "bg-sky-100 border-sky-400",
    talentKeys: ["corporelle"],
  },
  createurs: {
    key: "createurs",
    name: "Les Créateurs",
    emoji: "🎨",
    tagline: "Donner vie à ce qui n'existait pas",
    description: "Arts, musique, expression, design. Tu ressens, tu crées, tu touches les cœurs (🎨 Créative & 🗣️ Linguistique).",
    color: "text-pink-800",
    bgColor: "bg-pink-100 border-pink-400",
    talentKeys: ["creative", "linguistique"],
  },
  strateges: {
    key: "strateges",
    name: "Les Stratèges",
    emoji: "🏆",
    tagline: "Transformer une idée en impact réel",
    description: "Entrepreneuriat, leadership, négociation. Tu planifies, tu décides, tu inspires (💡 Entreprendre, 🤝 Sociale & 🪞 Émotionnelle).",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100 border-emerald-400",
    talentKeys: ["entrepreneuriale", "sociale", "emotionnelle"],
  },
  protecteurs: {
    key: "protecteurs",
    name: "Les Protecteurs du Vivant",
    emoji: "🌿",
    tagline: "Prendre soin de la Terre et de ses habitants",
    description: "Agriculture, écologie, biodiversité. Tu cultives, tu protèges, tu régénères.",
    color: "text-green-800",
    bgColor: "bg-green-100 border-green-400",
    talentKeys: [],
  },
};

// Deliberately NOT part of GUILDS — it isn't a 7th recruitable guild, it's a
// "no signal yet" placeholder returned by getChildGuild() when every talent
// score is 0. Kept out of GUILDS so `Object.values(GUILDS)` (used by the
// admin "Les 6 Guildes" legend) still enumerates exactly the 6 real ones.
// Shares GuildInfo's exact shape so every caller of getChildGuild() renders
// it correctly with zero changes on their end.
export const NO_GUILD_YET: GuildInfo = {
  key: "aucune",
  name: "Guilde à découvrir",
  emoji: "🔍",
  tagline: "Ses premiers défis révéleront sa voie",
  description: "Pas encore assez de données pour déterminer une guilde dominante.",
  color: "text-stone-600",
  bgColor: "bg-stone-100 border-stone-300",
  talentKeys: [],
};

// Labels "voie/domaine" distincts des noms de personas de Guilde (celles-ci
// s'affichent déjà ailleurs sur le Portfolio, ex. "Guilde de Nora : Les
// Bâtisseurs") — utilisés uniquement par getTalentAffinities ci-dessous, pour
// répondre à "où ça mène" plutôt que "à quelle Guilde j'appartiens".
const AFFINITY_LABELS: Record<GuildKey, string> = {
  batisseurs: "Ingénierie & construction",
  inventeurs: "Technologie & innovation",
  explorateurs: "Sciences & découverte",
  createurs: "Arts & création",
  strateges: "Entrepreneuriat & leadership",
  protecteurs: "Écologie & vivant",
};

export type TalentAffinity = { key: GuildKey; label: string; pct: number };

/** Pour chaque Guilde ayant au moins un talentKey (protecteurs en est
 *  toujours exclu, cf. talentKeys: [] ci-dessus), calcule un % d'affinité =
 *  moyenne des scores réels de l'enfant sur les talents de cette Guilde.
 *  Trié du plus fort au plus faible. Aucune donnée inventée : mêmes scores
 *  que ceux utilisés par getChildGuild(), juste agrégés différemment. */
export function getTalentAffinities(
  talents: Record<string, number> | null | undefined,
): TalentAffinity[] {
  const raw = talents ?? {};
  return (Object.entries(GUILDS) as [GuildKey, GuildInfo][])
    .filter(([, guild]) => guild.talentKeys.length > 0)
    .map(([key, guild]) => {
      const scores = guild.talentKeys.map((k) => raw[k] ?? 0);
      const pct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { key, label: AFFINITY_LABELS[key], pct };
    })
    .sort((a, b) => b.pct - a.pct);
}

/** Retourne l'info de la Guilde dominante d'un enfant à partir de ses scores
 *  de talents, ou NO_GUILD_YET si aucun talent n'a encore de score positif —
 *  on ne force plus une guilde arbitraire sur un enfant qui n'a rien fait.
 */
export function getChildGuild(
  talents: Record<string, number> | null | undefined
): GuildInfo {
  const raw = talents ?? {};

  let bestGuildKey: GuildKey | null = null;
  let bestScore = 0;

  for (const [guildKey, guild] of Object.entries(GUILDS) as [GuildKey, GuildInfo][]) {
    const guildScore = guild.talentKeys.reduce(
      (sum, talentKey) => sum + (raw[talentKey] ?? 0),
      0,
    );
    if (guildScore > bestScore) {
      bestScore = guildScore;
      bestGuildKey = guildKey;
    }
  }

  if (bestGuildKey) return GUILDS[bestGuildKey];

  // No guild scored above 0 — fall back to whichever single talent has the
  // highest raw score, in case a future talent key isn't yet mapped into any
  // guild's talentKeys. Today all 9 keys are covered, so this branch is a
  // safety net rather than reachable code — verified by
  // guilds.test.ts's "every talent key covered exactly once" check.
  const topTalent = Object.entries(raw)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  if (topTalent) {
    for (const guild of Object.values(GUILDS)) {
      if (guild.talentKeys.includes(topTalent)) return guild;
    }
  }

  return NO_GUILD_YET;
}

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
  key: GuildKey;
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
    description: "Architecture, construction, ingénierie. Tu conçois, tu assembles, tu élèves.",
    color: "text-amber-800",
    bgColor: "bg-amber-100 border-amber-400",
    talentKeys: ["spatial", "artisanale"],
  },
  inventeurs: {
    key: "inventeurs",
    name: "Les Inventeurs",
    emoji: "⚙️",
    tagline: "Résoudre ce que personne n'a encore résolu",
    description: "Technologie, robotique, IA, innovation. Tu imagines, tu prototypes, tu innoves.",
    color: "text-violet-800",
    bgColor: "bg-violet-100 border-violet-400",
    talentKeys: ["logico_mathematique"],
  },
  explorateurs: {
    key: "explorateurs",
    name: "Les Explorateurs",
    emoji: "🔭",
    tagline: "Découvrir ce que le monde cache encore",
    description: "Sciences, nature, biologie, géographie. Tu observes, tu questionnes, tu découvres.",
    color: "text-sky-800",
    bgColor: "bg-sky-100 border-sky-400",
    talentKeys: ["corporelle"],
  },
  createurs: {
    key: "createurs",
    name: "Les Créateurs",
    emoji: "🎨",
    tagline: "Donner vie à ce qui n'existait pas",
    description: "Arts, musique, expression, design. Tu ressens, tu crées, tu touches les cœurs.",
    color: "text-pink-800",
    bgColor: "bg-pink-100 border-pink-400",
    talentKeys: ["creative", "linguistique"],
  },
  strateges: {
    key: "strateges",
    name: "Les Stratèges",
    emoji: "🏆",
    tagline: "Transformer une idée en impact réel",
    description: "Entrepreneuriat, leadership, négociation. Tu planifies, tu décides, tu inspires.",
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

/** Retourne l'info de la Guilde dominante d'un enfant
 *  à partir de ses scores de talents.
 *  Retourne `strateges` par défaut si aucun talent n'est encore développé.
 */
export function getChildGuild(
  talents: Record<string, number> | null | undefined
): GuildInfo {
  const raw = talents ?? {};

  let bestGuildKey: GuildKey = "strateges";
  let bestScore = -1;

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

  // Si aucun talent n'est développé (tous à 0), on se base sur
  // l'index du premier talent non-nul dans l'ordre alphabétique
  if (bestScore === 0) {
    const topTalent = Object.entries(raw)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    if (topTalent) {
      for (const [gKey, guild] of Object.entries(GUILDS) as [GuildKey, GuildInfo][]) {
        if (guild.talentKeys.includes(topTalent)) {
          return guild;
        }
      }
    }
  }

  return GUILDS[bestGuildKey];
}

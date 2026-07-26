// ────────────────────────────────────────────────────────────
// GÉNIZIO — Single Source of Truth for the 9 Gardner Intelligences
// ────────────────────────────────────────────────────────────

export type GardnerKey =
  | "logico_mathematique"
  | "creative"
  | "corporelle"
  | "linguistique"
  | "spatial"
  | "sociale"
  | "emotionnelle"
  | "artisanale"
  | "entrepreneuriale";

export const GARDNER_LABELS: Record<GardnerKey, string> = {
  logico_mathematique: "🧠 Logique",
  creative: "🎨 Créative",
  corporelle: "🏃 Corporelle",
  linguistique: "🗣️ Linguistique",
  spatial: "📐 Spatiale",
  sociale: "🤝 Sociale",
  emotionnelle: "🪞 Émotionnelle",
  artisanale: "🪵 Artisanale",
  entrepreneuriale: "💡 Entreprendre",
};

export interface GardnerItem {
  key: GardnerKey;
  label: string;
  name: string;
  emoji: string;
}

export const GARDNER_TAXONOMY: Record<GardnerKey, GardnerItem> = {
  logico_mathematique: {
    key: "logico_mathematique",
    label: "🧠 Logique",
    name: "Logique",
    emoji: "🧠",
  },
  creative: {
    key: "creative",
    label: "🎨 Créative",
    name: "Créative",
    emoji: "🎨",
  },
  corporelle: {
    key: "corporelle",
    label: "🏃 Corporelle",
    name: "Corporelle",
    emoji: "🏃",
  },
  linguistique: {
    key: "linguistique",
    label: "🗣️ Linguistique",
    name: "Linguistique",
    emoji: "🗣️",
  },
  spatial: {
    key: "spatial",
    label: "📐 Spatiale",
    name: "Spatiale",
    emoji: "📐",
  },
  sociale: {
    key: "sociale",
    label: "🤝 Sociale",
    name: "Sociale",
    emoji: "🤝",
  },
  emotionnelle: {
    key: "emotionnelle",
    label: "🪞 Émotionnelle",
    name: "Émotionnelle",
    emoji: "🪞",
  },
  artisanale: {
    key: "artisanale",
    label: "🪵 Artisanale",
    name: "Artisanale",
    emoji: "🪵",
  },
  entrepreneuriale: {
    key: "entrepreneuriale",
    label: "💡 Entreprendre",
    name: "Entreprendre",
    emoji: "💡",
  },
};

export const GARDNER_KEYS: GardnerKey[] = Object.keys(GARDNER_LABELS) as GardnerKey[];

export function getGardnerLabel(key: string): string {
  return GARDNER_LABELS[key as GardnerKey] ?? key;
}

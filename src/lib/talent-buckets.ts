export type TalentBucket = "confirme" | "en_developpement" | "signal_precoce" | "pas_encore_explore";

export const TALENT_BUCKET_LABEL: Record<TalentBucket, string> = {
  confirme: "profondément exploré",
  en_developpement: "en développement",
  signal_precoce: "signal précoce",
  pas_encore_explore: "pas encore exploré",
};

export function getTalentBucket(score: number): TalentBucket {
  if (score >= 70) return "confirme";
  if (score >= 40) return "en_developpement";
  if (score >= 1) return "signal_precoce";
  return "pas_encore_explore";
}

import { GARDNER_LABELS } from "./gardner";

export const TALENT_KEY_LABELS: Record<string, string> = GARDNER_LABELS;

// The single allow-list of talent keys — child_profiles.talents must never
// contain anything outside this set (an AI hallucination or a stray field
// like pdf_unlocked has polluted it before). Anything else consuming/writing
// talent keys should derive from this rather than keeping its own copy.
export const VALID_TALENT_KEYS = Object.keys(TALENT_KEY_LABELS);

// Short narrative phrases per domain × bucket — richer than "Domaine — bucket",
// closer to the hi-fi reference copy ("Itératrice qui rebondit vite").
// Falls back to "{Domaine} — {bucket label}" for any (domain, bucket) pair not
// covered here, so this table only needs the most flavorful cases.
const PHRASES: Partial<Record<string, Partial<Record<TalentBucket, string>>>> = {
  creative: {
    confirme: "Sens du récit visuel",
    en_developpement: "Créative — en développement",
  },
  artisanale: {
    confirme: "Sens pratique de la valeur",
    en_developpement: "Habile de ses mains",
  },
  spatial: {
    en_developpement: "Raisonnement spatial en développement",
    signal_precoce: "Raisonnement spatial — signal précoce",
  },
  entrepreneuriale: {
    confirme: "Sens pratique de la valeur",
  },
};

export type PortfolioPulseEntry = {
  key: string;
  label: string;
  bucket: TalentBucket;
  phrase: string;
  score: number;
};

export function getPortfolioPulse(
  talents: Record<string, number> | null | undefined,
  limit = 5,
): PortfolioPulseEntry[] {
  const raw = talents ?? {};
  const entries = Object.keys(TALENT_KEY_LABELS).map((key) => {
    const score = raw[key] || 0;
    const bucket = getTalentBucket(score);
    const label = TALENT_KEY_LABELS[key];
    const phrase = PHRASES[key]?.[bucket] ?? `${label} — ${TALENT_BUCKET_LABEL[bucket]}`;
    return { key, label, bucket, phrase, score };
  });

  // Surface the most notable mix: highest-signal entries first, but keep at
  // least one "pas encore exploré" if present, so the pulse doesn't read as
  // uniformly glowing — matches the wireframe's mix of confident + early signals.
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, limit);
  const hasUnexplored = top.some((e) => e.bucket === "pas_encore_explore");
  if (!hasUnexplored) {
    const unexplored = sorted.find((e) => e.bucket === "pas_encore_explore");
    if (unexplored) top[top.length - 1] = unexplored;
  }
  return top;
}

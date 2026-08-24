/**
 * Aspirations déclarées → hypothèses de travail testées par l'expérience
 * (analyse « Évolution de Génizio » §10-16, chantier Naya V4, 2026-08-12).
 *
 * Même philosophie que interest-confidence.ts (décision 2026-08-05) : la
 * déclaration (« je veux devenir menuisier ») n'est ni une vérité ni un mensonge —
 * c'est un terrain d'exploration. La confiance est DÉRIVÉE À LA LECTURE, aucune
 * table dédiée : les essais se comptent sur les défis complétés/abandonnés qui
 * touchent l'univers de l'aspiration (par le marqueur aspiration_label quand il
 * est présent, sinon par le chevauchement domaines/talents mappés).
 *
 * Seuils alignés sur les intérêts (validés avec l'utilisateur) : fenêtre 8 essais,
 * engagement net ≥ 0.65 → confirmé, ≤ 0.35 → écarté. Jamais de verdict affiché :
 * les statuts ne servent qu'au ciblage des défis et à une narration qualitative.
 */

import { findAspirationBridge, type AspirationBridge } from "@/lib/aspiration-map";

export const ASPIRATION_MIN_TRIALS = 8;
export const ASPIRATION_CONFIRM_THRESHOLD = 0.65;
export const ASPIRATION_REFUTE_THRESHOLD = 0.35;

export type AspirationStatus = "untested" | "exploring" | "confirmed" | "refuted";

export interface AspirationHypothesis {
  /** Libellé déclaré (exactement comme saisi). */
  label: string;
  type: "metier" | "exploration";
  /** Qui a formulé : l'enfant (via le parent à l'onboarding) ou le parent. */
  source: "parent" | "enfant";
  status: AspirationStatus;
  /** Ratio net : max(0, complétions − abandons) / max(1, essais). */
  engagement: number;
  completions: number;
  abandoned: number;
  trials: number;
  bridge: AspirationBridge;
}

export interface AspirationHypotheses {
  byLabel: Record<string, AspirationHypothesis>;
  confirmedLabels: string[];
  refutedLabels: string[];
  untestedLabels: string[];
  exploringLabels: string[];
}

export interface AspirationChallengeSignal {
  domain?: string | null;
  target_intelligences?: string[] | null;
  /** Marqueur de défi-pont (challenges.aspiration_label). */
  aspiration_label?: string | null;
}

export interface AspirationHypothesisInput {
  aspirations?: { label: string; type?: string; source?: string }[] | null;
  completed?: AspirationChallengeSignal[] | null;
  abandoned?: AspirationChallengeSignal[] | null;
}

/** Un défi compte comme essai d'une aspiration s'il est marqué par elle OU chevauche son pont. */
function countsAsTrial(
  signal: AspirationChallengeSignal,
  aspiration: { label: string; bridge: AspirationBridge },
): boolean {
  if (signal.aspiration_label) {
    return signal.aspiration_label.toLowerCase() === aspiration.label.toLowerCase();
  }
  const bridge = aspiration.bridge;
  if (bridge.domains.length > 0 && signal.domain && bridge.domains.includes(signal.domain))
    return true;
  if (
    bridge.talentKeys.length > 0 &&
    (signal.target_intelligences ?? []).some((k) => bridge.talentKeys.includes(k))
  )
    return true;
  return false;
}

export function resolveAspirationHypotheses(
  input: AspirationHypothesisInput,
): AspirationHypotheses {
  const declared = input.aspirations ?? [];
  const completed = input.completed ?? [];
  const abandoned = input.abandoned ?? [];

  const byLabel: Record<string, AspirationHypothesis> = {};

  for (const aspiration of declared) {
    const label = aspiration.label?.trim();
    if (!label) continue;

    const bridge = findAspirationBridge(label);
    const completions = completed.filter((c) => countsAsTrial(c, { label, bridge })).length;
    const abandonedCount = abandoned.filter((c) => countsAsTrial(c, { label, bridge })).length;
    const trials = completions + abandonedCount;
    const engagement = trials > 0 ? Math.max(0, completions - abandonedCount) / trials : 0;

    let status: AspirationStatus;
    if (trials < ASPIRATION_MIN_TRIALS) status = "untested";
    else if (engagement >= ASPIRATION_CONFIRM_THRESHOLD) status = "confirmed";
    else if (engagement <= ASPIRATION_REFUTE_THRESHOLD) status = "refuted";
    else status = "exploring";

    byLabel[label] = {
      label,
      type: aspiration.type === "exploration" ? "exploration" : "metier",
      source: aspiration.source === "enfant" ? "enfant" : "parent",
      status,
      engagement,
      completions,
      abandoned: abandonedCount,
      trials,
      bridge,
    };
  }

  const entries = Object.values(byLabel);
  return {
    byLabel,
    confirmedLabels: entries.filter((h) => h.status === "confirmed").map((h) => h.label),
    refutedLabels: entries.filter((h) => h.status === "refuted").map((h) => h.label),
    untestedLabels: entries.filter((h) => h.status === "untested").map((h) => h.label),
    exploringLabels: entries.filter((h) => h.status === "exploring").map((h) => h.label),
  };
}

/**
 * Snapshot serveur : lit les aspirations du profil + les défis complétés/abandonnés
 * (domaines, intelligences ciblées, marqueur aspiration_label). Ne JETTE jamais :
 * un échec renvoie null et les appelants retombent sur un comportement sans
 * aspiration (pattern getInterestHypothesesSnapshot).
 */
export async function getAspirationHypothesesSnapshot(
  db: { from: (table: string) => any },
  childId: string,
): Promise<AspirationHypotheses | null> {
  try {
    const [{ data: child }, { data: completed }, { data: abandoned }] = await Promise.all([
      db.from("child_profiles").select("aspirations").eq("id", childId).maybeSingle(),
      db
        .from("challenges")
        .select("domain, target_intelligences, aspiration_label")
        .eq("child_id", childId)
        .eq("status", "completed"),
      db
        .from("challenges")
        .select("domain, target_intelligences, aspiration_label")
        .eq("child_id", childId)
        .eq("status", "not_completed"),
    ]);

    return resolveAspirationHypotheses({
      aspirations: (child?.aspirations as AspirationHypothesisInput["aspirations"]) ?? [],
      completed: (completed ?? []) as AspirationChallengeSignal[],
      abandoned: (abandoned ?? []) as AspirationChallengeSignal[],
    });
  } catch (err) {
    console.error(
      "getAspirationHypothesesSnapshot: échec non bloquant (fallback sans aspiration):",
      err,
    );
    return null;
  }
}

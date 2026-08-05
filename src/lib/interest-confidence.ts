/**
 * Centres d'intérêt déclarés par le parent → hypothèses de travail (décision 2026-08-05).
 *
 * Les choix du parent au formulaire de création de profil ne sont PAS une vérité
 * permanente : ils accélèrent la phase d'exploration initiale, puis sont confirmés ou
 * écartés par l'expérience réelle de l'enfant (complétions validées par l'IA vs
 * abandons). La confiance est DÉRIVÉE À LA LECTURE — aucune table dédiée : les
 * complétions viennent de pedagogical_twins.competencies[key].n (déjà maintenu par
 * événement CHALLENGE_COMPLETED, migration 20260720110000), les abandons de
 * challenges.status='not_completed'. Le pont tag → compétence se fait par le groupe de
 * talents Gardner (INTERESTS_BY_TALENT), exactement l'axe que l'UI de sélection du
 * profil utilise déjà.
 *
 * Seuils validés avec l'utilisateur : fenêtre 8 défis, confirmé ≥ 0.65, écarté ≤ 0.35,
 * prior 0.5, déclin de l'influence parentale sur 20 défis (plancher 20 %).
 */

import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { normalizeChildInterests } from "@/lib/interest-migration";

/** Fenêtre de validation : en dessous de ce nombre d'essais, l'hypothèse n'est pas encore testée. */
export const INTEREST_MIN_TRIALS = 8;
/** Engagement net ≥ 0.65 sur la fenêtre → levier confirmé par l'expérience. */
export const INTEREST_CONFIRM_THRESHOLD = 0.65;
/** Engagement net ≤ 0.35 sur la fenêtre → levier écarté (l'expérience l'a contredit). */
export const INTEREST_REFUTE_THRESHOLD = 0.35;
/** Confiance accordée à une hypothèse non encore testée (prior non informatif). */
export const INTEREST_PRIOR_CONFIDENCE = 0.5;
/** Horizon de déclin : l'influence parentale tombe à INTEREST_DECAY_FLOOR après ce nombre de défis observés. */
export const INTEREST_DECAY_WINDOW = 20;
/** Plancher d'influence parentale : la déclaration n'est jamais totalement ignorée. */
export const INTEREST_DECAY_FLOOR = 0.2;

export type InterestHypothesisStatus = "untested" | "confirmed" | "refuted" | "neutral";

export interface InterestHypothesis {
  /** Tag déclaré (libellé exact du formulaire parent). */
  tag: string;
  /** Clé Gardner à laquelle le tag est rattaché (INTERESTS_BY_TALENT). */
  talentKey: string;
  /** Libellé humain du groupe de talents (ex. "Logico-mathématique"). */
  talentLabel: string;
  status: InterestHypothesisStatus;
  /** Confiance : prior 0.5 tant que non testé, sinon engagement net. */
  confidence: number;
  completions: number;
  abandoned: number;
  trials: number;
  /** Ratio net : max(0, complétions - abandons) / max(1, essais). */
  engagement: number;
}

export interface InterestHypotheses {
  byTag: Record<string, InterestHypothesis>;
  /** Influence parentale résiduelle (1.0 au démarrage → plancher 0.2). */
  parentInfluence: number;
  /** Nombre total d'observations comportementales (tous talents, complétions + abandons). */
  totalEvidence: number;
  confirmedTags: string[];
  refutedTags: string[];
  untestedTags: string[];
}

export interface InterestHypothesisInput {
  declared?: string[] | null;
  competencies?: Record<string, { n?: number; value?: number } | null> | null;
  abandonedByTalent?: Record<string, number> | null;
}

/**
 * Résout, pour chaque tag déclaré par le parent, son statut d'hypothèse à partir des
 * observations réelles (complétions validées vs abandons, par groupe de talents).
 * Fonction pure, testable sans base.
 */
export function resolveInterestHypotheses(input: InterestHypothesisInput): InterestHypotheses {
  const declared = normalizeChildInterests(input.declared);
  const competencies = input.competencies ?? {};
  const abandonedByTalent = input.abandonedByTalent ?? {};

  const byTag: Record<string, InterestHypothesis> = {};

  for (const tag of declared) {
    const talentKey = findTalentKeyForTag(tag);
    if (!talentKey) {
      // Tag hors référentiel (héritage, texte libre) : on ne sait pas le rattacher à
      // une compétence, donc jamais écarté sur des données qu'on ne peut pas lire.
      byTag[tag] = {
        tag,
        talentKey: "unknown",
        talentLabel: "Levier d'action",
        status: "untested",
        confidence: INTEREST_PRIOR_CONFIDENCE,
        completions: 0,
        abandoned: 0,
        trials: 0,
        engagement: 0,
      };
      continue;
    }

    const completions = competencies[talentKey]?.n ?? 0;
    const abandoned = abandonedByTalent[talentKey] ?? 0;
    const trials = completions + abandoned;
    // Ratio NET : un abandon annule une complétion. Sur 8 essais, 8 complétions → 1.0
    // (confirmé) ; 5 abandons sur 8 → 0.375 (neutral, la déclaration vacille).
    const engagement = trials > 0 ? Math.max(0, completions - abandoned) / trials : 0;

    let status: InterestHypothesisStatus;
    if (trials < INTEREST_MIN_TRIALS) status = "untested";
    else if (engagement >= INTEREST_CONFIRM_THRESHOLD) status = "confirmed";
    else if (engagement <= INTEREST_REFUTE_THRESHOLD) status = "refuted";
    else status = "neutral";

    byTag[tag] = {
      tag,
      talentKey,
      talentLabel: INTERESTS_BY_TALENT[talentKey].label,
      status,
      confidence: trials < INTEREST_MIN_TRIALS ? INTEREST_PRIOR_CONFIDENCE : engagement,
      completions,
      abandoned,
      trials,
      engagement,
    };
  }

  const totalEvidence =
    Object.values(competencies).reduce((sum, c) => sum + (c?.n ?? 0), 0) +
    Object.values(abandonedByTalent).reduce((sum, n) => sum + n, 0);

  const parentInfluence = Math.max(INTEREST_DECAY_FLOOR, 1 - totalEvidence / INTEREST_DECAY_WINDOW);

  const entries = Object.values(byTag);
  return {
    byTag,
    parentInfluence,
    totalEvidence,
    confirmedTags: entries.filter((h) => h.status === "confirmed").map((h) => h.tag),
    refutedTags: entries.filter((h) => h.status === "refuted").map((h) => h.tag),
    untestedTags: entries.filter((h) => h.status === "untested").map((h) => h.tag),
  };
}

/**
 * Snapshot serveur : lit les 3 sources (interests du profil, competencies du jumeau,
 * abandons dans challenges) et agrège. Ne JETTE jamais — un échec (RLS, jumeau absent,
 * table indisponible) renvoie null et les prompts retombent sur le formatage brut.
 */
export async function getInterestHypothesesSnapshot(
  db: { from: (table: string) => any },
  childId: string
): Promise<InterestHypotheses | null> {
  try {
    const [{ data: child }, { data: twin }, { data: abandoned }] = await Promise.all([
      db.from("child_profiles").select("interests").eq("id", childId).maybeSingle(),
      db.from("pedagogical_twins").select("competencies").eq("child_id", childId).maybeSingle(),
      db
        .from("challenges")
        .select("target_intelligences")
        .eq("child_id", childId)
        .eq("status", "not_completed"),
    ]);

    const competencies =
      (twin?.competencies as Record<string, { n?: number; value?: number }> | null) ?? {};

    // Même garde que apply_observation_to_twin : on ne compte que les clés Gardner
    // connues (les target_intelligences décoratives de création ne comptent pas).
    const abandonedByTalent: Record<string, number> = {};
    for (const row of (abandoned ?? []) as Array<{ target_intelligences?: string[] | null }>) {
      for (const key of row.target_intelligences ?? []) {
        if (key in INTERESTS_BY_TALENT) {
          abandonedByTalent[key] = (abandonedByTalent[key] ?? 0) + 1;
        }
      }
    }

    return resolveInterestHypotheses({
      declared: child?.interests,
      competencies,
      abandonedByTalent,
    });
  } catch (err) {
    console.error(
      "getInterestHypothesesSnapshot: échec non bloquant, fallback au formatage brut:",
      err
    );
    return null;
  }
}

/** Retrouve la clé Gardner d'un tag déclaré (retourne undefined si hors référentiel). */
function findTalentKeyForTag(tag: string): string | undefined {
  for (const [key, group] of Object.entries(INTERESTS_BY_TALENT)) {
    if (group.tags.includes(tag)) return key;
  }
  return undefined;
}

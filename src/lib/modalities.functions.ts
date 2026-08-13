// Boucle de réévaluation des modalités d'apprentissage (chantier 3, spec NAYA V4 —
// analyse utilisateur « Évolution de Génizio » §22-26, §35, §38).
//
// Principe : un échec n'est jamais un verdict. Quand un défi échoue avec une cause
// accommodable, Naya reformule le MÊME objectif pédagogique dans une AUTRE modalité
// de présentation (manipulation, histoire, analogie…), jusqu'à MAX_MODALITY_ATTEMPTS
// essais — la conclusion éventuelle appartient au chantier 5 (§36), pas ici.
//
// Contrats :
//   • challenges.presentation_mode  — modalité du défi (vocabulaire fermé ci-dessous).
//   • pedagogical_context           — { is_reformulation, original_challenge_id,
//     modality_attempt, presentation_mode } (lien de filiation, lu par
//     parseReformulationContext / l'UI via formatPedagogicalIntention).
//   • observation_events            — CHALLENGE_NOT_COMPLETED émis par trigger DB
//     (migration 20260812170000), payload presentation_mode — le Jumeau apprend
//     « quelle manière échoue » (presentation_signals).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  callClaude,
  extractJsonFromLLMResponse,
  finalizeChallenge,
  formatChildInterestsPayload,
} from "@/lib/challenges.functions";
import { buildReformulationPrompt } from "@/lib/naya-prompts";
import { verifyAndLog } from "@/lib/naya-verifier.functions";
import { formatTimePressureNote, resolveTimeLimitMinutes } from "@/lib/time-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ── Vocabulaire fermé des modalités ─────────────────────────────────────────────

export const PRESENTATION_MODES = [
  "texte",
  "image",
  "demonstration",
  "manipulation",
  "histoire",
  "analogie",
  "conversation",
  "projet",
  "situation_concrete",
] as const;

export type PresentationMode = (typeof PRESENTATION_MODES)[number];

/** Libellés humains pour la narration qualitative (jamais de chiffres ni de verdict). */
export const PRESENTATION_MODE_LABELS: Record<PresentationMode, string> = {
  texte: "un texte",
  image: "des images",
  demonstration: "une démonstration",
  manipulation: "une activité manuelle",
  histoire: "une histoire",
  analogie: "une comparaison avec ce qu'il connaît déjà",
  conversation: "une conversation",
  projet: "un petit projet",
  situation_concrete: "une situation concrète du quotidien",
};

/** Borne de la boucle : jamais plus de 3 modalités testées avant une conclusion. */
export const MAX_MODALITY_ATTEMPTS = 3;

// Causes pour lesquelles la reformulation a du sens (la présentation peut être en
// cause) — OTHER et les causes absentes ne déclenchent pas la boucle.
const ACCOMMODABLE_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
] as const;

export function canReformulate(cause: string | null | undefined): boolean {
  return !!cause && (ACCOMMODABLE_CAUSES as readonly string[]).includes(cause);
}

// Priorité des modalités par cause (heuristique produit, révisable) — la première
// non encore essayée est choisie ; le vocabulaire reste fermé.
const MODALITY_PRIORITIES: Record<string, PresentationMode[]> = {
  METHOD_MISMATCH: ["manipulation", "demonstration", "situation_concrete"],
  PERFORMANCE_ANXIETY: ["histoire", "conversation", "image"],
  LACK_OF_ENGAGEMENT: ["projet", "situation_concrete", "histoire"],
  CONCEPTUAL_GAP: ["analogie", "manipulation", "demonstration"],
};

const DEFAULT_MODALITY_PRIORITY: PresentationMode[] = ["image", "histoire", "manipulation"];

/**
 * Prochaine modalité à tester pour une cause donnée : la première priorité non déjà
 * essayée. Renvoie null quand tout le socle de la cause a été essayé (la boucle
 * s'arrête — la conclusion appartient au chantier 5, jamais un verdict ici).
 */
export function resolveNextModality(
  cause: string | null | undefined,
  tried: PresentationMode[]
): PresentationMode | null {
  const priority =
    cause && MODALITY_PRIORITIES[cause] ? MODALITY_PRIORITIES[cause] : DEFAULT_MODALITY_PRIORITY;
  for (const mode of priority) {
    if (!tried.includes(mode)) return mode;
  }
  return null;
}

// ── Filiation des reformulations ────────────────────────────────────────────────

export interface ReformulationContext {
  originalChallengeId: string;
  modalityAttempt: number;
  presentationMode: PresentationMode;
}

/** Lit la filiation depuis `pedagogical_context` (colonne TEXT contenant du JSON). */
export function parseReformulationContext(
  raw: string | null | undefined
): ReformulationContext | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.is_reformulation !== true) return null;
    if (typeof parsed.original_challenge_id !== "string") return null;
    if (typeof parsed.modality_attempt !== "number") return null;
    if (!(PRESENTATION_MODES as readonly string[]).includes(parsed.presentation_mode)) return null;
    return {
      originalChallengeId: parsed.original_challenge_id,
      modalityAttempt: parsed.modality_attempt,
      presentationMode: parsed.presentation_mode as PresentationMode,
    };
  } catch {
    return null;
  }
}

/** Racine de la chaîne de reformulation (pure) : si le défi échoué est lui-même une
 *  reformulation, la chaîne s'ancre sur l'ORIGINAL (sa propre filiation), pas sur le
 *  parent immédiat — sinon le défi EST l'original. Sans cette résolution, chaque
 *  reformulation démarrée sur un parent ouvrait une sous-chaîne vide : les tentatives
 *  précédentes étaient invisibles (modality_attempt toujours 1, boucle jamais bornée,
 *  même modalité re-choisie — review 2026-08-12, P0). */
export function resolveReformulationRoot(
  failedChallengeContext: string | null | undefined,
  challengeId: string
): string {
  return parseReformulationContext(failedChallengeContext)?.originalChallengeId ?? challengeId;
}

export interface ModalityAttemptSummary {
  total: number;
  /** Reformulation encore en cours (todo/in_progress) — la boucle attend son issue. */
  pending: number;
  succeeded: number;
  failed: number;
  triedModes: PresentationMode[];
}

/** Résumé déterministe des tentatives d'une chaîne de reformulation (0 IA). */
export function summarizeModalityAttempts(
  attempts: { presentationMode: PresentationMode | null; status: string }[]
): ModalityAttemptSummary {
  const summary: ModalityAttemptSummary = {
    total: attempts.length,
    pending: 0,
    succeeded: 0,
    failed: 0,
    triedModes: [],
  };
  for (const a of attempts) {
    if (a.status === "todo" || a.status === "in_progress") summary.pending += 1;
    else if (a.status === "completed") summary.succeeded += 1;
    else summary.failed += 1;
    if (a.presentationMode) summary.triedModes.push(a.presentationMode);
  }
  return summary;
}

// ── Reformulation (génération d'un défi dans une nouvelle modalité) ─────────────

const ReformulateInput = z.object({
  challengeId: z.string().uuid(),
});

export type ReformulationOutcome =
  | { ok: true; challenge: any }
  | { ok: false; reason: string };

/**
 * Fonction interne (réutilisable par submitChallengeNotCompleted sans passer par le
 * wrapper server fn — même pattern que processDiscriminantResult). Non fatale par
 * conception : chaque retour { ok: false, reason } est un no-op sûr pour l'appelant.
 */
export async function processModalityReformulation(
  supabase: SupabaseClient<Database>,
  userId: string,
  challengeId: string
): Promise<ReformulationOutcome> {
  // 1. Défi original + enfant (ownership explicite, gating identique aux autres
  //    mutations de challenges — on ne se fie jamais qu'à la RLS).
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("*, child_profiles(*)")
    .eq("id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !challenge) return { ok: false, reason: "NOT_FOUND" };
  const child = challenge.child_profiles as any;
  if (!child) return { ok: false, reason: "NO_CHILD" };
  if (child.access_locked_at) return { ok: false, reason: "ACCESS_LOCKED" };
  if (child.is_active === false) return { ok: false, reason: "CHILD_INACTIVE" };
  if (challenge.status !== "not_completed") return { ok: false, reason: "NOT_NOT_COMPLETED" };

  const cause = challenge.not_completed_cause as string | null;
  if (!canReformulate(cause)) return { ok: false, reason: "CAUSE_NOT_ACCOMMODABLE" };

  // 2. Chaîne de reformulations du défi ORIGINAL. Filiation par la RACINE (jamais par
  //    le parent immédiat — review 2026-08-12, P0) : sans cette résolution, chaque
  //    reformulation démarrée sur un parent ne retrouvait aucun sibling, modality_attempt
  //    restait à 1, la boucle n'était jamais bornée et la même modalité était re-choisie.
  const rootChallengeId = resolveReformulationRoot(challenge.pedagogical_context, challengeId);
  const { data: siblings } = await supabase
    .from("challenges")
    .select("id, status, title, pedagogical_context, presentation_mode")
    .eq("child_id", child.id)
    .like("pedagogical_context", "%is_reformulation%")
    .order("created_at", { ascending: false })
    .limit(50);
  const attempts = ((siblings ?? []) as any[])
    .map((s) => {
      const ctx = parseReformulationContext(s.pedagogical_context);
      return ctx && ctx.originalChallengeId === rootChallengeId
        ? { ...ctx, status: s.status as string, title: s.title as string | undefined }
        : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const summary = summarizeModalityAttempts(attempts);
  if (summary.pending > 0) return { ok: false, reason: "REFORMULATION_PENDING" };
  if (summary.total >= MAX_MODALITY_ATTEMPTS) return { ok: false, reason: "MAX_ATTEMPTS" };

  const nextMode = resolveNextModality(cause, summary.triedModes);
  if (!nextMode) return { ok: false, reason: "NO_MODALITY_LEFT" };

  // 3. Génération IA — même compétence cible, modalité imposée.
  const location = [child.city, child.country].filter(Boolean).join(", ") || "non précisé";
  const reformulationTitles = attempts
    .map((a) => a.title)
    .filter((t): t is string => !!t);
  const prompt = buildReformulationPrompt({
    childName: child.name,
    childAge: child.age,
    location,
    originalTitle: challenge.title,
    originalDomain: challenge.domain,
    originalObjective: challenge.description,
    presentationMode: nextMode,
    interestsPayload: formatChildInterestsPayload(child.interests),
    talentsJson: JSON.stringify(child.talents ?? {}),
    timePressureNote: formatTimePressureNote(child.time_pressure ?? "standard"),
    // Titres de TOUTE la chaîne (pas seulement le parent) : l'IA ne répète jamais un
    // titre déjà proposé dans une reformulation antérieure de la même racine.
    existingTitles: [challenge.title, ...reformulationTitles],
  });

  let parsed: any;
  try {
    const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
    parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));
  } catch {
    // Non fatal : l'échec de génération ne fait jamais échouer la soumission
    // d'origine (l'appelant retombe sur la recommandation classique).
    return { ok: false, reason: "GENERATION_FAILED" };
  }

  // Le Loup (chantier 3) : audit shadow de la reformulation — même objectif,
  // modalité respectée, jamais de trace de l'échec précédent.
  void verifyAndLog({
    kind: "reformulation",
    output: parsed,
    context: {
      childAge: child.age,
      childName: child.name,
      domain: challenge.domain,
      originalTitle: challenge.title,
    },
    sourceFunction: "processModalityReformulation",
    childId: child.id,
    model: "deepseek-v4-flash",
  });

  // 4. Filets déterministes (même point de passage que tous les générateurs) puis
  //    insertion — kind forcé micro (activité brève de remise en confiance) et
  //    guidance relevée (pas-à-pas détaillé : défi de soutien, jamais une épreuve).
  const safeTitle = (parsed.title || `Mission Naya : ${challenge.domain}`) as string;
  const safeDescription = (parsed.description || "") as string;
  const safeSteps = (parsed.steps || []) as string[];
  const safeMaterials = (parsed.materials || []) as string[];

  const finalized = finalizeChallenge(
    {
      title: safeTitle,
      description: safeDescription,
      steps: safeSteps,
      materials: safeMaterials,
      material_tags: parsed.material_tags,
      intelligences: parsed.intelligences,
      trait_subform: parsed.trait_subform,
      requires_supervision: parsed.requires_supervision,
      supervision_warning: parsed.supervision_warning,
      difficulty: parsed.difficulty,
      proof_mode: parsed.proof_mode,
      proof_target: parsed.proof_target,
      declarative_award: parsed.declarative_award,
      academic_domain: parsed.academic_domain,
      academic_level_age: parsed.academic_level_age,
      academic_reference_note: parsed.academic_reference_note,
      kind: parsed.kind,
      guidance_level: parsed.guidance_level,
    },
    child.age
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: created, error: insertErr } = await supabaseAdmin
    .from("challenges")
    .insert({
      child_id: child.id,
      user_id: userId,
      domain: challenge.domain,
      description: safeDescription,
      duration: parsed.duration || "15 min",
      steps: safeSteps,
      materials: safeMaterials,
      status: "todo",
      progress: 0,
      academic_secret: parsed.academic_secret ?? null,
      pedagogical_context: JSON.stringify({
        is_reformulation: true,
        original_challenge_id: rootChallengeId,
        modality_attempt: summary.total + 1,
        presentation_mode: nextMode,
      }),
      time_limit_minutes: resolveTimeLimitMinutes({
        estimatedMinutes: null,
        age: child.age,
        timePressure: child.time_pressure ?? "standard",
        difficulty: finalized.difficulty,
      }),
      ...finalized,
      // kind forcé micro (activité brève de remise en confiance) et guidance relevée
      // (pas-à-pas détaillé : défi de soutien, jamais une épreuve) — APRÈS le spread
      // pour ne pas être écrasés par les valeurs résolues.
      kind: "micro",
      guidance_level: Math.max(finalized.guidance_level, 4),
      presentation_mode: nextMode,
    })
    .select("*")
    .single();

  if (insertErr) return { ok: false, reason: "INSERT_FAILED" };
  return { ok: true, challenge: created };
}

export const reformulateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ReformulateInput.parse(input))
  .handler(async ({ data, context }) => {
    return processModalityReformulation(context.supabase, context.userId, data.challengeId);
  });

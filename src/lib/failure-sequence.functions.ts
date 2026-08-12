// Boucle de réévaluation complète (chantier 5, spec NAYA V4 — analyse §36).
//
// La question directrice : « L'enfant ne sait-il pas faire, ou n'avons-nous pas
// trouvé la bonne manière de lui faire démontrer qu'il sait faire ? »
//
// La chaîne complète vit déjà dans les données (rien à migrer) :
//   échec → reformulation (chantier 3) → nouvelle tentative → … → jusqu'à 3 essais.
// Ce module en fait l'ORCHESTRATION lisible :
//   • évaluation de la séquence (comparaison des résultats entre tentatives) ;
//   • identification du facteur explicatif (déterministe, 0 IA) ;
//   • garde-fou §35 (« personne n'est nul ») : aucune conclusion avant ≥ 2 modalités
//     testées, et jamais de verdict — la narration ne dit jamais « il ne peut pas » ;
//   • narration parent qualitative « Ce que Naya a compris » (0 chiffre).
//
// Les drivers du Jumeau sont déjà mis à jour automatiquement par les triggers DB
// (CHALLENGE_COMPLETED/NOT_COMPLETED avec presentation_mode → presentation_signals,
// chantier 3) : la mise à jour du profil est donc dérivée à la lecture, sans table
// dédiée — même pattern que le reste du moteur.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseReformulationContext,
  PRESENTATION_MODE_LABELS,
  type PresentationMode,
} from "@/lib/modalities.functions";

// ── Évaluation déterministe de la séquence ──────────────────────────────────────

export type FailureSequenceVerdict =
  | { status: "MODALITY_FOUND"; modality: PresentationMode }
  | { status: "STILL_EXPLORING"; testedModes: number };

export interface SequenceAttempt {
  presentationMode: PresentationMode | null;
  status: string;
}

/**
 * Compare les résultats des tentatives et identifie le facteur explicatif.
 *  • une modalité a réussi → le facteur est trouvé : « voici comment il apprend » ;
 *  • toutes ont échoué mais ≥ 2 modalités testées → « encore à explorer » ;
 *  • < 2 modalités testées → null (garde-fou §35 : la boucle continue, AUCUNE
 *    conclusion — « personne n'est nul », on n'a pas encore cherché assez loin).
 * Renvoie null tant qu'il n'y a rien de concluant à montrer au parent.
 */
export function evaluateFailureSequence(attempts: SequenceAttempt[]): FailureSequenceVerdict | null {
  const succeeded = attempts.find((a) => a.status === "completed" && a.presentationMode);
  if (succeeded?.presentationMode) {
    return { status: "MODALITY_FOUND", modality: succeeded.presentationMode };
  }

  const testedModes = attempts.filter((a) => a.presentationMode).length;
  if (testedModes < 2) return null;

  return { status: "STILL_EXPLORING", testedModes };
}

/** Garde-fou §35 exposé : la séquence n'est concluante qu'avec ≥ 2 modalités testées
 *  ou au moins une réussite (jamais de conclusion sur une seule manière). */
export function isSequenceConcludable(attempts: SequenceAttempt[]): boolean {
  return evaluateFailureSequence(attempts) !== null;
}

// ── Narration qualitative (0 IA, 0 chiffre, jamais de verdict) ──────────────────

export function buildFailureNarrative(verdict: FailureSequenceVerdict, childName: string): string {
  if (verdict.status === "MODALITY_FOUND") {
    const label = PRESENTATION_MODE_LABELS[verdict.modality];
    return `${childName} a réussi ce défi quand Naya le lui a présenté par ${label}. Naya garde cette manière en mémoire pour lui proposer de nouvelles activités.`;
  }
  // STILL_EXPLORING — jamais « il ne peut pas », jamais « il a échoué » : la
  // compétence n'est pas conclue absente, elle attend une autre occasion.
  return `Naya a proposé ce défi de plusieurs manières différentes. ${childName} n'est pas encore tout à fait prêt·e pour celui-ci — Naya le laisse de côté un moment et continue d'observer ce qui le motive vraiment.`;
}

// ── Lecture de la dernière séquence (GET) ───────────────────────────────────────

const ChildIdInput = z.object({ childId: z.string().uuid() });

export interface FailureSequenceSnapshot {
  hasSequence: boolean;
  narrative: string | null;
  status: FailureSequenceVerdict["status"] | null;
}

/**
 * Dernière chaîne de reformulation de l'enfant (dérivée à la lecture) : la
 * reformulation la plus récente, son défi original et toutes les tentatives liées.
 * Ne renvoie une narration que si la séquence est concluante (garde-fou §35).
 */
export const getLatestFailureSequence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildIdInput.parse(input))
  .handler(async ({ data, context }): Promise<FailureSequenceSnapshot> => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, name")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!child) return { hasSequence: false, narrative: null, status: null };

    const { data: reformulations } = await supabase
      .from("challenges")
      .select("id, status, presentation_mode, pedagogical_context, created_at")
      .eq("child_id", data.childId)
      .like("pedagogical_context", "%is_reformulation%")
      .order("created_at", { ascending: false })
      .limit(20);

    const chain = (reformulations ?? []) as {
      status: string;
      presentation_mode: string | null;
      pedagogical_context: string | null;
    }[];
    if (chain.length === 0) return { hasSequence: false, narrative: null, status: null };

    // Chaîne la plus récente : la première reformulation (tri desc) donne son
    // original — on regroupe ensuite toutes les tentatives liées à cet original.
    const latestCtx = parseReformulationContext(chain[0].pedagogical_context);
    if (!latestCtx) return { hasSequence: false, narrative: null, status: null };

    const siblings = chain.filter(
      (c) =>
        parseReformulationContext(c.pedagogical_context)?.originalChallengeId ===
        latestCtx.originalChallengeId
    );

    const attempts: SequenceAttempt[] = siblings.map((s) => ({
      presentationMode: s.presentation_mode as PresentationMode | null,
      status: s.status,
    }));

    const verdict = evaluateFailureSequence(attempts);
    if (!verdict) return { hasSequence: false, narrative: null, status: null };

    return {
      hasSequence: true,
      narrative: buildFailureNarrative(verdict, child.name),
      status: verdict.status,
    };
  });

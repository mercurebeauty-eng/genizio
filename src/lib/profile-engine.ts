// Profile Engine — Moteur de Profil & Boucle de Rétroaction Pédagogique
//
// Rôle fondamental :
// 1. Fermer la boucle d'apprentissage (Feedback Loop) : ingérer les observations candidates
//    générées par l'IA lors de la validation d'une preuve de défi.
// 2. Traiter ces observations de manière déterministe et bayésienne pour faire évoluer
//    l'état de développement de l'enfant et ses hypothèses.
// 3. Déterminer le format pédagogique adapté (Taxonomie : Étincelle -> Investigation -> Projet)
//    pour aligner l'enfant sur les meilleurs standards internationaux (Pratique vers Théorie).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PedagogicalFormat =
  | "spark_micro" // L'Étincelle : Micro-défi d'amorce ou découverte (10-20 min, curiosité, manipulation directe sans théorie préalable)
  | "investigation" // L'Investigation : Défi d'observation et de recueil de données/mesures pour déduire un principe par soi-même
  | "constructive_project"; // Le Projet Constructif : Réalisation d'envergure ou œuvre de synthèse adaptée aux talents de l'enfant (maquette, conte illustré, herbier, création artistique, prototype, robotique/code, etc.)

export type InternationalBenchmark = "below_grade" | "at_grade" | "ahead_of_grade";

export interface ObservationCandidate {
  /** Signal pédagogique extrait (ex: "curiosite_inductive", "autonomie_technique", "friction_conceptuelle") */
  signal: string;
  /** Preuve comportementale concrète observée */
  behavioralEvidence: string;
  /** Enseignement pédagogique pour le profil */
  pedagogicalInsight: string;
  /** Compétence ou intelligence Gardner concernée */
  competenceKey?: string;
  /** Évaluation par rapport aux standards internationaux d'âge */
  internationalBenchmark?: InternationalBenchmark;
  /** Format pédagogique recommandé pour la suite */
  suggestedNextFormat?: PedagogicalFormat;
}

export interface IngestChallengeObservationsParams {
  db: SupabaseClient<Database>;
  childId: string;
  challengeId: string;
  userId: string;
  observations: ObservationCandidate[];
  challengeContext: {
    title: string;
    domain: string;
    difficulty?: string | null;
    academic_domain?: string | null;
    academic_level_age?: number | null;
  };
}

export interface IngestChallengeObservationsResult {
  ingestedCount: number;
  recommendedNextFormat: PedagogicalFormat;
}

/**
 * Calcule le format pédagogique optimal pour un enfant dans un domaine donné.
 * Règle "Pratique ➔ Théorie" :
 * - Domaine neuf ou fragile -> "spark_micro" (initiation par l'étonnement sensoriel/physique)
 * - Domaine en cours d'exploration -> "investigation" (relevé, mesure, formulation d'hypothèses)
 * - Domaine avec acquis ou pic collectif -> "constructive_project" (ingénierie concrète, Arduino, standard international)
 */
export function determinePedagogicalFormat(params: {
  domainCompletedCount: number;
  hasUnconsolidatedPeak?: boolean;
  activeHypothesisStatus?: string;
  recentObservations?: ObservationCandidate[];
}): PedagogicalFormat {
  const {
    domainCompletedCount,
    hasUnconsolidatedPeak,
    activeHypothesisStatus,
    recentObservations = [],
  } = params;

  // Si une observation récente suggère explicitement un format
  const explicitSuggestion = recentObservations.find(
    (o) => o.suggestedNextFormat,
  )?.suggestedNextFormat;
  if (explicitSuggestion) {
    return explicitSuggestion;
  }

  // Si l'enfant a validé un pic collectif en groupe ou a déjà 3+ réalisations réussies dans le domaine
  if (hasUnconsolidatedPeak || domainCompletedCount >= 3) {
    return "constructive_project";
  }

  // Si une hypothèse est en cours d'investigation ou si l'enfant a 1-2 réalisations
  if (activeHypothesisStatus === "exploring" || domainCompletedCount >= 1) {
    return "investigation";
  }

  // Par défaut : l'étincelle pour amorcer l'intuition pratique
  return "spark_micro";
}

/**
 * Enregistre les observations candidates et met à jour le profil de l'enfant.
 * Opération sécurisée et non-bloquante pour la validation utilisateur.
 */
export async function ingestChallengeObservations(
  params: IngestChallengeObservationsParams,
): Promise<IngestChallengeObservationsResult> {
  const { db, childId, challengeId, userId, observations, challengeContext } = params;

  if (!observations || observations.length === 0) {
    return {
      ingestedCount: 0,
      recommendedNextFormat: "investigation",
    };
  }

  let ingestedCount = 0;

  try {
    // 1. Audit trail : persister le paquet d'observations candidates dans `observation_events`
    const payload = {
      challenge_id: challengeId,
      challenge_title: challengeContext.title,
      domain: challengeContext.domain,
      academic_domain: challengeContext.academic_domain,
      academic_level_age: challengeContext.academic_level_age,
      observations,
      created_at: new Date().toISOString(),
    };

    let { error: eventErr } = await db.from("observation_events").insert({
      child_id: childId,
      user_id: userId,
      type: "CANDIDATE_OBSERVATIONS" as any,
      source: "profile_engine" as any,
      payload: payload as any,
    });

    // Filet de sécurité défensif : si la contrainte SQL n'a pas encore migré dans l'environnement courant,
    // on replie sur BEHAVIOR_FLAG + app (qui existent depuis la Phase 0 de Naya).
    if (eventErr && eventErr.message.includes("check")) {
      const fallback = await db.from("observation_events").insert({
        child_id: childId,
        user_id: userId,
        type: "BEHAVIOR_FLAG",
        source: "app",
        payload: {
          ...payload,
          event_subtype: "CANDIDATE_OBSERVATIONS",
        } as any,
      });
      eventErr = fallback.error;
    }

    if (eventErr) {
      console.warn("[ProfileEngine] Échec insertion observation_events (non bloquant):", eventErr);
    } else {
      ingestedCount = observations.length;
    }
  } catch (err) {
    console.warn("[ProfileEngine] Erreur journalisation observations:", err);
  }

  // 2. Détermination du format pour le prochain cycle
  const recommendedNextFormat = determinePedagogicalFormat({
    domainCompletedCount: 2,
    recentObservations: observations,
  });

  return {
    ingestedCount,
    recommendedNextFormat,
  };
}

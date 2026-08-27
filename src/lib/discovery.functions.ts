// Espace Découverte — Fonctions métier, enregistrement des traces et calibration Naya.
//
// Capture l'initiative, la curiosité et la démarche cognitive des enfants lorsqu'ils
// explorent librement en dehors du parcours structuré habituel, et alimente la boucle
// d'apprentissage du Jumeau Pédagogique (Naya).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { callClaude, extractJsonFromLLMResponse } from "@/lib/challenges.functions";
import { buildDiscoveryAnalysisPrompt } from "@/lib/naya-prompts";
import { verifyAndLog } from "@/lib/naya-verifier.functions";

// ── Vocabulaire & Constantes Découverte ────────────────────────────────────────

export const DISCOVERY_SOURCES = ["self_chosen", "found_external", "open_sandbox", "fablab_marathon", "projet_collectif"] as const;
export type DiscoverySourceType = (typeof DISCOVERY_SOURCES)[number];

export const DISCOVERY_SOURCE_LABELS: Record<DiscoverySourceType, { label: string; badge: string; description: string }> = {
  self_chosen: {
    label: "Je choisis",
    badge: "Initiative personnelle",
    description: "L'enfant a eu lui-même l'idée d'explorer, créer ou résoudre ce défi.",
  },
  found_external: {
    label: "Je trouve",
    badge: "Trouvé ailleurs",
    description: "Exercice, challenge ou expérience vu sur Internet, dans un livre ou à l'école.",
  },
  open_sandbox: {
    label: "Je tente",
    badge: "Laboratoire libre",
    description: "Exploration ouverte ou expérimentation spontanée sans cadre rigide.",
  },
  fablab_marathon: {
    label: "Fab Lab",
    badge: "Événement de groupe",
    description: "Participation à un atelier, marathon ou camp de création collectif.",
  },
  projet_collectif: {
    label: "Projet d'équipe",
    badge: "Coopération",
    description: "Projet mené à plusieurs, mettant en jeu des compétences interpersonnelles.",
  },
};

export const DISCOVERY_DOMAINS = [
  "logique",
  "maths",
  "sciences",
  "construction",
  "art_creativite",
  "expression_orale",
  "langues",
  "programmation",
  "nature_environnement",
  "autre",
] as const;
export type DiscoveryDomain = (typeof DISCOVERY_DOMAINS)[number];

export const DISCOVERY_DOMAIN_LABELS: Record<DiscoveryDomain, string> = {
  logique: "Logique & Énigmes",
  maths: "Mathématiques appliquées",
  sciences: "Sciences & Expériences",
  construction: "Construction & Bricolage",
  art_creativite: "Créativité & Design",
  expression_orale: "Expression & Éloquence",
  langues: "Langues & Vocabulaire",
  programmation: "Numérique & Code",
  nature_environnement: "Nature & Environnement",
  autre: "Autre domaine libre",
};

export const DISCOVERY_DIFFICULTIES = ["facile", "moyen", "difficile", "eleve"] as const;
export type DiscoveryPerceivedDifficulty = (typeof DISCOVERY_DIFFICULTIES)[number];

export const DISCOVERY_AUTONOMY_LEVELS = ["totalement_seul", "peu_d_aide", "accompagne"] as const;
export type DiscoveryAutonomyLevel = (typeof DISCOVERY_AUTONOMY_LEVELS)[number];

export const DISCOVERY_AUTONOMY_LABELS: Record<DiscoveryAutonomyLevel, string> = {
  totalement_seul: "Totalement autonome",
  peu_d_aide: "Très peu d'aide demandée",
  accompagne: "Guidé ou accompagné",
};

export const DISCOVERY_OUTCOMES = ["fonctionnel", "partiel", "en_cours", "echec_enrichissant"] as const;
export type DiscoveryOutcomeStatus = (typeof DISCOVERY_OUTCOMES)[number];

export const DISCOVERY_OUTCOME_LABELS: Record<DiscoveryOutcomeStatus, { label: string; tone: "success" | "warning" | "info" }> = {
  fonctionnel: { label: "Objectif atteint / Fonctionnel", tone: "success" },
  partiel: { label: "Partiellement réussi", tone: "info" },
  en_cours: { label: "Projet toujours en cours", tone: "info" },
  echec_enrichissant: { label: "Non abouti mais enrichissant", tone: "warning" },
};

// ── Types d'analyse IA Naya ──────────────────────────────────────────────────

export type DiscoveryAIAnalysis = {
  summary: string;
  initiative_score: number;
  perseverance_score: number;
  curiosity_score: number;
  autonomy_score: number;
  cognitive_insights: string;
  potential_anomaly: boolean;
  anomaly_hypothesis: string | null;
  recommended_next_step: string;
};

// ── Schémas de Validation Zod ────────────────────────────────────────────────

export const CreateDiscoveryTraceSchema = z.object({
  childId: z.string().uuid(),
  sourceType: z.enum(DISCOVERY_SOURCES),
  title: z.string().min(2, "Le titre doit comporter au moins 2 caractères").max(120),
  description: z.string().min(5, "La description doit comporter au moins 5 caractères").max(3000),
  domain: z.string().min(2),
  perceivedDifficulty: z.enum(DISCOVERY_DIFFICULTIES).optional().nullable(),
  attemptsCount: z.number().int().min(1).max(50).default(1),
  durationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  autonomyLevel: z.enum(DISCOVERY_AUTONOMY_LEVELS).optional().nullable(),
  helpContext: z.string().max(500).optional().nullable(),
  strategyUsed: z.string().max(300).optional().nullable(),
  outcomeStatus: z.enum(DISCOVERY_OUTCOMES),
  proofImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  nayaDialogue: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
});

export const GetDiscoveryTracesSchema = z.object({
  childId: z.string().uuid(),
});

export const AddMentorFeedbackSchema = z.object({
  traceId: z.string().uuid(),
  notes: z.string().min(2).max(2000),
});

// ── Helpers Serveur ──────────────────────────────────────────────────────────

async function analyzeAndCalibrateTrace(params: {
  supabaseAdmin: any;
  traceId: string;
  childId: string;
  childName: string;
  childAge: number;
  talents: Record<string, number>;
  traceData: z.infer<typeof CreateDiscoveryTraceSchema>;
  userId: string;
}): Promise<DiscoveryAIAnalysis | null> {
  const { supabaseAdmin, traceId, childId, childName, childAge, talents, traceData, userId } = params;

  try {
    const prompt = buildDiscoveryAnalysisPrompt({
      childName,
      childAge,
      talentsJson: JSON.stringify(talents, null, 2),
      trace: {
        sourceType: traceData.sourceType,
        title: traceData.title,
        description: traceData.description,
        domain: traceData.domain,
        perceivedDifficulty: traceData.perceivedDifficulty,
        attemptsCount: traceData.attemptsCount,
        durationMinutes: traceData.durationMinutes,
        autonomyLevel: traceData.autonomyLevel,
        helpContext: traceData.helpContext,
        strategyUsed: traceData.strategyUsed,
        outcomeStatus: traceData.outcomeStatus,
        proofImageUrl: traceData.proofImageUrl,
        dialogue: traceData.nayaDialogue,
      },
    });

    const rawResponse = await callClaude(prompt, true, undefined, 1000, 2);
    const analysis = extractJsonFromLLMResponse<DiscoveryAIAnalysis>(rawResponse);

    if (!analysis) return null;

    let hypothesisCycleId: string | null = null;

    // Si une anomalie positive ou une capacité supérieure est détectée, Naya formule une hypothèse
    if (analysis.potential_anomaly && analysis.anomaly_hypothesis) {
      const newHypothesis = {
        cause: "READY_FOR_MORE",
        evidence_log: [
          {
            fact: `Exploration libre "${traceData.title}" (${traceData.domain}) : ${analysis.anomaly_hypothesis}`,
            source: "discovery_trace",
            trace_id: traceId,
          },
        ],
        direction: "AHEAD",
        confidence: "medium",
      };

      // Vérifier s'il y a déjà un cycle ouvert pour cet enfant sur ce domaine
      const { data: existingCycle } = await supabaseAdmin
        .from("hypothesis_cycles")
        .select("id, hypotheses")
        .eq("child_id", childId)
        .eq("status", "open")
        .maybeSingle();

      if (existingCycle) {
        const currentHyps = Array.isArray(existingCycle.hypotheses) ? existingCycle.hypotheses : [];
        await supabaseAdmin
          .from("hypothesis_cycles")
          .update({
            hypotheses: [newHypothesis, ...currentHyps],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCycle.id);
        hypothesisCycleId = existingCycle.id;
      } else {
        const { data: createdCycle } = await supabaseAdmin
          .from("hypothesis_cycles")
          .insert({
            child_id: childId,
            user_id: userId,
            trigger_domain: traceData.domain,
            status: "open",
            hypotheses: [newHypothesis],
            parent_narrative: analysis.summary,
          })
          .select("id")
          .single();
        if (createdCycle) {
          hypothesisCycleId = createdCycle.id;
        }
      }
    }

    // Mise à jour de la trace avec l'analyse IA et l'id de cycle éventuel
    await supabaseAdmin
      .from("discovery_traces")
      .update({
        ai_behavioral_analysis: analysis,
        hypothesis_cycle_id: hypothesisCycleId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", traceId);

    // Audit Shadow
    void verifyAndLog({
      kind: "narrative",
      output: JSON.stringify(analysis),
      context: { childAge, childId, domain: traceData.domain },
      sourceFunction: "analyzeAndCalibrateTrace",
      model: "deepseek-v4-flash",
    });

    return analysis;
  } catch (err) {
    console.error("analyzeAndCalibrateTrace failed (non-fatal):", err);
    return null;
  }
}

// ── Server Functions ─────────────────────────────────────────────────────────

export const createDiscoveryTrace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateDiscoveryTraceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Vérification d'accès au profil enfant (Parent ou Mentor assigné)
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, talents, user_id")
      .eq("id", data.childId)
      .maybeSingle();

    if (childErr || !child) {
      throw new Error("Profil enfant introuvable ou accès non autorisé.");
    }

    // Vérifier si l'utilisateur est le parent ou un mentor assigné
    const isParent = child.user_id === userId;
    let isMentor = false;
    if (!isParent) {
      const { data: mentorLink } = await supabaseAdmin
        .from("mentors")
        .select("id")
        .eq("child_profile_id", data.childId)
        .eq("mentor_user_id", userId)
        .is("removed_at", null)
        .maybeSingle();
      isMentor = !!mentorLink;
    }

    if (!isParent && !isMentor) {
      throw new Error("Accès refusé : vous devez être le parent ou le mentor de cet enfant.");
    }

    // 2. Insertion de la trace
    const insertPayload: any = {
      child_id: data.childId,
      user_id: child.user_id, // L'owner de la donnée reste le compte parent
      source_type: data.sourceType,
      title: data.title.trim(),
      description: data.description.trim(),
      domain: data.domain,
      perceived_difficulty: data.perceivedDifficulty ?? null,
      attempts_count: data.attemptsCount,
      duration_minutes: data.durationMinutes ?? null,
      autonomy_level: data.autonomyLevel ?? null,
      help_context: data.helpContext?.trim() ?? null,
      strategy_used: data.strategyUsed?.trim() ?? null,
      outcome_status: data.outcomeStatus,
      proof_image_url: data.proofImageUrl ? data.proofImageUrl.trim() : null,
      naya_dialogue: data.nayaDialogue,
    };

    if (isMentor) {
      insertPayload.mentor_user_id = userId;
      insertPayload.mentor_reviewed_at = new Date().toISOString();
    }

    const { data: trace, error: insertErr } = await supabaseAdmin
      .from("discovery_traces")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr || !trace) {
      throw new Error(`Erreur lors de l'enregistrement de l'exploration : ${insertErr?.message}`);
    }

    // 3. Émission d'événement d'observation pour le Jumeau Pédagogique
    try {
      await supabaseAdmin.from("observation_events").insert({
        child_id: data.childId,
        user_id: child.user_id,
        type: "DISCOVERY_EXPLORATION_RECORDED",
        source: "discovery_trace",
        payload: {
          trace_id: trace.id,
          source_type: data.sourceType,
          title: data.title,
          domain: data.domain,
          autonomy_level: data.autonomyLevel,
          attempts_count: data.attemptsCount,
          outcome_status: data.outcomeStatus,
          perceived_difficulty: data.perceivedDifficulty,
        },
      });
    } catch (evtErr) {
      console.warn("Échec de l'émission observation_events pour discovery (non-fatal):", evtErr);
    }

    // 4. Analyse IA & Calibration en tâche de fond / synchrone
    const analysis = await analyzeAndCalibrateTrace({
      supabaseAdmin,
      traceId: trace.id,
      childId: child.id,
      childName: child.name,
      childAge: child.age,
      talents: (child.talents as Record<string, number>) || {},
      traceData: data,
      userId: child.user_id,
    });

    return {
      success: true,
      trace: {
        ...trace,
        ai_behavioral_analysis: analysis,
      },
    };
  });

export const getDiscoveryTracesForChild = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GetDiscoveryTracesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Vérifier l'accès
    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();

    if (!child) {
      throw new Error("Profil enfant introuvable.");
    }

    const isParent = child.user_id === userId;
    let isMentor = false;
    if (!isParent) {
      const { data: mentorLink } = await supabaseAdmin
        .from("mentors")
        .select("id")
        .eq("child_profile_id", data.childId)
        .eq("mentor_user_id", userId)
        .is("removed_at", null)
        .maybeSingle();
      isMentor = !!mentorLink;
    }

    if (!isParent && !isMentor) {
      throw new Error("Accès refusé aux traces d'exploration de cet enfant.");
    }

    const { data: traces, error: tracesErr } = await supabaseAdmin
      .from("discovery_traces")
      .select("*")
      .eq("child_id", data.childId)
      .order("created_at", { ascending: false });

    if (tracesErr) {
      throw new Error(`Erreur lors du chargement des traces : ${tracesErr.message}`);
    }

    return traces ?? [];
  });

export const addMentorDiscoveryFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AddMentorFeedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Trouver la trace
    const { data: trace, error: traceErr } = await supabaseAdmin
      .from("discovery_traces")
      .select("id, child_id, title")
      .eq("id", data.traceId)
      .maybeSingle();

    if (traceErr || !trace) {
      throw new Error("Trace introuvable.");
    }

    // 2. Vérifier que l'utilisateur est bien le mentor actif de l'enfant
    const { data: mentorLink } = await supabaseAdmin
      .from("mentors")
      .select("id")
      .eq("child_profile_id", trace.child_id)
      .eq("mentor_user_id", userId)
      .is("removed_at", null)
      .maybeSingle();

    if (!mentorLink) {
      throw new Error("Seul un mentor assigné à cet enfant peut ajouter une observation.");
    }

    // 3. Mettre à jour la trace
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("discovery_traces")
      .update({
        mentor_notes: data.notes.trim(),
        mentor_reviewed_at: new Date().toISOString(),
        mentor_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.traceId)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error(`Erreur lors de l'enregistrement de l'observation mentor : ${updateErr?.message}`);
    }

    return { success: true, trace: updated };
  });

export const getDiscoveryAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: traces, error } = await supabaseAdmin
      .from("discovery_traces")
      .select("id, source_type, domain, outcome_status, ai_behavioral_analysis, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Erreur lors du chargement des statistiques admin : ${error.message}`);
    }

    const totalCount = traces?.length ?? 0;
    const bySource: Record<string, number> = { self_chosen: 0, found_external: 0, open_sandbox: 0 };
    const byDomain: Record<string, number> = {};
    let anomalyCount = 0;

    for (const t of traces ?? []) {
      if (t.source_type && bySource[t.source_type] !== undefined) {
        bySource[t.source_type]++;
      }
      if (t.domain) {
        byDomain[t.domain] = (byDomain[t.domain] || 0) + 1;
      }
      const ai = t.ai_behavioral_analysis as DiscoveryAIAnalysis | null;
      if (ai?.potential_anomaly) {
        anomalyCount++;
      }
    }

    return {
      totalTraces: totalCount,
      bySource,
      byDomain,
      anomalyCount,
      recentTraces: traces?.slice(0, 10) ?? [],
    };
  });

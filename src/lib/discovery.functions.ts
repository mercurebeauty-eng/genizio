// Espace Découverte — Fonctions métier, enregistrement des traces et calibration Naya.
//
// Capture l'initiative, la curiosité et la démarche cognitive des enfants lorsqu'ils
// explorent librement en dehors du parcours structuré habituel, et alimente la boucle
// d'apprentissage du Jumeau Pédagogique (Naya).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { callClaude, safeJsonParse } from "@/lib/challenges.functions";
import { buildDiscoveryAnalysisPrompt } from "@/lib/naya-prompts";
import { verifyAndLog } from "@/lib/naya-verifier.functions";

// ── Vocabulaire & Constantes Découverte ────────────────────────────────────────

export const DISCOVERY_SOURCES = [
  "self_chosen",
  "found_external",
  "open_sandbox",
  "fablab_marathon",
  "projet_collectif",
] as const;
export type DiscoverySourceType = (typeof DISCOVERY_SOURCES)[number];

export const DISCOVERY_POLES = {
  individual: {
    id: "individual",
    title: "Explorations Individuelles",
    subtitle: "L'enfant dans son univers d'initiative libre et d'autonomie personnelle",
    badge: "Solo & Autonomie",
    sources: ["self_chosen", "found_external", "open_sandbox"] as const,
  },
  collective: {
    id: "collective",
    title: "Ateliers Pratiques & Projets Collectifs",
    subtitle: "L'enfant face aux pairs, au matériel réel et à l'intelligence collective",
    badge: "Ateliers & Guilde",
    sources: ["fablab_marathon", "projet_collectif"] as const,
  },
} as const;

export const DISCOVERY_SOURCE_LABELS: Record<
  DiscoverySourceType,
  {
    label: string;
    door: string;
    title: string;
    badge: string;
    description: string;
    cta: string;
    theme: "amber" | "sky" | "emerald" | "indigo" | "rose";
    pole: "individual" | "collective";
  }
> = {
  self_chosen: {
    label: "Je choisis",
    door: "1. Je choisis",
    title: "Initiative & Création",
    badge: "Initiative personnelle",
    description:
      "Une idée, un bricolage, un conte ou un projet né de sa propre imagination sans aucune consigne.",
    cta: "Raconter sa création",
    theme: "amber",
    pole: "individual",
  },
  found_external: {
    label: "Je trouve",
    door: "2. Je trouve",
    title: "Curiosité Externe",
    badge: "Défi trouvé ailleurs",
    description:
      "Un casse-tête, une énigme ardue ou un défi découvert à l'école, dans un livre ou sur le web.",
    cta: "Décortiquer le défi",
    theme: "sky",
    pole: "individual",
  },
  open_sandbox: {
    label: "Je tente",
    door: "3. Je tente",
    title: "Laboratoire Libre",
    badge: "Essais-Erreurs & Tests",
    description:
      "Une expérience spontanée par essais-erreurs, tests d'hypothèses et manipulation sans consigne fermée.",
    cta: "Consigner l'expérience",
    theme: "emerald",
    pole: "individual",
  },
  fablab_marathon: {
    label: "Fab Lab",
    door: "4. Fab Lab & Atelier",
    title: "Immersion Maker",
    badge: "Atelier & Outils Réels",
    description:
      "Création concrète avec outils réels, bricolage guidé, découpe, électronique ou atelier tiers-lieu.",
    cta: "Documenter l'atelier",
    theme: "indigo",
    pole: "collective",
  },
  projet_collectif: {
    label: "Projet d'équipe",
    door: "5. Projet d'Équipe",
    title: "Coopération & Guilde",
    badge: "Escouade & Entraide",
    description:
      "Projet mené à plusieurs, mettant en jeu la complémentarité des talents et l'intelligence collective.",
    cta: "Partager le projet d'équipe",
    theme: "rose",
    pole: "collective",
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

export const DISCOVERY_TEAM_ROLES = [
  {
    id: "ideateur",
    label: "💡 Idéateur & Créatif",
    desc: "Foisonnement d'idées, vision globale et imagination",
  },
  {
    id: "batisseur",
    label: "🔨 Bâtisseur & Praticien",
    desc: "Concrétisation, assemblage et réalisation technique",
  },
  {
    id: "capitaine",
    label: "🧭 Capitaine & Moteur",
    desc: "Impulsion, motivation du groupe et prise de décision",
  },
  {
    id: "organisateur",
    label: "⏱️ Organisateur & Planificateur",
    desc: "Méthode, gestion du temps et répartition des tâches",
  },
  {
    id: "mediateur",
    label: "🤝 Médiateur & Ciment d'équipe",
    desc: "Écoute, régulation des émotions et harmonie",
  },
  {
    id: "chercheur",
    label: "🔍 Chercheur & Stratège",
    desc: "Analyse des blocages, recherche d'infos et logique",
  },
  {
    id: "finisseur",
    label: "🎨 Perfectionniste & Finisseur",
    desc: "Souci du détail, finitions et vérification",
  },
  {
    id: "porte_parole",
    label: "📢 Porte-parole & Conteur",
    desc: "Présentation du projet, pitch et narration",
  },
  {
    id: "soutien",
    label: "🛡️ Soutien & Pilier logistique",
    desc: "Aide polyvalente et assistance aux coéquipiers",
  },
  { id: "autre", label: "✍️ Autre rôle personnalisé", desc: "Rôle sur-mesure ou combiné" },
] as const;

export const DISCOVERY_TEAM_DYNAMICS = [
  {
    id: "complementarite",
    label: "🤝 Complémentarité spontanée",
    desc: "Chacun a naturellement misé sur ses points forts",
  },
  {
    id: "tutorat",
    label: "🎓 Tutorat & Transmission",
    desc: "L'un a guidé ou transmis une compétence à l'autre",
  },
  {
    id: "emulation",
    label: "⚡ Émulation & Synergie créative",
    desc: "Les idées ont rebondi et grandi ensemble",
  },
  {
    id: "leadership_tournant",
    label: "🧭 Leadership partagé / tournant",
    desc: "La direction a changé selon les phases du projet",
  },
  {
    id: "negociation",
    label: "🔄 Rebond constructif après désaccord",
    desc: "Tension ou hésitation surmontée par la concertation",
  },
  {
    id: "parallele",
    label: "🧩 Travail en parallèle puis assemblage",
    desc: "Chacun sa mission en autonomie avant la mise en commun",
  },
  {
    id: "entrainement",
    label: "🚀 Entraînement par l'exemple",
    desc: "Un enfant a impulsé le mouvement et inspiré le groupe",
  },
  { id: "autre", label: "✍️ Autre dynamique observée", desc: "Dynamique spécifique" },
] as const;

export const DISCOVERY_OUTCOMES = [
  "fonctionnel",
  "partiel",
  "en_cours",
  "echec_enrichissant",
] as const;
export type DiscoveryOutcomeStatus = (typeof DISCOVERY_OUTCOMES)[number];

export const DISCOVERY_OUTCOME_LABELS: Record<
  DiscoveryOutcomeStatus,
  { label: string; tone: "success" | "warning" | "info" }
> = {
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
  social_synergy_score?: number;
  interpersonal_insights?: string;
  role_plasticity_analysis?: string;
  image_context_verified?: boolean;
  image_feedback?: string | null;
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
  taggedHandles: z.array(z.string()).optional(),
  officialEventId: z.string().optional().nullable(),
  officialEventName: z.string().optional().nullable(),
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
  const { supabaseAdmin, traceId, childId, childName, childAge, talents, traceData, userId } =
    params;

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

    const rawResponse = await callClaude(prompt, true, undefined, 2500, 2);
    let analysis: DiscoveryAIAnalysis | null = null;
    try {
      analysis = safeJsonParse<DiscoveryAIAnalysis>(rawResponse);
    } catch {
      return null;
    }

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
      childId,
      context: { childAge, domain: traceData.domain },
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

    // 2. Résolution des coéquipiers tagués (taggedHandles)
    let taggedChildIds: string[] = [];
    if (data.taggedHandles && data.taggedHandles.length > 0) {
      // Extraire les noms d'utilisateurs purs sans le @
      const usernames = data.taggedHandles.map((h) => h.replace(/^@/, ""));
      const { data: matchedProfiles } = await supabaseAdmin
        .from("child_profiles")
        .select("id, user_id, name")
        .in("username", usernames);

      if (matchedProfiles && matchedProfiles.length > 0) {
        taggedChildIds = matchedProfiles.map((p) => p.id);

        // Notifier les parents/mentors des enfants tagués
        const { notifyUser } = await import("@/lib/app-notifications");
        for (const p of matchedProfiles) {
          await notifyUser({
            userId: p.user_id,
            type: "collective_discovery_tagged",
            childId: p.id,
            payload: {
              title: data.title.trim(),
              authorName: child.name,
              sourceType: data.sourceType,
            },
            channels: { push: true },
          });
        }
      }
    }

    let finalStrategy = data.strategyUsed?.trim() ?? null;
    if (
      data.officialEventName &&
      (!finalStrategy || !finalStrategy.includes(data.officialEventName))
    ) {
      finalStrategy = `Événement: ${data.officialEventName.trim()}${finalStrategy ? ` | ${finalStrategy}` : ""}`;
    }

    // 3. Insertion de la trace
    const insertPayload: any = {
      child_id: data.childId,
      user_id: child.user_id,
      source_type: data.sourceType,
      title: data.title.trim(),
      description: data.description.trim(),
      domain: data.domain,
      perceived_difficulty: data.perceivedDifficulty ?? null,
      attempts_count: data.attemptsCount,
      duration_minutes: data.durationMinutes ?? null,
      autonomy_level: data.autonomyLevel ?? null,
      help_context: data.helpContext?.trim() ?? null,
      strategy_used: finalStrategy,
      outcome_status: data.outcomeStatus,
      proof_image_url: data.proofImageUrl ? data.proofImageUrl.trim() : null,
      naya_dialogue: data.nayaDialogue,
      tagged_child_ids: taggedChildIds,
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
      .select("*, child_profiles!discovery_traces_child_id_fkey(username, name)")
      .or(`child_id.eq.${data.childId},tagged_child_ids.cs.{${data.childId}}`)
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
      throw new Error(
        `Erreur lors de l'enregistrement de l'observation mentor : ${updateErr?.message}`,
      );
    }

    return { success: true, trace: updated };
  });

export const getDiscoveryAdminStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: traces, error } = await supabaseAdmin
      .from("discovery_traces")
      .select(
        "id, title, source_type, domain, outcome_status, strategy_used, help_context, ai_behavioral_analysis, mentor_reviewed_at, created_at, child_profiles!discovery_traces_child_id_fkey(name, age, username)",
      )
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      throw new Error(`Erreur lors du chargement des statistiques admin : ${error.message}`);
    }

    const totalCount = traces?.length ?? 0;
    const bySource: Record<string, number> = {
      self_chosen: 0,
      found_external: 0,
      open_sandbox: 0,
      fablab_marathon: 0,
      projet_collectif: 0,
    };
    const byDomain: Record<string, number> = {};
    const rolesDistribution: Record<string, number> = {};
    const dynamicsDistribution: Record<string, number> = {};
    const anomaliesList: any[] = [];
    let reviewedCount = 0;

    for (const t of traces ?? []) {
      if (t.source_type && bySource[t.source_type] !== undefined) {
        bySource[t.source_type]++;
      }
      if (t.domain) {
        byDomain[t.domain] = (byDomain[t.domain] || 0) + 1;
      }
      if (t.mentor_reviewed_at) {
        reviewedCount++;
      }

      // Extraction des rôles et dynamiques depuis strategy_used (si projet collectif)
      if (t.source_type === "projet_collectif" && t.strategy_used) {
        for (const role of DISCOVERY_TEAM_ROLES) {
          if (t.strategy_used.includes(role.label) || t.strategy_used.includes(role.id)) {
            rolesDistribution[role.label] = (rolesDistribution[role.label] || 0) + 1;
          }
        }
        for (const dyn of DISCOVERY_TEAM_DYNAMICS) {
          if (t.strategy_used.includes(dyn.label) || t.strategy_used.includes(dyn.id)) {
            dynamicsDistribution[dyn.label] = (dynamicsDistribution[dyn.label] || 0) + 1;
          }
        }
      }

      const ai = t.ai_behavioral_analysis as DiscoveryAIAnalysis | null;
      if (ai?.potential_anomaly) {
        const child = (t as any).child_profiles;
        anomaliesList.push({
          id: t.id,
          title: t.title,
          childName: child?.name || "Enfant",
          childAge: child?.age || null,
          domain: t.domain,
          sourceType: t.source_type,
          anomalyHypothesis: ai.anomaly_hypothesis,
          cognitiveInsights: ai.cognitive_insights,
          initiativeScore: ai.initiative_score || 8,
          createdAt: t.created_at,
        });
      }
    }

    return {
      totalTraces: totalCount,
      bySource,
      byDomain,
      rolesDistribution,
      dynamicsDistribution,
      anomalyCount: anomaliesList.length,
      anomaliesList: anomaliesList.slice(0, 15),
      reviewedCount,
      recentTraces: traces?.slice(0, 12) ?? [],
    };
  });

export const AddCoPerspectiveSchema = z.object({
  traceId: z.string().uuid(),
  childId: z.string().uuid(),
  role: z.string().min(2).max(100),
  perspective: z.string().min(5).max(3000),
  proofImageUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const addCoPerspectiveToTrace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AddCoPerspectiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Vérification d'accès à l'enfant qui ajoute sa perspective
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable");

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

    if (!isParent && !isMentor) throw new Error("Accès refusé");

    // Récupérer la trace pour s'assurer que l'enfant est bien tagué
    const { data: trace } = await supabaseAdmin
      .from("discovery_traces")
      .select("id, co_perspectives, tagged_child_ids")
      .eq("id", data.traceId)
      .maybeSingle();

    if (!trace) throw new Error("Trace introuvable");

    const tagged = Array.isArray(trace.tagged_child_ids) ? trace.tagged_child_ids : [];
    if (!tagged.includes(data.childId)) {
      throw new Error("L'enfant n'est pas tagué dans ce projet collectif");
    }

    const currentPerspectives = Array.isArray(trace.co_perspectives) ? trace.co_perspectives : [];

    const newPerspective = {
      child_id: data.childId,
      role: data.role,
      perspective: data.perspective,
      proof_image_url: data.proofImageUrl || null,
      added_at: new Date().toISOString(),
      added_by_user_id: userId,
    };

    // Mettre à jour la trace (sans écraser les perspectives existantes)
    const { error: updateErr } = await supabaseAdmin
      .from("discovery_traces")
      .update({
        co_perspectives: [...currentPerspectives, newPerspective],
      })
      .eq("id", data.traceId);

    if (updateErr) throw new Error("Erreur lors de l'ajout de la perspective");

    return { success: true };
  });

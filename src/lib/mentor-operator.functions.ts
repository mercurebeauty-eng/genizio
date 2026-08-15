// Mentor Copilote (décision #74, 2026-08-15) — les actions opérateur du mentor.
//
// Toutes ces fonctions passent par supabaseAdmin (service role) APRÈS
// assertMentorOperator : la RLS « Parents manage their own challenges »
// (auth.uid() = user_id) bloquerait un tiers via le client parent — la vérification
// explicite EST la sécurité, et les écritures sont tracées dans mentor_actions.
//
// Règles verrouillées (décision #74) :
//   • le mentor opère les défis des enfants ACCOMPAGNÉS (pack ou campagne) ;
//   • challenges.user_id reste le parent (ownership) — attribution via created_by_user_id ;
//   • la chaîne IA (preuve photo/déclarative → points/Jumeau) est INTACTE — les cœurs
//     partagés de challenges.functions.ts sont réutilisés, seul l'acteur change ;
//   • jamais de suppression, jamais de publication ;
//   • les notes du mentor vont dans le journal (action 'notes'), challenges.notes
//     reste le journal d'apprentissage du parent.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertMentorOperator } from "@/lib/mentor-operator";
import { logMentorAction } from "@/lib/mentor-actions";
import { notifyUser } from "@/lib/app-notifications";
import { creditMentorPoints } from "@/lib/mentor-trust";
import { resolveTimeLimitMinutes } from "@/lib/time-limit";
import {
  validateChallengeProofCore,
  submitDeclarativeProofCore,
  generateChallengesCore,
  assignTemplateChallengeCore,
  classifyNotCompletedReason,
  AssignTemplateInput,
} from "@/lib/challenges.functions";

const MentorUpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const mentorUpdateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: challenge, error: challengeErr } = await (supabaseAdmin as any)
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (challengeErr || !challenge) throw new Error("Défi introuvable");

    // L'autorisation opérateur est faite AVANT toute écriture (service role).
    await assertMentorOperator(supabaseAdmin as any, userId, challenge.child_id);

    if (challenge.child_profiles?.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (challenge.child_profiles?.is_active === false)
      throw new Error("Ce profil est désactivé par l'administrateur.");

    // Même garde que le parent : jamais de complétion manuelle — le mentor soumet
    // la preuve (photo prise en séance ou déclarative) via mentorSubmitProof.
    if (data.status === "completed") {
      throw new Error(
        "Un défi ne peut pas être terminé manuellement sans preuve. Le mentor soumet la preuve (photo ou déclarative) prise en séance.",
      );
    }

    // Les notes du mentor sont journalisées (action 'notes') — le journal sert de
    // journal de séance ; challenges.notes reste le journal d'apprentissage du parent.
    if (data.notes) {
      void logMentorAction({
        mentorUserId: userId,
        childId: challenge.child_id,
        challengeId: challenge.id,
        action: "notes",
        payload: { note: data.notes },
      });
    }

    // Miroir exact de la logique de patch de updateChallenge (status/progress uniquement).
    const patch: {
      status?: "todo" | "in_progress" | "completed";
      progress?: number;
      completed_at?: string | null;
      time_limit_minutes?: number | null;
    } = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completed_at = null;
      if (data.status === "todo") patch.progress = 0;
    }
    if (data.progress !== undefined) {
      patch.progress = data.progress;
      if (data.progress > 0) {
        patch.status = "in_progress";
        patch.completed_at = null;
      }
    }

    // Temps adaptatif (2026-08-12) : repli au démarrage — identique à updateChallenge.
    if (
      patch.status === "in_progress" &&
      !challenge.time_limit_minutes &&
      (challenge.child_profiles as any)?.time_pressure !== "none"
    ) {
      patch.time_limit_minutes = resolveTimeLimitMinutes({
        estimatedMinutes: challenge.estimated_duration_minutes,
        age: (challenge.child_profiles as any)?.age ?? 10,
        timePressure: (challenge.child_profiles as any)?.time_pressure ?? "standard",
        difficulty: challenge.difficulty,
      });
    }

    if (Object.keys(patch).length === 0) return challenge;

    const { data: row, error } = await (supabaseAdmin as any)
      .from("challenges")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    void logMentorAction({
      mentorUserId: userId,
      childId: challenge.child_id,
      challengeId: challenge.id,
      action: "update",
      payload: { status: data.status ?? null, progress: data.progress ?? null },
    });

    return row;
  });

const MentorNotCompletedInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
  reasonChip: z.string().optional(),
});

export const mentorSubmitNotCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorNotCompletedInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: challenge, error: challengeErr } = await (supabaseAdmin as any)
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (challengeErr || !challenge) throw new Error("Défi introuvable");

    await assertMentorOperator(supabaseAdmin as any, userId, challenge.child_id);
    if (challenge.child_profiles?.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (challenge.child_profiles?.is_active === false)
      throw new Error("Ce profil est désactivé par l'administrateur.");

    // Mêmes gardes de statut que submitChallengeNotCompleted (review 2026-08-12, P1).
    if (challenge.status === "completed") {
      throw new Error("Ce défi est déjà terminé — il ne peut pas être marqué non réussi.");
    }
    if (challenge.status === "not_completed") {
      throw new Error("Ce défi est déjà marqué non réussi.");
    }

    const { data: updated, error } = await (supabaseAdmin as any)
      .from("challenges")
      .update({
        status: "not_completed" as const,
        not_completed_reason: data.reason,
        not_completed_reason_chip: data.reasonChip ?? null,
        not_completed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Traitement post-échec en arrière-plan — même chaîne que le parent (classification,
    // discriminants, retest, reformulation, recommandation). Le userId passé à
    // processModalityReformulation est le PARENT (challenge.user_id) : la reformulation
    // est un nouveau défi appartenant au parent, pas au mentor.
    const parentUserId = challenge.user_id;
    (async () => {
      const cause = await classifyNotCompletedReason(data.reason);
      if (cause) {
        const { error: causeErr } = await (supabaseAdmin as any)
          .from("challenges")
          .update({ not_completed_cause: cause })
          .eq("id", data.id);
        if (causeErr) console.error("Non-fatal: écriture de not_completed_cause échouée", causeErr);
      }

      try {
        const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
        void processDiscriminantResult(data.id, "ABANDONED");
      } catch (err) {
        console.error("Non-fatal: processDiscriminantResult failed", err);
      }

      try {
        const { processSupportRetestResult } = await import("@/lib/hypotheses.functions");
        void processSupportRetestResult(data.id, "ABANDONED");
      } catch (err) {
        console.error("Non-fatal: processSupportRetestResult failed", err);
      }

      const { canReformulate } = await import("@/lib/modalities.functions");
      if (canReformulate(cause)) {
        try {
          const { processModalityReformulation } = await import("@/lib/modalities.functions");
          const outcome = await processModalityReformulation(
            supabaseAdmin as any,
            parentUserId,
            data.id,
          );
          if (outcome.ok) return; // la reformulation devient la mission suivante
          console.error(
            `Non-fatal: reformulation impossible (${outcome.reason}) — repli sur la recommandation`,
          );
        } catch (err) {
          console.error("Non-fatal: reformulation failed", err);
        }
      }

      try {
        const { recommendChallengesForChild } = await import("@/lib/recommendations.functions");
        void recommendChallengesForChild({ data: { childId: challenge.child_id } });
      } catch (err) {
        console.error("Non-fatal: pré-génération de la prochaine mission a échoué", err);
      }
    })().catch((err) => console.error("Non-fatal: traitement post-échec failed", err));

    void logMentorAction({
      mentorUserId: userId,
      childId: challenge.child_id,
      challengeId: challenge.id,
      action: "abandon",
      payload: { reason: data.reason, reasonChip: data.reasonChip ?? null },
    });
    void notifyUser({
      userId: parentUserId,
      type: "mentor_abandon",
      childId: challenge.child_id,
      payload: { challenge_id: challenge.id, title: challenge.title },
    });

    return { challenge: updated };
  });

const MentorProofInput = z.object({
  challengeId: z.string().uuid(),
  proofText: z.string().max(2000).optional(),
  // Raw bytes — même contrat que validateChallengeProof (upload seulement si l'IA
  // confirme la pertinence, après compression côté client via fileToCompressedProof).
  proofImageBase64: z.string().optional(),
  proofImageMediaType: z.string().optional(),
});

export const mentorSubmitProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorProofInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: challenge, error: challengeErr } = await (supabaseAdmin as any)
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (challengeErr || !challenge) throw new Error("Défi introuvable");

    await assertMentorOperator(supabaseAdmin as any, userId, challenge.child_id);

    // La photo prise EN SÉANCE par le mentor (seul adulte présent) traverse la MÊME
    // chaîne IA que la preuve parent : pertinence → points → Jumeau → observations.
    const result = await validateChallengeProofCore({
      db: supabaseAdmin as any,
      challenge,
      actingUserId: userId,
      id: data.challengeId,
      proofText: data.proofText,
      proofImageBase64: data.proofImageBase64,
      proofImageMediaType: data.proofImageMediaType,
    });

    void logMentorAction({
      mentorUserId: userId,
      childId: challenge.child_id,
      challengeId: challenge.id,
      action: result.relevant ? "proof_submitted" : "proof_rejected",
      payload: { relevant: result.relevant, imageAnalyzed: result.imageAnalyzed },
    });
    if (result.relevant) {
      // Veto éclairé du parent : il voit la photo + le résultat IA et peut réouvrir.
      void notifyUser({
        userId: challenge.user_id,
        type: "mentor_challenge_completed",
        childId: challenge.child_id,
        payload: { challenge_id: challenge.id, title: challenge.title },
      });
      // Confiance Mentor (V3) : un défi complété par le mentor crédite +2 points
      // (idempotent — l'index unique (challenge_id, kind) empêche le double crédit).
      void creditMentorPoints(supabaseAdmin as any, {
        mentorUserId: userId,
        childId: challenge.child_id,
        challengeId: challenge.id,
        kind: "challenge_completed",
        points: 2,
        reason: "Défi complété par le mentor",
      });
    }

    return result;
  });

const MentorDeclarativeInput = z.object({
  challengeId: z.string().uuid(),
  reportedValue: z.number().finite(),
});

export const mentorSubmitDeclarativeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorDeclarativeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: challenge, error: challengeErr } = await (supabaseAdmin as any)
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (challengeErr || !challenge) throw new Error("Défi introuvable");

    await assertMentorOperator(supabaseAdmin as any, userId, challenge.child_id);

    // Mode déclaratif (décision #36) : 0 appel IA, confiance en l'adulte présent — le
    // mentor remplit la valeur (ex. « 43 jonglages » vs cible 40).
    const result = await submitDeclarativeProofCore({
      db: supabaseAdmin as any,
      challenge,
      actingUserId: userId,
      id: data.challengeId,
      reportedValue: data.reportedValue,
    });

    void logMentorAction({
      mentorUserId: userId,
      childId: challenge.child_id,
      challengeId: challenge.id,
      action: result.relevant ? "proof_submitted" : "proof_rejected",
      payload: { relevant: result.relevant, declarative: true },
    });
    if (result.relevant) {
      void notifyUser({
        userId: challenge.user_id,
        type: "mentor_challenge_completed",
        childId: challenge.child_id,
        payload: { challenge_id: challenge.id, title: challenge.title },
      });
      // Confiance Mentor (V3) : +2 points pour un défi complété (idempotent en base).
      void creditMentorPoints(supabaseAdmin as any, {
        mentorUserId: userId,
        childId: challenge.child_id,
        challengeId: challenge.id,
        kind: "challenge_completed",
        points: 2,
        reason: "Défi complété par le mentor (déclaratif)",
      });
    }

    return result;
  });

const MentorGenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

export const mentorGenerateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorGenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child, error: childErr } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    await assertMentorOperator(supabaseAdmin as any, userId, data.childId);

    // user_id = le PARENT (ownership intact) ; created_by_user_id = le mentor
    // (attribution). Le cœur IA est strictement le même que pour le parent.
    const inserted = await generateChallengesCore({
      db: supabaseAdmin as any,
      child,
      childId: data.childId,
      count: data.count,
      ownerUserId: child.user_id,
      createdByUserId: userId,
    });

    void logMentorAction({
      mentorUserId: userId,
      childId: data.childId,
      action: "generate",
      payload: { count: data.count },
    });

    return inserted;
  });

export const mentorAssignTemplateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AssignTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child, error: childErr } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("id, age, time_pressure, user_id")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    await assertMentorOperator(supabaseAdmin as any, userId, data.childId);

    const inserted = await assignTemplateChallengeCore({
      db: supabaseAdmin as any,
      child,
      childId: data.childId,
      template: data.template,
      estimatedDurationMinutes: data.estimated_duration_minutes,
      ownerUserId: child.user_id,
      createdByUserId: userId,
    });

    void logMentorAction({
      mentorUserId: userId,
      childId: data.childId,
      challengeId: inserted.id,
      action: "assign",
      payload: { title: inserted.title },
    });

    return inserted;
  });

// Mentor Copilote (décision #74, 2026-08-15) — le bilan de fin (« bilan inclus » du
// pack 60 000 F). Seule pièce à validation EXPLICITE du parent (draft → submitted →
// validated | rejected → draft). Écriture via supabaseAdmin + assertMentorOperator ;
// validation parent avec ownership vérifiée sur child_profiles.user_id.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertMentorOperator } from "@/lib/mentor-operator";
import { notifyUser } from "@/lib/app-notifications";
import { nextReportStatus } from "@/lib/mentor-reports";

const SaveReportInput = z.object({
  childId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  realisations: z.string().max(5000).default(""),
  competencesObservees: z.string().max(5000).default(""),
  recommandations: z.string().max(5000).default(""),
});

export const saveMentorReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SaveReportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    await assertMentorOperator(supabaseAdmin as any, userId, data.childId);

    const { data: latest } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("*")
      .eq("child_profile_id", data.childId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      child_profile_id: data.childId,
      mentor_user_id: userId,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      realisations: data.realisations,
      competences_observees: data.competencesObservees,
      recommandations: data.recommandations,
    };

    // Pas de bilan encore → création d'un brouillon.
    if (!latest) {
      const { data: created, error } = await (supabaseAdmin as any)
        .from("mentor_reports")
        .insert({ ...payload, status: "draft" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { report: created };
    }

    // Un brouillon (ou un bilan rejeté) → mise à jour du contenu, retour en draft.
    if (latest.status === "draft" || latest.status === "rejected") {
      const { data: updated, error } = await (supabaseAdmin as any)
        .from("mentor_reports")
        .update({
          ...payload,
          status: "draft",
          parent_feedback: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", latest.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { report: updated };
    }

    // Soumis → verrouillé (en attente du parent). Validé → nouvelle période (l'index
    // partiel autorise une nouvelle ligne une fois la précédente clôturée).
    if (latest.status === "submitted") {
      throw new Error(
        "Un bilan est déjà soumis pour cet enfant — en attente de validation du parent.",
      );
    }
    if (latest.status === "validated") {
      const { data: created, error } = await (supabaseAdmin as any)
        .from("mentor_reports")
        .insert({ ...payload, status: "draft" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { report: created };
    }
    throw new Error("État de bilan inconnu.");
  });

const SubmitReportInput = z.object({
  reportId: z.string().uuid(),
});

export const submitMentorReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitReportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: report, error: reportErr } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("*")
      .eq("id", data.reportId)
      .maybeSingle();
    if (reportErr || !report) throw new Error("Bilan introuvable.");
    if (report.mentor_user_id !== userId) throw new Error("Accès refusé.");

    await assertMentorOperator(supabaseAdmin as any, userId, report.child_profile_id);

    const status = nextReportStatus(report.status, "submit");
    const { data: updated, error } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", data.reportId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { report: updated };
  });

// Lecture par le mentor (ses propres bilans pour un enfant assigné) — vérification
// d'assignation active, sans exiger l'accompagnement (le statut du bilan reste visible
// même si le pack a expiré entre-temps).
export const getMentorReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;
    const childId = data.childId;

    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    if ((profile?.status as string | undefined) === "banned")
      throw new Error("Votre compte mentor est banni.");

    const { data: assignment } = await (supabaseAdmin as any)
      .from("mentors")
      .select("id")
      .eq("mentor_user_id", userId)
      .eq("child_profile_id", childId)
      .is("removed_at", null)
      .maybeSingle();
    if (!assignment) throw new Error("Cet enfant n'est pas (plus) assigné à votre suivi.");

    const { data: reports, error } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("*")
      .eq("child_profile_id", childId)
      .eq("mentor_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { reports: reports ?? [] };
  });

// Lecture par le parent (ownership vérifiée sur child_profiles.user_id).
export const getChildBilan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;
    const childId = data.childId;

    const { data: child } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("user_id")
      .eq("id", childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) throw new Error("Accès refusé.");

    const { data: report } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("*")
      .eq("child_profile_id", childId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { report: report ?? null };
  });

const ValidateReportInput = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(["validate", "reject"]),
  feedback: z.string().max(2000).optional(),
});

export const validateMentorReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ValidateReportInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: report, error: reportErr } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("*")
      .eq("id", data.reportId)
      .maybeSingle();
    if (reportErr || !report) throw new Error("Bilan introuvable.");

    // Ownership parent : le validateur doit être le parent de l'enfant du bilan.
    const { data: child } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("user_id")
      .eq("id", report.child_profile_id)
      .maybeSingle();
    if (!child || child.user_id !== userId) throw new Error("Accès refusé.");

    const status = nextReportStatus(report.status, data.decision);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (data.decision === "validate") {
      patch.validated_by = userId;
      patch.validated_at = new Date().toISOString();
      patch.parent_feedback = null;
    } else {
      patch.validated_by = null;
      patch.validated_at = null;
      patch.parent_feedback = data.feedback ?? null;
    }

    const { data: updated, error } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .update(patch)
      .eq("id", data.reportId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    void notifyUser({
      userId: report.mentor_user_id,
      type:
        data.decision === "validate" ? "mentor_bilan_validated" : "mentor_bilan_rejected",
      childId: report.child_profile_id,
      payload: { report_id: report.id, feedback: data.feedback ?? null },
    });

    return { report: updated };
  });

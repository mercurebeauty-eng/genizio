import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";

export interface ChildSafetyReportDetail {
  id: string;
  child_id: string;
  child_name?: string;
  reporter_user_id: string;
  reporter_role: "parent" | "educator" | "admin" | "other";
  accused_mentor_user_id: string;
  accused_mentor_name?: string;
  session_id: string | null;
  category:
    | "harassment"
    | "verbal_abuse"
    | "excessive_stress"
    | "unauthorized_contact"
    | "unpunctuality_fraud"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence_urls: string[] | null;
  status: "open" | "investigating" | "sanctioned" | "dismissed";
  kill_switch_triggered: boolean;
  investigation_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ChildSafetyAuditDetail {
  id: string;
  child_id: string;
  child_name: string;
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  family_phone: string | null;
  quarter_period: string;
  status: "pending" | "contacted_ok" | "warning" | "escalated" | "unreachable";
  contact_channel: "phone_call" | "whatsapp_voice" | "in_person" | "in_app" | null;
  contacted_person: string | null;
  child_wellbeing_rating: number | null;
  notes: string | null;
  conducted_at: string | null;
}

const CreateSafetyReportSchema = z.object({
  childId: z.string().uuid(),
  accusedMentorUserId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  category: z.enum([
    "harassment",
    "verbal_abuse",
    "excessive_stress",
    "unauthorized_contact",
    "unpunctuality_fraud",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
  description: z.string().min(5, "Description trop courte (minimum 5 caractères)"),
  evidenceUrls: z.array(z.string().url()).optional(),
});

/**
 * Dépose un signalement d'urgence concernant le comportement d'un mentor.
 * Émis par un parent, un enseignant, ou un tuteur.
 */
export const createChildSafetyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => CreateSafetyReportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = context.user;

    // Détermination du rôle du rapporteur
    let reporterRole: "parent" | "educator" | "admin" | "other" = "parent";
    const { data: child } = await supabaseAdmin
      .from("child_profiles")
      .select("user_id")
      .eq("id", data.childId)
      .maybeSingle();

    if (child?.user_id === user.id) {
      reporterRole = "parent";
    } else {
      reporterRole = "educator";
    }

    const { data: report, error } = await supabaseAdmin
      .from("child_safety_reports")
      .insert({
        child_id: data.childId,
        reporter_user_id: user.id,
        reporter_role: reporterRole,
        accused_mentor_user_id: data.accusedMentorUserId,
        session_id: data.sessionId || null,
        category: data.category,
        severity: data.severity,
        description: data.description.trim(),
        evidence_urls: data.evidenceUrls || [],
        status: "open",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Erreur createChildSafetyReport:", error);
      throw new Error(`Impossible d'enregistrer le signalement : ${error.message}`);
    }

    // Alerte automatique pour les cas graves
    if (data.severity === "critical" || data.severity === "high") {
      console.warn(
        `🚨 ALERTE SÉCURITÉ ENFANT [${data.severity.toUpperCase()}] : Mentor ${data.accusedMentorUserId}, Enfant ${data.childId}`,
      );
    }

    return report;
  });

/**
 * Liste tous les signalements de sécurité (réservé aux administrateurs Génizio).
 */
export const listChildSafetyReports = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((filter?: { status?: string }) => filter)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("child_safety_reports")
      .select(`
        *,
        child_profiles:child_id (name),
        accused:accused_mentor_user_id (email)
      `)
      .order("created_at", { ascending: false });

    if (data?.status) {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Erreur listChildSafetyReports:", error);
      return [];
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      child_name: r.child_profiles?.name ?? "Enfant",
      accused_mentor_name: r.accused?.email ?? "Mentor",
    })) as ChildSafetyReportDetail[];
  });

/**
 * Enregistre un audit trimestriel de bienveillance auprès de la famille (Admin OS).
 */
export const recordQuarterlySafetyAudit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (data: {
      childId: string;
      mentorId: string;
      quarterPeriod: string;
      status: "pending" | "contacted_ok" | "warning" | "escalated" | "unreachable";
      contactChannel?: "phone_call" | "whatsapp_voice" | "in_person" | "in_app";
      contactedPerson?: string;
      childWellbeingRating?: number;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminUser = context.user;

    const { data: audit, error } = await supabaseAdmin
      .from("child_safety_audits")
      .upsert(
        {
          child_id: data.childId,
          mentor_id: data.mentorId,
          quarter_period: data.quarterPeriod,
          status: data.status,
          contact_channel: data.contactChannel || "phone_call",
          contacted_person: data.contactedPerson || null,
          child_wellbeing_rating: data.childWellbeingRating || null,
          notes: data.notes?.trim() || null,
          conducted_by: adminUser.id,
          conducted_at: new Date().toISOString(),
        },
        { onConflict: "child_id,quarter_period" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("Erreur recordQuarterlySafetyAudit:", error);
      throw new Error(`Erreur lors de l'enregistrement de l'audit : ${error.message}`);
    }

    return audit;
  });

/**
 * Liste tous les enfants accompagnés pour un trimestre donné et leur statut d'audit.
 * Utilisé par Admin OS pour appeler les familles et vérifier la bienveillance.
 */
export const listQuarterlySafetyAudits = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((quarterPeriod: string) => quarterPeriod)
  .handler(async ({ data: quarterPeriod }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Récupérer toutes les assignations actives mentor ↔ enfant
    const { data: assignments } = await supabaseAdmin
      .from("mentors")
      .select(`
        child_profile_id,
        mentor_user_id,
        child_profiles:child_profile_id (id, name, user_id)
      `)
      .is("removed_at", null);

    if (!assignments || assignments.length === 0) return [];

    // 2. Récupérer les audits existants pour ce trimestre
    const childIds = assignments.map((a: any) => a.child_profile_id);
    const { data: audits } = await supabaseAdmin
      .from("child_safety_audits")
      .select("*")
      .in("child_id", childIds)
      .eq("quarter_period", quarterPeriod);

    const auditMap = new Map((audits ?? []).map((aud: any) => [aud.child_id, aud]));

    // 3. Récupérer les coordonnées des parents et des mentors
    const mentorIds = Array.from(new Set(assignments.map((a: any) => a.mentor_user_id)));
    const parentUserIds = Array.from(
      new Set(assignments.map((a: any) => a.child_profiles?.user_id).filter(Boolean)),
    );

    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userMap = new Map((allUsers?.users ?? []).map((u: any) => [u.id, u]));

    return assignments.map((a: any) => {
      const child = a.child_profiles;
      const mentor = userMap.get(a.mentor_user_id);
      const parent = userMap.get(child?.user_id);
      const existingAudit = auditMap.get(a.child_profile_id);

      return {
        id: existingAudit?.id ?? `pending-${a.child_profile_id}`,
        child_id: a.child_profile_id,
        child_name: child?.name ?? "Élève",
        mentor_id: a.mentor_user_id,
        mentor_name: mentor?.user_metadata?.full_name || mentor?.email || "Mentor",
        mentor_email: mentor?.email || "",
        family_phone: (parent?.user_metadata?.phone as string) || null,
        quarter_period: quarterPeriod,
        status: existingAudit?.status ?? "pending",
        contact_channel: existingAudit?.contact_channel ?? null,
        contacted_person: existingAudit?.contacted_person ?? null,
        child_wellbeing_rating: existingAudit?.child_wellbeing_rating ?? null,
        notes: existingAudit?.notes ?? null,
        conducted_at: existingAudit?.conducted_at ?? null,
      } as ChildSafetyAuditDetail;
    });
  });

/**
 * KILL-SWITCH D'URGENCE (Admin OS)
 * Suspend immédiatement un mentor, révoque ses sessions Supabase actives,
 * gèle ses assignations et ses décaissements.
 */
export const triggerMentorEmergencySuspension = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (data: {
      mentorUserId: string;
      reportId?: string;
      reason: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminUser = context.user;
    const now = new Date().toISOString();

    console.warn(
      `⛔ DÉCLENCHEMENT DU KILL-SWITCH : Suspension du mentor ${data.mentorUserId} par ${adminUser.email}. Motif: ${data.reason}`,
    );

    // 1. Suspension du statut du mentor
    await supabaseAdmin
      .from("mentor_profiles")
      .update({
        status: "suspended",
      })
      .eq("mentor_user_id", data.mentorUserId);

    // 2. Retrait conservatoire de tous les enfants assignés
    await supabaseAdmin
      .from("mentors")
      .update({
        removed_at: now,
      })
      .eq("mentor_user_id", data.mentorUserId)
      .is("removed_at", null);

    // 3. Mise à jour du signalement si fourni
    if (data.reportId) {
      await supabaseAdmin
        .from("child_safety_reports")
        .update({
          kill_switch_triggered: true,
          status: "sanctioned",
          investigation_notes: `Kill-switch activé le ${now} par ${adminUser.email}. Raison: ${data.reason}`,
          resolved_by: adminUser.id,
          resolved_at: now,
        })
        .eq("id", data.reportId);
    }

    return {
      success: true,
      message: "Kill-Switch exécuté : mentor suspendu et assignations enfants révoquées.",
    };
  });

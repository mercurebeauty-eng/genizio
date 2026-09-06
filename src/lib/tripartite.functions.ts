// Server functions de la Boucle Fermée Tripartite (Phase 4, Admin OS).
//
// Génération d'un rapport trimestriel par escouade/mentor + file de
// PROPOSITIONS. Séparation stricte : le moteur (tripartite-reporting.ts, pur)
// produit des faits et des propositions ; ici on ne fait que persister et
// trancher. La confirmation d'une suspension_review passe par le kill-switch
// existant triggerMentorEmergencySuspension — aucune suspension codée ici.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildTripartiteReport,
  proposeMentorDecisions,
  type MentorDecisionProposalKind,
  type TripartiteCohortReport,
} from "@/lib/tripartite-reporting";
import type {
  ChildTripartiteEvaluation,
} from "@/lib/mentor-safeguards";
import { currentAcademicYear } from "@/lib/academic-year";

const QuarterSchema = z.string().regex(/^\d{4}-T[1-4]$/, "période attendue : YYYY-Tn");

// ── Génération d'un rapport trimestriel ─────────────────────────────────────

export const generateTripartiteReportAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z
      .object({
        quarterPeriod: QuarterSchema,
        scope: z.enum(["squad", "school"]).default("squad"),
        squadId: z.string().uuid().optional(),
        schoolId: z.string().uuid().optional(),
      })
      .refine((d) => (d.scope === "squad" ? !!d.squadId : !!d.schoolId), {
        message: "squadId requis pour scope squad, schoolId pour scope school.",
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<TripartiteCohortReport & { proposals: ReturnType<typeof proposeMentorDecisions> }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Cibles : escouades du périmètre, avec leur mentor.
    let squads: Array<{ id: string; mentor_user_id: string; school_id: string | null }> = [];
    if (data.scope === "squad" && data.squadId) {
      const { data: s } = await db
        .from("mentor_squads")
        .select("id, mentor_user_id, school_id")
        .eq("id", data.squadId)
        .maybeSingle();
      if (!s) throw new Error("Escouade introuvable.");
      squads = [s];
    } else if (data.schoolId) {
      const { data: all } = await db
        .from("mentor_squads")
        .select("id, mentor_user_id, school_id")
        .eq("school_id", data.schoolId)
        .eq("status", "active");
      squads = all ?? [];
    }

    if (squads.length === 0) throw new Error("Aucune escouade dans ce périmètre pour la période.");

    // Bornes du trimestre : [début, fin) en UTC.
    const year = Number.parseInt(data.quarterPeriod.slice(0, 4), 10);
    const quarter = Number.parseInt(data.quarterPeriod.slice(-1), 10);
    const start = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const end = new Date(Date.UTC(year, quarter * 3, 1));
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    let lastReport: TripartiteCohortReport | null = null;
    let lastMentor: string | null = null;

    for (const squad of squads) {
      // Membres actifs de l'escouade.
      const { data: members } = await db
        .from("mentor_squad_members")
        .select("child_profile_id")
        .eq("squad_id", squad.id)
        .is("removed_at", null);
      const childIds = (members ?? []).map((m: any) => m.child_profile_id as string);

      // (a) Preuves matérielles du club DANS le trimestre (empreintes/vision réelles).
      const { data: clubSessions } = childIds.length
        ? await db
            .from("mentor_club_sessions")
            .select("id, attendance, proof_image_fingerprint, naya_vision_confidence, vision_verdict, occurred_at")
            .eq("squad_id", squad.id)
            .gte("occurred_at", startIso)
            .lt("occurred_at", endIso)
            .in("status", ["validated", "flagged"])
        : { data: [] };

      // (b) Notes de classe : observations académiques saisies par le professeur
      const { data: gradeRows } = childIds.length
        ? await db
            .from("child_academic_observations")
            .select("child_id, term, previous_average, current_average, class_average, teacher_report_notes")
            .in("child_id", childIds)
            .eq("term", quarter <= 3 ? quarter : 3)
        : { data: [] };

      const gradeByChild = new Map<string, any>(
        (gradeRows ?? []).map((g: any) => [
          g.child_id,
          {
            childId: g.child_id,
            term: g.term as 1 | 2 | 3,
            previousAverage: Number(g.previous_average),
            currentAverage: Number(g.current_average),
            classAverage: g.class_average != null ? Number(g.class_average) : undefined,
            teacherReportNotes: g.teacher_report_notes ?? undefined,
          },
        ]),
      );

      const evaluations: ChildTripartiteEvaluation[] = childIds.map((childId: string) => ({
        childId,
        academicObservation: gradeByChild.get(childId) ?? undefined,
        artifactSubmissions: (clubSessions ?? [])
          .filter((cs: any) =>
            Array.isArray(cs.attendance) &&
            cs.attendance.some((a: any) => a.childProfileId === childId && a.present),
          )
          .map((cs: any) => ({
            challengeId: cs.id,
            childId,
            photoUrl: cs.vision_verdict?.proofPath ?? "",
            imageFingerprint: cs.proof_image_fingerprint ?? `session:${cs.id}`,
            nayaVisionConfidence: cs.naya_vision_confidence ?? 0,
            isMaterialArtifactDetected: cs.vision_verdict?.materialArtifactDetected === true,
            submissionTimestamp: cs.occurred_at,
          })),
        autonomyProbes: [],
      }));


      const report = buildTripartiteReport({
        period: data.quarterPeriod,
        referenceQuarter: { year, quarter },
        evaluations,
      });

      // Persistance : 1 rapport par escouade et trimestre (upsert immuable).
      const { data: savedReport, error: saveErr } = await db
        .from("tripartite_quarterly_reports")
        .upsert(
          {
            school_id: squad.school_id,
            squad_id: squad.id,
            mentor_user_id: squad.mentor_user_id,
            quarter_period: data.quarterPeriod,
            report,
          },
          { onConflict: "squad_id,quarter_period" },
        )
        .select("id")
        .single();
      if (saveErr) throw new Error(`Enregistrement du rapport impossible : ${saveErr.message}`);

      // File de propositions : dédupliquée PAR RAPPORT — un rapport régénéré ne
      // recrée pas ses propositions (statut proposed ou déjà tranché).
      const proposals = proposeMentorDecisions(report);
      if (proposals.length > 0) {
        const { data: existing } = await db
          .from("mentor_decision_proposals")
          .select("kind")
          .eq("report_id", savedReport.id);
        const existingKinds = new Set((existing ?? []).map((e: any) => e.kind as string));
        for (const p of proposals) {
          if (existingKinds.has(p.kind)) continue;
          await db.from("mentor_decision_proposals").insert({
            mentor_user_id: squad.mentor_user_id,
            report_id: savedReport.id,
            kind: p.kind,
            evidence: p.evidence,
            status: "proposed",
          });
        }
      }

      lastReport = report;
      lastMentor = squad.mentor_user_id;
    }

    void lastMentor;
    if (!lastReport) throw new Error("Génération impossible : aucune cohorte évaluée.");
    const proposals = proposeMentorDecisions(lastReport);
    return { ...lastReport, proposals };
  });

// ── File de décisions ───────────────────────────────────────────────────────

export const listDecisionProposalsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z.object({ status: z.enum(["proposed", "confirmed", "dismissed", "all"]).default("proposed") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("mentor_decision_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Lecture de la file impossible : ${error.message}`);
    return rows ?? [];
  });

export const resolveDecisionProposalAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z
      .object({
        proposalId: z.string().uuid(),
        decision: z.enum(["confirm", "dismiss"]),
        note: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; escalation?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminUserId = (context as any).claims?.sub as string;

    const { data: proposal } = await db
      .from("mentor_decision_proposals")
      .select("id, mentor_user_id, kind, status")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (!proposal) throw new Error("Proposition introuvable.");
    if (proposal.status !== "proposed") throw new Error("Proposition déjà tranchée.");

    await db
      .from("mentor_decision_proposals")
      .update({
        status: data.decision === "confirm" ? "confirmed" : "dismissed",
        decided_by: adminUserId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.proposalId);

    // Confirmation d'une revue de suspension → escalade vers le kill-switch
    // existant (l'admin voit le lien, la suspension reste un geste humain).
    if (data.decision === "confirm" && proposal.kind === "suspension_review") {
      return {
        ok: true,
        escalation: `Proposition confirmée : ouvrez l'audit du mentor ${proposal.mentor_user_id} et déclenchez la suspension conservatoire (triggerMentorEmergencySuspension) après contradiction.`,
      };
    }
    return { ok: true };
  });

// Renvoie le dernier rapport trimestriel d'une escouade (lecture UI).
export const getLatestTripartiteReportAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ squadId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<TripartiteCohortReport | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: row } = await db
      .from("tripartite_quarterly_reports")
      .select("report")
      .eq("squad_id", data.squadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (row?.report as TripartiteCohortReport) ?? null;
  });

// ── Saisie des observations académiques par l'éducateur / professeur ───────

const RecordAcademicObservationSchema = z.object({
  childId: z.string().uuid(),
  term: z.number().int().min(1).max(3),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  previousAverage: z.number().min(0).max(20),
  currentAverage: z.number().min(0).max(20),
  classAverage: z.number().min(0).max(20).optional(),
  teacherReportNotes: z.string().max(1000).optional(),
});

/**
 * Un éducateur n'observe les notes d'UN enfant que s'il a un lien légitime avec
 * lui : même école liée (child_schools actif) OU délégation active envers lui.
 * Sans ce garde, n'importe quel compte « éducateur » pouvait écrire/lire les
 * notes de n'importe quel enfant (IDOR, audit backend vague A).
 */
async function assertEducatorMayObserveChild(
  db: any,
  userId: string,
  childId: string,
): Promise<{ schoolId: string | null }> {
  const { data: educatorProfile } = await db
    .from("educator_profiles")
    .select("school_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!educatorProfile) {
    throw new Error("Profil éducateur requis pour saisir les observations académiques.");
  }

  if (educatorProfile.school_id) {
    const { data: link } = await db
      .from("child_schools")
      .select("child_id")
      .eq("child_id", childId)
      .eq("school_id", educatorProfile.school_id)
      .eq("status", "active")
      .maybeSingle();
    if (link) return { schoolId: educatorProfile.school_id };
  }

  const { data: delegation } = await db
    .from("child_delegations")
    .select("id")
    .eq("child_id", childId)
    .eq("beneficiary_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (delegation) return { schoolId: educatorProfile.school_id ?? null };

  throw new Error("Cet élève n'est rattaché ni à votre établissement ni à une de vos délégations.");
}

export const recordChildAcademicObservationEducator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RecordAcademicObservationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub || (context as any).user?.id;

    // Garde IDOR (audit vague A) : lien école ou délégation avec CET enfant.
    const { schoolId } = await assertEducatorMayObserveChild(db, userId, data.childId);

    const { data: row, error } = await db
      .from("child_academic_observations")
      .upsert(
        {
          child_id: data.childId,
          school_id: schoolId,
          educator_user_id: userId,
          term: data.term,
          academic_year: data.academicYear ?? currentAcademicYear(),
          previous_average: data.previousAverage,
          current_average: data.currentAverage,
          class_average: data.classAverage ?? null,
          teacher_report_notes: data.teacherReportNotes?.trim() ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_id,academic_year,term" },
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(`Enregistrement de l'observation académique impossible : ${error.message}`);
    }

    return row;
  });

export const listChildAcademicObservationsEducator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub || (context as any).user?.id;
    // Même garde qu'en écriture : pas de lecture des notes d'un inconnu.
    await assertEducatorMayObserveChild(db, userId, data.childId);

    const { data: rows, error } = await db
      .from("child_academic_observations")
      .select("*")
      .eq("child_id", data.childId)
      .order("term", { ascending: true });

    if (error) {
      // Un échec de lecture ne doit pas se déguiser en « aucune observation ».
      throw new Error("Lecture des observations académiques impossible.");
    }

    return rows ?? [];
  });

export type { MentorDecisionProposalKind };


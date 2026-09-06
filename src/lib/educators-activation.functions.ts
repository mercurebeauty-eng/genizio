// Server functions Admin OS — activation des espaces professionnels.
// Ferme l'angle mort historique : listEducatorsAdmin liste les délégations
// (child_delegations) mais aucun flux admin ne voyait ni ne validait les
// educator_profiles auto-inscrits, et is_verified n'était jamais posé à true.

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";

export type VerificationStatus = "pending" | "verified" | "suspended";

export interface EducatorProfileAdminRow {
  id: string;
  userId: string | null;
  email: string | null;
  fullName: string;
  handle: string | null;
  professionalRole: "teacher" | "counselor" | "psychologist" | "other";
  organizationName: string | null;
  schoolId: string | null;
  schoolName: string | null;
  classCode: string | null;
  verificationStatus: VerificationStatus;
  delegatedStudentsCount: number;
  createdAt: string;
}

export interface SchoolLeaderRequestRow {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AuthorizedEmailRow {
  id: string;
  email: string;
  schoolId: string | null;
  schoolName: string | null;
  expectedRole: "teacher" | "counselor" | "psychologist" | "other" | null;
  isLeader: boolean;
  note: string | null;
  createdAt: string;
}

// ── Profils professionnels (educator_profiles) ───────────────────────────────

export const listEducatorProfilesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<EducatorProfileAdminRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: profiles, error } = await db
      .from("educator_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !profiles) {
      console.error("Erreur listEducatorProfilesAdmin:", error);
      return [];
    }

    const { data: schools } = await db.from("schools").select("id, name");
    const schoolNames = new Map((schools ?? []).map((s: any) => [s.id, s.name]));

    const { count: delegations, error: delegErr } = await db
      .from("child_delegations")
      .select("beneficiary_email, status, valid_until");
    const activeByEmail = new Map<string, number>();
    if (!delegErr) {
      for (const d of delegations ?? []) {
        if (d.status !== "active") continue;
        if (new Date(d.valid_until).getTime() < Date.now()) continue;
        const key = String(d.beneficiary_email ?? "").toLowerCase();
        if (key) activeByEmail.set(key, (activeByEmail.get(key) ?? 0) + 1);
      }
    }

    const emailsToResolve = profiles.map((p: any) => p.user_id).filter(Boolean) as string[];
    const emailMap = new Map<string, string>();
    if (emailsToResolve.length > 0) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      for (const u of users?.users ?? []) {
        if (u.email) emailMap.set(u.id, u.email);
      }
    }

    return profiles.map((p: any) => {
      const email = p.user_id ? (emailMap.get(p.user_id) ?? null) : null;
      return {
        id: p.id,
        userId: p.user_id,
        email,
        fullName: p.full_name,
        handle: p.handle,
        professionalRole: p.professional_role,
        organizationName: p.organization_name,
        schoolId: p.school_id,
        schoolName: p.school_id ? (schoolNames.get(p.school_id) ?? null) : null,
        classCode: p.class_code,
        verificationStatus: (p.verification_status ??
          (p.is_verified ? "verified" : "pending")) as VerificationStatus,
        delegatedStudentsCount: email ? (activeByEmail.get(email.toLowerCase()) ?? 0) : 0,
        createdAt: p.created_at,
      };
    });
  });

const VerificationActionSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(["verify", "suspend", "requeue"]),
});

/**
 * Vérifie / suspend / remet en attente un profil professionnel. Synchronise
 * is_verified (quotas Copilote) et user_metadata pour l'affichage.
 */
export const setEducatorVerificationAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => VerificationActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminEmail = (context as any).claims?.email || "admin";

    const status: VerificationStatus =
      data.action === "verify" ? "verified" : data.action === "suspend" ? "suspended" : "pending";

    const { data: updated, error } = await db
      .from("educator_profiles")
      .update({
        verification_status: status,
        is_verified: status === "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.profileId)
      .select("user_id, full_name")
      .single();

    if (error || !updated) {
      throw new Error(`Impossible de mettre à jour le statut : ${error?.message}`);
    }

    console.warn(
      `🏫 VÉRIFICATION PRO : ${adminEmail} → ${status} sur « ${updated.full_name} » (${data.profileId})`,
    );

    if (updated.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(updated.user_id);
      await supabaseAdmin.auth.admin.updateUserById(updated.user_id, {
        user_metadata: {
          ...(userData?.user?.user_metadata ?? {}),
          educator_verified: status === "verified",
        },
      });
    }

    return { status };
  });

// ── Demandes de direction (school_leader_requests) ──────────────────────────

export const listSchoolLeaderRequestsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<SchoolLeaderRequestRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: rows, error } = await db
      .from("school_leader_requests")
      .select(
        `id, school_id, user_id, status, created_at,
         schools: school_id (name, code)`,
      )
      .order("created_at", { ascending: false });
    if (error || !rows) {
      console.error("Erreur listSchoolLeaderRequestsAdmin:", error);
      return [];
    }

    const emailMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      for (const u of users?.users ?? []) {
        if (u.email) emailMap.set(u.id, u.email);
        if (u.user_metadata?.full_name) nameMap.set(u.id, u.user_metadata.full_name);
      }
    }

    return rows.map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      schoolName: r.schools?.name ?? "Établissement inconnu",
      schoolCode: r.schools?.code ?? "",
      userId: r.user_id,
      userEmail: emailMap.get(r.user_id) ?? null,
      userName: nameMap.get(r.user_id) ?? null,
      status: r.status,
      createdAt: r.created_at,
    }));
  });

const DecideLeaderRequestSchema = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
});

/**
 * Approuve ou rejette une demande de direction. L'approbation pose
 * schools.leader_user_id (le seul chemin restant, avec l'e-mail admin existant).
 */
export const decideSchoolLeaderRequestAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => DecideLeaderRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminId = (context as any).claims?.sub;

    const { data: request } = await db
      .from("school_leader_requests")
      .select("id, school_id, user_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request) throw new Error("Demande de direction introuvable.");
    if (request.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

    const now = new Date().toISOString();
    const { error: updateErr } = await db
      .from("school_leader_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_by: adminId,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", data.requestId);
    if (updateErr) throw new Error(`Décision impossible : ${updateErr.message}`);

    if (data.approve) {
      const { error: schoolErr } = await db
        .from("schools")
        .update({ leader_user_id: request.user_id, updated_at: now })
        .eq("id", request.school_id);
      if (schoolErr) throw new Error(`Échec de l'attribution de direction : ${schoolErr.message}`);
    }

    return { approved: data.approve };
  });

// ── E-mails autorisés (chaîne d'activation) ─────────────────────────────────

export const listAuthorizedEmailsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AuthorizedEmailRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: rows, error } = await db
      .from("authorized_emails")
      .select(
        `id, email, school_id, expected_role, is_leader, note, created_at,
         schools: school_id (name)`,
      )
      .order("created_at", { ascending: false });
    if (error || !rows) {
      console.error("Erreur listAuthorizedEmailsAdmin:", error);
      return [];
    }

    return rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      schoolId: r.school_id,
      schoolName: r.schools?.name ?? null,
      expectedRole: r.expected_role,
      isLeader: r.is_leader,
      note: r.note,
      createdAt: r.created_at,
    }));
  });

const AddAuthorizedEmailSchema = z.object({
  email: z.string().email(),
  schoolId: z.string().uuid().nullable().optional(),
  expectedRole: z.enum(["teacher", "counselor", "psychologist", "other"]).nullable().optional(),
  isLeader: z.boolean().optional().default(false),
  note: z.string().max(300).optional(),
});

export const addAuthorizedEmailAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AddAuthorizedEmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminId = (context as any).claims?.sub;

    const email = data.email.toLowerCase().trim();

    // Si l'e-mail est habilité chef d'établissement, l'approbation est immédiate :
    // on pose leader_user_id si le compte existe déjà.
    if (data.isLeader && data.schoolId) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const found = users?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (found) {
        await db
          .from("schools")
          .update({ leader_user_id: found.id, updated_at: new Date().toISOString() })
          .eq("id", data.schoolId);
      }
    }

    const { error } = await db.from("authorized_emails").insert({
      email,
      school_id: data.schoolId || null,
      expected_role: data.expectedRole || null,
      is_leader: data.isLeader ?? false,
      note: data.note?.trim() || null,
      created_by: adminId,
    });
    if (error) {
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        throw new Error("Cet e-mail est déjà dans la liste des habilitations.");
      }
      throw new Error(`Impossible d'ajouter l'habilitation : ${error.message}`);
    }

    return { ok: true };
  });

export const removeAuthorizedEmailAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("authorized_emails").delete().eq("id", id);
    if (error) throw new Error(`Impossible de retirer l'habilitation : ${error.message}`);
    return { ok: true };
  });

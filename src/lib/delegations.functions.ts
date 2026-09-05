import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertChildActor } from "@/lib/child-actor";
import { z } from "zod";

export interface ChildDelegationDetail {
  id: string;
  child_id: string;
  child_name: string;
  granted_by: string;
  granted_by_role: "parent" | "mentor";
  beneficiary_user_id: string | null;
  beneficiary_email: string;
  beneficiary_name: string | null;
  organization_name: string | null;
  professional_role: "teacher" | "counselor" | "psychologist" | "other";
  scope: "overview" | "orientation" | "full_pedagogical";
  share_parent_phone: boolean;
  status: "pending" | "active" | "revoked" | "expired";
  valid_from: string;
  valid_until: string;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
}

const CreateDelegationSchema = z.object({
  childId: z.string().uuid(),
  beneficiaryEmail: z.string().email(),
  beneficiaryName: z.string().optional(),
  organizationName: z.string().optional(),
  professionalRole: z.enum(["teacher", "counselor", "psychologist", "other"]),
  scope: z.enum(["overview", "orientation", "full_pedagogical"]).default("orientation"),
  durationDays: z.number().int().min(1).max(365).default(300), // ~Année scolaire par défaut
  shareParentPhone: z.boolean().default(true),
});

/**
 * Crée ou mandate un accès pédagogique (Pass Éducatif) pour un enseignant ou conseiller.
 * Utilisable par le parent OU par le mentor de l'enfant (Règle de Symétrie).
 */
export const createChildDelegation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => CreateDelegationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    // 1. Vérification des droits : Parent ou Mentor actif
    const actorRole = await assertChildActor(supabaseAdmin, userId, data.childId);
    const grantedByRole = actorRole === "owner" ? "parent" : "mentor";

    // 2. Recherche si le bénéficiaire a déjà un compte utilisateur
    const normalizedEmail = data.beneficiaryEmail.trim().toLowerCase();
    let beneficiaryUserId: string | null = null;

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = userList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (existingUser) {
      beneficiaryUserId = existingUser.id;
    }

    const validUntil = new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 3. Insertion de la délégation
    const { data: delegation, error } = await db
      .from("child_delegations")
      .insert({
        child_id: data.childId,
        granted_by: userId,
        granted_by_role: grantedByRole,
        beneficiary_user_id: beneficiaryUserId,
        beneficiary_email: normalizedEmail,
        beneficiary_name: data.beneficiaryName?.trim() || null,
        organization_name: data.organizationName?.trim() || null,
        professional_role: data.professionalRole,
        scope: data.scope,
        share_parent_phone: data.shareParentPhone,
        status: "active",
        valid_until: validUntil,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Erreur lors de la création de la délégation:", error);
      throw new Error(`Impossible de créer la délégation : ${error.message}`);
    }

    return delegation;
  });

/**
 * Liste les délégations actives et passées pour un enfant donné.
 * Accessible par le parent ou le mentor de l'enfant.
 */
export const listChildDelegations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((childId: string) => z.string().uuid().parse(childId))
  .handler(async ({ data: childId, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    await assertChildActor(supabaseAdmin, userId, childId);

    const { data: rows, error } = await db
      .from("child_delegations")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur listChildDelegations:", error);
      return [];
    }

    return (rows ?? []) as ChildDelegationDetail[];
  });

/**
 * Révoque immédiatement une délégation d'accès.
 * Accessible par le parent ou le mentor de l'enfant.
 */
export const revokeChildDelegation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((delegationId: string) => z.string().uuid().parse(delegationId))
  .handler(async ({ data: delegationId, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const { data: delegation, error: fetchErr } = await db
      .from("child_delegations")
      .select("child_id")
      .eq("id", delegationId)
      .single();

    if (fetchErr || !delegation) {
      throw new Error("Délégation introuvable.");
    }

    await assertChildActor(supabaseAdmin, userId, delegation.child_id);

    const { error: updateErr } = await db
      .from("child_delegations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", delegationId);

    if (updateErr) {
      throw new Error(`Erreur lors de la révocation : ${updateErr.message}`);
    }

    return { success: true };
  });

/**
 * Liste les enfants délégués à l'enseignant ou conseiller actuellement connecté.
 */
export const listMyEducatorDelegations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;
    const userEmail = (context as any).claims?.email?.toLowerCase();

    // Rapprochement automatique : si la délégation avait été créée par email
    // avant que l'éducateur ne se connecte, on lie son user_id.
    if (userEmail) {
      await db
        .from("child_delegations")
        .update({ beneficiary_user_id: userId })
        .eq("beneficiary_email", userEmail)
        .is("beneficiary_user_id", null);
    }

    const now = new Date().toISOString();
    const { data: delegations, error } = await db
      .from("child_delegations")
      .select(
        `
        id,
        child_id,
        professional_role,
        scope,
        share_parent_phone,
        valid_until,
        status,
        pro_dossier_unlocked,
        last_accessed_at,
        created_at
      `,
      )
      .or(`beneficiary_user_id.eq.${userId},beneficiary_email.eq.${userEmail}`)
      .eq("status", "active")
      .gt("valid_until", now);

    if (error || !delegations) {
      console.error("Erreur listMyEducatorDelegations:", error);
      return [];
    }

    // Récupération des informations synthétiques des enfants
    const childIds: string[] = Array.from(
      new Set(delegations.map((d: any) => d.child_id as string)),
    );
    if (childIds.length === 0) return [];

    const { data: children } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age, talents, learning_profile, user_id")
      .in("id", childIds);

    const childMap = new Map((children ?? []).map((c: any) => [c.id, c]));

    return delegations.map((d: any) => {
      const child = childMap.get(d.child_id);
      return {
        delegationId: d.id,
        childId: d.child_id,
        childName: child?.name ?? "Élève",
        childAge: child?.age ?? null,
        talents: child?.talents ?? {},
        learningProfile: child?.learning_profile ?? {},
        professionalRole: d.professional_role,
        scope: d.scope,
        shareParentPhone: d.share_parent_phone,
        proDossierUnlocked: Boolean(d.pro_dossier_unlocked),
        validUntil: d.valid_until,
      };
    });
  });

/**
 * Fournit le Passeport Éducatif complet et sécurisé d'un enfant pour un professionnel délégué.
 * Trace la consultation (last_accessed_at et access_count).
 */
export const getEducationalPassport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((childId: string) => z.string().uuid().parse(childId))
  .handler(async ({ data: childId, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;
    const userEmail = (context as any).claims?.email?.toLowerCase();
    const now = new Date().toISOString();

    // 1. Vérification : est-ce le parent/mentor OU un professionnel délégué ?
    let isAuthorized = false;
    let sharePhone = false;
    let activeDelegationId: string | null = null;
    let activeDelegation: any = null;

    try {
      await assertChildActor(supabaseAdmin, userId, childId);
      isAuthorized = true;
      sharePhone = true;
    } catch {
      // Pas parent ni mentor, vérifions la table child_delegations
      const { data: delegation } = await db
        .from("child_delegations")
        .select(
          "id, share_parent_phone, pro_dossier_unlocked, pro_clinical_notes, pro_remediation_prescriptions",
        )
        .eq("child_id", childId)
        .or(`beneficiary_user_id.eq.${userId},beneficiary_email.eq.${userEmail}`)
        .eq("status", "active")
        .gt("valid_until", now)
        .maybeSingle();

      if (delegation) {
        isAuthorized = true;
        sharePhone = delegation.share_parent_phone;
        activeDelegationId = delegation.id;
        activeDelegation = delegation;
      }
    }

    if (!isAuthorized) {
      throw new Error("Vous ne disposez pas d'un accès valide au profil de cet élève.");
    }

    // 2. Traçabilité de consultation
    if (activeDelegationId) {
      try {
        await (supabaseAdmin as any).rpc("increment_delegation_access", {
          delegation_id: activeDelegationId,
        });
      } catch {
        // Fallback si RPC absente
        await db
          .from("child_delegations")
          .update({
            last_accessed_at: now,
          })
          .eq("id", activeDelegationId);
      }
    }

    // 3. Récupération des données pédagogiques assainies
    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age, talents, learning_profile, user_id")
      .eq("id", childId)
      .single();

    if (childErr || !child) {
      throw new Error("Profil introuvable.");
    }

    // Coordonnées parent (si consenti)
    let parentPhone: string | null = null;
    let parentEmail: string | null = null;
    if (sharePhone) {
      const { data: parentUser } = await supabaseAdmin.auth.admin.getUserById(child.user_id);
      if (parentUser?.user) {
        parentPhone = (parentUser.user.user_metadata?.phone as string) || null;
        parentEmail = parentUser.user.email || null;
      }
    }

    // Défis réussis et artefacts
    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select("id, title, domain, completed_at, proof_image_url, ai_observations, trait_subform")
      .eq("child_id", childId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10);

    return {
      child: {
        id: child.id,
        name: child.name,
        age: child.age,
        talents: child.talents || {},
        learningProfile: child.learning_profile || {},
      },
      parentContact: sharePhone
        ? {
            phone: parentPhone,
            email: parentEmail,
          }
        : null,
      recentAchievements: (challenges ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        domain: c.domain,
        completedAt: c.completed_at,
        proofImageUrl: c.proof_image_url,
        aiObservations: c.ai_observations,
        traitSubform: c.trait_subform,
      })),
      proDossierUnlocked: Boolean(activeDelegation?.pro_dossier_unlocked),
      clinicalNotes: (activeDelegation?.pro_clinical_notes as string) || "",
      prescriptions: (activeDelegation?.pro_remediation_prescriptions as any[]) || [],
      delegationId: activeDelegationId,
    };
  });

/**
 * Enregistre les notes confidentielles du praticien sur le dossier débloqué d'un élève.
 */
export const saveProClinicalNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        childId: z.string().uuid(),
        notes: z.string().max(10000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;
    const userEmail = (context as any).claims?.email?.toLowerCase();

    const { data: delegation, error: delErr } = await db
      .from("child_delegations")
      .select("id, pro_dossier_unlocked")
      .eq("child_id", data.childId)
      .or(`beneficiary_user_id.eq.${userId},beneficiary_email.eq.${userEmail}`)
      .eq("status", "active")
      .maybeSingle();

    if (delErr || !delegation || !delegation.pro_dossier_unlocked) {
      throw new Error("Dossier d'expertise non activé pour cet élève.");
    }

    const { error: updErr } = await db
      .from("child_delegations")
      .update({
        pro_clinical_notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delegation.id);

    if (updErr) throw new Error(updErr.message);
    return { success: true };
  });

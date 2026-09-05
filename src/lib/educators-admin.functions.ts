import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";

export interface EducatorAdminRow {
  email: string;
  name: string | null;
  organization: string | null;
  role: "teacher" | "counselor" | "psychologist" | "other";
  userId: string | null;
  activeChildrenCount: number;
  totalDelegationsCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface EducatorDelegatedStudent {
  delegationId: string;
  childId: string;
  childName: string;
  childAge: number | null;
  grantedByRole: "parent" | "mentor";
  validUntil: string;
  status: "active" | "revoked" | "expired";
  shareParentPhone: boolean;
  parentEmail?: string;
  parentPhone?: string;
}

/**
 * Liste tous les professionnels de l'éducation (enseignants, conseillers, psychologues)
 * ayant reçu un mandat d'accès à des élèves.
 */
export const listEducatorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();

    const { data: rows, error } = await db
      .from("child_delegations")
      .select(
        `
        id,
        child_id,
        beneficiary_user_id,
        beneficiary_email,
        beneficiary_name,
        organization_name,
        professional_role,
        status,
        valid_until,
        last_accessed_at,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error || !rows) {
      console.error("Erreur listEducatorsAdmin:", error);
      return [];
    }

    // Regroupement par email de professionnel
    const educatorMap = new Map<string, EducatorAdminRow>();

    for (const r of rows) {
      const email = r.beneficiary_email.toLowerCase();
      const isActive = r.status === "active" && new Date(r.valid_until).getTime() > Date.now();

      if (!educatorMap.has(email)) {
        educatorMap.set(email, {
          email,
          name: r.beneficiary_name || null,
          organization: r.organization_name || null,
          role: r.professional_role,
          userId: r.beneficiary_user_id || null,
          activeChildrenCount: isActive ? 1 : 0,
          totalDelegationsCount: 1,
          lastAccessedAt: r.last_accessed_at || null,
          createdAt: r.created_at,
        });
      } else {
        const item = educatorMap.get(email)!;
        item.totalDelegationsCount += 1;
        if (isActive) item.activeChildrenCount += 1;
        if (r.beneficiary_name && !item.name) item.name = r.beneficiary_name;
        if (r.organization_name && !item.organization) item.organization = r.organization_name;
        if (
          r.last_accessed_at &&
          (!item.lastAccessedAt || new Date(r.last_accessed_at) > new Date(item.lastAccessedAt))
        ) {
          item.lastAccessedAt = r.last_accessed_at;
        }
      }
    }

    return Array.from(educatorMap.values());
  });

/**
 * Liste les élèves délégués à un professionnel spécifique pour inspection par le Super Admin.
 */
export const listEducatorStudentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((email: string) => z.string().email().parse(email))
  .handler(async ({ data: email }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const normalizedEmail = email.toLowerCase().trim();

    const { data: rows, error } = await db
      .from("child_delegations")
      .select(
        `
        id,
        child_id,
        granted_by,
        granted_by_role,
        valid_until,
        status,
        share_parent_phone,
        child_profiles:child_id (id, name, age, user_id)
      `,
      )
      .eq("beneficiary_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (error || !rows) {
      console.error("Erreur listEducatorStudentsAdmin:", error);
      return [];
    }

    // Récupérer les téléphones parents
    const parentUserIds = Array.from(
      new Set(rows.map((r: any) => r.child_profiles?.user_id).filter(Boolean)),
    );
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userMap = new Map((allUsers?.users ?? []).map((u: any) => [u.id, u]));

    return rows.map((r: any) => {
      const child = r.child_profiles;
      const parentUser = userMap.get(child?.user_id);
      const isExpired = new Date(r.valid_until).getTime() < Date.now();
      const effectiveStatus = r.status === "active" && isExpired ? "expired" : r.status;

      return {
        delegationId: r.id,
        childId: r.child_id,
        childName: child?.name ?? "Élève",
        childAge: child?.age ?? null,
        grantedByRole: r.granted_by_role,
        validUntil: r.valid_until,
        status: effectiveStatus,
        shareParentPhone: r.share_parent_phone,
        parentEmail: parentUser?.email,
        parentPhone: (parentUser?.user_metadata?.phone as string) || null,
      } as EducatorDelegatedStudent;
    });
  });

/**
 * Révoque en 1 clic TOUS les accès accordés à un professionnel spécifique.
 * Pouvoir régalien Super Admin.
 */
export const revokeAllEducatorAccessAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((email: string) => z.string().email().parse(email))
  .handler(async ({ data: email, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminEmail = (context as any).claims?.email || "admin";
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date().toISOString();

    console.warn(
      `⛔ RÉVOCATION MASSIVE D'ÉDUCATEUR : ${adminEmail} révoque tous les accès de ${normalizedEmail}`,
    );

    const { data, error } = await db
      .from("child_delegations")
      .update({
        status: "revoked",
        updated_at: now,
      })
      .eq("beneficiary_email", normalizedEmail)
      .eq("status", "active")
      .select("id");

    if (error) {
      throw new Error(`Erreur lors de la révocation globale : ${error.message}`);
    }

    return {
      success: true,
      revokedCount: data?.length ?? 0,
    };
  });

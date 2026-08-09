import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Superviseurs — Fonctions serveur
// Un superviseur peut consulter les profils de plusieurs enfants.
// Seul l'admin peut assigner des superviseurs.
// ────────────────────────────────────────────────────────────

// Utilisée par le sélecteur "Profil enfant" de /admin/supervisors — la requête
// client directe (soumise aux RLS) ne remontait que les enfants du compte admin
// lui-même plus ceux ayant déjà un défi complété (policy publique du Mur Public),
// rendant tout enfant nouvellement inscrit invisible pour l'assignation.
export const listChildProfilesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSupervisors = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("supervisors")
      .select("id, supervisor_user_id, child_profile_id, created_at, child_profiles(name, age)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const usersData = await listAllUsers(supabaseAdmin);

    const usersMap = new Map(usersData.map((u) => [u.id, u.email]));

    return (data ?? []).map((row) => ({
      ...row,
      supervisor: {
        email: usersMap.get(row.supervisor_user_id) || "Inconnu",
      },
    }));
  });


const AssignSupervisorInput = z.object({
  email: z.string().email("Email invalide"),
  childProfileId: z.string().uuid("ID de profil invalide"),
});

// Point d'insertion unique pour les deux chemins d'assignation (admin manuel ici, et B2B dans
// campaigns.functions.ts) — décision utilisateur (2026-07-26) : "un seul superviseur par
// enfant" est une règle du SYSTÈME, pas d'un chemin en particulier. Avant, seul le chemin B2B
// filtrait les enfants déjà supervisés (côté application, pas garanti), et le chemin admin
// n'appliquait rien du tout. Centraliser l'insertion ici évite qu'un futur 3e chemin
// (import en masse, transfert...) oublie la même garde-fou. La contrainte UNIQUE
// (child_profile_id) posée en base (migration 20260726140000) fait foi dans tous les cas ;
// ceci ne fait que donner un message d'erreur clair au lieu d'un code Postgres brut.
export async function insertSupervisorAssignments(
  supabaseAdmin: any,
  params: { supervisorUserId: string; childProfileIds: string[]; campaignId: string | null; assignedBy: string | null }
) {
  if (params.childProfileIds.length === 0) return [];
  const rows = params.childProfileIds.map((childId) => ({
    supervisor_user_id: params.supervisorUserId,
    child_profile_id: childId,
    campaign_id: params.campaignId,
    assigned_by: params.assignedBy,
  }));
  const { data, error } = await supabaseAdmin.from("supervisors").insert(rows).select("*");
  if (error) {
    if (error.code === "23505") throw new Error("Un ou plusieurs de ces enfants ont déjà un superviseur assigné.");
    throw new Error(error.message);
  }
  return data ?? [];
}

export const assignSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignSupervisorInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Chercher l'utilisateur par email via auth admin
    const users = await listAllUsers(supabaseAdmin);

    const targetUser = users.find((u) => u.email === data.email);
    if (!targetUser) throw new Error(`Aucun compte trouvé pour l'email : ${data.email}`);

    // Chercher l'inscription à une campagne pour cet enfant si elle existe
    const { data: enrollment } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("campaign_id")
      .eq("child_id", data.childProfileId)
      .not("campaign_id", "is", null)
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rows = await insertSupervisorAssignments(supabaseAdmin, {
      supervisorUserId: targetUser.id,
      childProfileIds: [data.childProfileId],
      campaignId: enrollment?.campaign_id ?? null,
      assignedBy: (context as any).claims?.sub ?? null,
    });
    return rows[0];
  });

export const removeSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supervisors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Le parent ne voyait jusqu'ici jamais qui supervise son enfant (aucune UI, aucune notif —
// il n'existe pas d'infra email/SMS dans ce projet, seulement des liens WhatsApp manuels).
// Cette fonction expose l'info de façon passive : le parent la découvre en ouvrant le
// portfolio. Ownership vérifiée manuellement (supabaseAdmin bypass les RLS).
const ChildSupervisorInfoInput = z.object({ childId: z.string().uuid() });

export const getChildSupervisorInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildSupervisorInfoInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: child } = await supabaseAdmin
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) return null;

    const { data: assignment } = await supabaseAdmin
      .from("supervisors")
      .select("supervisor_user_id, created_at")
      .eq("child_profile_id", data.childId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!assignment) return null;

    const users = await listAllUsers(supabaseAdmin);
    const email = users.find((u) => u.id === assignment.supervisor_user_id)?.email ?? "Inconnu";

    return { email, assignedAt: assignment.created_at as string };
  });

// ── Vue superviseur : liste de ses enfants assignés ──
export const getSupervisorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: assignments, error } = await supabaseAdmin
      .from("supervisors")
      .select("child_profile_id, created_at, child_profiles(id, name, age, talents, city, interests, user_id)")
      .eq("supervisor_user_id", userId);
    if (error) throw new Error(error.message);

    if (!assignments || assignments.length === 0) return { children: [] };

    const childIds = assignments.map((a) => a.child_profile_id);

    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select("child_id, id, title, domain, status, created_at, description, duration, steps, materials, proof_image_url, ai_observations, notes, difficulty, pedagogical_context, requires_supervision, supervision_warning")
      .in("child_id", childIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Le numéro de téléphone du parent vit dans auth.users.user_metadata, pas
    // dans child_profiles — le superviseur doit pouvoir contacter le parent
    // directement, donc jointure manuelle via l'API admin.
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const phoneByUserId = new Map(users.map((u) => [u.id, (u.user_metadata as any)?.phone as string | undefined]));

    return {
      children: assignments.map((a) => {
        const child = a.child_profiles as any;
        return {
          ...child,
          parentPhone: phoneByUserId.get(child?.user_id) ?? null,
          assignedAt: a.created_at as string,
          challenges: (challenges ?? []).filter((c) => c.child_id === a.child_profile_id),
        };
      }),
    };
  });

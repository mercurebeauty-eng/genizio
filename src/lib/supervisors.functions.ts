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

export const assignSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => AssignSupervisorInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Chercher l'utilisateur par email via auth admin
    const users = await listAllUsers(supabaseAdmin);

    const targetUser = users.find((u) => u.email === data.email);
    if (!targetUser) throw new Error(`Aucun compte trouvé pour l'email : ${data.email}`);

    const { data: row, error } = await supabaseAdmin
      .from("supervisors")
      .insert({
        supervisor_user_id: targetUser.id,
        child_profile_id: data.childProfileId,
        assigned_by: (context as any).claims?.sub ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supervisors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Vue superviseur : liste de ses enfants assignés ──
export const getSupervisorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: assignments, error } = await supabaseAdmin
      .from("supervisors")
      .select("child_profile_id, child_profiles(id, name, age, talents, city, interests)")
      .eq("supervisor_user_id", userId);
    if (error) throw new Error(error.message);

    if (!assignments || assignments.length === 0) return { children: [] };

    const childIds = assignments.map((a) => a.child_profile_id);

    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select("child_id, id, title, domain, status, created_at, description, duration, steps, materials, proof_image_url, ai_observations, notes, difficulty, pedagogical_context, requires_supervision, supervision_warning")
      .in("child_id", childIds)
      .order("created_at", { ascending: false });

    return {
      children: assignments.map((a) => ({
        ...(a.child_profiles as any),
        challenges: (challenges ?? []).filter((c) => c.child_id === a.child_profile_id),
      })),
    };
  });

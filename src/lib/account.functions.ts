import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Fetch all user data (RLS scoped to owner)
    const [profilesData, challengesData, consentData, mentorsData] = await Promise.all([
      supabase.from("child_profiles").select("*"),
      supabase.from("challenges").select("*"),
      supabase.from("consent_events").select("*").order("created_at", { ascending: false }),
      supabase.from("child_mentors").select("*"),
    ]);

    const exportObject = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      child_profiles: profilesData.data || [],
      challenges: challengesData.data || [],
      child_mentors: mentorsData.data || [],
      consent_events: consentData.data || [],
    };

    // Log the export event
    await supabase.from("consent_events").insert({
      user_id: userId,
      event_type: "data_exported",
      description: "L'utilisateur a exporté l'intégralité de ses données personnelles.",
    });

    return exportObject;
  });

export const deleteAccountAndData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // We can delete child_profiles via the authenticated client.
    // Due to ON DELETE CASCADE on foreign keys, this automatically drops
    // associated challenges, child_mentors, and consent_events where child_id is set.
    // However, consent_events without a child_id might remain if not cascaded by user_id.
    // Let's explicitly delete child_profiles first (as an extra step to ensure everything drops cleanly).
    await supabase.from("child_profiles").delete().eq("user_id", userId);

    // Some consent_events might be global (child_id null), let's delete them as well to be completely clean
    // before the actual user deletion.
    await supabase.from("consent_events").delete().eq("user_id", userId);

    // Finally, use service role to delete the user account from auth.users
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Erreur lors de la suppression du compte :", deleteError);
      throw new Error("Impossible de supprimer le compte utilisateur.");
    }

    return { success: true };
  });

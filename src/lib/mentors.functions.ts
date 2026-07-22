import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InviteMentorSchema = z.object({
  childId: z.string().uuid(),
  mentorName: z.string().min(1, "Le nom du mentor est requis"),
  mentorEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  scopeDomains: z.array(z.string()),
  canViewTalentMap: z.boolean(),
  canViewTimeline: z.boolean(),
  canViewRawObservations: z.boolean(),
  expiresAt: z.string().optional().nullable(),
});

export const inviteMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(InviteMentorSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Generate random 16-byte hex token
    const randomArray = new Uint8Array(16);
    crypto.getRandomValues(randomArray);
    const accessToken = Array.from(randomArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: mentorData, error: mentorError } = await supabase
      .from("child_mentors")
      .insert({
        child_id: data.childId,
        owner_user_id: userId,
        mentor_name: data.mentorName,
        mentor_email: data.mentorEmail || null,
        scope_domains: data.scopeDomains,
        can_view_talent_map: data.canViewTalentMap,
        can_view_timeline: data.canViewTimeline,
        can_view_raw_observations: data.canViewRawObservations,
        access_token: accessToken,
        expires_at: data.expiresAt || null,
        status: "active",
      })
      .select("*")
      .single();

    if (mentorError) {
      console.error(mentorError);
      throw new Error("Impossible d'inviter le mentor");
    }

    // Log consent event — the invite itself already succeeded above, so a
    // failure here shouldn't fail the whole request, but it must not be
    // invisible either: this ledger is what /profile shows as the record of
    // consent-relevant actions on the account.
    const { error: consentError } = await supabase.from("consent_events").insert({
      user_id: userId,
      child_id: data.childId,
      event_type: "mentor_invited",
      description: `Invitation du mentor ${data.mentorName}`,
      metadata: { mentor_id: mentorData.id },
    });
    if (consentError) console.error("Échec de la journalisation du consentement (mentor_invited):", consentError);

    const appUrl = process.env.VITE_APP_URL || "http://localhost:5173";
    const shareUrl = `${appUrl}/s/${accessToken}`;

    return { mentor: mentorData, shareUrl };
  });

export const revokeMentorAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ mentorId: z.string().uuid(), childId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("child_mentors")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", data.mentorId)
      .eq("child_id", data.childId)
      .eq("owner_user_id", userId);

    if (error) {
      console.error(error);
      throw new Error("Impossible de révoquer l'accès");
    }

    // Log consent event — same non-fatal-but-not-silent handling as inviteMentor.
    const { error: consentError } = await supabase.from("consent_events").insert({
      user_id: userId,
      child_id: data.childId,
      event_type: "mentor_revoked",
      description: "Accès du mentor révoqué",
      metadata: { mentor_id: data.mentorId },
    });
    if (consentError) console.error("Échec de la journalisation du consentement (mentor_revoked):", consentError);

    return { success: true };
  });

export const getSharedChildView = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lookup token
    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from("child_mentors")
      .select("*")
      .eq("access_token", data.token)
      .single();

    if (mentorError || !mentor) {
      throw new Error("Lien invalide ou expiré");
    }

    if (mentor.status !== "active") {
      throw new Error("Lien invalide ou expiré");
    }

    if (mentor.expires_at && new Date(mentor.expires_at) < new Date()) {
      throw new Error("Lien invalide ou expiré");
    }

    // Fetch whitelisted child data
    const { data: child, error: childError } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, avatar_color, talents, age")
      .eq("id", mentor.child_id)
      .single();

    if (childError || !child) {
      throw new Error("Lien invalide ou expiré");
    }

    // Le numéro du parent (owner_user_id du mentor) vit dans auth.users.user_metadata,
    // pas dans child_profiles — le mentor doit pouvoir contacter le parent directement.
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(mentor.owner_user_id);
    const parentPhone = (ownerUser?.user?.user_metadata as any)?.phone ?? null;

    const result: any = {
      mentorName: mentor.mentor_name,
      childName: child.name,
      childColor: child.avatar_color,
      childAge: child.age,
      talents: mentor.can_view_talent_map ? child.talents : null,
      scopeDomains: mentor.scope_domains || [],
      parentPhone,
      timeline: [],
    };

    if (mentor.can_view_timeline) {
      let query = supabaseAdmin
        .from("challenges")
        .select("*")
        .eq("child_id", mentor.child_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
        
      if (mentor.scope_domains && mentor.scope_domains.length > 0) {
        query = query.in("domain", mentor.scope_domains);
      }

      const { data: challenges } = await query;
      
      if (challenges) {
        result.timeline = challenges.map(c => {
          const safeC = {
            id: c.id,
            title: c.title,
            domain: c.domain,
            description: c.description,
            completed_at: c.completed_at,
            proof_image_url: c.proof_image_url,
            ai_observations: c.ai_observations,
            notes: undefined as string | null | undefined,
          };
          if (mentor.can_view_raw_observations) {
            safeC.notes = c.notes;
          }
          return safeC;
        });
      }
    }

    return result;
  });

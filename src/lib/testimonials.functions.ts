// Témoignages — preuve sociale RÉELLE collectée dans l'app (chantier
// « Preuve sociale réelle », 2026-08-15).
//
// Deux fonctions :
//   1. submitParentTestimonial — un parent (ou un mentor assigné) écrit son retour
//      dans l'application après un défi validé, coche son consentement de
//      publication, et le témoignage devient public. La nature de l'émetteur
//      (parent / mentor) est détectée automatiquement côté serveur — jamais
//      envoyée par le client — et stockée dans sender_type. Les métadonnées
//      factuelles (nombre d'enfants inscrits par le parent, défis complétés de
//      l'enfant) sont prises au moment de l'écriture. Insertion via service role
//      (aucune policy RLS d'écriture), accès vérifié explicitement.
//   2. listPublishedTestimonials — lecture publique pour la landing : seules les
//      lignes `published = true` (donc consenties) sont renvoyées, jamais de nom
//      complet ni de coordonnées.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// ── Soumission d'un témoignage (authentifié, parent ou mentor de l'enfant) ─────

const SubmitInput = z.object({
  childId: z.string().uuid(),
  /** Prénom de l'émetteur (ou pseudonyme) — jamais de nom complet. */
  authorName: z.string().min(1).max(60),
  /** Ville de l'émetteur (ex. « Abidjan ») — renforce la crédibilité locale. */
  authorCity: z.string().max(80).default(""),
  /** Court titre de l'avis (ex. « Un vrai changement pour mon fils »). */
  headline: z.string().min(3).max(120),
  /** Corps de l'avis, 1 à 3 phrases autonomes. */
  reviewBody: z.string().min(10).max(1000),
  /** Note de 1 à 5. */
  rating: z.number().int().min(1).max(5),
  /** Consentement explicite de publication sur le site (prénom + ville). */
  consentPublish: z.boolean(),
});

/**
 * Détermine la nature de l'émetteur pour un enfant donné, sans jamais se fier au
 * client :
 *   - 'parent' : l'utilisateur est le propriétaire du profil enfant
 *     (child_profiles.user_id).
 *   - 'mentor' : l'utilisateur est le mentor actif assigné à cet enfant (table
 *     mentors, chantier multicouche — mentor_user_id + child_profile_id).
 *   - null : aucun accès légitime (témoignage refusé).
 * La table `mentors` n'existant que depuis le chantier multicouche, l'appel est
 * protégé : si elle manque encore, on retombe proprement sur parent/null.
 */
async function detectSenderType(
  supabase: SupabaseClient<Database>,
  userId: string,
  childId: string,
): Promise<"parent" | "mentor" | null> {
  const { data: owned } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("user_id", userId)
    .is("access_locked_at", null)
    .eq("is_active", true)
    .maybeSingle();
  if (owned) return "parent";

  try {
    const { data: mentorLink } = await supabase
      .from("mentors")
      .select("id")
      .eq("child_profile_id", childId)
      .eq("mentor_user_id", userId)
      .maybeSingle();
    if (mentorLink) return "mentor";
  } catch {
    // Table `mentors` absente (chantier multicouche pas encore appliqué) — on
    // considère simplement qu'il n'y a pas de lien mentor vérifiable ici.
  }

  return null;
}

export const submitParentTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Accès légitime : parent propriétaire OU mentor assigné à cet enfant.
    const senderType = await detectSenderType(supabase, userId, data.childId);
    if (!senderType) throw new Error("Profil enfant introuvable ou accès refusé.");

    // Sans consentement, pas de publication : on refuse plutôt que d'insérer un
    // témoignage privé que personne ne relira jamais.
    if (!data.consentPublish) {
      throw new Error("Le consentement de publication est requis pour partager votre retour.");
    }

    // Métadonnées factuelles au moment de l'écriture : pour un parent, le nombre
    // d'enfants inscrits par CE parent ; pour un mentor, on compte les enfants du
    // compte parent propriétaire (le témoignage reste rattaché à la famille).
    let ownerUserId = userId;
    if (senderType === "mentor") {
      const { data: ownerRow } = await supabase
        .from("child_profiles")
        .select("user_id")
        .eq("id", data.childId)
        .maybeSingle();
      if (ownerRow?.user_id) ownerUserId = ownerRow.user_id;
    }
    const [childrenRows, completedRows] = await Promise.all([
      supabase
        .from("child_profiles")
        .select("id")
        .eq("user_id", ownerUserId)
        .is("access_locked_at", null)
        .eq("is_active", true),
      supabase
        .from("challenges")
        .select("id")
        .eq("child_id", data.childId)
        .eq("status", "completed"),
    ]);
    const childrenCount = childrenRows.data?.length ?? 0;
    const challengesCompleted = completedRows.data?.length ?? 0;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("parent_testimonials")
      .upsert(
        {
          user_id: userId,
          child_id: data.childId,
          author_name: data.authorName.trim(),
          author_city: data.authorCity.trim(),
          headline: data.headline.trim(),
          review_body: data.reviewBody.trim(),
          rating: data.rating,
          consent_publish: true,
          published: true, // consenti + soumis = publié immédiatement
          sender_type: senderType,
          children_count: childrenCount,
          challenges_completed: challengesCompleted,
        },
        { onConflict: "user_id,child_id" },
      )
      .select("id, published, created_at")
      .single();

    if (error) throw new Error("Impossible d'enregistrer votre témoignage pour le moment.");
    return { ok: true as const, id: row.id, published: row.published };
  });

// ── Lecture publique pour la landing ─────────────────────────────────────────

export type PublishedTestimonial = {
  author: string;
  authorLocation: string;
  rating: number;
  headline: string;
  reviewBody: string;
  /** Nature de l'émetteur : 'parent' ou 'mentor' — la landing l'affiche. */
  senderType: "parent" | "mentor";
  /** Nombre d'enfants inscrits par la famille au moment du témoignage. */
  childrenCount: number;
  /** Défis complétés de l'enfant au moment du témoignage. */
  challengesCompleted: number;
  createdAt: string;
};

/**
 * Renvoie les témoignages publiés (consentis), les plus récents d'abord.
 * Accessible sans session (la landing est publique) : seules les lignes
 * `published = true` sont visibles via la RLS anon — le service role lit quand
 * même, mais la politique publique est le vrai garde-fou.
 */
export const listPublishedTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("parent_testimonials")
    .select(
      "author_name, author_city, rating, headline, review_body, sender_type, children_count, challenges_completed, created_at",
    )
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [] as PublishedTestimonial[];

  return (data ?? []).map((t) => ({
    author: t.author_name,
    authorLocation: t.author_city,
    rating: t.rating,
    headline: t.headline,
    reviewBody: t.review_body,
    senderType: (t.sender_type === "mentor" ? "mentor" : "parent") as "parent" | "mentor",
    childrenCount: t.children_count,
    challengesCompleted: t.challenges_completed,
    createdAt: t.created_at,
  }));
});

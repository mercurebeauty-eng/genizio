// Mentor Copilote (décision #74, 2026-08-15) — génération de défis par le mentor.
//
// Les AUTRES actions opérateur (commencer, progression, preuve photo/déclarative,
// non réussi) vivent désormais dans les fonctions parent de challenges.functions.ts :
// la vue parent en mode Mentor (décision #81) est le point d'opération unique, avec
// assertChildActor comme garde et mentor_actions comme journal acteur. Seule la
// GÉNÉRATION reste ici (bouton « Générer 4 défis » du dashboard /mentor).
//
// Règles verrouillées (décision #74) :
//   • le mentor génère pour les enfants ACCOMPAGNÉS (pack ou campagne) ;
//   • challenges.user_id reste le parent (ownership) — attribution via created_by_user_id ;
//   • le cœur IA (generateChallengesCore) est strictement le même que pour le parent.
//
// Toutes ces fonctions passent par supabaseAdmin (service role) APRÈS
// assertMentorOperator : la RLS « Parents manage their own challenges »
// (auth.uid() = user_id) bloquerait un tiers via le client parent — la vérification
// explicite EST la sécurité, et les écritures sont tracées dans mentor_actions.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertMentorOperator } from "@/lib/mentor-operator";
import { logMentorAction } from "@/lib/mentor-actions";
import { generateChallengesCore } from "@/lib/challenges.functions";

const MentorGenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

export const mentorGenerateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => MentorGenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child, error: childErr } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    await assertMentorOperator(supabaseAdmin as any, userId, data.childId);

    // user_id = le PARENT (ownership intact) ; created_by_user_id = le mentor
    // (attribution). Le cœur IA est strictement le même que pour le parent.
    const inserted = await generateChallengesCore({
      db: supabaseAdmin as any,
      child,
      childId: data.childId,
      count: data.count,
      ownerUserId: child.user_id,
      createdByUserId: userId,
    });

    void logMentorAction({
      mentorUserId: userId,
      childId: data.childId,
      action: "generate",
      payload: { count: data.count },
    });

    return inserted;
  });

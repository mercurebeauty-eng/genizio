// Mentor Copilote (décision #74) — journal d'audit des actions mentor.
//
// Non-bloquant pour l'appelant (pattern logChallengeOutcome / verifyAndLog) : une erreur
// de journalisation ne doit JAMAIS faire échouer l'action opérateur — elle est déjà
// autorisée, la trace est un filet. Sert aussi de journal de séance : les notes du
// mentor sont tracées ici (action 'notes') plutôt que dans challenges.notes, qui
// reste le journal d'apprentissage du parent.

export async function logMentorAction(params: {
  mentorUserId: string;
  childId: string;
  challengeId?: string | null;
  action: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // (supabaseAdmin as any) : tables mentor service-role (mêmes tables que
    // mentors.functions.ts — cast systématique, le client typé ne les connaît
    // que si les types ont été régénérés après la migration).
    await (supabaseAdmin as any).from("mentor_actions").insert({
      mentor_user_id: params.mentorUserId,
      child_profile_id: params.childId,
      challenge_id: params.challengeId ?? null,
      action: params.action,
      payload: params.payload ?? {},
    });
  } catch (err) {
    console.error("mentor_actions log failed (non-fatal):", err);
  }
}

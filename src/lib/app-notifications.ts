// Superviseur Copilote (décision #74) — notifications parent (canal cross-appareil minimal).
//
// Pas de push : le parent PULL les notifications à l'ouverture (badge + liste) et les
// marque lues. Écriture par les server functions superviseur (défi complété, abandon,
// bilan soumis/validé) — non-bloquant, même pattern que le journal.

export async function notifyUser(params: {
  userId: string;
  type: string;
  childId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // (supabaseAdmin as any) : table service-role (même convention que le reste des
    // tables internes — cast systématique).
    await (supabaseAdmin as any).from("app_notifications").insert({
      user_id: params.userId,
      type: params.type,
      child_profile_id: params.childId ?? null,
      payload: params.payload ?? {},
    });
  } catch (err) {
    console.error("app_notifications insert failed (non-fatal):", err);
  }
}

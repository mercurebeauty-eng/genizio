-- V4 « Pass Enfant » (Vague C, 2026-08-14) — feedback famille : une note par séance.
--
-- supervisor_feedback (table créée dans la migration 20260814180000) reçoit la note 1-5
-- de la famille sur une séance de son superviseur (décision 4 : « feedback famille »,
-- composante 25% du score V2). Garantie : UNE note par (séance, famille) — la famille ne
-- peut pas noter deux fois la même séance (la mise à jour est un upsert applicatif).
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_feedback_session_user_key
  ON public.supervisor_feedback(supervisor_session_id, user_id);

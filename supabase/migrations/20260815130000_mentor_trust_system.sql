-- Système de confiance mentor — V3 (2026-08-15) — « Confiance Mentor ».
--
-- Trois ajouts qui complètent le V1/V2 (statut, séances, score, feedback) :
--   1. mentor_sessions : le statut « confirmed » (validation PARENT) s'insère entre
--      declared et approved. Le cycle devient declared → confirmed (parent) →
--      approved (admin) → paid. La déclaration seule du mentor ne suffit plus :
--      sans confirmation du parent, la séance ne rapporte ni point ni payout.
--      confirmed_by/confirmed_at tracent qui/quoi a confirmé.
--   2. mentor_points : solde de récompenses du mentor (séance confirmée +1,
--      défi complété +2, note famille 5/5 +1) — source des paliers (badges,
--      bonus de payout). Index uniques partiels (kind, session_id) /
--      (kind, challenge_id) : le double crédit est impossible en base.
--   3. push_subscriptions : endpoints Web Push des utilisateurs (parent ET
--      mentor) pour les notifications push — la ligne in-app (app_notifications)
--      reste le canal pull, le push devient le canal actif.
--
-- Tout est idempotent (gardes IF EXISTS / DO $$) : rejouable sans erreur.
-- RLS activée sans policy : accès service-role uniquement (même principe que
-- le reste de la famille mentor).

-- ── 1. mentor_sessions : statut « confirmed » (validation parent) ──────────────
DO $$
DECLARE
  cname text;
BEGIN
  -- La contrainte a été posée en colonne (anonyme, auto-nommée
  -- <table>_status_check) puis renommée avec la table : on la retrouve par son
  -- contenu (définitivement repérable à la présence de 'declared') plutôt que
  -- par son nom, au cas où un rejeu partiel l'aurait nommée autrement.
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.mentor_sessions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%declared%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.mentor_sessions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.mentor_sessions ADD CONSTRAINT mentor_sessions_status_check
  CHECK (status IN ('declared','confirmed','approved','paid'));

ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS confirmed_by uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS mentor_sessions_confirmed_idx
  ON public.mentor_sessions(child_profile_id, status, occurred_at);

-- ── 2. mentor_points : solde de récompenses ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentor_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('session_confirmed','challenge_completed','feedback_5')),
  points int NOT NULL CHECK (points > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_points ENABLE ROW LEVEL SECURITY;
-- Aucune policy : crédit/lecture via supabaseAdmin (service role), même principe
-- que mentor_profiles/mentor_sessions.

-- Anti double-crédit : une séance ne peut créditer qu'une fois, idem pour un défi.
CREATE UNIQUE INDEX IF NOT EXISTS mentor_points_session_kind_key
  ON public.mentor_points(session_id, kind)
  WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mentor_points_challenge_kind_key
  ON public.mentor_points(challenge_id, kind)
  WHERE challenge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mentor_points_mentor_idx
  ON public.mentor_points(mentor_user_id, created_at);

-- ── 3. push_subscriptions : endpoints Web Push (VAPID) ────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Aucune policy : l'utilisateur écrit sa subscription via la server fn
-- (service role), le serveur envoie via service role — même principe que le reste.

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions(user_id);

-- Planification des séances + ponctualité + contestation (2026-08-15) —
-- « Ponctualité / Contester une séance » (backlog, décision #79/#75 différés).
--
-- Deux ajouts à la famille mentor :
--   1. mentor_session_slots : le mentor PLANIFIE un créneau (date + heure) avant la
--      séance ; le parent est notifié. À la déclaration, la séance peut être liée au
--      créneau (scheduled_at dénormalisé sur la séance) → la ponctualité = écart entre
--      l'heure planifiée et l'heure déclarée. Un créneau ne lie qu'une seule séance
--      (index partiel UNIQUE — garde anti-double).
--   2. mentor_sessions : statut « contested » — le parent CONTESTE une séance
--      déclarée (motif + traçabilité contested_by/at/reason). Une séance contestée
--      est exclue des séances confirmées (score), inapprovable par l'admin
--      (transition .eq("status","confirmed") inchangée) et rembourse la séance de
--      pack/campagne.
--
-- Idempotent (IF NOT EXISTS / DO $$) : rejouable sans erreur.
-- RLS activée sans policy : accès service-role uniquement (même principe que le
-- reste de la famille mentor).

-- ── 1. mentor_session_slots : créneaux planifiés ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentor_session_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  planned_at timestamptz NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','cancelled')),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_session_slots ENABLE ROW LEVEL SECURITY;
-- Aucune policy : lecture/écriture via les server functions (supabaseAdmin),
-- même principe que mentor_sessions / app_notifications.

CREATE INDEX IF NOT EXISTS mentor_session_slots_mentor_idx
  ON public.mentor_session_slots(mentor_user_id, planned_at);
CREATE INDEX IF NOT EXISTS mentor_session_slots_child_idx
  ON public.mentor_session_slots(child_profile_id, planned_at);

-- ── 2. mentor_sessions : ponctualité + contestation ───────────────────────────
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS mentor_session_slot_id uuid
  REFERENCES public.mentor_session_slots(id) ON DELETE SET NULL;
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS contested_by uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS contested_at timestamptz;
ALTER TABLE public.mentor_sessions ADD COLUMN IF NOT EXISTS contest_reason text;

-- Un créneau planifié ne peut lier qu'une seule séance (garde anti-double à la
-- déclaration avec slotId).
CREATE UNIQUE INDEX IF NOT EXISTS mentor_sessions_slot_key
  ON public.mentor_sessions(mentor_session_slot_id)
  WHERE mentor_session_slot_id IS NOT NULL;

-- Statut « contested » : étend la contrainte posée par 20260815130000. On la
-- retrouve par son contenu (présence de 'declared') pour la redéfinir, au cas où
-- un rejeu partiel l'aurait nommée autrement.
DO $$
DECLARE
  cname text;
BEGIN
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
  CHECK (status IN ('declared','confirmed','approved','paid','contested'));

CREATE INDEX IF NOT EXISTS mentor_sessions_contested_idx
  ON public.mentor_sessions(child_profile_id, status, contested_at);

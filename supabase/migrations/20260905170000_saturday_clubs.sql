-- Migration: Clubs Périscolaires du Samedi — escouades, membres, séances
-- Date: 2026-09-05
--
-- Modèle de données de la Phase 3 :
--   • mentor_squads        — une escouade du samedi (6 à 8 enfants, mentor
--                            de soutien ; quotas MENTOR_CATEGORY_QUOTAS).
--   • mentor_squad_members — appartenance + rôle naturel (rotation hebdo).
--   • mentor_club_sessions — séance du samedi : atelier, présences, preuve
--                            photo, EMPREINTE anti-doublon (dHash), verdict
--                            Naya Vision, débriefing famille.
--
-- Toutes ces tables sont médiatisées par les server functions (service role) :
-- RLS activée, aucune policy authenticated.

CREATE TABLE IF NOT EXISTS public.mentor_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Escouade du Samedi',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_squads_mentor
ON public.mentor_squads (mentor_user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.mentor_squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.mentor_squads(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  natural_role text CHECK (natural_role IN ('ideateur', 'batisseur', 'capitaine', 'mediateur')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (squad_id, child_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_squad_members_squad
ON public.mentor_squad_members (squad_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.mentor_club_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.mentor_squads(id) ON DELETE CASCADE,
  mentor_user_id uuid NOT NULL,
  occurred_at date NOT NULL,
  atelier_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'validated', 'rejected', 'flagged')),
  -- Pointage 1 tap : [{child_profile_id, present}]
  attendance jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(attendance) = 'array'),
  proof_image_path text,
  -- Empreinte dHash 64 bits en hex (16 caractères), calculée SERVEUR sur les
  -- octets uploadés — le mentor est la partie adverse de la détection de fraude.
  proof_image_fingerprint text,
  -- Séance antérieure dont la preuve ressemble (doublon suspecté).
  fingerprint_matched_session_id uuid REFERENCES public.mentor_club_sessions(id),
  naya_vision_confidence numeric(3, 2),
  vision_verdict jsonb,
  debrief_note text,
  debrief_audio_path text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  -- Une seule séance par jour et par escouade.
  UNIQUE (squad_id, occurred_at)
);

CREATE INDEX IF NOT EXISTS idx_mentor_club_sessions_fp
ON public.mentor_club_sessions (proof_image_fingerprint)
WHERE proof_image_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_club_sessions_mentor
ON public.mentor_club_sessions (mentor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_club_sessions_squad
ON public.mentor_club_sessions (squad_id, occurred_at DESC);

ALTER TABLE public.mentor_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_club_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to mentor_squads"
ON public.mentor_squads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to mentor_squad_members"
ON public.mentor_squad_members FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to mentor_club_sessions"
ON public.mentor_club_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

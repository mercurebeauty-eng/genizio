-- Migration: Activation des espaces professionnels + facturation Campus
-- Date: 2026-09-06
--
-- Refonte « Espace Professionnel & Orientation » :
--   1. UNIQUE(user_id) sur educator_profiles — l'upsert onConflict("user_id")
--      (saveMyEducatorProfile) échouait en 42P10 depuis la création de la table.
--   2. verification_status (pending/verified/suspended) — l'ancien booléen
--      is_verified n'était JAMAIS posé à true (aucun flux d'activation) ;
--      conservé et synchronisé pour compat (quotas Copilote).
--   3. authorized_emails — annuaire des e-mails habilités (établissement ou
--      structure), source d'auto-activation et d'assignation de direction.
--   4. school_leader_requests — fin de l'auto-attribution de la direction
--      (suggestSchool ne pose plus leader_user_id directement).
--   5. Facturation Campus réelle : license_paid / license_paid_at sur schools.
--   6. Recherche d'établissements insensible aux accents : colonne générée
--      search_text + index trigram (pg_trgm).

-- ── 1. Contrainte manquante (bug ON CONFLICT 42P10) ─────────────────────────
ALTER TABLE public.educator_profiles
  DROP CONSTRAINT IF EXISTS educator_profiles_user_id_key;
ALTER TABLE public.educator_profiles
  ADD CONSTRAINT educator_profiles_user_id_key UNIQUE (user_id);

-- ── 2. Statut de vérification des professionnels ────────────────────────────
ALTER TABLE public.educator_profiles
  ADD COLUMN IF NOT EXISTS verification_status text
    NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'suspended'));

-- Backfill : les rares profils marqués vérifiés (manuellement en base) gardent
-- leur statut ; tous les autres passent en attente de validation.
UPDATE public.educator_profiles
SET verification_status = 'verified'
WHERE is_verified = true
  AND verification_status = 'pending';

-- ── 3. E-mails autorisés (chaîne d'autorisation Admin OS) ───────────────────
CREATE TABLE IF NOT EXISTS public.authorized_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  expected_role text CHECK (expected_role IN ('teacher', 'counselor', 'psychologist', 'other')),
  is_leader boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Un e-mail = une habilitation (insensible à la casse).
CREATE UNIQUE INDEX IF NOT EXISTS idx_authorized_emails_email
  ON public.authorized_emails (lower(email));
CREATE INDEX IF NOT EXISTS idx_authorized_emails_school
  ON public.authorized_emails (school_id);

ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;
-- Service role uniquement (aucune policy) : la lecture passe par les server fns
-- requireAdmin, jamais par le client Supabase.

-- ── 4. Demandes de rôle « Chef d'établissement » ────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_leader_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  note text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Une seule demande en attente par utilisateur.
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_leader_requests_pending
  ON public.school_leader_requests (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_school_leader_requests_school
  ON public.school_leader_requests (school_id, status);

ALTER TABLE public.school_leader_requests ENABLE ROW LEVEL SECURITY;
-- Service role uniquement (aucune policy) : validation régalienne Admin OS.

-- ── 5. Facturation Campus (licences payées / échéances) ─────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS license_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS license_paid_at timestamptz;

-- ── 6. Recherche d'établissements insensible aux accents ────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.genizio_unaccent(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    t,
    'àáâãäçèéêëìíîïñòóôõöùúûüýÿœæ',
    'aaaaaceeeeiiiinooooouuuuyyoae'
  );
$$;

-- Colonne générée : nom + ville + slug + code (sans #), désaccentués et minuscules.
-- Le slug est déjà désaccentué (slugify) ; translate() est IMMUTABLE → GENERATED OK.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    lower(public.genizio_unaccent(coalesce(name, ''))) || ' ' ||
    lower(public.genizio_unaccent(coalesce(city, ''))) || ' ' ||
    coalesce(slug, '') || ' ' ||
    lower(replace(coalesce(code, ''), '#', ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_schools_search_trgm
  ON public.schools USING gin (search_text gin_trgm_ops);

-- ── 7. Horodatage automatique de school_leader_requests ─────────────────────
DROP TRIGGER IF EXISTS update_school_leader_requests_updated_at ON public.school_leader_requests;
CREATE TRIGGER update_school_leader_requests_updated_at
  BEFORE UPDATE ON public.school_leader_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

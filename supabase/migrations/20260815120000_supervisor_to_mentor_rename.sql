-- Renommage « Superviseur » → « Mentor » (2026-08-15) — décision #76.
--
-- Décision produit du porteur du projet : le terme « mentor » est plus vendeur et mieux
-- adapté que « superviseur » (accompagnement vs contrôle). Le rôle opérateur (ex-superviseur,
-- compte réel, assigné par l'admin) devient « Mentor ».
--
-- FUSION : la fonction de partage `child_mentors` (lien de lecture seule envoyé à un
-- prof/coach externe, sans compte) est SUPPRIMÉE — « Mentor » n'a plus qu'un seul sens.
-- Vérifié avant ce drop : `child_mentors` est VIDE en production (0 ligne).
--
-- Ce que cette migration pose :
--   1. `supervisors` → `mentors` (et toute la famille `supervisor_*` → `mentor_*`) : tables,
--      colonnes, index, contraintes, policy — renommés à l'identique (ALTER … RENAME,
--      préserve données/FK/index/RLS, aucun transfert de données).
--   2. `check_supervisor_quota()` → `check_mentor_quota()` : le corps plpgsql est du texte —
--      il ne suit pas les renommages ; on recrée la fonction sur les nouveaux noms puis le
--      trigger.
--   3. `DROP TABLE child_mentors` : fusion des deux concepts « mentor ».
--
-- HORS PÉRIMÈTRE : `challenges.requires_supervision`/`supervision_warning` = concept de
-- SÉCURITÉ (défi nécessitant la présence d'un adulte), ≠ rôle mentor → inchangé.
-- `campaign_educators` = concept « éducateur de campagne » distinct → inchangé.
-- Tout est idempotent (gardes IF EXISTS) : rejouable sans erreur.

-- ── 0. Trigger quota : déposé AVANT les renommages (il référence la table à renommer) ──
-- (Gardé : sur rejeu, `supervisors` n'existe plus — DROP TRIGGER … ON table inexistante
-- lèverait une erreur malgré IF EXISTS.)
DO $$ BEGIN
  IF to_regclass('public.supervisors') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_check_supervisor_quota ON public.supervisors';
  END IF;
END $$;

-- ── 1. Fusion : suppression de la fonction de partage (0 ligne en prod, vérifié) ───────
DROP TABLE IF EXISTS public.child_mentors;

-- ── 2. Renommage des tables ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.supervisors') IS NOT NULL THEN
    ALTER TABLE public.supervisors RENAME TO mentors;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.supervisor_profiles') IS NOT NULL THEN
    ALTER TABLE public.supervisor_profiles RENAME TO mentor_profiles;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.supervisor_sessions') IS NOT NULL THEN
    ALTER TABLE public.supervisor_sessions RENAME TO mentor_sessions;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.supervisor_feedback') IS NOT NULL THEN
    ALTER TABLE public.supervisor_feedback RENAME TO mentor_feedback;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.supervisor_actions') IS NOT NULL THEN
    ALTER TABLE public.supervisor_actions RENAME TO mentor_actions;
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.supervisor_reports') IS NOT NULL THEN
    ALTER TABLE public.supervisor_reports RENAME TO mentor_reports;
  END IF;
END $$;

-- ── 3. Renommage des colonnes ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentors' AND column_name='supervisor_user_id') THEN
    ALTER TABLE public.mentors RENAME COLUMN supervisor_user_id TO mentor_user_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_profiles' AND column_name='supervisor_user_id') THEN
    ALTER TABLE public.mentor_profiles RENAME COLUMN supervisor_user_id TO mentor_user_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_sessions' AND column_name='supervisor_user_id') THEN
    ALTER TABLE public.mentor_sessions RENAME COLUMN supervisor_user_id TO mentor_user_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_actions' AND column_name='supervisor_user_id') THEN
    ALTER TABLE public.mentor_actions RENAME COLUMN supervisor_user_id TO mentor_user_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_reports' AND column_name='supervisor_user_id') THEN
    ALTER TABLE public.mentor_reports RENAME COLUMN supervisor_user_id TO mentor_user_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_feedback' AND column_name='supervisor_session_id') THEN
    ALTER TABLE public.mentor_feedback RENAME COLUMN supervisor_session_id TO mentor_session_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='campaigns' AND column_name='extra_supervisors_quota') THEN
    ALTER TABLE public.campaigns RENAME COLUMN extra_supervisors_quota TO extra_mentors_quota;
  END IF;
END $$;

-- ── 4. Renommage des index (cosmétique, alignement types régénérés) ────────────────────
ALTER INDEX IF EXISTS supervisors_supervisor_user_id_idx RENAME TO mentors_mentor_user_id_idx;
ALTER INDEX IF EXISTS supervisors_campaign_id_idx RENAME TO mentors_campaign_id_idx;
ALTER INDEX IF EXISTS supervisors_child_profile_id_active_key RENAME TO mentors_child_profile_id_active_key;
ALTER INDEX IF EXISTS supervisor_sessions_supervisor_idx RENAME TO mentor_sessions_mentor_idx;
ALTER INDEX IF EXISTS supervisor_sessions_child_idx RENAME TO mentor_sessions_child_idx;
ALTER INDEX IF EXISTS supervisor_sessions_status_idx RENAME TO mentor_sessions_status_idx;
ALTER INDEX IF EXISTS supervisor_feedback_session_idx RENAME TO mentor_feedback_session_idx;
ALTER INDEX IF EXISTS supervisor_feedback_session_user_key RENAME TO mentor_feedback_session_user_key;
ALTER INDEX IF EXISTS supervisor_actions_supervisor_idx RENAME TO mentor_actions_mentor_idx;
ALTER INDEX IF EXISTS supervisor_actions_child_idx RENAME TO mentor_actions_child_idx;
ALTER INDEX IF EXISTS supervisor_actions_challenge_idx RENAME TO mentor_actions_challenge_idx;
ALTER INDEX IF EXISTS supervisor_reports_one_open_per_child_key RENAME TO mentor_reports_one_open_per_child_key;
ALTER INDEX IF EXISTS supervisor_reports_child_idx RENAME TO mentor_reports_child_idx;
ALTER INDEX IF EXISTS supervisor_reports_supervisor_idx RENAME TO mentor_reports_mentor_idx;

-- ── 5. Renommage des contraintes (PK + FK, cosmétique) ────────────────────────────────
-- Les noms de contraintes ne suivent pas les renommages de tables (elles sont portées par
-- OID, pas par nom). Une seule chaîne de remplacements, ordonnée du plus spécifique au
-- générique (`supervisor_sessions` avant `supervisor_`, sinon le suffixe resterait en
-- « supervisor_… » comme dans `mentor_actions_supervisor_user_id_fkey`).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND (conname LIKE 'supervisor%' OR conname LIKE 'supervisors%')
  LOOP
    EXECUTE format(
      'ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
      c.tbl,
      c.conname,
      replace(replace(replace(replace(replace(replace(replace(replace(replace(
        c.conname,
        'supervisor_sessions', 'mentor_sessions'),
        'supervisor_feedback', 'mentor_feedback'),
        'supervisor_actions', 'mentor_actions'),
        'supervisor_reports', 'mentor_reports'),
        'supervisor_profiles', 'mentor_profiles'),
        'supervisors', 'mentors'),
        'supervisor_user_id', 'mentor_user_id'),
        'supervisor_session_id', 'mentor_session_id'),
        'supervisor_', 'mentor_')
    );
  END LOOP;
END $$;

-- ── 6. Policy RLS (les policies suivent la table par OID, seul le NOM change) ─────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentors' AND policyname='Supervisors can read their own assignments') THEN
    ALTER POLICY "Supervisors can read their own assignments" ON public.mentors
      RENAME TO "Mentors can read their own assignments";
  END IF;
END $$;

-- ── 7. Quota mentor : la fonction plpgsql est du texte — recréée sur les nouveaux noms ─
DROP FUNCTION IF EXISTS public.check_supervisor_quota();

CREATE OR REPLACE FUNCTION public.check_mentor_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  extra_quota integer := 0;
  relevant_created_at timestamptz;
  base_floor integer;
  quota integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.mentors
  WHERE mentor_user_id = NEW.mentor_user_id
    AND removed_at IS NULL;

  IF NEW.campaign_id IS NOT NULL THEN
    SELECT COALESCE(extra_mentors_quota, 0), created_at
      INTO extra_quota, relevant_created_at
      FROM public.campaigns WHERE id = NEW.campaign_id;
  ELSE
    SELECT created_at INTO relevant_created_at FROM auth.users WHERE id = NEW.mentor_user_id;
  END IF;

  IF relevant_created_at IS NOT NULL AND relevant_created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN
    base_floor := 5;
  ELSE
    base_floor := 1;
  END IF;

  quota := base_floor + COALESCE(extra_quota, 0);

  -- Plafond absolu 5 enfants suivis par mentor.
  quota := LEAST(quota, 5);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de mentorat atteint (% / % enfants pour ce mentor).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_mentor_quota() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_supervisor_quota ON public.mentors;
CREATE TRIGGER trg_check_mentor_quota
  BEFORE INSERT ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.check_mentor_quota();

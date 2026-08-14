-- Système de confiance superviseur (V1, 2026-08-14) — décision 4 « score auto dès la V1 ».
--
-- Ce que cette migration pose :
--   1. supervisor_profiles : le STATUT du superviseur (compte), distinct de l'assignation —
--      active | warning | suspended | banned. C'est le levier du ban/récompense : un compte
--      suspendu/banni n'est plus assignable (insertSupervisorAssignments le refuse).
--   2. supervisors.removed_at : soft-retire de l'ASSIGNATION (pattern campaign_educators) —
--      un superviseur retiré garde son historique (séances, score) mais ne consomme plus
--      son quota ni ses enfants. La contrainte UNIQUE(child_profile_id) devient un index
--      partiel UNIQUE WHERE removed_at IS NULL : on peut réassigner un enfant après retrait
--      sans perdre la garantie « un enfant = un superviseur actif ».
--   3. supervisor_sessions : la déclaration de séance faite en app par le superviseur —
--      source du score de fiabilité (séances tenues/attendues) et de la future facturation
--      (supervisor_payout, V2).
--   4. check_supervisor_quota : ne compte plus que les assignations ACTIVES (removed_at IS
--      NULL) — un superviseur retiré libère sa place.

-- ── 1. Statut du superviseur (compte) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supervisor_profiles (
  supervisor_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','warning','suspended','banned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_profiles ENABLE ROW LEVEL SECURITY;
-- Aucune policy : les chemins d'accès passent par supabaseAdmin (service role) — même
-- principe du moindre privilège que supervisors/campaigns.

-- ── 2. Soft-retire de l'assignation ────────────────────────────────────────────
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS removed_at timestamptz;

-- La contrainte UNIQUE(child_profile_id) devient un index partiel sur les assignations
-- actives uniquement : retirer un superviseur libère l'enfant (réassignable) sans jamais
-- permettre deux superviseurs actifs sur le même enfant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisors_child_profile_id_key'
      AND conrelid = 'public.supervisors'::regclass
  ) THEN
    ALTER TABLE public.supervisors DROP CONSTRAINT supervisors_child_profile_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS supervisors_child_profile_id_active_key
  ON public.supervisors(child_profile_id)
  WHERE removed_at IS NULL;

-- ── 3. Déclarations de séance ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supervisor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (occurred_at <= now() + interval '1 day')
);

ALTER TABLE public.supervisor_sessions ENABLE ROW LEVEL SECURITY;
-- Aucune policy : lecture/écriture via supabaseAdmin (service role), même principe que le reste.

CREATE INDEX IF NOT EXISTS supervisor_sessions_supervisor_idx
  ON public.supervisor_sessions(supervisor_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS supervisor_sessions_child_idx
  ON public.supervisor_sessions(child_profile_id, occurred_at);

-- ── 4. Quota superviseur : ne compter que les assignations actives ─────────────
-- Un superviseur retiré (removed_at) ne consomme plus son quota — ses enfants sont
-- réassignables. Miroir TS : computeSupervisorQuota reste inchangé (pré-check pur) ;
-- le count côté application (listSupervisorsAdmin, getSupervisorDashboard) filtre
-- removed_at IS NULL.
CREATE OR REPLACE FUNCTION public.check_supervisor_quota()
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
  SELECT count(*) INTO current_count FROM public.supervisors
  WHERE supervisor_user_id = NEW.supervisor_user_id
    AND removed_at IS NULL;

  IF NEW.campaign_id IS NOT NULL THEN
    SELECT COALESCE(extra_supervisors_quota, 0), created_at
      INTO extra_quota, relevant_created_at
      FROM public.campaigns WHERE id = NEW.campaign_id;
  ELSE
    SELECT created_at INTO relevant_created_at FROM auth.users WHERE id = NEW.supervisor_user_id;
  END IF;

  IF relevant_created_at IS NOT NULL AND relevant_created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN
    base_floor := 5;
  ELSE
    base_floor := 1;
  END IF;

  quota := base_floor + COALESCE(extra_quota, 0);

  -- Plafond absolu 5 enfants suivis par superviseur.
  quota := LEAST(quota, 5);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de supervision atteint (% / % enfants pour ce superviseur).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_supervisor_quota() FROM PUBLIC, anon, authenticated;

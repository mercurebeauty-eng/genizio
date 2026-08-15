-- Vague 4 « Pagination » du plan multicouche (2026-08-15) — voir docs/memoire/genizio_plan_multicouche.md.
--
-- Deux apports pour l'Admin OS à l'échelle :
--   1. compute_executive_kpis() : RPC SECURITY DEFINER qui calcule TOUS les KPIs
--      exécutif en SQL (une passe, indexée) — au lieu de ramener les tables
--      child_profiles et challenges ENTIÈRES en mémoire à chaque chargement de
--      l'onglet Exécutif. Sémantique identique aux fonctions pures existantes :
--      calculateActiveChildren (fenêtres 7j/30j, signaux profil OU défi),
--      calculateRetentionRate (pourcentage), calculateAgeDistribution (tranches
--      « 3-6 / 7-10 / 11-13 / 14+ », total = TOUS les enfants, ages invalides exclus
--      des comptages mais inclus du dénominateur — reproduit à l'identique).
--   2. parent_profiles.created_at : date de création du COMPTE (auth.users.created_at),
--      copiée par le trigger de sync — permet de paginer l'annuaire admin « plus
--      récents d'abord » (l'ordre actuel utilisait auth.users, non requêtable).
--
-- ⚠️ NON APPLIQUÉE en prod avant revue (convention du repo).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPC KPIs exécutif
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_executive_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_children bigint;
  v_total_challenges bigint;
  v_completed_challenges bigint;
  v_active_7d bigint;
  v_active_30d bigint;
  v_age_brackets jsonb;
  v_cutoff_7d timestamptz := now() - interval '7 days';
  v_cutoff_30d timestamptz := now() - interval '30 days';
BEGIN
  SELECT count(*) INTO v_total_children FROM public.child_profiles;
  SELECT count(*) INTO v_total_challenges
    FROM public.challenges WHERE deleted_at IS NULL;
  SELECT count(*) INTO v_completed_challenges
    FROM public.challenges WHERE deleted_at IS NULL AND status = 'completed';

  -- Un enfant est actif si un signal PROFIL (last_activity_date/updated_at/created_at)
  -- ou un signal DÉFI (complétion/mise à jour/création) tombe dans la fenêtre.
  SELECT count(*) INTO v_active_7d FROM public.child_profiles c
  WHERE c.last_activity_date >= v_cutoff_7d
     OR c.updated_at >= v_cutoff_7d
     OR c.created_at >= v_cutoff_7d
     OR EXISTS (SELECT 1 FROM public.challenges ch
                WHERE ch.child_id = c.id AND ch.deleted_at IS NULL
                  AND GREATEST(COALESCE(ch.completed_at, '-infinity'::timestamptz),
                               COALESCE(ch.updated_at, '-infinity'::timestamptz),
                               COALESCE(ch.created_at, '-infinity'::timestamptz)) >= v_cutoff_7d);

  SELECT count(*) INTO v_active_30d FROM public.child_profiles c
  WHERE c.last_activity_date >= v_cutoff_30d
     OR c.updated_at >= v_cutoff_30d
     OR c.created_at >= v_cutoff_30d
     OR EXISTS (SELECT 1 FROM public.challenges ch
                WHERE ch.child_id = c.id AND ch.deleted_at IS NULL
                  AND GREATEST(COALESCE(ch.completed_at, '-infinity'::timestamptz),
                               COALESCE(ch.updated_at, '-infinity'::timestamptz),
                               COALESCE(ch.created_at, '-infinity'::timestamptz)) >= v_cutoff_30d);

  -- Tranches d'âge (miroir SQL de calculateAgeDistribution : floor(age), bornes
  -- 6/10/13, âges null/invalides EXCLUS des comptages — le dénominateur du
  -- pourcentage reste le total des enfants, calculé côté application).
  SELECT COALESCE(jsonb_agg(jsonb_build_object('bracket', b, 'count', n) ORDER BY n DESC), '[]'::jsonb)
    INTO v_age_brackets
  FROM (
    SELECT CASE
             WHEN age <= 6 THEN '3-6 ans'
             WHEN age <= 10 THEN '7-10 ans'
             WHEN age <= 13 THEN '11-13 ans'
             ELSE '14+ ans'
           END AS b,
           count(*) AS n
    FROM public.child_profiles
    WHERE age IS NOT NULL AND age >= 0
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'totalChildren', v_total_children,
    'totalChallenges', v_total_challenges,
    'completedChallenges', v_completed_challenges,
    'activeChildren7d', v_active_7d,
    'activeChildren30d', v_active_30d,
    'ageBrackets', v_age_brackets
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_executive_kpis() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. parent_profiles.created_at — date de création du compte (pagination admin)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.parent_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Backfill depuis auth.users (les comptes existants n'ont pas encore de date).
UPDATE public.parent_profiles pp
SET created_at = u.created_at
FROM auth.users u
WHERE u.id = pp.user_id
  AND pp.created_at IS NULL;

CREATE INDEX IF NOT EXISTS parent_profiles_created_at_idx
  ON public.parent_profiles(created_at DESC);

-- Le trigger de sync alimente created_at à l'INSERT (jamais en UPDATE — la date de
-- création du compte ne change pas).
CREATE OR REPLACE FUNCTION public.sync_parent_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.parent_profiles (user_id, email, phone, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'full_name'),
    NEW.created_at,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_parent_profile() FROM PUBLIC, anon, authenticated;

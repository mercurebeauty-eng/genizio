-- Quota + par compte (2026-08-14) : exception ciblée au plafond absolu de 5.
--
-- Contexte : la migration 20260809120000 a introduit un plafond ABSOLU de 5 profils
-- par compte (LEAST(quota, 5), décision « au-delà → nouveau compte »). Ce plafond
-- neutralise l'outil admin de « dépassement temporaire » (extra_profile_slots,
-- updateExtraProfileSlotsAdmin) : un compte avec 10 slots ne peut toujours créer que
-- 5 profils.
--
-- Décision utilisateur 2026-08-14 : ce N'EST PAS un changement de règle global — le
-- plafond de 5 reste la règle pour tous les comptes. Un compte peut recevoir un
-- « quota + » individuel via la clé raw_app_meta_data.quota_override (posée par
-- l'admin, même mécanique que extra_profile_slots) : si elle est > 0, elle remplace
-- la borne de 5 pour CE compte uniquement.
--
-- Miroir TS : computeChildCreationLimit (child-access.ts) — le 4e argument
-- quotaOverride remplace MAX_CHILDREN_PER_ACCOUNT quand il est > 0.

CREATE OR REPLACE FUNCTION public.check_child_profile_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  extra_slots integer;
  quota_override integer;
  is_vouched_educator boolean;
  account_created_at timestamptz;
  base_floor integer;
  quota integer;
  cap integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.child_profiles WHERE user_id = NEW.user_id;

  SELECT COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0),
         COALESCE((raw_app_meta_data ->> 'quota_override')::integer, 0),
         created_at
    INTO extra_slots, quota_override, account_created_at
    FROM auth.users WHERE id = NEW.user_id;

  SELECT EXISTS(
    SELECT 1 FROM public.campaign_educators
    WHERE educator_user_id = NEW.user_id AND removed_at IS NULL
  ) INTO is_vouched_educator;

  IF account_created_at IS NOT NULL AND account_created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN
    base_floor := 5;
  ELSE
    base_floor := 1;
  END IF;

  quota := base_floor + COALESCE(extra_slots, 0);

  -- Palier éducateur vouché (20260730100000) : un éducateur activement vouché par une
  -- campagne gère davantage de profils, quel que soit son plancher de départ.
  IF is_vouched_educator THEN
    quota := GREATEST(quota, 10);
  END IF;

  -- Couverture famille (abonnement actif/past_due dans sa période, ou crédit de parrainage
  -- valide) : la famille peut créer jusqu'au plafond de 5 profils.
  IF EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND status = 'active'
  ) OR EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND status = 'past_due' AND current_period_end > now()
  ) OR EXISTS(
    SELECT 1 FROM public.sponsorship_credits
    WHERE user_id = NEW.user_id AND ends_at > now()
  ) THEN
    quota := GREATEST(quota, 5);
  END IF;

  -- Plafond absolu par compte : 5 pour tous (décision 2026-08-08), SAUF quota_override
  -- posé par l'admin (quota + individuel, décision 2026-08-14) qui le remplace.
  cap := CASE WHEN quota_override > 0 THEN quota_override ELSE 5 END;
  quota := LEAST(quota, cap);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_child_profile_quota() FROM PUBLIC, anon, authenticated;

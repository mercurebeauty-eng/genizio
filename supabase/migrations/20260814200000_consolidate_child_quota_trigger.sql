-- V4 « Pass Enfant » (Vague A, 2026-08-14) — trigger de quota consolidé (V10).
--
-- La lecture de la couverture passe des 4 mécanismes parallèles (abonnement, crédit de
-- parrainage, inscription campagne, plafond fixe) à UNE SEULE table : family_coverages
-- (migration 20260814180000 + données 20260814190000). Règle miroir TS : computeAppQuota
-- (child-profile-quota.ts) — l'UI promet exactement ce que la base acceptera.
--
--   • quota_override (app_metadata, outil ADMIN) : inchangé — early return borné 50.
--   • Sinon : plancher (grand-péré 5 | neuf 1) → palier éducateur vouché (10) → couverture
--     de base family_coverages (5) → + Σ(max_children des paliers 'purchase' actifs) →
--     plafond absolu 50 (DÉCISION 5, 2026-08-14 : « 5 par palier, cap 50 » — le plafond
--     passe de 5 à 50, le parent avec 6+ enfants achète un palier au lieu de créer un
--     nouveau compte).
--   • Les paliers éducateurs vouchés (10) ne sont plus ramenés à 5 par la borne : le cap
--     absolu 5 (décision 2026-08-08) est remplacé par le cap 50 — l'intention d'origine
--     du palier éducateur (20260730100000) est rétablie.
--
-- Grand-père préservé : rien ne change pour les comptes créés avant 2026-08-04 (5 gratuits).

CREATE OR REPLACE FUNCTION public.check_child_profile_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  quota_override integer;
  is_vouched_educator boolean;
  account_created_at timestamptz;
  base_floor integer;
  has_base boolean;
  sum_purchases integer;
  quota integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.child_profiles WHERE user_id = NEW.user_id;

  SELECT COALESCE((raw_app_meta_data ->> 'quota_override')::integer, 0),
         created_at
    INTO quota_override, account_created_at
    FROM auth.users WHERE id = NEW.user_id;

  SELECT EXISTS(
    SELECT 1 FROM public.campaign_educators
    WHERE educator_user_id = NEW.user_id AND removed_at IS NULL
  ) INTO is_vouched_educator;

  -- Quota + par compte (outil ADMIN, inchangé) : quota_override = quota TOTAL accordé
  -- (borne 50, miroir du validateur admin). 0/absente → règle standard automatique.
  IF quota_override > 0 THEN
    quota := LEAST(quota_override, 50);
    IF current_count >= quota THEN
      RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF account_created_at IS NOT NULL AND account_created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN
    base_floor := 5;
  ELSE
    base_floor := 1;
  END IF;

  quota := base_floor;

  -- Palier éducateur vouché (20260730100000) : un éducateur activement vouché par une
  -- campagne gère davantage de profils, quel que soit son plancher de départ.
  IF is_vouched_educator THEN
    quota := GREATEST(quota, 10);
  END IF;

  -- V4 : couverture de base = UNE ligne family_coverages active child_id IS NULL d'une
  -- source app (abonnement, campagne, parrainage) → 5 profils. Les paliers ACHETÉS
  -- (source 'purchase') s'empilent : +max_children (5) par palier — décision 5.
  SELECT EXISTS(
    SELECT 1 FROM public.family_coverages fc
    WHERE fc.user_id = NEW.user_id
      AND fc.child_id IS NULL
      AND fc.status = 'active'
      AND fc.source IN ('subscription','campaign','sponsorship')
      AND (fc.starts_at IS NULL OR fc.starts_at <= now())
      AND (fc.ends_at IS NULL OR fc.ends_at > now())
  ), COALESCE((
    SELECT SUM(fc.max_children) FROM public.family_coverages fc
    WHERE fc.user_id = NEW.user_id
      AND fc.source = 'purchase'
      AND fc.status = 'active'
      AND (fc.starts_at IS NULL OR fc.starts_at <= now())
      AND (fc.ends_at IS NULL OR fc.ends_at > now())
  ), 0)
  INTO has_base, sum_purchases;

  IF has_base THEN
    quota := GREATEST(quota, 5);
  END IF;
  quota := quota + sum_purchases;

  -- Plafond absolu 50 par compte (décision 5 — remplace le plafond 5 du 2026-08-08).
  quota := LEAST(quota, 50);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_child_profile_quota() FROM PUBLIC, anon, authenticated;

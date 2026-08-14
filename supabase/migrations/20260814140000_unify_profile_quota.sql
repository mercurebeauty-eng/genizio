-- Unification du quota de profils (2026-08-14) : UNE seule clé quota_override.
--
-- Contexte : deux clés coexistaient — extra_profile_slots (slots de dépassement
-- « en plus du plancher », écrits par updateExtraProfileSlotsAdmin et le paiement
-- en ligne extra_slots) et quota_override (exception au plafond de 5, introduite par
-- 20260814120000). C'était perturbant et redondant : pour régler le quota d'un compte
-- il fallait comprendre les deux.
--
-- Décision utilisateur 2026-08-14 : UNE SEULE clé raw_app_meta_data.quota_override =
-- quota TOTAL de profils accordé au compte (0/absente = règle standard automatique :
-- plancher grand-péré/neuf + couverture famille → 5, plafond 5). La clé
-- extra_profile_slots n'est plus lue nulle part : les comptes existants sont convertis
-- (voir la migration de données en fin de fichier : quota_override =
-- GREATEST(quota_override, plancher + extra_profile_slots), puis retrait de la clé).
--
-- Miroir TS : computeChildCreationLimit (child-access.ts) — même borne 50, même
-- sémantique « 0 = auto ».

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

  -- Quota + par compte : quota_override = quota TOTAL accordé (borne 50, miroir du
  -- validateur admin). 0/absente → règle standard automatique ci-dessous.
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

  -- Plafond absolu 5 enfants par compte (décision utilisateur 2026-08-08). Le palier
  -- éducateur 10 est donc ramené à 5 par la même borne.
  quota := LEAST(quota, 5);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_child_profile_quota() FROM PUBLIC, anon, authenticated;

-- ── Migration de données : extra_profile_slots → quota_override ──────────────
-- Pour chaque compte ayant encore des slots de dépassement (l'ancienne clé) :
--   quota_override = GREATEST(quota_override existant, plancher + extra_profile_slots)
-- (plancher selon le cutover grand-père 2026-08-04), puis retrait de la clé devenue
-- inerte. Un compte sans extra_profile_slots n'est pas touché (quota_override éventuel
-- déjà posé par l'admin conservé).
UPDATE auth.users
SET raw_app_meta_data =
      CASE
        WHEN COALESCE((raw_app_meta_data ->> 'quota_override')::integer, 0)
             > COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0)
             + CASE WHEN created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN 5 ELSE 1 END
        THEN raw_app_meta_data - 'extra_profile_slots'
        ELSE jsonb_set(
          raw_app_meta_data - 'extra_profile_slots',
          '{quota_override}',
          to_jsonb(
            LEAST(
              COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0)
              + CASE WHEN created_at < '2026-08-04T00:00:00.000Z'::timestamptz THEN 5 ELSE 1 END,
              50
            )
          )
        )
      END
WHERE raw_app_meta_data ? 'extra_profile_slots'
  AND COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0) > 0;

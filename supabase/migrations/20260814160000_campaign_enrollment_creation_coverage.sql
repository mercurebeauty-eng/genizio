-- Couverture CAMPAGNE côté CRÉATION de profils (2026-08-14).
--
-- Contexte (constat utilisateur) : l'essence du modèle campagne est qu'une institution
-- soutient des parents qui n'ont pas les moyens d'un abonnement régulier — le parent
-- inscrit plusieurs de ses enfants via le lien/QR ou le code distribué par l'institution.
-- Or check_child_profile_quota ne connaissait que l'abonnement famille, les crédits de
-- parrainage et les slots payants : un parent dont l'enfant était POURTANT inscrit à une
-- campagne (donc financé par l'institution) restait bloqué au plancher (1 profil pour un
-- compte récent) dès qu'il voulait ajouter un 2e enfant — le poussant vers un abonnement
-- qu'il n'a justement pas les moyens de payer. L'accès, lui, était déjà couvert
-- (getChildAccessStatus rend l'enfant de campagne « permanent » pendant la fenêtre) ;
-- seule la CRÉATION était verrouillée à tort.
--
-- Fix : un compte dont un enfant est inscrit à une campagne ACTIVE (fenêtre fixe
-- start_date/end_date en cours) est traité comme une famille couverte → création
-- possible jusqu'au plafond de 5 profils, sans abonnement. Même effet que la couverture
-- famille (GREATEST avant la borne LEAST) — le plafond absolu 5 reste inchangé.
--
-- Miroir TS : computeChildCreationLimit (child-access.ts) — nouveau param campaignCovered.

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

  -- Couverture famille (abonnement actif/past_due dans sa période, crédit de parrainage
  -- valide) OU couverture CAMPAGNE (2026-08-14 : un enfant du compte inscrit à une
  -- campagne active, fenêtre fixe en cours) : création possible jusqu'au plafond de 5.
  IF EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND status = 'active'
  ) OR EXISTS(
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND status = 'past_due' AND current_period_end > now()
  ) OR EXISTS(
    SELECT 1 FROM public.sponsorship_credits
    WHERE user_id = NEW.user_id AND ends_at > now()
  ) OR EXISTS(
    SELECT 1
    FROM public.season_enrollments se
    JOIN public.campaigns c ON c.id = se.campaign_id
    WHERE se.user_id = NEW.user_id
      AND c.start_date <= now() AND c.end_date >= now()
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

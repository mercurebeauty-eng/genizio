-- Abonnement famille (Paystack Subscriptions) + crédits de parrainage + plafond 5 enfants/compte.
--
-- Décisions utilisateur (2026-08-08) :
--   • 1 abonnement Paystack par COMPTE parent (forfait famille) : tarif unique
--     (5 000 F/mois ×3 mois de bienvenue puis 15 000 F/mois), couvre tous les enfants
--     jusqu'au plafond de 5. Résiliation = coupure immédiate des accès hors le 1er gratuit.
--   • Plafond de 5 enfants par compte, VOULU : au-delà → nouveau compte. Idem pour les
--     superviseurs de campagnes (suivi rigoureux, 5 par 5).
--   • Parrainage : paiement en ligne Paystack → code → crédit de COUVERTURE FAMILLE
--     (sponsorship_credits), indépendant du prélèvement récurrent (pas de double débit).
--   • L'accès est CALCULÉ par le résolveur (src/lib/child-access.ts) : l'abonnement n'écrit
--     jamais dans child_access_periods — résilier change un statut, la coupure est immédiate.

-- ── Table subscriptions (1 ligne par compte) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'active', 'past_due', 'cancelled', 'expired')),
  plan_code text,
  price_xof integer,
  currency text NOT NULL DEFAULT 'XOF',
  paystack_customer_code text,
  paystack_subscription_code text UNIQUE,
  paystack_reference text UNIQUE,
  current_period_start timestamptz,
  current_period_end timestamptz,
  started_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- Aucune policy client : accès service-role uniquement (même pattern que child_access_periods).

-- ── Table sponsorship_credits (crédit famille par token rédimé) ───────────────
-- Le parrain paie en ligne N mois (3 premiers offerts, puis 15 000 F/mois) ; le code,
-- une fois rédimé par la famille ciblée, ajoute N mois de COUVERTURE FAMILLE. ends_at est
-- calculé par extension sans découpe (computeAccessPeriodWindow côté TS) : une famille
-- déjà couverte voit sa couverture s'allonger, jamais se couper.
CREATE TABLE IF NOT EXISTS public.sponsorship_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.sponsorship_tokens(id) ON DELETE SET NULL,
  months_count integer NOT NULL DEFAULT 1 CHECK (months_count BETWEEN 1 AND 12),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsorship_credits_user_id_idx ON public.sponsorship_credits (user_id);
CREATE INDEX IF NOT EXISTS sponsorship_credits_ends_at_idx ON public.sponsorship_credits (ends_at);

ALTER TABLE public.sponsorship_credits ENABLE ROW LEVEL SECURITY;
-- Aucune policy client : service-role uniquement.

-- ── Table paystack_plans (cache des codes de plans auto-créés) ────────────────
-- Réponse à la question « je dois créer les plans dans le dashboard Paystack ? » : non —
-- ensurePaystackPlan (paystack.server.ts) lit ce cache, sinon cherche le plan chez
-- Paystack par nom, sinon le crée, et l'enregistre ici. Idempotent à travers les déplois.
CREATE TABLE IF NOT EXISTS public.paystack_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  plan_code text NOT NULL,
  name text NOT NULL,
  interval text NOT NULL DEFAULT 'monthly',
  amount_xof integer NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paystack_plans ENABLE ROW LEVEL SECURITY;
-- Aucune policy client : service-role uniquement.

-- ── sponsorship_tokens : lien avec le paiement en ligne ───────────────────────
-- Un token de parrainage est désormais créé PAR le paiement Paystack one-time (intent
-- 'sponsorship') — webhook ou page de retour — au lieu de l'être d'avance puis confirmé
-- manuellement par l'admin. La référence Paystack rend la création idempotente (un token
-- par paiement, jamais deux).
ALTER TABLE public.sponsorship_tokens
  ADD COLUMN IF NOT EXISTS paystack_reference text UNIQUE;

-- ── check_child_profile_quota : plafond 5 + couverture famille → 5 ────────────
-- Même base que la version 20260803100000 (plancher 5 grand-péré / 1 cutover, palier
-- éducateur 10, forme additive), plus :
--   • plafond ABSOLU de 5 profils par compte (LEAST) — au-delà → nouveau compte ;
--   • un compte avec un abonnement actif (ou past_due dans sa période) OU un crédit de
--     parrainage encore valide peut créer jusqu'au plafond de 5 (GREATEST avant la borne).
-- CREATE OR REPLACE : les REVOKE posés par les migrations précédentes restent en vigueur.
CREATE OR REPLACE FUNCTION public.check_child_profile_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  extra_slots integer;
  is_vouched_educator boolean;
  account_created_at timestamptz;
  base_floor integer;
  quota integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.child_profiles WHERE user_id = NEW.user_id;

  SELECT COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0), created_at
    INTO extra_slots, account_created_at
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

-- ── check_supervisor_quota : plafond 5 superviseurs ───────────────────────────
-- Suivi rigoureux : un superviseur ne suit que 5 enfants au maximum (5 par 5).
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
  WHERE supervisor_user_id = NEW.supervisor_user_id;

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

REVOKE EXECUTE ON FUNCTION public.check_child_profile_quota() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_supervisor_quota() FROM PUBLIC, anon, authenticated;

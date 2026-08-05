-- Accès mensuel par enfant + parrainage par mois (2026-08-05)
--
-- Décisions utilisateur (2026-08-05) :
--   • Barème : 1 profil enfant GRATUIT par compte ; chaque enfant supplémentaire coûte
--     5 000 FCFA/mois pendant les 3 premiers mois du compte, puis 15 000 FCFA/mois
--     (déjà porté par src/lib/pricing.ts — resolveExtraSlotPrice).
--   • Les "slots" achetés AVANT ce modèle (extra_profile_slots, accès vendu "permanent")
--     restent valables à vie : grand-père, jamais rétroactif (même esprit que
--     20260803100000_grandfather_free_floor_and_extra_slots.sql).
--   • Le parrain (diaspora/RSE) choisit 1 à 6 mois ; le code valide exactement ces mois ;
--     le prix suit le même barème que la famille.
--   • À l'expiration de la période payée : bannière + blocage des NOUVEAUX défis
--     (portfolio/acquis restent accessibles).
--   • Paiement : manuel WhatsApp/Mobile Money + confirmation admin (pattern établi).

-- ── 1. Périodes d'accès payant par enfant ─────────────────────────────────────
-- Source de vérité de l'accès mensuel. Une ligne = une période achetée (famille,
-- parrain, ou octroi admin). L'accès effectif d'un enfant = la période la plus récente.
-- Le 1er profil (plancher) et les slots grand-pérés n'ont PAS de période : ils sont
-- gratuits/permanents par construction (position ≤ plancher + extra_profile_slots).
CREATE TABLE IF NOT EXISTS public.child_access_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'family' CHECK (source IN ('family', 'sponsor', 'admin_grant')),
  token_id uuid REFERENCES public.sponsorship_tokens(id) ON DELETE SET NULL,
  amount_xof numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- Accès service-role/admin uniquement : jamais lisible par un client (même principe
-- que sponsorship_tokens et campaigns — cf. 20260725100000, aucune policy posée).
ALTER TABLE public.child_access_periods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS child_access_periods_child_id_idx
  ON public.child_access_periods(child_id);
CREATE INDEX IF NOT EXISTS child_access_periods_ends_at_idx
  ON public.child_access_periods(ends_at);

-- ── 2. Parrainage : durée en mois ─────────────────────────────────────────────
-- Le code vaut désormais N mois (choix du parrain, 1-6) ; le prix suit le barème
-- famille (pricing.ts). months_count remplace la durée implicite "1 saison de 3 mois".
ALTER TABLE public.sponsorship_tokens ADD COLUMN IF NOT EXISTS months_count integer NOT NULL DEFAULT 3;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsorship_tokens_months_count_check') THEN
    ALTER TABLE public.sponsorship_tokens
      ADD CONSTRAINT sponsorship_tokens_months_count_check CHECK (months_count >= 1 AND months_count <= 12);
  END IF;
END
$migration$;

-- ── 3. Quota de création : +1 profil "en cours de mise en paiement" ───────────
-- Sans ce +1, aucun enfant mensuel ne pourrait JAMAIS être créé : le trigger
-- check_child_profile_quota bloquait la création au-delà de plancher + slots, alors
-- que le modèle mensuel exige de créer l'enfant PUIS de payer/activer son accès.
-- Nouvelle règle : autoriser jusqu'à plancher + extra_slots + 1 profil — le "+1" est
-- l'enfant mensuel qu'on vient de créer et dont la première période est en cours de
-- paiement (WhatsApp → confirmation admin). Un seul enfant non payé à la fois : pas
-- de thésaurisation de profils, et l'accès reste borné par les périodes.
--
-- L'accès de cet enfant "en cours de paiement" est EXPIRED tant qu'aucune période
-- n'existe : la génération de défis est bloquée côté applicatif (getChildAccessStatus),
-- le portfolio reste visible, une bannière invite au paiement.
CREATE OR REPLACE FUNCTION public.check_child_profile_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $migration$
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

  -- +1 : l'enfant mensuel en cours de première mise en paiement (voir en-tête).
  quota := base_floor + COALESCE(extra_slots, 0) + 1;

  -- Palier éducateur vouché inchangé (20260730100000).
  IF is_vouched_educator THEN
    quota := GREATEST(quota, 10);
  END IF;

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$migration$;

-- Note : check_supervisor_quota (superviseurs) n'est PAS touché — le quota de
-- supervision reste plancher + extra_supervisors_quota, hors périmètre de ce chantier.

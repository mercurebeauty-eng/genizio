-- Retour au modèle "1 profil gratuit + slots payants" (2026-08-03) — inverse le pivot du
-- 2026-07-22 (update_child_profile_quota_flat_limit.sql : 5 gratuits pour tous, monétisation
-- déplacée vers les Saisons). La Saison devient incluse automatiquement (migration voisine
-- 20260803110000), le slot de profil redevient le seul palier payant côté famille.
--
-- Grand-père : tout compte (ou campagne) créé AVANT le cutover garde son plancher de 5. Rien
-- n'est rétroactif de toute façon — ces deux fonctions sont des BEFORE INSERT, elles ne gatent
-- que la création d'une NOUVELLE ligne, jamais celles déjà en base.
--
-- Cutover choisi au 2026-08-04T00:00:00Z : postérieur au compte le plus récent en base au
-- moment d'écrire cette migration (2026-07-24), donc les comptes existants sont tous
-- grand-pérés sans zone grise. Doit rester identique à FREE_FLOOR_CUTOVER dans
-- src/lib/child-profile-quota.ts (pas de source commune SQL↔TS dans ce projet).

-- ── Quota de profils enfants ────────────────────────────────────────────────
-- CREATE OR REPLACE, comme lors du dernier changement de cette fonction
-- (20260730100000_campaign_educators_and_elevated_quota.sql) — le REVOKE EXECUTE posé par
-- 20260717160000_enforce_child_profile_quota.sql reste donc en vigueur, inutile de le rejouer.
--
-- GREATEST(5, 2 + extra_slots) remplacé par une forme strictement additive. Ce GREATEST
-- protégeait les tout premiers acheteurs de slots (17→22 juillet) et n'était sans danger que
-- parce que extra_profile_slots était gelé depuis la suppression de grantProfileSlot. Un outil
-- d'octroi admin étant reconstruit dans le même chantier, il redeviendrait un piège réel : un
-- compte grand-pèré déjà à 5 pourrait acheter 1, 2 ou 3 slots sans que son plafond bouge d'un
-- pouce (2 + 3 = 5, toujours ≤ 5) — jusqu'à trois paiements pour rien. La forme additive ne
-- rend jamais MOINS que l'ancienne à personne : 5 + extra ≥ GREATEST(5, 2 + extra) ∀ extra ≥ 0.
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

  -- Palier éducateur vouché inchangé (20260730100000) : un éducateur activement vouché par une
  -- campagne gère jusqu'à 10 profils, quel que soit son plancher de départ.
  IF is_vouched_educator THEN
    quota := GREATEST(quota, 10);
  END IF;

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- ── Quota de supervision ────────────────────────────────────────────────────
-- Même bascule 5 → 1, même cutover. Version précédente : 20260726120000_b2b_campaigns_schema.sql
-- (lignes 68-98), déjà purement additive — pas de GREATEST à défaire ici.
--
-- Nouveau : le chemin SANS campagne (assignation admin directe) n'avait aucune référence de
-- date à consulter. Il se grand-père désormais sur le compte du superviseur lui-même, par
-- symétrie avec check_child_profile_quota.
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

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de supervision atteint (% / % enfants pour ce superviseur).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Jamais posé sur cette fonction, contrairement à check_child_profile_quota et
-- check_campaign_educator_capacity. Risque réel faible (une fonction RETURNS TRIGGER n'est pas
-- appelable directement), mais aligné par hygiène tant qu'on la remplace.
REVOKE EXECUTE ON FUNCTION public.check_supervisor_quota() FROM PUBLIC, anon, authenticated;

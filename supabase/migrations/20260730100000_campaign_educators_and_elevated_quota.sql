-- Éducateurs vouchés par une campagne (2026-07-30, cf. discussion produit) — calqué sur
-- public.supervisors : même forme, même principe de non-suppression (removed_at plutôt
-- qu'un DELETE, pour garder un historique de qui a été vouché/retiré et quand).
--
-- L'auto-déclaration seule (relationship_type = 'educateur' dans user_metadata) ne débloque
-- jamais rien : il faut en plus apparaître ici, ajouté explicitement par un gestionnaire de
-- campagne ou un admin. C'est cette double condition qui empêche l'abus du quota élevé.
CREATE TABLE public.campaign_educators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  educator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE(campaign_id, educator_user_id)
);

ALTER TABLE public.campaign_educators ENABLE ROW LEVEL SECURITY;

-- Comme pour supervisors : tous les écrits passent par le client service-role (fonctions
-- serveur), donc uniquement une politique de lecture pour que l'éducateur voie son propre
-- statut de vouching.
CREATE POLICY "Educators can read their own assignments" ON public.campaign_educators
  FOR SELECT USING (auth.uid() = educator_user_id);

-- Capacité éducateurs par campagne — mirroir exact de check_supervisor_quota (b2b_campaigns_schema.sql).
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_educators int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.check_campaign_educator_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  capacity integer;
BEGIN
  SELECT max_educators INTO capacity FROM public.campaigns WHERE id = NEW.campaign_id;
  SELECT count(*) INTO current_count FROM public.campaign_educators
    WHERE campaign_id = NEW.campaign_id AND removed_at IS NULL;
  IF current_count >= COALESCE(capacity, 0) THEN
    RAISE EXCEPTION 'Capacité éducateurs de la campagne atteinte (% / %).', current_count, capacity USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_campaign_educator_capacity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_check_campaign_educator_capacity
  BEFORE INSERT ON public.campaign_educators
  FOR EACH ROW
  EXECUTE FUNCTION public.check_campaign_educator_capacity();

-- Quota d'enfants élevé pour un éducateur activement vouché (sur n'importe quelle campagne) —
-- CREATE OR REPLACE de la fonction existante (update_child_profile_quota_flat_limit.sql),
-- même niveau d'intervention que son dernier changement, pas une réécriture. Quota par compte
-- éducateur total (pas par campagne), même logique que check_supervisor_quota déjà en place.
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
  quota integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.child_profiles WHERE user_id = NEW.user_id;
  SELECT COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0) INTO extra_slots
    FROM auth.users WHERE id = NEW.user_id;
  SELECT EXISTS(
    SELECT 1 FROM public.campaign_educators
    WHERE educator_user_id = NEW.user_id AND removed_at IS NULL
  ) INTO is_vouched_educator;

  quota := GREATEST(5, 2 + COALESCE(extra_slots, 0));
  IF is_vouched_educator THEN
    quota := GREATEST(quota, 10);
  END IF;

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Lien + QR d'inscription par campagne (2026-07-27) : un partenaire ONG va bientôt pouvoir
-- partager un lien/QR directement rattaché à sa campagne, sans code alphanumérique pré-généré
-- (generateCampaignTokensAdmin reste utilisé pour le parrainage individuel diaspora, mais plus
-- comme unique porte d'entrée B2B). Ce nouveau chemin insère directement dans
-- season_enrollments, SANS passer par sponsorship_tokens — donc sans jamais traverser la garde
-- applicative posée dans generateCampaignTokensAdmin (campagnes.functions.ts) qui compare le lot
-- demandé à campaigns.target_count.
--
-- Même classe de bug que check_supervisor_quota (migration 20260726120000) : une règle métier
-- vérifiée sur un seul chemin applicatif est fragile dès qu'un deuxième chemin d'écriture existe.
-- Ici l'enjeu est directement financier (une ONG paie pour N places) — la limite doit donc être
-- vraie en base, pas seulement dans le code qui génère des tokens.
CREATE OR REPLACE FUNCTION public.check_campaign_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  capacity integer;
BEGIN
  IF NEW.campaign_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT target_count INTO capacity
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  -- Campagne introuvable (FK déjà censée l'empêcher) : ne bloque pas ici, la contrainte de clé
  -- étrangère sur season_enrollments.campaign_id est l'autorité pour ce cas.
  IF capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_count
  FROM public.season_enrollments
  WHERE campaign_id = NEW.campaign_id;

  IF current_count >= capacity THEN
    RAISE EXCEPTION 'Capacité de la campagne atteinte (% / % places).', current_count, capacity
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_campaign_capacity ON public.season_enrollments;
CREATE TRIGGER trg_check_campaign_capacity
  BEFORE INSERT ON public.season_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.check_campaign_capacity();

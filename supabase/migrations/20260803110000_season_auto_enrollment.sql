-- La Saison devient incluse automatiquement avec chaque profil enfant (2026-08-03) — remplace
-- le palier payant séparé (10 000 FCFA/enfant, WhatsApp → activation manuelle). Le mécanisme de
-- Saison lui-même (thème injecté dans la génération IA, badge "En cours", certificat, fenêtre
-- roulante de 3 mois) reste inchangé : seul le péage autour disparaît.
--
-- Élargit payment_status pour distinguer "inclus gratuitement avec le profil" d'un ancien achat
-- réel ('completed') ou d'un octroi admin ('admin_granted') — changement additif (Expand),
-- jamais lu pour du gating nulle part dans le code (vérifié), donc sans risque de régression.
ALTER TABLE public.season_enrollments DROP CONSTRAINT IF EXISTS season_enrollments_payment_status_check;
ALTER TABLE public.season_enrollments ADD CONSTRAINT season_enrollments_payment_status_check
  CHECK (payment_status IN ('pending', 'completed', 'sponsored', 'refunded', 'admin_granted', 'included'));

-- Trigger AFTER INSERT plutôt qu'un appel client supplémentaire : la seule création de
-- child_profiles passe par un insert client direct (ProfileDialog.tsx, via le client Supabase
-- standard), et l'audit de sécurité du 2026-07-22 a délibérément retiré la seule policy INSERT
-- qui existait sur season_enrollments côté client (aucun chemin légitime ne l'utilisait à
-- l'époque — principe du moindre privilège, cf. 20260725100000_create_seasons_and_sponsorships.sql
-- lignes 17-20). Rouvrir cette policy irait à l'encontre de cet audit. Precedent exact déjà dans
-- ce repo pour ce genre d'effet de bord : log_interest_observation() / AFTER INSERT ON
-- child_profiles (20260720100000_add_observation_events.sql).
CREATE OR REPLACE FUNCTION public.auto_enroll_new_child_in_active_season()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_season_id uuid;
BEGIN
  -- Même ordre de résolution que getActiveSeason() (seasons.functions.ts), traduit en SQL :
  -- la saison 'active' d'abord, sinon la plus proche 'upcoming', sinon la plus récente peu
  -- importe son statut — pour qu'un profil ne soit jamais bloqué par un état inattendu de la
  -- table seasons (aucune ligne, ou toutes archivées).
  SELECT id INTO target_season_id FROM public.seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
  IF target_season_id IS NULL THEN
    SELECT id INTO target_season_id FROM public.seasons WHERE status = 'upcoming'
      ORDER BY start_date ASC, created_at ASC LIMIT 1;
  END IF;
  IF target_season_id IS NULL THEN
    SELECT id INTO target_season_id FROM public.seasons ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF target_season_id IS NOT NULL THEN
    INSERT INTO public.season_enrollments (season_id, child_id, user_id, payment_status)
    VALUES (target_season_id, NEW.id, NEW.user_id, 'included');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_enroll_new_child_in_active_season() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_child_profiles_auto_enroll_season
  AFTER INSERT ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_new_child_in_active_season();

-- Backfill : tout profil existant sans AUCUNE ligne season_enrollments en reçoit une. Sans quoi
-- seuls les nouveaux profils créés après cette migration bénéficieraient de l'inclusion —
-- exactement le contraire de l'intention (tout le monde inclus, pas seulement les nouveaux
-- arrivants). enrolled_at = now(), PAS child_profiles.created_at : la fenêtre roulante se
-- calcule comme enrolled_at + duration_months (resolveEnrollmentWindow) — backfiller avec la
-- date de création du profil donnerait une fenêtre déjà expirée à tout compte plus vieux qu'une
-- durée de saison, ce qui viderait cette migration de son effet pour les comptes les plus
-- anciens, précisément ceux pour qui ce chantier a le plus de valeur.
WITH target_season AS (
  SELECT id FROM public.seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.season_enrollments (season_id, child_id, user_id, payment_status, enrolled_at)
SELECT (SELECT id FROM target_season), cp.id, cp.user_id, 'included', now()
FROM public.child_profiles cp
WHERE NOT EXISTS (SELECT 1 FROM public.season_enrollments se WHERE se.child_id = cp.id)
  AND EXISTS (SELECT 1 FROM target_season);

-- Vague 4 batch 4 du plan multicouche (2026-08-15) — voir docs/memoire/genizio_plan_multicouche.md.
--
-- compute_progression_health() : RPC SECURITY DEFINER qui agrège en SQL la « Santé de
-- la Progression par Domaine » (décision #43) — au lieu de ramener TOUS les défis
-- académiques complétés (et tous les défis périmés) en mémoire à chaque visite de
-- l'onglet Naya/Progression.
--
-- Sémantique identique aux fonctions pures existantes (getProgressionHealthAdmin) :
--   • complétés : challenges status='completed', non soft-supprimés, avec domaine et
--     completed_at — count par domaine + durée moyenne (jours) arrondie à 1 décimale ;
--   • périmés (stale) : challenges status IN ('todo','in_progress'), non soft-supprimés,
--     avec domaine, créés il y a PLUS de 14 jours (même seuil que STALE_DOMAIN_CUTOFF).
-- La jointure « domaine → libellé » et le filtrage des domaines sans donnée restent côté
-- application (ACADEMIC_DOMAINS / ACADEMIC_DOMAIN_LABELS, source unique).
--
-- ⚠️ NON APPLIQUÉE en prod avant revue (convention du repo).

CREATE OR REPLACE FUNCTION public.compute_progression_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '14 days';
  v_completed jsonb;
  v_stale jsonb;
BEGIN
  -- Défis complétés par domaine : count + durée moyenne (jours, bornée à 0 par défi —
  -- même règle que Math.max(0, days) côté application), arrondie à 1 décimale.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'domain', domain,
    'completedCount', completed_count,
    'avgDaysToCompletion', avg_days
  )), '[]'::jsonb) INTO v_completed
  FROM (
    SELECT
      academic_domain AS domain,
      count(*) AS completed_count,
      round(avg(GREATEST(0, EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400.0))::numeric, 1) AS avg_days
    FROM public.challenges
    WHERE status = 'completed'
      AND deleted_at IS NULL
      AND academic_domain IS NOT NULL
      AND completed_at IS NOT NULL
    GROUP BY academic_domain
  ) t;

  -- Défis périmés par domaine : commencés (todo/in_progress) depuis plus de 14 jours.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'domain', domain,
    'staleCount', stale_count
  )), '[]'::jsonb) INTO v_stale
  FROM (
    SELECT
      academic_domain AS domain,
      count(*) AS stale_count
    FROM public.challenges
    WHERE status IN ('todo', 'in_progress')
      AND deleted_at IS NULL
      AND academic_domain IS NOT NULL
      AND created_at < v_cutoff
    GROUP BY academic_domain
  ) t;

  RETURN jsonb_build_object('completed', v_completed, 'stale', v_stale);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_progression_health() FROM PUBLIC, anon, authenticated;

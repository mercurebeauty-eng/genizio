-- Cycle de vie complet des Saisons (2026-07-26) : ajout/suppression/modification, activation via
-- toggle, et rotation automatique quand la saison active arrive à expiration.
--
-- Contexte : jusqu'ici, "activer" une saison depuis l'Admin OS (updateSeasonStatusAdmin) ne
-- désactivait pas les autres — rien n'empêchait deux lignes `status = 'active'` en même temps.
-- getActiveSeason() prenait juste la plus récente par created_at, masquant silencieusement le
-- conflit. Nécessaire avant d'ajouter une rotation automatique, sinon la rotation pourrait
-- laisser 2 saisons actives simultanément selon l'ordre des opérations.
--
-- IMPORTANT (décision utilisateur 2026-07-26) : l'accès individuel d'un enfant déjà inscrit
-- (season_enrollments.created_at + seasons.duration_months, modèle "Rolling" Option B, décision
-- #48) ne doit JAMAIS être cassé rétroactivement par cette rotation globale. Cette migration ne
-- touche donc que le statut de la saison "catalogue/thème", jamais season_enrollments — le calcul
-- d'accès individuel est corrigé séparément côté application (seasons.functions.ts,
-- challenges.functions.ts) pour ne plus jamais comparer season_id à "la saison active du moment".

-- 1. Au plus une saison 'active' à la fois. Index partiel unique : toutes les lignes indexées
--    portent la même valeur ('active'), donc au plus une ligne peut satisfaire le filtre.
DROP INDEX IF EXISTS public.seasons_single_active_idx;
CREATE UNIQUE INDEX seasons_single_active_idx ON public.seasons (status) WHERE status = 'active';

-- 2. Activation atomique : désactive l'ancienne (-> 'completed', jamais un simple statut perdu)
--    puis active la cible, dans la même transaction — pour ne jamais violer l'index ci-dessus
--    et pour que "toggle" se comporte comme une vraie bascule plutôt que deux updates séparés
--    côté client qui pourraient échouer à mi-chemin.
CREATE OR REPLACE FUNCTION public.activate_season(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.seasons
  SET status = 'completed'
  WHERE status = 'active' AND id <> target_id;

  UPDATE public.seasons
  SET status = 'active'
  WHERE id = target_id;
END;
$$;

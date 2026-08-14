-- Refonte Gestion des Superviseurs (2026-08-14) : index de volume.
--
-- La table `supervisors` n'avait AUCUN index hors sa PK : chaque requête d'assignation
-- (check_supervisor_quota, listSupervisorsAdmin, getSupervisorDashboard, détection de
-- statut dans /profile) filtrait par supervisor_user_id ou par campaign_id en scan
-- séquentiel. Acceptable à petite échelle, mais la table est une ligne par ASSIGNATION
-- (1 superviseur × N enfants) — exactement le volume qui explose quand Génizio grandit.
--
-- Deux index de couverture, idempotents :
--   • supervisor_user_id : requêtes « les enfants de ce superviseur » (dashboard, quota,
--     détection de statut) ;
--   • campaign_id : requêtes « les superviseurs de cette campagne » (dashboard ONG,
--     filtre de la nouvelle liste admin, check_supervisor_quota).
CREATE INDEX IF NOT EXISTS supervisors_supervisor_user_id_idx
  ON public.supervisors(supervisor_user_id);

CREATE INDEX IF NOT EXISTS supervisors_campaign_id_idx
  ON public.supervisors(campaign_id);

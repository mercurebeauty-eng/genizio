-- Garantit qu'un enfant n'a jamais plus d'un superviseur à la fois.
--
-- Jusqu'ici, seule la paire (superviseur, enfant) était unique (supervisors_supervisor_user_id_
-- child_profile_id_key) : ça empêchait le MÊME superviseur d'être assigné deux fois au même
-- enfant, mais rien n'empêchait un DEUXIÈME superviseur différent d'être assigné en plus. Le
-- chemin B2B (assignCampaignSupervisor) filtre déjà les enfants "non supervisés" côté
-- application avant de proposer une assignation, mais c'est une convention de CE chemin, pas
-- une garantie du système — le chemin admin manuel (assignSupervisor) n'appliquait aucun filtre
-- équivalent. Décision utilisateur (2026-07-26) : "un seul superviseur par enfant" est une
-- règle du système, pas d'un seul chemin — elle doit donc vivre en base, pas dans un seul
-- appelant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisors_supervisor_user_id_child_profile_id_key'
      AND conrelid = 'public.supervisors'::regclass
  ) THEN
    ALTER TABLE public.supervisors DROP CONSTRAINT supervisors_supervisor_user_id_child_profile_id_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisors_child_profile_id_key'
      AND conrelid = 'public.supervisors'::regclass
  ) THEN
    ALTER TABLE public.supervisors ADD CONSTRAINT supervisors_child_profile_id_key UNIQUE (child_profile_id);
  END IF;
END $$;

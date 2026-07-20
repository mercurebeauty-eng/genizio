-- Génizio — colonne de contexte pour le nouveau déclencheur Phase 3 (cf. genizio-decisions #38)
--
-- L'ancien anomaly_trigger_id (supprimé en décision #37) permettait de retrouver la matière
-- concernée en remontant jusqu'à la note scolaire. Le nouveau déclencheur (écart au
-- référentiel académique) n'a plus cette chaîne — on stocke directement le domaine
-- académique concerné sur le cycle lui-même, plus simple que l'ancienne indirection à 2
-- tables, et sert aussi à éviter d'ouvrir deux cycles simultanés sur le même domaine.

ALTER TABLE public.hypothesis_cycles
  ADD COLUMN trigger_domain text;

ALTER TABLE public.hypothesis_cycles
  ADD CONSTRAINT hypothesis_cycles_trigger_domain_check
    CHECK (trigger_domain IS NULL OR trigger_domain IN ('mathematiques', 'langage', 'sciences'));

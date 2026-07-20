-- Génizio — suppression complète des notes scolaires comme signal système
-- (cf. docs/memoire/genizio_decisions.md, décision #37)
--
-- Décision de l'utilisateur : une note scolaire n'a aucun référentiel stable pour être
-- interprétée (l'enfant change de classe/école/pays d'une année à l'autre, le système ne
-- connaît aucun programme scolaire), donc ce n'est pas un signal fiable pour piloter le
-- moteur de diagnostic. Remplacé par un référentiel académique interne par domaine x
-- tranche d'âge (à venir, une fois le premier jet validé — cf. genizio_referentiel_academique.md).
--
-- Zéro ligne dans school_grades/anomaly_triggers/hypothesis_cycles au moment de cette
-- migration (vérifié en direct) : suppression sans perte de données réelle.

-- hypothesis_cycles.anomaly_trigger_id référence anomaly_triggers en NOT NULL — doit être
-- retirée avant de pouvoir supprimer la table référencée. Le reste de hypothesis_cycles
-- (hypotheses, status, current/prior_probability, parent_narrative, final_diagnosis) n'est
-- pas spécifique aux notes et reste en place : Phase 3a redémarrera sur ce même schéma une
-- fois le nouveau déclencheur (écart au référentiel académique) construit.
ALTER TABLE public.hypothesis_cycles DROP COLUMN anomaly_trigger_id;

DROP TABLE public.anomaly_triggers;
DROP TABLE public.school_grades;
DROP FUNCTION IF EXISTS public.detect_grade_anomaly();

-- Étape 3 — "classer automatiquement le commentaire du parent" (brainstorm produit,
-- 2026-08-02). Stocke la cause détectée par l'IA à partir de not_completed_reason
-- (même vocabulaire que hypothesis_cycles.hypotheses[].cause, sans READY_FOR_MORE qui
-- ne s'applique qu'à un écart "en avance"). Colonne texte libre, sans contrainte DB,
-- cohérent avec hypothesis_cycles.status/final_diagnosis qui ne sont pas non plus
-- des enums Postgres — la validation du vocabulaire se fait côté application.

ALTER TABLE public.challenges
  ADD COLUMN not_completed_cause text;

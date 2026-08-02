-- Étape 2 — "un vrai statut non réussi" (brainstorm produit, 2026-08-02).
-- Jusqu'ici, challenge_status n'avait que todo/in_progress/completed : aucun moyen
-- d'enregistrer qu'un défi a été tenté puis n'a pas pu être terminé, distinct d'un
-- défi simplement laissé de côté (todo/in_progress). N'ajoute qu'une valeur et deux
-- colonnes, ne touche à aucune valeur ni comportement existant.

ALTER TYPE public.challenge_status ADD VALUE 'not_completed';

ALTER TABLE public.challenges
  ADD COLUMN not_completed_reason text,
  ADD COLUMN not_completed_at timestamptz;

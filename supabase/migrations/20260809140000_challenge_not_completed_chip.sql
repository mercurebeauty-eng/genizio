-- Reframe de l'abandon (2026-08-09, Décision #58 complémentaire) : le défi non
-- réussi peut désormais porter un chip de raison structuré (même vocabulaire que
-- challenge_outcomes pour la suppression) en plus de la note libre. Le chip est un
-- signal exploitable directement par le Loup et la classification, sans IA.
alter table public.challenges
  add column if not exists not_completed_reason_chip text;

alter table public.challenges
  add constraint challenges_not_completed_reason_chip_check
  check (
    not_completed_reason_chip is null
    or not_completed_reason_chip in ('pas_le_bon_moment', 'deja_fait_autrement', 'pas_interesse', 'doublon')
  );

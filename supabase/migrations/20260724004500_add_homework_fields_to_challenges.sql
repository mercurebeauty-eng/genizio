-- Génizio — ajout des champs de soutien scolaire / devoirs à la maison sur la table challenges
-- (cf. feat/naya-academic-homework-fusion)

ALTER TABLE public.challenges
  ADD COLUMN academic_subject text,
  ADD COLUMN academic_grade_level text,
  ADD COLUMN homework_instruction text,
  ADD COLUMN behavioral_driver text,
  ADD COLUMN zpa_level integer;

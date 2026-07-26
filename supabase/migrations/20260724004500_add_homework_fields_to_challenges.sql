-- Génizio — ajout des champs de soutien scolaire / devoirs à la maison sur la table challenges
-- (cf. feat/naya-academic-homework-fusion)
--
-- Corrigé avant application propre (audit du 2026-07-22) : contrainte CHECK ajoutée sur les 3
-- champs à valeurs fermées, cohérent avec le pattern déjà établi sur ce projet pour tout champ
-- texte "enum-like" généré par l'IA (academic_domain, trait_subform) — ne jamais faire
-- confiance à la seule auto-discipline du modèle, même au niveau base de données.
--
-- Rendu idempotent : une première tentative de `supabase db push` a échoué sur "column
-- academic_subject already exists" alors que `supabase migration list` indiquait cette
-- migration comme non appliquée — le suivi local a divergé de l'état réel de la base à un
-- moment donné (cause exacte non déterminée). IF NOT EXISTS / DROP CONSTRAINT IF EXISTS avant
-- ADD CONSTRAINT pour que ce fichier s'applique proprement quel que soit l'état de départ.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS academic_subject text,
  ADD COLUMN IF NOT EXISTS academic_grade_level text,
  ADD COLUMN IF NOT EXISTS homework_instruction text,
  ADD COLUMN IF NOT EXISTS behavioral_driver text,
  ADD COLUMN IF NOT EXISTS zpa_level integer;

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_academic_subject_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_academic_subject_check
  CHECK (academic_subject IS NULL OR academic_subject IN ('maths', 'francais', 'sciences', 'histoire_geo', 'anglais'));

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_academic_grade_level_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_academic_grade_level_check
  CHECK (academic_grade_level IS NULL OR academic_grade_level IN ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6eme', '5eme', '4eme', '3eme'));

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_behavioral_driver_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_behavioral_driver_check
  CHECK (behavioral_driver IS NULL OR behavioral_driver IN ('deconstruire', 'schematiser', 'simuler', 'enqueter', 'optimiser'));

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_zpa_level_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_zpa_level_check
  CHECK (zpa_level IS NULL OR (zpa_level BETWEEN 1 AND 5));

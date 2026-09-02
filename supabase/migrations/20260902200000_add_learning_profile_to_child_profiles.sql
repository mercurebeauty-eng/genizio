-- Migration: Ajout du profil d'apprentissage sur child_profiles
-- Permet de capturer les dimensions comportementales observées par le parent
-- (rapport au défi, mode d'apprentissage, rapport à l'erreur, préférence collaborative)

ALTER TABLE child_profiles
  ADD COLUMN IF NOT EXISTS learning_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN child_profiles.learning_profile IS
  'Profil d''apprentissage déclaré par le parent (challenge_rapport, learning_mode, error_rapport, collab_preference) — données comportementales fiables pour calibrer Naya.';

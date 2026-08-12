-- Moteur d'aspirations + défis-projets (2026-08-12, analyse « Évolution de Génizio »
-- §10-16, §27-28, §40 — chantier Naya V4).
--
--   • challenges.kind : un défi n'est pas qu'un exercice — il peut être une
--     micro-activité d'entraînement ou un véritable PROJET (construire, concevoir,
--     rechercher, planifier, expérimenter → résultat observable, analyse §27).
--   • challenges.guidance_level (1-5) : niveau de guidage — plus l'enfant progresse
--     dans un domaine, moins le système fait le travail à sa place (analyse §28).
--     Le retrait progressif est calculé côté applicatif (resolveGuidanceLevel).
--   • challenges.aspiration_label : marqueur lisible d'un défi-pont — le défi est
--     scénarisé dans l'univers de l'aspiration déclarée mais cible les compétences
--     mappées (ex. menuiserie → mesurer, compter, proportions) ; l'aspiration reste
--     une HYPOTHÈSE testée par l'expérience, jamais un verdict (analyse §10-16).

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'micro'
    CHECK (kind IN ('micro', 'projet')),
  ADD COLUMN IF NOT EXISTS guidance_level integer NOT NULL DEFAULT 3
    CHECK (guidance_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS aspiration_label text;

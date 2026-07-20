-- Génizio — mode de preuve déclaratif pour les défis comptables/chronométrés/live
-- (cf. docs/memoire/genizio_decisions.md, décision #35)
--
-- Une seule photo ne peut pas prouver un comptage ("20 jongles") ni une durée
-- ("10 min de course") — ce n'est pas un problème de qualité du modèle de vision,
-- c'est une limite structurelle du format de preuve. Pour ce type de défi, on
-- retire le jugement IA à la soumission et on fait confiance à la déclaration
-- du parent/superviseur, comparée strictement à une cible fixée à la génération
-- du défi (cf. submitDeclarativeProof, challenges.functions.ts).
--
-- proof_mode est NOT NULL DEFAULT 'photo' : tous les défis existants et tout
-- défi futur qui ne précise rien restent exactement sur le comportement
-- actuel (photo + jugement IA à la validation) — aucune régression silencieuse.

ALTER TABLE public.challenges
  ADD COLUMN proof_mode text NOT NULL DEFAULT 'photo',
  ADD COLUMN proof_target jsonb,
  ADD COLUMN declarative_award jsonb;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_proof_mode_check CHECK (proof_mode IN ('photo', 'declarative'));

-- Chantier « Deuxième colonne vertébrale » (2026-08-15) — deux briques qui
-- s'ajoutent PAR-DESSUS le moteur existant, sans rien remplacer :
--
--   1. challenges.child_question : la question que l'enfant formule lui-même
--      (« pourquoi cette aile est-elle courbée ? »). Stockée sur le défi, elle
--      est réinjectée comme contrainte dans les prompts de génération suivants
--      (buildChallengePrompt / buildSingleChallengePrompt) — l'enfant devient
--      l'auteur de la question, pas le spectateur. Champ optionnel : la
--      génération automatique par intérêts reste le défaut.
--
--   2. challenges.naya_hint : l'indice « juste-à-temps » généré quand l'enfant
--      bute pendant le défi (bouton « Naya, je suis bloqué·e »). Livre le
--      concept minimal qui débloque l'étape, jamais la solution. L'indice
--      s'insère AVANT la reformulation de modalité existante (modalities) —
--      celle-ci reste le filet final, aucun downgrade.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS child_question text,
  ADD COLUMN IF NOT EXISTS naya_hint text;

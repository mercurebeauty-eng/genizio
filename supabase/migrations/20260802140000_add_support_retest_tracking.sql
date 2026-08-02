-- Étape 4 — "faire redescendre le soutien renforcé, pas rester figé" (brainstorm produit,
-- 2026-08-02). Quand un cycle d'hypothèses se résout sur une cause qui justifie un
-- accompagnement renforcé (ex: anxiété confirmée), le soutien reste actif un moment
-- (5 défis réussis dans ce domaine, décision utilisateur) puis un défi de retest, sans
-- accommodation, vérifie s'il est encore nécessaire. support_checkpoint_at marque le
-- point de départ du comptage (résolution initiale, ou dernier retest tenté).

ALTER TABLE public.hypothesis_cycles
  ADD COLUMN support_active boolean,
  ADD COLUMN support_checkpoint_at timestamptz;

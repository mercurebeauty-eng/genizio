-- NAYA 2.0 Phase 3b — correctif : colonne updated_at manquante sur hypothesis_cycles
-- (cf. docs/memoire/genizio_decisions.md, décision #34)
--
-- processDiscriminantResult (Phase 3b, boucle bayésienne) écrit `updated_at` à chaque mise
-- à jour de probabilité — colonne absente du schéma créé en Phase 3a/4, jamais ajoutée.
-- Confirmé en direct sur la base réelle avant ce correctif :
--   PGRST204 "Could not find the 'updated_at' column of 'hypothesis_cycles' in the schema cache"
-- Conséquence : CHAQUE mise à jour bayésienne échouait silencieusement (l'erreur du .update()
-- n'était jamais vérifiée côté application) — la probabilité ne changeait jamais réellement en
-- base, quel que soit le nombre de défis discriminants complétés. Choix du correctif : ajouter
-- la colonne (cohérent avec le reste du schéma — challenges/products/orders ont tous un
-- updated_at) plutôt que réécrire le code déjà écrit pour ne plus l'utiliser.

ALTER TABLE public.hypothesis_cycles
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

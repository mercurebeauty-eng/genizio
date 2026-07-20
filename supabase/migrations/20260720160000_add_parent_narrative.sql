-- NAYA 2.0 Phase 4 — restitution parent ("Compréhension de Naya")
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md §6, décision #33)
--
-- Le cycle d'hypothèses (Phase 3a) contient des chiffres bruts (0.85, z=-10, probabilités) et
-- des étiquettes cliniques (METHOD_MISMATCH) dans hypotheses/rationale/evidence_log — utiles en
-- interne, mais leur exposition directe au parent violerait la règle non-négociable "jamais de
-- probabilité brute" (§1 du plan). parent_narrative stocke la traduction en langage humain,
-- chaleureux, provisoire — c'est la SEULE colonne que l'UI parent doit jamais lire sur cette
-- table. Nullable : peut rester vide un court instant si la narration échoue après le
-- raisonnement (résilience gérée côté serveur, pas ici).

ALTER TABLE public.hypothesis_cycles ADD COLUMN parent_narrative text;

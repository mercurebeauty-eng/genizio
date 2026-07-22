-- Génizio — sous-formes de talent, pilote sur "corporelle" (V1 du chantier "orientation fine",
-- cf. discussion produit du 2026-07-22 à documenter en décision #40).
--
-- Constat : savoir qu'un enfant est fort en "corporelle" ne dit rien de la discipline où ce
-- potentiel s'exprime le mieux (endurance ≠ explosivité ≠ coordination). Plutôt que de deviner
-- une discipline précise (basket/foot/tennis) à partir de données de défis à domicile — ce que
-- l'app ne peut structurellement pas mesurer de façon fiable (pas de vidéo/capteurs, contrairement
-- aux outils de scouting sportif type aiScout) — on tague la SOUS-FORME sollicitée par chaque
-- défi complété, et on laisse l'agrégat se construire dans le temps. Nullable, sans défaut : la
-- grande majorité des défis (hors corporelle) n'ont simplement pas ce signal.
--
-- Périmètre volontairement restreint à "corporelle" pour cette première passe (pattern à valider
-- avant extension aux 8 autres domaines) — même prudence incrémentale que le référentiel
-- académique (décision #39 : 3 domaines d'abord, extension seulement après validation).

ALTER TABLE public.challenges
  ADD COLUMN trait_subform text;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_trait_subform_check
    CHECK (trait_subform IS NULL OR trait_subform IN (
      'endurance', 'explosivite', 'coordination_fine', 'coordination_collective', 'precision'
    ));

-- Génizio — extension des sous-formes de talent (trait_subform) de "corporelle" seul aux 9
-- intelligences Gardner (cf. genizio-decisions #40, addendum du même jour). Le pilote corporelle
-- a validé le mécanisme en direct (défi "30 secondes de sauts" → trait_subform: "explosivite") ;
-- contrairement au référentiel académique (décision #39), ce contenu n'est pas une recherche
-- sourcée mais une construction raisonnable de l'agent — donc pas de raison de sourcer domaine
-- par domaine avant d'étendre, la prudence de la décision #39 ne s'applique pas ici.

ALTER TABLE public.challenges DROP CONSTRAINT challenges_trait_subform_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_trait_subform_check
  CHECK (trait_subform IS NULL OR trait_subform IN (
    -- corporelle
    'endurance', 'explosivite', 'coordination_fine', 'coordination_collective', 'precision',
    -- spatiale
    'orientation', 'visualisation_3d', 'representation_graphique', 'organisation_espace',
    -- sociale
    'leadership', 'mediation', 'collaboration', 'ecoute_empathique',
    -- entrepreneuriale
    'negociation', 'prise_de_risque', 'sens_du_client', 'gestion_ressources',
    -- creative
    'invention_visuelle', 'narration', 'improvisation', 'detournement',
    -- artisanale
    'dexterite_fine', 'assemblage', 'reparation', 'finition_esthetique',
    -- emotionnelle
    'autoregulation', 'expression', 'empathie', 'resilience',
    -- logico_mathematique
    'raisonnement_abstrait', 'calcul', 'resolution_problemes', 'reconnaissance_motifs',
    -- linguistique
    'expression_ecrite', 'expression_orale', 'argumentation', 'memorisation_lexicale'
  ));

-- Génizio — extension du référentiel académique à 8 des 9 intelligences Gardner + citation
-- traçable (cf. genizio-decisions #39, demande explicite utilisateur "faut que ça prenne en
-- compte tout"). "creative" reste volontairement absente (développement non linéaire par âge,
-- cf. docs/memoire/genizio_referentiel_academique.md §10) — ne jamais l'ajouter à ces listes
-- sans revoir le mécanisme de détection d'écart lui-même.

ALTER TABLE public.challenges DROP CONSTRAINT challenges_academic_domain_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_academic_domain_check
  CHECK (academic_domain IS NULL OR academic_domain IN (
    'mathematiques', 'langage', 'sciences',
    'corporelle', 'sociale', 'emotionnelle', 'entrepreneuriale', 'artisanale', 'spatiale'
  ));

ALTER TABLE public.hypothesis_cycles DROP CONSTRAINT hypothesis_cycles_trigger_domain_check;
ALTER TABLE public.hypothesis_cycles ADD CONSTRAINT hypothesis_cycles_trigger_domain_check
  CHECK (trigger_domain IS NULL OR trigger_domain IN (
    'mathematiques', 'langage', 'sciences',
    'corporelle', 'sociale', 'emotionnelle', 'entrepreneuriale', 'artisanale', 'spatiale'
  ));

-- Citation traçable (décision #39, item 2) : au lieu de faire confiance à un chiffre brut
-- non vérifiable, l'IA cite la ligne du référentiel sur laquelle elle s'est basée — lisible
-- et comparable au contenu réel du défi lors d'une relecture d'échantillon.
ALTER TABLE public.challenges ADD COLUMN academic_reference_note text;

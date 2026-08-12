-- Profil enfant multidimensionnel (2026-08-12, analyse « Évolution de Génizio » §6-7).
--
-- Collecte STRUCTURÉE et OPTIONNELLE, déclarée par le parent, modifiable à tout
-- moment — aucun texte libre sensible (données de mineurs) : des préréglages
-- seulement, avec consentement explicite (consent_events 'context_declared').
--
--   • school_level    : niveau scolaire déclaré (préscolaire → Terminale, non scolarisé)
--   • languages       : langues parlées à la maison
--   • ability_profile : axes de capacités/difficultés (langage, motricité, mémoire,
--                       concentration, raisonnement, logique, perception spatiale,
--                       coordination, communication, autonomie) × facile/neutre/difficulte
--   • school_relation : rapport à l'école (apprecie / neutre / conflit / non_scolarise)
--   • life_context    : contexte de parcours en PRÉRÉGLAGES (parcours_rue, ...) — pas
--                       de narration libre
--   • aspirations     : [{label, type: metier|exploration}] — la déclaration est une
--                       HYPOTHÈSE à explorer (moteur d'exploration = chantier Naya V4)
--   • is_active       : pouvoir administratif exceptionnel (activation/désactivation
--                       manuelle d'un profil par l'Admin OS — la règle commerciale ne
--                       prime jamais sur le pouvoir admin, analyse §4)

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS school_level text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ability_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS school_relation text,
  ADD COLUMN IF NOT EXISTS life_context text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS aspirations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Intégrité des préréglages : les CHECKs garantissent qu'aucun client ne peut écrire
-- du texte libre dans ces champs sensibles (les valeurs restent du vocabulaire fermé).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_profiles_school_level_check'
  ) THEN
    ALTER TABLE public.child_profiles ADD CONSTRAINT child_profiles_school_level_check
      CHECK (school_level IS NULL OR school_level IN (
        'prescolaire', 'cp1', 'cp2', 'ce1', 'ce2', 'cm1', 'cm2',
        'sixieme', 'cinquieme', 'quatrieme', 'troisieme',
        'seconde', 'premiere', 'terminale', 'non_scolarise'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_profiles_school_relation_check'
  ) THEN
    ALTER TABLE public.child_profiles ADD CONSTRAINT child_profiles_school_relation_check
      CHECK (school_relation IS NULL OR school_relation IN ('apprecie', 'neutre', 'conflit', 'non_scolarise'));
  END IF;
END $$;

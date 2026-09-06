-- Migration: triggers updated_at manquants (audit backend, vague D)
-- Date: 2026-09-06
--
-- update_updated_at_column n'était posé que sur challenges, child_profiles,
-- child_schools (+ mentor_club_sessions/child_academic_observations hier).
-- Les tables d'argent et de cycle de vie portaient updated_at maintenu À LA
-- MAIN par le code (donc faussé dès qu'un chemin oubliait le champ) ou pas de
-- colonne du tout.

-- Triggers sur les tables ayant déjà une colonne updated_at :
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payments', 'subscriptions', 'orders', 'schools', 'child_delegations',
    'products', 'educator_profiles', 'discovery_traces', 'ai_feature_usage',
    'country_materials', 'admin_naya_settings'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at'
       )
    THEN
      EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Colonnes + triggers pour les tables d'argent sans updated_at :
ALTER TABLE public.family_coverages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.sponsorship_tokens ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['family_coverages', 'campaigns', 'sponsorship_tokens']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

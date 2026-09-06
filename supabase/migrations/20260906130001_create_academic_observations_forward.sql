-- Migration: child_academic_observations — recréation forward-only
-- Date: 2026-09-06
--
-- Pourquoi : la migration source 20260905190000_academic_observations.sql a été
-- renommée en production sous une collision de version (20260905190000 portait
-- material_conquest à l'application) — la CLI considère la version appliquée et
-- ne créera JAMAIS la table sur cette instance. Cette migration est idempotente
-- (IF NOT EXISTS) : sur une instance fraîche, la source a déjà tout créé, elle
-- ne fait rien de plus.
--
-- Différence volontaire avec la source : PAS de policy SELECT USING(true) pour
-- authenticated (trou P1 de l'audit backend vague A) — la lecture passe par les
-- server functions qui vérifient le lien école/délégation.

CREATE TABLE IF NOT EXISTS public.child_academic_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  educator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  term int NOT NULL CHECK (term BETWEEN 1 AND 3),
  academic_year text NOT NULL,
  previous_average numeric(4,2) NOT NULL,
  current_average numeric(4,2) NOT NULL,
  class_average numeric(4,2),
  teacher_report_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, academic_year, term)
);

CREATE INDEX IF NOT EXISTS idx_academic_observations_child
ON public.child_academic_observations (child_id, academic_year, term);

ALTER TABLE public.child_academic_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to child_academic_observations"
ON public.child_academic_observations;
CREATE POLICY "Service role full access to child_academic_observations"
ON public.child_academic_observations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_child_academic_observations_updated_at ON public.child_academic_observations;
CREATE TRIGGER update_child_academic_observations_updated_at
  BEFORE UPDATE ON public.child_academic_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: Observations académiques neutres saisies par le professeur
-- Date: 2026-09-05
-- Alimente la "Source Neutre" du moteur d'évaluation tripartite et de garde-fous.

CREATE TABLE IF NOT EXISTS public.child_academic_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  educator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  term int NOT NULL CHECK (term BETWEEN 1 AND 3),
  academic_year text NOT NULL, -- ex: "2026-2027"
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

CREATE POLICY "Authenticated users read academic observations"
ON public.child_academic_observations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access to child_academic_observations"
ON public.child_academic_observations FOR ALL TO service_role USING (true) WITH CHECK (true);

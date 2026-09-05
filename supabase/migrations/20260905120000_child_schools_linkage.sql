-- Migration: child_schools linkage & School Impact Dashboard architecture
-- Date: 2026-09-05

CREATE TABLE IF NOT EXISTS public.child_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past')),
  academic_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_schools_single_active 
ON public.child_schools(child_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_child_schools_school_id 
ON public.child_schools(school_id, status);

ALTER TABLE public.child_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage their child schools"
ON public.child_schools FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE id = child_schools.child_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE id = child_schools.child_id AND user_id = auth.uid()
  )
);

CREATE POLICY "School leaders can read their linked children"
ON public.child_schools FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = child_schools.school_id AND leader_user_id = auth.uid()
  )
);

CREATE POLICY "Service role full access to child schools"
ON public.child_schools FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.revoke_educators_on_school_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Un changement effectif de statut révoque les délégations éducatives
  -- actives de l'enfant (les accès ne doivent pas survivre au changement).
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.child_delegations
    SET status = 'revoked'
    WHERE child_id = NEW.child_id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_revoke_educators_on_school_change
  AFTER UPDATE OF status ON public.child_schools
  FOR EACH ROW EXECUTE FUNCTION public.revoke_educators_on_school_change();

CREATE TRIGGER update_child_schools_updated_at
  BEFORE UPDATE ON public.child_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Migration : Espace Découverte — Traces d'exploration libre & calibration Naya (2026-08-25)
--
-- Capture les initiatives, démarches et traces cognitives des enfants en dehors
-- du parcours structuré habituel, et alimente le moteur d'hypothèses de calibration Naya.

CREATE TABLE IF NOT EXISTS public.discovery_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 3 Niveaux de Découverte : 'self_chosen' (Je choisis), 'found_external' (Je trouve), 'open_sandbox' (Je tente)
  source_type TEXT NOT NULL CHECK (source_type IN ('self_chosen', 'found_external', 'open_sandbox')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  
  -- Métriques cognitives & comportementales
  perceived_difficulty TEXT CHECK (perceived_difficulty IN ('facile', 'moyen', 'difficile', 'eleve')),
  attempts_count INT DEFAULT 1,
  duration_minutes INT,
  autonomy_level TEXT CHECK (autonomy_level IN ('totalement_seul', 'peu_d_aide', 'accompagne')),
  help_context TEXT,
  strategy_used TEXT,
  outcome_status TEXT NOT NULL CHECK (outcome_status IN ('fonctionnel', 'partiel', 'en_cours', 'echec_enrichissant')),
  
  -- Preuve optionnelle & Dialogue métacognitif avec Naya
  proof_image_url TEXT,
  naya_dialogue JSONB DEFAULT '[]'::jsonb,
  
  -- Analyse Naya & Hypothèse de calibration
  ai_behavioral_analysis JSONB,
  hypothesis_cycle_id UUID REFERENCES public.hypothesis_cycles(id) ON DELETE SET NULL,
  
  -- Suivi Mentor (enfants suivis)
  mentor_notes TEXT,
  mentor_reviewed_at TIMESTAMPTZ,
  mentor_user_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexation
CREATE INDEX IF NOT EXISTS discovery_traces_child_id_idx ON public.discovery_traces(child_id);
CREATE INDEX IF NOT EXISTS discovery_traces_user_id_idx ON public.discovery_traces(user_id);
CREATE INDEX IF NOT EXISTS discovery_traces_created_at_idx ON public.discovery_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS discovery_traces_source_type_idx ON public.discovery_traces(source_type);
CREATE INDEX IF NOT EXISTS discovery_traces_hypothesis_cycle_id_idx ON public.discovery_traces(hypothesis_cycle_id);

-- RLS
ALTER TABLE public.discovery_traces ENABLE ROW LEVEL SECURITY;

-- 1. Parents : CRUD sur les traces de leurs propres enfants
DROP POLICY IF EXISTS "Parents manage their children discovery traces" ON public.discovery_traces;
CREATE POLICY "Parents manage their children discovery traces"
  ON public.discovery_traces
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = discovery_traces.child_id
      AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = discovery_traces.child_id
      AND cp.user_id = auth.uid()
    )
  );

-- 2. Mentors : Lecture des traces des enfants assignés/suivis
DROP POLICY IF EXISTS "Mentors read discovery traces of assigned children" ON public.discovery_traces;
CREATE POLICY "Mentors read discovery traces of assigned children"
  ON public.discovery_traces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.child_profile_id = discovery_traces.child_id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
    )
  );

-- 3. Mentors : Mise à jour des notes et validation sur les traces des enfants assignés
DROP POLICY IF EXISTS "Mentors update notes on discovery traces of assigned children" ON public.discovery_traces;
CREATE POLICY "Mentors update notes on discovery traces of assigned children"
  ON public.discovery_traces
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.child_profile_id = discovery_traces.child_id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.child_profile_id = discovery_traces.child_id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
    )
  );

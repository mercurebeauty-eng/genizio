-- Migration : Ajout des champs pour les projets collectifs et le tagging croisé (2026-08-30)

-- 1. Ajout de la colonne pour les enfants tagués
ALTER TABLE public.discovery_traces 
ADD COLUMN IF NOT EXISTS tagged_child_ids UUID[] DEFAULT '{}'::UUID[];

-- 2. Ajout de la colonne pour stocker les perspectives croisées (co_perspectives)
-- Structure JSONB attendue:
-- [{ "child_id": "uuid", "role": "string", "perspective": "string", "proof_image_url": "string", "added_at": "timestamp" }]
ALTER TABLE public.discovery_traces 
ADD COLUMN IF NOT EXISTS co_perspectives JSONB DEFAULT '[]'::jsonb;

-- Index GIN sur le tableau d'UUID pour des requêtes performantes (ex: WHERE tagged_child_ids @> ARRAY['uuid'])
CREATE INDEX IF NOT EXISTS discovery_traces_tagged_child_ids_idx ON public.discovery_traces USING GIN(tagged_child_ids);

-- 3. Mise à jour des politiques RLS

-- Parents : Autoriser la LECTURE et MISE A JOUR (uniquement de la colonne co_perspectives) si l'enfant est tagué.

-- Lecture pour les parents des enfants tagués
DROP POLICY IF EXISTS "Parents can read traces where their child is tagged" ON public.discovery_traces;
CREATE POLICY "Parents can read traces where their child is tagged"
  ON public.discovery_traces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = ANY(discovery_traces.tagged_child_ids)
      AND cp.user_id = auth.uid()
    )
  );

-- Mise à jour pour les parents des enfants tagués (permet d'ajouter leur co_perspective)
DROP POLICY IF EXISTS "Parents can update co_perspectives on shared traces" ON public.discovery_traces;
CREATE POLICY "Parents can update co_perspectives on shared traces"
  ON public.discovery_traces
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = ANY(discovery_traces.tagged_child_ids)
      AND cp.user_id = auth.uid()
    )
  );

-- Mentors : Lecture si l'enfant tagué est suivi par le mentor
DROP POLICY IF EXISTS "Mentors read traces of assigned tagged children" ON public.discovery_traces;
CREATE POLICY "Mentors read traces of assigned tagged children"
  ON public.discovery_traces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.child_profile_id = ANY(discovery_traces.tagged_child_ids)
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
    )
  );

-- Mentors : Update (pour mentor_notes) sur les traces des enfants tagués assignés
DROP POLICY IF EXISTS "Mentors update notes on traces of assigned tagged children" ON public.discovery_traces;
CREATE POLICY "Mentors update notes on traces of assigned tagged children"
  ON public.discovery_traces
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.child_profile_id = ANY(discovery_traces.tagged_child_ids)
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
    )
  );

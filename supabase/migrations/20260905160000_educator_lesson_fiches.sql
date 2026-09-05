-- Migration: fiches du Copilote Professeur + bucket privé educator-copilot
-- Date: 2026-09-05

-- Fiches de préparation différenciée générées par le Copilote Professeur
-- (GLM 5.3 Flash, fallback Claude). La fiche est un agrégat de classe : aucune
-- donnée individuelle d'élève (privacy by design). Les images sources (photos
-- de pages de manuel) vivent dans le bucket privé educator-copilot.

CREATE TABLE IF NOT EXISTS public.educator_lesson_fiches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  class_code text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('text', 'photo', 'voice')),
  source_image_path text,
  fiche jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'glm' CHECK (provider IN ('glm', 'claude-fallback')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_educator_lesson_fiches_edu
ON public.educator_lesson_fiches (educator_user_id, created_at DESC);

ALTER TABLE public.educator_lesson_fiches ENABLE ROW LEVEL SECURITY;

-- Écriture/lecture par le service role uniquement (les server functions ne
-- passent jamais par le poste client pour ce tableau) : pas de policy
-- authenticated, l'accès est médiatisé par les server functions authentifiées.
CREATE POLICY "Service role full access to educator_lesson_fiches"
ON public.educator_lesson_fiches FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bucket PRIVÉ des photos sources du copilote (pages de manuel scannées) :
-- contrairement à 'proofs' (preuves publiques), une photo de manuel n'a rien à
-- faire en lecture publique. Les uploads passent par le service role côté
-- server function, la lecture est un chemin signé éphémère.
INSERT INTO storage.buckets (id, name, public)
VALUES ('educator-copilot', 'educator-copilot', false)
ON CONFLICT (id) DO NOTHING;

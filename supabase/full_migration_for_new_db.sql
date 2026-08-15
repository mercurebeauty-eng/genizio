-- ⚠️ ⚠️ ⚠️ FICHIER PÉRIMÉ — NE PAS UTILISER (2026-08-15) ⚠️ ⚠️ ⚠️
-- Ce snapshot ne couvre que 2 tables (child_profiles + challenges) de l'état du 2026-07-15.
-- Le schéma réel compte ~86 migrations dans supabase/migrations/ (mentors, family_coverages,
-- payments, campaigns, mentor_*…). Toute remise à zéro d'une base doit se faire par
-- l'historique complet des migrations (`supabase db reset` / `supabase db push`), jamais
-- par ce fichier. À régénérer ou supprimer (plan multicouche, A2).

-- 1. Create Child Profiles
CREATE TABLE public.child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age int NOT NULL CHECK (age BETWEEN 3 AND 20),
  interests text[] NOT NULL DEFAULT '{}',
  city text,
  country text,
  avatar_color text NOT NULL DEFAULT 'brand',
  favorite_challenges text[] NOT NULL DEFAULT '{}',
  completed_challenges text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own child profiles"
  ON public.child_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX child_profiles_user_id_idx ON public.child_profiles(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create Challenges Table
CREATE TYPE public.challenge_status AS ENUM ('todo', 'in_progress', 'completed');

CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.challenge_status NOT NULL DEFAULT 'todo',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX challenges_child_id_idx ON public.challenges(child_id);
CREATE INDEX challenges_user_id_idx ON public.challenges(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own challenges"
  ON public.challenges FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add AI / Talents fields
ALTER TABLE public.child_profiles
ADD COLUMN IF NOT EXISTS talents JSONB NOT NULL DEFAULT '{
  "spatial": 0,
  "corporelle": 0,
  "sociale": 0,
  "entrepreneuriale": 0,
  "creative": 0,
  "artisanale": 0,
  "emotionnelle": 0,
  "logico_mathematique": 0,
  "linguistique": 0
}'::jsonb;

ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS target_intelligences JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS ai_observations TEXT;

-- 4. Create Proofs Bucket for Image Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'proofs');

CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Users can update their own proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proofs' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proofs' AND auth.uid() = owner);

-- 5. Add pedagogical_context
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS pedagogical_context TEXT;

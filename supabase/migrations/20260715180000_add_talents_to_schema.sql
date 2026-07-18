-- Add talents portfolio to child_profiles
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

-- Add target intelligences to challenges
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS target_intelligences JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add proof of completion to challenges
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS ai_observations TEXT;

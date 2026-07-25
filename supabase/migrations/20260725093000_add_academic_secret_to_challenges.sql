-- Add academic_secret column to public.challenges for post-completion Secret de Naya insight
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS academic_secret TEXT;

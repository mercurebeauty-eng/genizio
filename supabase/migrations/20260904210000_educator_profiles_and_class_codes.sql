-- Migration: Profils Professionnels, Handles (@) et Codes de Classe (#)
-- Date: 2026-09-04

CREATE TABLE IF NOT EXISTS public.educator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Handle unique mémorisable (ex: "kone.maths", "cisse.orientation")
  handle text UNIQUE,
  
  full_name text NOT NULL,
  professional_role text NOT NULL CHECK (professional_role IN ('teacher', 'counselor', 'psychologist', 'other')),
  organization_name text, -- ex: "Lycée Classique d'Abidjan"
  
  -- Code de ralliement de classe (ex: "LCA-6B", "SACRE-COEUR-3A")
  class_code text,
  
  whatsapp_phone text,
  is_verified boolean NOT NULL DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par handle ou code de classe
CREATE INDEX IF NOT EXISTS idx_educator_profiles_handle 
ON public.educator_profiles(lower(handle));

CREATE INDEX IF NOT EXISTS idx_educator_profiles_class_code 
ON public.educator_profiles(upper(class_code));

ALTER TABLE public.educator_profiles ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut chercher un profil éducateur par handle ou code classe (pour lier son enfant)
CREATE POLICY "Public authenticated lookup for educator profiles"
ON public.educator_profiles
FOR SELECT
TO authenticated
USING (true);

-- Un éducateur peut mettre à jour son propre profil
CREATE POLICY "Educators can manage their own profile"
ON public.educator_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Migration: Architecture Écoles & Établissements Scolaires (Génizio Campus)
-- Date: 2026-09-04

-- 1. Table des Établissements Scolaires
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL, -- Code unique de ralliement (ex: "#CSV-OUAGA", "#LCA-ABIDJAN")
  country_code text NOT NULL DEFAULT 'BF',
  city text NOT NULL,
  address text,
  type text NOT NULL CHECK (type IN ('public', 'private_secular', 'private_religious', 'international', 'other')),
  status text NOT NULL DEFAULT 'community' CHECK (status IN ('community', 'verified', 'partner_campus', 'archived')),
  
  -- Direction & Responsable
  leader_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email text,
  contact_phone text,
  website_url text,
  
  -- Modèle économique & Quotas
  pricing_tier text NOT NULL DEFAULT 'free' CHECK (pricing_tier IN ('free', 'pilot', 'standard_campus', 'sponsored')),
  licensed_students_quota int NOT NULL DEFAULT 0,
  license_valid_until timestamptz,
  sponsor_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Clé étrangère dans educator_profiles
ALTER TABLE public.educator_profiles 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- 3. Indexation performante pour recherche instantanée et autocomplete
CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(upper(code));
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.schools(lower(city));
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools(lower(name));
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);
CREATE INDEX IF NOT EXISTS idx_educator_profiles_school_id ON public.educator_profiles(school_id);

-- 4. Sécurité RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Lecture libre pour les utilisateurs authentifiés (recherche d'établissement, vue équipe)
CREATE POLICY "Public authenticated lookup for schools"
ON public.schools FOR SELECT TO authenticated USING (true);

-- Création d'une école par un enseignant (statut communautaire par défaut)
CREATE POLICY "Authenticated users can create community schools"
ON public.schools FOR INSERT TO authenticated WITH CHECK (status = 'community');

-- Mise à jour autorisée pour le responsable d'établissement désigné
CREATE POLICY "School leaders can update their own school"
ON public.schools FOR UPDATE TO authenticated
USING (auth.uid() = leader_user_id)
WITH CHECK (auth.uid() = leader_user_id);

-- Accès complet pour service_role / admins
CREATE POLICY "Service role full access to schools"
ON public.schools FOR ALL TO service_role USING (true) WITH CHECK (true);

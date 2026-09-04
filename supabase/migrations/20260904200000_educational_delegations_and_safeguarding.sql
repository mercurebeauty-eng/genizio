-- Migration: Passerelle Éducative & Bouclier de Protection de l'Enfance (Safeguarding)
-- Date: 2026-09-04
--
-- Contient :
-- 1. child_delegations : Délégations d'accès pour enseignants, conseillers d'orientation et psychologues.
-- 2. child_safety_reports : Signalements d'urgence pour maltraitance, harcèlement, stress ou fraude.
-- 3. child_safety_audits : Audits trimestriels pour le suivi bienveillant des familles (notamment analphabètes).

-- ── 1. child_delegations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.child_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  
  -- Qui a accordé la délégation ? (Parent ou Mentor selon la règle de symétrie)
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_by_role text NOT NULL CHECK (granted_by_role IN ('parent', 'mentor')),
  
  -- Professionnel bénéficiaire
  beneficiary_user_id uuid REFERENCES auth.users(id),
  beneficiary_email text NOT NULL,
  beneficiary_name text,
  organization_name text,
  
  -- Typologie & Portée
  professional_role text NOT NULL CHECK (professional_role IN ('teacher', 'counselor', 'psychologist', 'other')),
  scope text NOT NULL DEFAULT 'orientation' CHECK (scope IN ('overview', 'orientation', 'full_pedagogical')),
  
  -- Partage du contact parent (WhatsApp / Téléphone)
  share_parent_phone boolean NOT NULL DEFAULT true,
  
  -- Cycle de vie
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  
  -- Traçabilité & Audit
  last_accessed_at timestamptz,
  access_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_delegations_child_active 
ON public.child_delegations(child_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_child_delegations_beneficiary 
ON public.child_delegations(beneficiary_user_id, status);

ALTER TABLE public.child_delegations ENABLE ROW LEVEL SECURITY;

-- ── 2. child_safety_reports (Signalements d'urgence) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.child_safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id),
  reporter_role text NOT NULL CHECK (reporter_role IN ('parent', 'educator', 'admin', 'other')),
  
  accused_mentor_user_id uuid NOT NULL REFERENCES auth.users(id),
  session_id uuid,
  
  category text NOT NULL CHECK (category IN (
    'harassment',          -- Harcèlement, propos ambigus, gestes déplacés
    'verbal_abuse',        -- Agressivité verbale, rabaissement
    'excessive_stress',    -- Pression anxiogène, pleurs de l'enfant
    'unauthorized_contact',-- Tentative de contact privé hors cadre
    'unpunctuality_fraud', -- Retards répétés, fausses déclarations
    'other'
  )),
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  description text NOT NULL,
  evidence_urls text[],
  
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'sanctioned', 'dismissed')),
  kill_switch_triggered boolean NOT NULL DEFAULT false,
  investigation_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_reports_mentor 
ON public.child_safety_reports(accused_mentor_user_id, status);

CREATE INDEX IF NOT EXISTS idx_safety_reports_status 
ON public.child_safety_reports(status, severity);

ALTER TABLE public.child_safety_reports ENABLE ROW LEVEL SECURITY;

-- ── 3. child_safety_audits (Audits Trimestriels Admin OS) ──────────────────────
CREATE TABLE IF NOT EXISTS public.child_safety_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id),
  
  quarter_period text NOT NULL, -- ex: "2026-Q3", "2026-Q4"
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Audit à réaliser ce trimestre
    'contacted_ok', -- Famille jointe, retour positif
    'warning',      -- Signaux faibles / réserves sur la relation
    'escalated',    -- Alerte grave transmise aux fondateurs
    'unreachable'   -- Famille injoignable (relance programmée)
  )),
  
  contact_channel text CHECK (contact_channel IN ('phone_call', 'whatsapp_voice', 'in_person', 'in_app')),
  contacted_person text, -- ex: "Mère", "Père", "Tuteur"
  child_wellbeing_rating int CHECK (child_wellbeing_rating BETWEEN 1 AND 5),
  
  notes text,
  conducted_by uuid REFERENCES auth.users(id),
  conducted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_quarter_audit 
ON public.child_safety_audits(child_id, quarter_period);

CREATE INDEX IF NOT EXISTS idx_safety_audits_status_quarter 
ON public.child_safety_audits(quarter_period, status);

ALTER TABLE public.child_safety_audits ENABLE ROW LEVEL SECURITY;

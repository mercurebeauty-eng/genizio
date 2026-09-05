-- Migration: Dossier Pro Indépendant (Bilan d'Expertise & Prescription Clinique)
-- Date: 2026-09-05
-- Permet aux professionnels indépendants (psychologues, conseillers, coachs libéraux)
-- d'activer le Pack Bilan & Prescription (15 000 FCFA / enfant).

ALTER TABLE public.child_delegations
ADD COLUMN IF NOT EXISTS pro_dossier_unlocked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_dossier_unlocked_at timestamptz,
ADD COLUMN IF NOT EXISTS pro_clinical_notes text,
ADD COLUMN IF NOT EXISTS pro_remediation_prescriptions jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_child_delegations_pro_unlocked 
ON public.child_delegations(beneficiary_user_id, pro_dossier_unlocked);

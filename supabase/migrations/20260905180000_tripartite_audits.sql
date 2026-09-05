-- Migration: Boucle Fermée Tripartite — rapports trimestriels + file de décisions
-- Date: 2026-09-05
--
-- tripartite_quarterly_reports : le rapport FIGÉ d'une cohorte (escouade ou
--   école) pour un trimestre — immuable, auditable.
-- mentor_decision_proposals : les PROPOSITIONS issues du rapport. AUCUNE
--   suspension automatique : l'Admin OS confirme (→ kill-switch existant
--   triggerMentorEmergencySuspension ou prime) ou écarte, avec trace.

CREATE TABLE IF NOT EXISTS public.tripartite_quarterly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  squad_id uuid REFERENCES public.mentor_squads(id) ON DELETE SET NULL,
  mentor_user_id uuid,
  quarter_period text NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (squad_id, quarter_period)
);

CREATE INDEX IF NOT EXISTS idx_tripartite_reports_period
ON public.tripartite_quarterly_reports (quarter_period DESC);

CREATE TABLE IF NOT EXISTS public.mentor_decision_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id uuid NOT NULL,
  report_id uuid REFERENCES public.tripartite_quarterly_reports(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('confidence_bonus', 'suspension_review', 'coach_alert')),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'array'),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'dismissed')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_decision_proposals_pending
ON public.mentor_decision_proposals (status, created_at DESC) WHERE status = 'proposed';

ALTER TABLE public.tripartite_quarterly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_decision_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to tripartite_quarterly_reports"
ON public.tripartite_quarterly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to mentor_decision_proposals"
ON public.mentor_decision_proposals FOR ALL TO service_role USING (true) WITH CHECK (true);

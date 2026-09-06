-- Migration: trail de paiement des séances mentor + réconciliation des crédits
-- Date: 2026-09-06 (audit backend, vague B)

-- ── 1. Traçabilité du virement mentor ────────────────────────────────────────
-- markMentorSessionsPaidAdmin retournait approved→paid par lot sans aucune
-- trace : ni date, ni référence, ni sélection. On ajoute les colonnes du
-- ledger (miroir de ce que mentor_club_sessions vient de recevoir).
ALTER TABLE public.mentor_sessions
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_reference text;

-- ── 2. Vue de réconciliation crédits vs séances confirmées ───────────────────
-- Les compteurs sessions_used (packs/campagnes) se dérivent des séances réelles ;
-- avec les courses read-then-write corrigées en 20260906140000, la dérive
-- résiduelle (historique) devient mesurable. Lecture seule, pour l'Admin OS.
CREATE OR REPLACE VIEW public.v_entitlement_drift AS
WITH pack_actual AS (
  SELECT ms.child_profile_id,
         count(*)::int AS actual_sessions
  FROM public.mentor_sessions ms
  WHERE ms.funding = 'pack' AND ms.status IN ('declared', 'confirmed', 'approved', 'paid')
  GROUP BY ms.child_profile_id
)
SELECT fc.id AS coverage_id,
       fc.child_id,
       fc.sessions,
       fc.sessions_used,
       COALESCE(pa.actual_sessions, 0) AS actual_pack_sessions,
       fc.sessions_used - COALESCE(pa.actual_sessions, 0) AS drift_sessions
FROM public.family_coverages fc
LEFT JOIN pack_actual pa ON pa.child_profile_id = fc.child_id
WHERE fc.source = 'accompaniment_pack'
  AND fc.sessions_used <> COALESCE(pa.actual_sessions, 0);

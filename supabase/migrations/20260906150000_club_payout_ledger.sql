-- Migration: ledger de payout des clubs du samedi (audit backend, vague B)
-- Date: 2026-09-06
--
-- Le montant dû au mentor vivait uniquement dans vision_verdict.payoutXof (jsonb) :
-- pas sommable, pas filtrable, pas de cycle de vie pending→paid, pas de trace de
-- virement. On le promeut en colonnes réelles, calquées sur le ledger mentor_sessions
-- (snapshot à la validation, jamais recomputé après coup).

ALTER TABLE public.mentor_club_sessions
  ADD COLUMN IF NOT EXISTS payout_xof integer CHECK (payout_xof IS NULL OR payout_xof >= 0),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid', 'frozen')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_reference text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Un seul paiement par (escouade, jour) : la contrainte d'unicité existante
-- UNIQUE(squad_id, occurred_at) reste la garde anti-ferme ; cet index sert les
-- requêtes de ledger admin (somme par mentor/période).
CREATE INDEX IF NOT EXISTS idx_mentor_club_sessions_payout
ON public.mentor_club_sessions (mentor_user_id, payout_status, occurred_at DESC);

DROP TRIGGER IF EXISTS update_mentor_club_sessions_updated_at ON public.mentor_club_sessions;
CREATE TRIGGER update_mentor_club_sessions_updated_at
  BEFORE UPDATE ON public.mentor_club_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

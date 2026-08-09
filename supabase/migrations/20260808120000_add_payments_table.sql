-- Paiements en ligne (Paystack, 2026-08-08)
--
-- Source de vérité d'une transaction Paystack : une ligne = une tentative de paiement,
-- référencée par le `reference` Paystack (unique). Le webhook (ou la page de retour)
-- marque la ligne success/failed et applique le bénéfice associé via `metadata`.
--
-- Metadata intents :
--   • { type: 'order',         order_id, ... }        → commande boutique (orders.confirmed)
--   • { type: 'child_access',   child_id, months }     → période d'accès mensuel (child_access_periods)
--   • { type: 'passport',       child_id }             → déblocage Passeport (child_profiles.pdf_unlocked)
--
-- Accès service-role/admin uniquement : jamais lisible par un client (même principe que
-- child_access_periods et sponsorship_tokens — cf. 20260725100000, aucune policy posée).

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reference text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'paystack',
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'success', 'failed', 'abandoned')),
  amount_xof integer NOT NULL CHECK (amount_xof > 0),
  currency text NOT NULL DEFAULT 'XOF',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS payments_reference_idx ON public.payments(reference);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- Traçabilité du paiement sur la commande (affichage admin).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON public.orders(payment_reference);

-- Les périodes d'accès peuvent désormais être créées par le paiement en ligne Paystack
-- (en plus des sources family/sponsor/admin_grant).
ALTER TABLE public.child_access_periods DROP CONSTRAINT IF EXISTS child_access_periods_source_check;
ALTER TABLE public.child_access_periods
  ADD CONSTRAINT child_access_periods_source_check
  CHECK (source IN ('family', 'sponsor', 'admin_grant', 'paystack'));

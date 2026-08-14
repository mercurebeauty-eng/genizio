-- V4 « Pass Enfant » (Vague A, 2026-08-14) — la table unique de couverture.
--
-- Ce que cette migration pose :
--   1. family_coverages : LA source de vérité de la couverture d'une famille.
--      Chaque manière d'être « couvert » devient une ligne :
--        • source='subscription'  → abonnement Paystack (famille, child_id NULL, ends_at =
--          current_period_end de la ligne subscriptions — sync par le webhook/activate) ;
--        • source='accompaniment_pack' → Pack Accompagnement PAR ENFANT (child_id NON-NULL,
--          sessions = budget de séances, sessions_used consommé à chaque déclaration) ;
--        • source='campaign'      → enfant du compte inscrit à une campagne (famille, une
--          ligne par (compte, campagne), ends_at = fin de fenêtre de la campagne) ;
--        • source='sponsorship'   → crédit de parrainage famille (ends_at = fin du crédit) ;
--        • source='purchase'      → PALIER acheté (décision 5 : +5 enfants par palier, même
--          tarif que le forfait, cap absolu 50) — plusieurs lignes s'empilent.
--   2. La règle de quota app lue par le trigger (Vague A, migration 20260814200000) :
--        has_base = ∃ ligne active child_id IS NULL source∈(subscription,campaign,sponsorship)
--        quota = GREATEST(plancher grand-péré 5 | neuf 1, has_base ? 5 : 0) + Σ(max_children
--        des lignes 'purchase' actives), borné 50 (décision 5).
--   3. campaigns.sessions_target / sessions_used : le COMPARTIMENT SÉANCES de la campagne
--      (décision 3 — 2 compteurs distincts). Consommé au fil des séances déclarées sur des
--      enfants de la campagne (décision utilisateur : « débit au fil des séances »).
--   4. supervisor_sessions enrichies pour le payout superviseur (décision : ledger admin) :
--      status declared|approved|paid, payout_xof (3 500 F = 70% × séance), campaign_id
--      (séance financée par une campagne), funding pack|campaign|none.
--   5. supervisor_feedback : la note 1-5 de la famille sur une séance — composante du score
--      superviseur V2 (25%), le « feedback famille » de la décision 4 (reporté en V1, posé ici).

-- ── 1. family_coverages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_coverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (
    source IN ('subscription','accompaniment_pack','campaign','sponsorship','purchase')
  ),
  source_ref uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  max_children int NOT NULL DEFAULT 5 CHECK (max_children >= 0),
  sessions int NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  sessions_used int NOT NULL DEFAULT 0 CHECK (sessions_used >= 0 AND sessions_used <= sessions),
  price_xof numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- DÉCISION 2 (2026-08-14) : le pack est PAR ENFANT — child_id est obligatoire pour
  -- accompaniment_pack, interdit pour les couvertures famille/app (child_id NULL).
  CONSTRAINT family_coverages_child_required_for_pack CHECK (
    (source = 'accompaniment_pack' AND child_id IS NOT NULL)
    OR (source <> 'accompaniment_pack')
  )
);

ALTER TABLE public.family_coverages ENABLE ROW LEVEL SECURITY;
-- Aucune policy : les chemins d'accès passent par supabaseAdmin (service role) — même
-- principe du moindre privilège que subscriptions/sponsorship_credits/campaigns.

-- Une seule ligne de couverture famille par (compte, source) pour les sources app à fenêtre
-- unique (subscription/sponsorship) ; les paliers (purchase) s'empilent, le pack est par
-- enfant, et la campagne est par (compte, CAMPAGNE) — une famille peut être inscrite à
-- plusieurs programmes. Ces index sont la garantie DB ; les écrivains font un upsert applicatif.
CREATE UNIQUE INDEX IF NOT EXISTS family_coverages_family_source_key
  ON public.family_coverages(user_id, source)
  WHERE child_id IS NULL AND source IN ('subscription','sponsorship');
CREATE UNIQUE INDEX IF NOT EXISTS family_coverages_campaign_source_key
  ON public.family_coverages(user_id, source, source_ref)
  WHERE child_id IS NULL AND source = 'campaign';
CREATE UNIQUE INDEX IF NOT EXISTS family_coverages_child_pack_key
  ON public.family_coverages(child_id)
  WHERE source = 'accompaniment_pack';

CREATE INDEX IF NOT EXISTS family_coverages_user_status_idx
  ON public.family_coverages(user_id, status);
CREATE INDEX IF NOT EXISTS family_coverages_child_idx
  ON public.family_coverages(child_id);
CREATE INDEX IF NOT EXISTS family_coverages_window_idx
  ON public.family_coverages(user_id, status, ends_at);

-- ── 2. Campagne : compartiment SÉANCES (2 compteurs distincts) ─────────────────
-- DÉCISION 3 (2026-08-14) : target_count (APP, existant) + sessions_target (SÉANCES,
-- nouveau). sessions_used = séances financées déjà consommées (débit au fil des
-- déclarations). Le CHECK interdit de consommer plus que le budget à la base.
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sessions_target int NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sessions_used int NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_sessions_used_within_target;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_sessions_used_within_target
  CHECK (sessions_used >= 0 AND sessions_used <= sessions_target);

-- ── 3. Déclarations de séance → payout superviseur (ledger admin) ─────────────
ALTER TABLE public.supervisor_sessions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'declared'
  CHECK (status IN ('declared','approved','paid'));
ALTER TABLE public.supervisor_sessions ADD COLUMN IF NOT EXISTS payout_xof numeric;
ALTER TABLE public.supervisor_sessions ADD COLUMN IF NOT EXISTS campaign_id uuid
  REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.supervisor_sessions ADD COLUMN IF NOT EXISTS funding text NOT NULL DEFAULT 'none'
  CHECK (funding IN ('pack','campaign','none'));

CREATE INDEX IF NOT EXISTS supervisor_sessions_status_idx
  ON public.supervisor_sessions(supervisor_user_id, status);

-- ── 4. Feedback famille (score superviseur V2) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supervisor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_session_id uuid NOT NULL REFERENCES public.supervisor_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_feedback ENABLE ROW LEVEL SECURITY;
-- Aucune policy : écriture par la famille (submitSupervisorFeedback, supabaseAdmin),
-- lecture par le calcul de score (supabaseAdmin) — même principe que le reste.

CREATE INDEX IF NOT EXISTS supervisor_feedback_session_idx
  ON public.supervisor_feedback(supervisor_session_id);

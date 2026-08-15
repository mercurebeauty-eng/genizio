-- Superviseur Copilote (décision #74, 2026-08-15) — le superviseur devient opérateur
-- pour les enfants accompagnés (pack ou campagne). Déclaré PRODUIT par l'utilisateur,
-- NON appliquée en prod avant revue.
--
-- Ce que cette migration pose :
--   1. supervisor_actions : le journal d'audit du superviseur (qui, quoi, quand).
--      Non-négociable dès qu'un tiers écrit sur les défis — dans l'esprit de
--      generation_audits / challenge_outcomes. Sert aussi de journal de séance
--      (les notes du superviseur sont tracées ici, jamais dans challenges.notes
--      qui reste le journal du parent).
--   2. challenges.created_by_user_id : l'attribution des défis générés/assignés par
--      un superviseur. challenges.user_id RESTE le parent (ownership, RLS, lectures
--      parent intacts) — la colonne ne fait que dire qui a créé la ligne.
--   3. supervisor_reports : le bilan de fin (« bilan inclus » du pack 60 000 F) —
--      rédigé par le superviseur, seule pièce à validation EXPLICITE du parent.
--      Statuts : draft → submitted → validated | rejected → draft (avec feedback).
--   4. app_notifications : canal parent cross-appareil minimal (pull + badge, pas de
--      push) — le parent voit les actions du superviseur (défi complété, abandon,
--      bilan soumis/validé) et garde son veto éclairé.

-- ── 1. Journal d'audit superviseur ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supervisor_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_actions ENABLE ROW LEVEL SECURITY;
-- Aucune policy : les chemins d'accès passent par supabaseAdmin (service role) — même
-- principe du moindre privilège que generation_audits/supervisor_sessions.

CREATE INDEX IF NOT EXISTS supervisor_actions_supervisor_idx
  ON public.supervisor_actions(supervisor_user_id, created_at);
CREATE INDEX IF NOT EXISTS supervisor_actions_child_idx
  ON public.supervisor_actions(child_profile_id, created_at);
CREATE INDEX IF NOT EXISTS supervisor_actions_challenge_idx
  ON public.supervisor_actions(challenge_id);

-- ── 2. Attribution des défis ───────────────────────────────────────────────────
-- user_id reste le parent (owner). created_by_user_id = le superviseur quand il
-- génère/assigne un défi pour un enfant accompagné (décision #74, sous-décision 4).
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS created_by_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 3. Bilan de fin du superviseur (le « bilan inclus » du pack) ───────────────
CREATE TABLE IF NOT EXISTS public.supervisor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  realisations text NOT NULL DEFAULT '',
  competences_observees text NOT NULL DEFAULT '',
  recommandations text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','validated','rejected')),
  parent_feedback text,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end > period_start)
);

ALTER TABLE public.supervisor_reports ENABLE ROW LEVEL SECURITY;
-- Aucune policy : écriture par le superviseur (supabaseAdmin), lecture par le parent
-- (supabaseAdmin, ownership vérifiée dans la server function) — même principe que le reste.

-- Une seule ligne OUVERTE par enfant (draft ou soumise) : le superviseur travaille sur
-- UN bilan à la fois ; les bilans validés s'empilent (un par période/mois).
CREATE UNIQUE INDEX IF NOT EXISTS supervisor_reports_one_open_per_child_key
  ON public.supervisor_reports(child_profile_id)
  WHERE status IN ('draft','submitted');

CREATE INDEX IF NOT EXISTS supervisor_reports_child_idx
  ON public.supervisor_reports(child_profile_id, status);
CREATE INDEX IF NOT EXISTS supervisor_reports_supervisor_idx
  ON public.supervisor_reports(supervisor_user_id, status);

-- ── 4. Notifications parent (canal cross-appareil minimal) ────────────────────
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  child_profile_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
-- Aucune policy : écriture par les server functions superviseur (supabaseAdmin),
-- lecture/marquage lu par le parent via server functions (supabaseAdmin) — même principe.

CREATE INDEX IF NOT EXISTS app_notifications_user_read_idx
  ON public.app_notifications(user_id, read_at, created_at);

-- Foundation for two new feature areas: mentor sharing (scoped, revocable, redacted
-- external access to a child's progress) and a consent/privacy ledger.
--
-- Also formally captures a policy that has been live on production since the
-- child_profiles RLS fix (20260716120000) but was never written down in a migration:
-- "Anyone can view completed challenges" on public.challenges. That policy is what the
-- child_profiles fix's public-select policy mirrors (a completed challenge makes a
-- child's profile + that challenge visible to any authenticated account, for the public
-- Feed). Bundling it here so the repo's migration history matches the real deployed
-- state before any more RLS work builds on top of it.

DROP POLICY IF EXISTS "Anyone can view completed challenges" ON public.challenges;

CREATE POLICY "Anyone can view completed challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (status = 'completed');

-- Mentor sharing: a parent grants a scoped, revocable, link-based view of one child's
-- progress to someone outside the app (teacher, coach) — no mentor account required.
-- No anon/token RLS policy is defined here on purpose: the token-based public view
-- (`/s/$token`) is served by a server function using the service-role client, which
-- validates the token and redacts the response itself. RLS here only protects normal
-- authenticated access, scoped to the owning parent.
CREATE TABLE public.child_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_name text,
  mentor_email text,
  scope_domains text[] NOT NULL DEFAULT '{}',
  can_view_talent_map boolean NOT NULL DEFAULT true,
  can_view_timeline boolean NOT NULL DEFAULT true,
  can_view_raw_observations boolean NOT NULL DEFAULT false,
  access_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_mentors TO authenticated;
GRANT ALL ON public.child_mentors TO service_role;

ALTER TABLE public.child_mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their child mentors"
  ON public.child_mentors FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE INDEX child_mentors_child_id_idx ON public.child_mentors(child_id);
CREATE INDEX child_mentors_owner_user_id_idx ON public.child_mentors(owner_user_id);
CREATE INDEX child_mentors_access_token_idx ON public.child_mentors(access_token);

-- Consent ledger: append-only log of privacy-relevant events (child profile created,
-- mentor invited/revoked, data exported, account deletion requested). Deliberately no
-- UPDATE/DELETE policy at all, even for the owner — a ledger you can edit isn't a ledger.
-- Account deletion (a later phase) still works: auth.admin.deleteUser() runs with
-- elevated privileges via GoTrue and the ON DELETE CASCADE fires regardless of the
-- missing DELETE policy here — that's the one legitimate system-level exception, not a
-- bypass available to a normal authenticated user.
CREATE TABLE public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.consent_events TO authenticated;
GRANT ALL ON public.consent_events TO service_role;

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their consent events"
  ON public.consent_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can log their consent events"
  ON public.consent_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX consent_events_user_id_idx ON public.consent_events(user_id);
CREATE INDEX consent_events_child_id_idx ON public.consent_events(child_id);

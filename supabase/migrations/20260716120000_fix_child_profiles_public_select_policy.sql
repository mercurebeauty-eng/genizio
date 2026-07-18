-- Fix: "Anyone can view child profiles" (qual: true) allowed any authenticated
-- account to read ALL child_profiles rows (name, age, city, country, interests,
-- talents...) regardless of ownership. This was discovered via a live data leak
-- on 2026-07-16 and already applied directly to production via the Supabase
-- Management API — this migration brings the repo history in sync with that
-- fix so future `db push` / fresh deployments don't reintroduce the hole.
--
-- Narrows public SELECT to only child_profiles that have at least one
-- completed challenge, mirroring the existing "Anyone can view completed
-- challenges" policy on public.challenges — this is what the public Feed
-- (/feed) needs to show a child's name/avatar for celebrated achievements.

DROP POLICY IF EXISTS "Anyone can view child profiles" ON public.child_profiles;

CREATE POLICY "Public can view profiles with completed challenges"
  ON public.child_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.child_id = child_profiles.id AND c.status = 'completed'
    )
  );

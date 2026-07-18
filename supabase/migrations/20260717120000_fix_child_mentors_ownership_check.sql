-- Fix: "Owners manage their child mentors" only checked owner_user_id = auth.uid(),
-- never that child_id actually belongs to a child_profile owned by that user.
-- This let any authenticated user INSERT a child_mentors row for an arbitrary
-- child_id (setting owner_user_id to themselves), then read that child's talent
-- map / completed-challenge timeline via the public /s/$token share view —
-- a privilege escalation beyond the intended "parents manage their own mentors"
-- scope. Tighten USING/WITH CHECK to also require child ownership.

DROP POLICY IF EXISTS "Owners manage their child mentors" ON public.child_mentors;

CREATE POLICY "Owners manage their child mentors"
ON public.child_mentors
FOR ALL
USING (
  auth.uid() = owner_user_id
  AND EXISTS (
    SELECT 1 FROM public.child_profiles cp
    WHERE cp.id = child_mentors.child_id AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = owner_user_id
  AND EXISTS (
    SELECT 1 FROM public.child_profiles cp
    WHERE cp.id = child_mentors.child_id AND cp.user_id = auth.uid()
  )
);

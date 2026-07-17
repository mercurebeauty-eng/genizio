-- validateChallengeProof used to read child_profiles.talents, merge the
-- newly-awarded points into it in JS, then write the whole object back —
-- a classic lost-update race: two challenges validated for the same child
-- within the same window (two tabs, or two validations a few seconds apart)
-- can each read the same starting snapshot and the second write silently
-- overwrites the first's points instead of adding to them.
--
-- Move the increment into a single atomic statement, serialized per child
-- via SELECT ... FOR UPDATE, so concurrent calls queue instead of clobbering
-- each other. SECURITY DEFINER (to bypass the child_profiles RLS policy for
-- the row lock/update) means the ownership check has to happen inside the
-- function itself, same defense-in-depth pattern as check_child_profile_quota.

CREATE OR REPLACE FUNCTION public.increment_child_talents(p_child_id uuid, p_deltas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  updated jsonb;
  owner uuid;
BEGIN
  SELECT talents, user_id INTO updated, owner
  FROM public.child_profiles
  WHERE id = p_child_id
  FOR UPDATE;

  IF owner IS NULL THEN
    RAISE EXCEPTION 'Profil enfant introuvable.';
  END IF;

  IF owner <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  IF updated IS NULL THEN
    updated := '{}'::jsonb;
  END IF;

  FOR rec IN SELECT * FROM jsonb_each_text(p_deltas)
  LOOP
    updated := jsonb_set(
      updated,
      ARRAY[rec.key],
      to_jsonb(COALESCE((updated ->> rec.key)::numeric, 0) + rec.value::numeric),
      true
    );
  END LOOP;

  UPDATE public.child_profiles SET talents = updated WHERE id = p_child_id;

  RETURN updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_child_talents(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_child_talents(uuid, jsonb) TO authenticated;

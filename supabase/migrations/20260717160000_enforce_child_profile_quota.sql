-- The "2 free profiles + paid extra slots (5000 FCFA)" quota was only ever
-- enforced client-side (profiles.index.tsx / profiles.manage.tsx disable the
-- "+ Nouveau profil" button once the quota is reached). ProfileDialog.save()
-- inserts directly into child_profiles via the browser Supabase client, and
-- the existing RLS policy ("Parents manage their own child profiles", USING
-- auth.uid() = user_id) has no cap on row count — so any authenticated user
-- could bypass the paywall entirely by inserting rows directly (devtools,
-- curl, a script), for free, with no limit. This closes that hole at the
-- database layer, which is the only place a client-supplied bypass can't
-- reach.
--
-- extra_profile_slots lives in auth.users.raw_app_meta_data (set by the
-- admin-only grantProfileSlot server function), which is readable from a
-- SECURITY DEFINER trigger function even though `authenticated` has no
-- direct SELECT grant on auth.users.

CREATE OR REPLACE FUNCTION public.check_child_profile_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  extra_slots integer;
  quota integer;
BEGIN
  SELECT count(*) INTO current_count
  FROM public.child_profiles
  WHERE user_id = NEW.user_id;

  SELECT COALESCE((raw_app_meta_data ->> 'extra_profile_slots')::integer, 0)
    INTO extra_slots
  FROM auth.users
  WHERE id = NEW.user_id;

  quota := 2 + COALESCE(extra_slots, 0);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils). Débloquez un slot supplémentaire pour continuer.', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_child_profile_quota() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_child_profile_quota ON public.child_profiles;

CREATE TRIGGER enforce_child_profile_quota
  BEFORE INSERT ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_child_profile_quota();

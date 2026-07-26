-- Met à jour le trigger check_child_profile_quota (cf. 20260717160000) suite au pivot
-- confirmé par l'utilisateur (2026-07-22) : le paywall par slot (2 gratuits + slots payants à
-- 5000 FCFA) est retiré au profit d'une limite gratuite de 5 pour tous — la monétisation passe
-- désormais par les Saisons, pas par le nombre d'enfants.
--
-- GREATEST(5, 2 + extra_slots) plutôt qu'un simple 5 fixe : un parent qui avait déjà payé pour
-- plus de 5 enfants au total avant ce pivot (2 + 4 slots achetés, par exemple) garde sa
-- capacité déjà payée, elle n'est pas réduite silencieusement par le nouveau plancher gratuit.
-- Sans cette mise à jour, le client (ProfileDialog.tsx/profiles.index.tsx/profiles.manage.tsx,
-- déjà passés à ce même calcul) autoriserait jusqu'à 5 enfants côté UI, mais ce trigger
-- rejetterait encore l'insertion dès 2 pour un parent sans slot bonus — un vrai bug utilisateur,
-- pas juste une incohérence cosmétique.

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

  quota := GREATEST(5, 2 + COALESCE(extra_slots, 0));

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de profils atteint (% / % profils).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

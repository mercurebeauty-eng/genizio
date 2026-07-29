-- Ajoute une date de naissance optionnelle aux profils enfants, source de vérité
-- pour l'âge plutôt qu'un entier saisi une fois et jamais revisité (l'âge affiché
-- devenait faux au fil des années sans qu'un parent y repense).
--
-- Approche "n'écrase rien tant que ce n'est pas rempli" (décision utilisateur,
-- 2026-07-29) : le trigger ne touche à `age` QUE si `birthdate` est renseignée sur
-- la ligne. Les profils existants (birthdate NULL) continuent de fonctionner
-- exactement comme avant, `age` restant l'entier saisi manuellement — aucun des
-- ~26 endroits de l'app qui lisent `child_profiles.age` n'a besoin de changer.
--
-- Une fois qu'un parent renseigne la date de naissance (via ProfileDialog), le
-- même UPDATE recalcule `age` immédiatement. Comme la ligne est aussi mise à jour
-- par l'usage normal (xp, streak, talents...), l'âge reste ensuite à jour tout
-- seul sans action supplémentaire du parent.
ALTER TABLE public.child_profiles
ADD COLUMN IF NOT EXISTS birthdate DATE;

CREATE OR REPLACE FUNCTION public.sync_child_age_from_birthdate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL THEN
    NEW.age := GREATEST(0, EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birthdate))::int);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_child_age_from_birthdate ON public.child_profiles;
CREATE TRIGGER trg_sync_child_age_from_birthdate
BEFORE INSERT OR UPDATE ON public.child_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_child_age_from_birthdate();

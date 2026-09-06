-- Deux modèles de mentors (V6) — colonne `category` sur les profils et les codes.
-- 'pro' = Superviseur Clinique (1-on-1, ≤ 5 enfants) ; 'support' = Club du Samedi (escouades 6-8).
-- Le défaut 'pro' est rétroactif : les superviseurs historiques étaient cliniques.

ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'pro'
  CHECK (category IN ('pro', 'support'));

ALTER TABLE public.mentor_activation_codes
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'pro'
  CHECK (category IN ('pro', 'support'));

-- L'activation recopie la catégorie DU CODE vers le profil : un code MNT-CLUB crée un
-- mentor de soutien, un code MNT-PRO un superviseur clinique. Une réactivation par un
-- nouveau code reflète la dernière intention de l'admin (comme le passage suspended → active).
CREATE OR REPLACE FUNCTION public.activate_mentor_code(p_code text, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.mentor_activation_codes%ROWTYPE;
BEGIN
  -- L'appelant ne peut activer que SON compte (auth.uid() via le JWT du client).
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN 'forbidden';
  END IF;

  -- FOR UPDATE : verrouille la ligne du code jusqu'à la fin de la transaction —
  -- deux activations simultanées du même code ne peuvent pas gagner toutes les deux.
  SELECT * INTO v_row FROM public.mentor_activation_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;
  IF v_row.used_by IS NOT NULL THEN
    RETURN 'used';
  END IF;
  IF v_row.valid_until IS NOT NULL AND v_row.valid_until < now() THEN
    RETURN 'expired';
  END IF;

  UPDATE public.mentor_activation_codes
  SET used_by = p_user_id, used_at = now()
  WHERE id = v_row.id;

  -- Le profil mentor est créé (ou réactivé) avec la catégorie du code. Aucun impact
  -- quota (l'assignation est séparée).
  INSERT INTO public.mentor_profiles (mentor_user_id, status, category)
  VALUES (p_user_id, 'active', v_row.category)
  ON CONFLICT (mentor_user_id) DO UPDATE
    SET status = 'active',
        category = v_row.category;

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_mentor_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_mentor_code(text, uuid) TO authenticated;

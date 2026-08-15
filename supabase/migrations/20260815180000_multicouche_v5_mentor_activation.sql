-- Vague 5 du plan multicouche (2026-08-15) — activation du mode Mentor par code
-- (spec §7 : « Paramètres → Mentor → code fourni par l'administrateur »).
-- Décision porteur D1 CONFIRMÉE (2026-08-15).
--
--  1. mentor_activation_codes : codes à usage unique générés par l'admin.
--  2. activate_mentor_code(p_code, p_user_id) : RPC SECURITY DEFINER ATOMIQUE —
--     une seule transaction : vérifie que l'appelant EST p_user_id (auth.uid()),
--     valide le code (existe, jamais utilisé, non expiré), le marque utilisé
--     (FOR UPDATE → aucun double-activation en cas de course), crée/active le
--     profil mentor. Pattern identique à increment_child_talents (défenseur
--     exécutable par authenticated, ownership vérifiée DANS la fonction).
--
-- ⚠️ NON APPLIQUÉE en prod avant revue (convention du repo).

-- ── 1. Codes d'activation ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentor_activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_until timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_at IS NULL OR used_by IS NOT NULL)
);

ALTER TABLE public.mentor_activation_codes ENABLE ROW LEVEL SECURITY;
-- Aucune policy : la table n'est jamais lue/écrite par le client directement —
-- l'admin passe par service role, l'activation par la RPC ci-dessous (défenseur).

CREATE INDEX IF NOT EXISTS mentor_activation_codes_used_idx
  ON public.mentor_activation_codes(used_by) WHERE used_by IS NOT NULL;

-- ── 2. Activation atomique par code ──────────────────────────────────────
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

  -- Le profil mentor est créé (ou réactivé) — un compte suspendu réactivé par un
  -- nouveau code redevient 'active'. Aucun impact quota (l'assignation est séparée).
  INSERT INTO public.mentor_profiles (mentor_user_id, status)
  VALUES (p_user_id, 'active')
  ON CONFLICT (mentor_user_id) DO UPDATE SET status = 'active';

  RETURN 'ok';
END;
$$;

-- Exécutable par les comptes connectés (l'appel vient du client avec le JWT) ;
-- jamais par anon. La table, elle, reste inaccessible au client.
REVOKE EXECUTE ON FUNCTION public.activate_mentor_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_mentor_code(text, uuid) TO authenticated;

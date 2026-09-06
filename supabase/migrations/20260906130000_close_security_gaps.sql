-- Migration: fermeture des trous de sécurité (audit backend, vague A)
-- Date: 2026-09-06
-- Forward-only : aucune migration appliquée n'est éditée.

-- ── 1. Observations académiques : plus de lecture universelle ───────────────
-- La policy USING(true) exposait les notes moyennes et les notes du professeur
-- de TOUS les enfants à TOUT compte authentifié. La lecture passe désormais
-- exclusivement par les server functions (qui vérifient le lien école/délégation).
DO $$ BEGIN
  -- La table peut manquer sur les instances où sa migration source a été
  -- sautée (collision de version 20260905190000) : la création suit en
  -- 20260906130001, sans la policy USING(true).
  IF to_regclass('public.child_academic_observations') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users read academic observations" ON public.child_academic_observations';
  END IF;
END $$;

-- ── 2. Résidus du « mur public » : bucket posts supprimé ────────────────────
-- Les tables posts/post_likes/comments ont été droppées (20260830152500) mais
-- le bucket de stockage et ses policies (dont la lecture anonyme) traînaient.
DROP POLICY IF EXISTS "Public Access posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
-- Le bucket lui-même est supprimé via l'API Storage (DELETE FROM storage.buckets
-- est bloqué par Supabase : 42501). La fermeture des policies ci-dessus suffit à
-- bloquer la lecture anonyme.

-- ── 3. RPC appelables par anonyme → service role uniquement ─────────────────
-- consume_ai_feature_quota : p_user_id est fourni par l'appelant ; sans revoke,
-- un anonyme pouvait, via /rest/v1/rpc/, vider le quota quotidien d'un éducateur.
-- Il n'est appelé que par ai-usage.server.ts (service role).
REVOKE EXECUTE ON FUNCTION public.consume_ai_feature_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- check_child_username_available : oracle d'énumération de pseudos enfants,
-- GRANTÉE à anon à sa création. search_path non épinglé. Appelée uniquement
-- par checkUsernameAvailabilityFn (service role).
ALTER FUNCTION public.check_child_username_available(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.check_child_username_available(text) FROM PUBLIC, anon, authenticated;

-- ── 4. increment_child_talents : liste blanche + clamp ──────────────────────
-- La version en vigueur fusionne TOUTE clé jsonb avec TOUT delta numérique :
-- un enfant (GRANT authenticated) pouvait s'auto-attribuer des scores sur des
-- clés inventées ou arbitraires. On restreigne aux 9 clés Gardner, delta 1..5,
-- total plafonné à 100 — la logique métier (quelle clé, combien) reste dans le
-- moteur serveur (validateChallengeProofCore), qui passe par le service role.
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
  v_delta numeric;
  v_new numeric;
BEGIN
  SELECT talents, user_id INTO updated, owner
  FROM public.child_profiles
  WHERE id = p_child_id
  FOR UPDATE;

  IF owner IS NULL THEN
    RAISE EXCEPTION 'Profil enfant introuvable.';
  END IF;

  -- auth.uid() est NULL pour le service role (chemin serveur légitime) :
  -- la comparaison NULL <> NULL n'est pas TRUE, donc le bypass est voulu.
  IF owner <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  IF updated IS NULL THEN
    updated := '{}'::jsonb;
  END IF;

  FOR rec IN SELECT * FROM jsonb_each_text(p_deltas)
  LOOP
    -- Liste blanche stricte des 9 intelligences multiples.
    IF rec.key NOT IN (
      'logico_mathematique', 'creative', 'corporelle', 'linguistique', 'spatial',
      'sociale', 'emotionnelle', 'artisanale', 'entrepreneuriale'
    ) THEN
      CONTINUE;
    END IF;

    BEGIN
      v_delta := rec.value::numeric;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    -- Delta entier borné (le moteur n'émet jamais que 1..3).
    IF v_delta < 1 OR v_delta > 5 THEN
      CONTINUE;
    END IF;

    v_new := COALESCE((updated ->> rec.key)::numeric, 0) + v_delta;
    IF v_new > 100 THEN
      v_new := 100;
    END IF;
    updated := jsonb_set(updated, ARRAY[rec.key], to_jsonb(v_new), true);
  END LOOP;

  UPDATE public.child_profiles SET talents = updated WHERE id = p_child_id;

  RETURN updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_child_talents(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_child_talents(uuid, jsonb) TO authenticated;

-- ── 5. admin_naya_settings : configuration interne, plus de lecture anonyme ─
DROP POLICY IF EXISTS "admin_naya_settings_select_authenticated" ON public.admin_naya_settings;

-- ── 6. educator_profiles : fin de l'énumération des classes ─────────────────
-- USING(true) exposait class_code/handle/téléphone WhatsApp de tous les
-- éducateurs à tout compte. Le lookup passe uniquement par la server fn
-- lookupEducator (rate-limitée, correspondance EXACTE handle/class_code via
-- le service role) — plus aucun accès direct authenticated.
DROP POLICY IF EXISTS "Public authenticated lookup for educator profiles" ON public.educator_profiles;

-- Migration: compteurs atomiques (audit backend, vague B)
-- Date: 2026-09-06
--
-- Les consommations/remboursements de crédits payés (séances de packs famille et
-- de campagnes) et les récompenses (XP, suggestions matérielles) se faisaient en
-- lecture-puis-écriture JS : deux requêtes concurrentes lisaient la même valeur
-- et écrivaient toutes deux N+1 → double-consommation silencieuse de séances
-- PAYÉES (et double attribution de XP). Ces RPC font l'incrément côté SQL, sous
-- verrou de ligne, avec le plafond dans le WHERE — le pattern exact déjà utilisé
-- par increment_child_talents et consume_ai_feature_quota.

-- ── 1. consume_session_credit : débit atomique d'un crédit de séance ─────────
-- p_source : 'pack' (family_coverages) | 'campaign' (campaigns).
-- Renvoie true si la séance a été débitée (plafond respecté), false sinon —
-- l'appelant traite alors le financement comme absent (aucune écriture partielle).
CREATE OR REPLACE FUNCTION public.consume_session_credit(p_source text, p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- EXISTS(UPDATE…) interdit en Postgres : l'UPDATE passe par un CTE RETURNING.
  WITH claim AS (
    UPDATE public.family_coverages
    SET sessions_used = sessions_used + 1
    WHERE p_source = 'pack'
      AND id = p_id
      AND status = 'active'
      AND ends_at > now()
      AND sessions_used < sessions
    RETURNING 1
  ),
  claim_campaign AS (
    UPDATE public.campaigns
    SET sessions_used = sessions_used + 1
    WHERE p_source = 'campaign'
      AND id = p_id
      AND sessions_used < sessions_target
    RETURNING 1
  )
  SELECT (EXISTS (SELECT 1 FROM claim)) OR (EXISTS (SELECT 1 FROM claim_campaign));
$$;

-- ── 2. refund_session_credit : remboursement atomique (litige) ──────────────
CREATE OR REPLACE FUNCTION public.refund_session_credit(p_source text, p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claim AS (
    UPDATE public.family_coverages
    SET sessions_used = sessions_used - 1
    WHERE p_source = 'pack'
      AND id = p_id AND sessions_used > 0
    RETURNING 1
  ),
  claim_campaign AS (
    UPDATE public.campaigns
    SET sessions_used = sessions_used - 1
    WHERE p_source = 'campaign'
      AND id = p_id AND sessions_used > 0
    RETURNING 1
  )
  SELECT (EXISTS (SELECT 1 FROM claim)) OR (EXISTS (SELECT 1 FROM claim_campaign));
$$;

-- ── 3. increment_child_xp : XP atomique (la logique streak reste JS) ────────
CREATE OR REPLACE FUNCTION public.increment_child_xp(
  p_child_id uuid,
  p_gain integer,
  p_streak integer,
  p_activity_date timestamptz
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.child_profiles
  SET xp = xp + p_gain,
      streak = p_streak,
      last_activity_date = p_activity_date
  WHERE id = p_child_id
  RETURNING xp;
$$;

-- ── 4. bump_material_suggestion : upsert atomique du compteur de vue ────────
CREATE OR REPLACE FUNCTION public.bump_material_suggestion(
  p_tag text,
  p_sample_title text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.material_suggestions (tag, sample_challenge_title, seen_count, last_seen_at)
  VALUES (p_tag, p_sample_title, 1, now())
  ON CONFLICT (tag) DO UPDATE SET
    seen_count = public.material_suggestions.seen_count + 1,
    last_seen_at = now(),
    sample_challenge_title = EXCLUDED.sample_challenge_title;
$$;

-- ── 5. Dédup TIME_OVER : contrainte DB au lieu du check-then-insert ─────────
-- Un événement TIME_OVER par (enfant, défi) — l'insertion côté app passe en
-- ignoreDuplicates. Les doublons historiques existants sont écartés par la
-- construction partielle (min id conservé).
CREATE UNIQUE INDEX IF NOT EXISTS observation_events_time_over_uniq
ON public.observation_events (child_id, (payload ->> 'challenge_id'))
WHERE type = 'TIME_OVER';

-- ── Grants : service role uniquement (les server fn appellent via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.consume_session_credit(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_session_credit(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_child_xp(uuid, integer, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_material_suggestion(text, text) FROM PUBLIC, anon, authenticated;

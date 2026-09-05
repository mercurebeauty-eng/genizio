-- Migration: quotas persistants par fonctionnalité IA
-- Date: 2026-09-05
--
-- Compteur journalier d'usage des features IA coûteuses (Copilote Professeur,
-- puis futurs sites d'appel). Le runtime est serverless (Vercel/Nitro) : une
-- limite en mémoire mourrait à chaque cold start — l'état de quota vit en base.
-- Écriture via service-role uniquement : aucune policy RLS (les tables sans
-- policy ne sont pas accessibles aux rôles authentifiés).

CREATE TABLE IF NOT EXISTS public.ai_feature_usage (
  user_id uuid NOT NULL,
  feature text NOT NULL CHECK (feature IN ('educator_copilot')),
  period date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, period)
);

ALTER TABLE public.ai_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to ai_feature_usage"
ON public.ai_feature_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Incrément atomique avec contrôle de limite côté SQL : évite le race condition
-- read-then-write quand un professeur double-clique sur « Générer » (deux
-- requêtes concurrentes verraient toutes deux count = limit-1 et passeraient).
CREATE OR REPLACE FUNCTION public.consume_ai_feature_quota(
  p_user_id uuid,
  p_feature text,
  p_limit integer
)
RETURNS TABLE (allowed boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period date := (now() AT TIME ZONE 'utc')::date;
  v_count integer;
BEGIN
  INSERT INTO public.ai_feature_usage (user_id, feature, period, count)
  VALUES (p_user_id, p_feature, v_period, 1)
  ON CONFLICT (user_id, feature, period)
  DO UPDATE SET
    count = ai_feature_usage.count + 1,
    updated_at = now();

  SELECT count INTO v_count
  FROM public.ai_feature_usage
  WHERE user_id = p_user_id AND feature = p_feature AND period = v_period;

  RETURN QUERY SELECT v_count <= p_limit, GREATEST(p_limit - v_count, 0);
END;
$$;

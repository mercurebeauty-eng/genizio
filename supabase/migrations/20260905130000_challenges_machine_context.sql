-- Contexte machine des défis : colonnes typées au lieu du JSON sérialisé dans
-- pedagogical_context (référence : analyse architecture Naya, 2026-09-05).
--
-- La colonne TEXT challenges.pedagogical_context servait deux usages mélangés :
-- 1. la prose pédagogique lisible produite par l'IA (« Ce que Naya observe… ») ;
-- 2. cinq formes de JSON interne écrits à la main (JSON.stringify) :
--    {cycle_id, target_cause, is_discriminant, subject}            (défi discriminant)
--    {is_support_retest, cycle_id, ...}                            (retest de soutien)
--    {is_recommendation, type}                                     (recommandations)
--    {is_reformulation, original_challenge_id, modality_attempt,
--     presentation_mode}                                           (reformulation)
--    {...ctx, abandoned_processed: true}                           (marquage « traité »)
-- et relus par sous-chaîne (LIKE '%"cycle_id":"…"%', LIKE '%is_reformulation%') —
-- fragile (casse en silence au moindre changement de formatage) et inindexable.
--
-- Désormais les flags machine ont leurs colonnes typées et indexables ;
-- pedagogical_context reste exclusivement la prose humaine.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS hypothesis_cycle_id uuid REFERENCES public.hypothesis_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS challenge_role text CHECK (challenge_role IN ('discriminant', 'support_retest')),
  ADD COLUMN IF NOT EXISTS target_cause text,
  ADD COLUMN IF NOT EXISTS abandoned_processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_type text CHECK (recommendation_type IN ('ASPIRATION', 'ESSAIMAGE', 'STABILISATION', 'EXPLORATION')),
  ADD COLUMN IF NOT EXISTS reformulation_of uuid REFERENCES public.challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_challenges_hypothesis_cycle_id
  ON public.challenges (hypothesis_cycle_id) WHERE hypothesis_cycle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_challenges_reformulation_of
  ON public.challenges (reformulation_of) WHERE reformulation_of IS NOT NULL;

-- Backfill : extrait les flags machine du JSON sérialisé vers les colonnes, puis
-- vide pedagogical_context sur les lignes migrées (le JSON n'a jamais été de la
-- prose affichable — formatPedagogicalIntention le masquait). Ligne par ligne avec
-- EXCEPTION par ligne : une ligne sale (JSON invalide, uuid malformé) est
-- journalisée et ignorée, jamais bloquante. Ré-exécutable sans effet (les lignes
-- déjà migrées ont pedagogical_context NULL et ne matchent plus le filtre).
DO $$
DECLARE
  r RECORD;
  ctx JSONB;
  v_cycle_id UUID;
  v_original_id UUID;
  v_role TEXT;
  v_recommendation_type TEXT;
BEGIN
  FOR r IN
    SELECT id, pedagogical_context
    FROM public.challenges
    WHERE pedagogical_context LIKE '{%'
  LOOP
    BEGIN
      ctx := r.pedagogical_context::jsonb;

      -- Seules les formes machine connues sont migrées (garde anti-faux positif
      -- sur une prose qui commencerait par « { »).
      IF NOT (ctx ?| ARRAY['is_discriminant', 'is_support_retest', 'is_recommendation', 'is_reformulation', 'cycle_id']) THEN
        CONTINUE;
      END IF;

      v_cycle_id := NULL;
      IF ctx ? 'cycle_id' THEN
        v_cycle_id := (ctx->>'cycle_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.hypothesis_cycles hc WHERE hc.id = v_cycle_id) THEN
          v_cycle_id := NULL; -- cycle supprimé entre-temps : le flag reste, le lien tombe
        END IF;
      END IF;

      IF COALESCE((ctx->>'is_support_retest')::boolean, false) THEN
        v_role := 'support_retest';
      ELSIF COALESCE((ctx->>'is_discriminant')::boolean, false) OR v_cycle_id IS NOT NULL THEN
        v_role := 'discriminant';
      ELSE
        v_role := NULL;
      END IF;

      v_recommendation_type := CASE
        WHEN COALESCE((ctx->>'is_recommendation')::boolean, false) THEN ctx->>'type'
      END;

      v_original_id := NULL;
      IF ctx ? 'original_challenge_id' THEN
        v_original_id := (ctx->>'original_challenge_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.challenges c2 WHERE c2.id = v_original_id) THEN
          v_original_id := NULL; -- original supprimé : ON DELETE SET NULL aurait fait pareil
        END IF;
      END IF;

      UPDATE public.challenges SET
        hypothesis_cycle_id = v_cycle_id,
        challenge_role = v_role,
        target_cause = ctx->>'target_cause',
        abandoned_processed = COALESCE((ctx->>'abandoned_processed')::boolean, false),
        recommendation_type = v_recommendation_type,
        reformulation_of = v_original_id,
        pedagogical_context = NULL
      WHERE id = r.id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill pedagogical_context : ligne % ignorée (%)', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

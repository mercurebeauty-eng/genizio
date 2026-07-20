-- NAYA 2.0 Phase 1 — Jumeau Pédagogique v1 (0 IA)
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md, décision #27/#28)
--
-- Consomme les événements de la Phase 0 (observation_events) pour maintenir un état
-- courant par enfant (pedagogical_twins) + un historique versionné (trait_series),
-- via lissage exponentiel déterministe. Aucun appel IA ici.
--
-- Décisions de conception prises à cette phase (documentées ici pour le lecteur SQL,
-- détaillées avec leurs alternatives rejetées dans genizio_decisions.md #28) :
-- 1. Niveau 3 "Compétences" réutilise les 9 clés Gardner déjà en place
--    (child_profiles.talents / VALID_TALENT_KEYS) plutôt qu'un nouveau vocabulaire —
--    évite la fragmentation déjà vécue avec les Guildes vs Gardner. C'est un signal
--    DÉRIVÉ différent (moyenne mobile [0,1] avec tendance), pas un doublon du score
--    cumulatif déjà affiché au parent.
-- 2. Seule la persévérance (N2) est calculée en v1 — curiosité/autonomie/compétition/
--    tolérance à la frustration n'ont pas encore de signal fiable dans la forme
--    actuelle des événements. Champs absents du JSONB plutôt que valeurs inventées.
-- 3. Recalcul événementiel (trigger), pas de pg_cron — résout la question ouverte du
--    plan. Cohérent avec le pattern déjà utilisé en Phase 0.
-- 4. Intérêts : "déclarés" (INTEREST_EXPRESSED) et "domaines engagés" (comportemental,
--    vocabulaire DOMAINS des défis) sont deux axes distincts, jamais fusionnés — les
--    deux vocabulaires ne se recouvrent pas 1:1, un mapping inventé serait malhonnête.
--    Pas de décroissance temporelle en v1 (aucun job périodique n'existe) — backlog.

CREATE TABLE public.pedagogical_twins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- { "perseverance": { value, trend, variance, category, n, updated_at } }
  drivers jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { "creative": { value, trend, variance, category, n, updated_at }, ... } — clés Gardner
  competencies jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { "declared": { "<tag>": {weight, last_at} }, "domains_engaged": { "<domaine>": {weight, count, last_at} } }
  interests jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trait_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  level integer NOT NULL CHECK (level IN (2, 3)), -- 2=Moteur, 3=Compétence (N1/N4 hors scope v1)
  trait_key text NOT NULL,
  value numeric NOT NULL CHECK (value >= 0 AND value <= 1),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source_event_id uuid REFERENCES public.observation_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_trait_series_child_trait_time
  ON public.trait_series (child_id, trait_key, recorded_at DESC);

ALTER TABLE public.pedagogical_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trait_series ENABLE ROW LEVEL SECURITY;

-- Donnée la plus sensible du produit (psychométrie d'enfants) : lecture owner-only,
-- AUCUNE policy d'écriture pour authenticated/anon — les seules écritures possibles
-- passent par les fonctions SECURITY DEFINER ci-dessous (EXECUTE révoqué au public).
CREATE POLICY "Parents read their own pedagogical twins"
  ON public.pedagogical_twins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Parents read their own trait series"
  ON public.trait_series FOR SELECT USING (auth.uid() = user_id);

-- ── Classification Force/Faiblesse/Fragilité/Risque/Émergence (§4 du plan) ─────────
-- Seuils v1 : heuristiques produit non calibrées sur des données réelles, pas de la
-- psychométrie validée. Documentées ici pour être retrouvées et ajustées.
CREATE OR REPLACE FUNCTION public.classify_trait(p_value numeric, p_trend numeric, p_variance numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  c_trend_critical CONSTANT numeric := -0.02; -- déclin net entre points consécutifs
  c_variance_high CONSTANT numeric := 0.02;   -- dents de scie sur une échelle [0,1]
BEGIN
  IF p_value IS NULL OR p_trend IS NULL THEN
    RETURN NULL; -- pas encore assez de points (cf. v_min_n dans record_trait_point)
  END IF;

  IF p_value > 0.7 THEN
    IF p_trend < c_trend_critical THEN RETURN 'RISQUE'; END IF;
    RETURN 'FORCE';
  ELSIF p_value < 0.3 THEN
    IF p_trend > 0 THEN RETURN 'FAIBLESSE'; END IF;
    IF p_trend < c_trend_critical THEN RETURN 'RISQUE'; END IF;
    RETURN 'FRAGILITE';
  ELSE
    IF p_variance IS NOT NULL AND p_variance > c_variance_high THEN RETURN 'FRAGILITE'; END IF;
    RETURN 'EMERGENCE';
  END IF;
END;
$$;

-- ── Mise à jour EMA d'un trait unique + versioning + classification ────────────────
-- p_field : 'drivers' ou 'competencies' — quelle colonne JSONB de pedagogical_twins
-- porte ce trait_key. Un seul point d'écriture pour les deux niveaux plutôt que du
-- code dupliqué : la seule différence entre les deux est la colonne cible.
CREATE OR REPLACE FUNCTION public.record_trait_point(
  p_child_id uuid,
  p_user_id uuid,
  p_level integer,
  p_trait_key text,
  p_signal numeric,
  p_alpha numeric,
  p_source_event_id uuid,
  p_occurred_at timestamptz,
  p_field text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_value numeric;
  v_new_value numeric;
  v_n integer;
  v_trend numeric;
  v_variance numeric;
  v_category text;
  v_min_n CONSTANT integer := 4; -- sous ce seuil, une régression linéaire est trop bruitée pour être publiée
  v_window CONSTANT integer := 10; -- "les N derniers points" du plan
BEGIN
  IF p_field NOT IN ('drivers', 'competencies') THEN
    RAISE EXCEPTION 'record_trait_point: p_field invalide (%)', p_field;
  END IF;

  INSERT INTO pedagogical_twins (child_id, user_id) VALUES (p_child_id, p_user_id)
    ON CONFLICT (child_id) DO NOTHING;

  IF p_field = 'drivers' THEN
    SELECT (drivers -> p_trait_key ->> 'value')::numeric INTO v_old_value
      FROM pedagogical_twins WHERE child_id = p_child_id;
  ELSE
    SELECT (competencies -> p_trait_key ->> 'value')::numeric INTO v_old_value
      FROM pedagogical_twins WHERE child_id = p_child_id;
  END IF;

  -- Lissage exponentiel ; pas de valeur antérieure = le premier signal devient la valeur.
  IF v_old_value IS NULL THEN
    v_new_value := p_signal;
  ELSE
    v_new_value := v_old_value * (1 - p_alpha) + p_signal * p_alpha;
  END IF;
  v_new_value := GREATEST(0, LEAST(1, v_new_value));

  INSERT INTO trait_series (child_id, user_id, level, trait_key, value, recorded_at, source_event_id)
  VALUES (p_child_id, p_user_id, p_level, p_trait_key, v_new_value, p_occurred_at, p_source_event_id);

  SELECT count(*) INTO v_n FROM trait_series
    WHERE child_id = p_child_id AND trait_key = p_trait_key;

  IF v_n >= v_min_n THEN
    -- row_number() croissant par recorded_at ASC sur les v_window points les plus
    -- récents : une pente positive signifie "en hausse dans le temps", intuitif.
    WITH last_n AS (
      SELECT value, recorded_at FROM trait_series
      WHERE child_id = p_child_id AND trait_key = p_trait_key
      ORDER BY recorded_at DESC LIMIT v_window
    ),
    numbered AS (
      SELECT value, row_number() OVER (ORDER BY recorded_at ASC) AS seq FROM last_n
    )
    SELECT regr_slope(value, seq), variance(value) INTO v_trend, v_variance FROM numbered;
    v_category := classify_trait(v_new_value, v_trend, v_variance);
  ELSE
    v_trend := NULL;
    v_variance := NULL;
    v_category := NULL;
  END IF;

  IF p_field = 'drivers' THEN
    UPDATE pedagogical_twins SET
      drivers = jsonb_set(drivers, ARRAY[p_trait_key], jsonb_build_object(
        'value', v_new_value, 'trend', v_trend, 'variance', v_variance,
        'category', v_category, 'n', v_n, 'updated_at', p_occurred_at
      )),
      last_computed_at = now(), updated_at = now()
    WHERE child_id = p_child_id;
  ELSE
    UPDATE pedagogical_twins SET
      competencies = jsonb_set(competencies, ARRAY[p_trait_key], jsonb_build_object(
        'value', v_new_value, 'trend', v_trend, 'variance', v_variance,
        'category', v_category, 'n', v_n, 'updated_at', p_occurred_at
      )),
      last_computed_at = now(), updated_at = now()
    WHERE child_id = p_child_id;
  END IF;
END;
$$;

-- ── Dispatcher : un observation_event -> les mises à jour de traits qu'il déclenche ─
CREATE OR REPLACE FUNCTION public.apply_observation_to_twin(p_event public.observation_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  -- Doit rester synchronisé avec VALID_TALENT_KEYS (src/lib/talent-buckets.ts).
  v_valid_keys CONSTANT text[] := ARRAY[
    'spatial', 'corporelle', 'sociale', 'entrepreneuriale', 'creative',
    'artisanale', 'emotionnelle', 'logico_mathematique', 'linguistique'
  ];
  v_domain text;
  v_old_weight numeric;
  v_new_weight numeric;
  v_old_count integer;
BEGIN
  IF p_event.type = 'CHALLENGE_COMPLETED' THEN
    -- Compétences (N3) : uniquement si validé par l'IA (target_intelligences est
    -- alors la liste contrainte aux 9 clés — voir validateChallengeProof). Une
    -- complétion marquée "terminé" manuellement sans validation IA a
    -- target_intelligences = valeurs décoratives de création (libellés libres, ex.
    -- "Créativité") qui ne matchent aucune clé v_valid_keys : le filtre ci-dessous
    -- les ignore naturellement, en plus de cette garde explicite — cohérent avec le
    -- principe déjà en place "pas de score sans preuve réelle".
    IF (p_event.payload ->> 'ai_validated')::boolean IS TRUE THEN
      FOR v_key IN SELECT jsonb_array_elements_text(COALESCE(p_event.payload -> 'target_intelligences', '[]'::jsonb))
      LOOP
        IF v_key = ANY(v_valid_keys) THEN
          PERFORM record_trait_point(p_event.child_id, p_event.user_id, 3, v_key,
            1.0, 0.25, p_event.id, p_event.occurred_at, 'competencies');
        END IF;
      END LOOP;
    END IF;

    -- Persévérance (N2) : signal comportemental ("est allé au bout"), indépendant
    -- de la validation IA du contenu — deux préoccupations distinctes.
    PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'perseverance',
      0.65, 0.08, p_event.id, p_event.occurred_at, 'drivers');

    -- Intérêts comportementaux : renforcement du domaine engagé ("choix répétés").
    v_domain := p_event.payload ->> 'domain';
    IF v_domain IS NOT NULL THEN
      INSERT INTO pedagogical_twins (child_id, user_id) VALUES (p_event.child_id, p_event.user_id)
        ON CONFLICT (child_id) DO NOTHING;
      SELECT (interests -> 'domains_engaged' -> v_domain ->> 'weight')::numeric,
             (interests -> 'domains_engaged' -> v_domain ->> 'count')::integer
        INTO v_old_weight, v_old_count
        FROM pedagogical_twins WHERE child_id = p_event.child_id;
      v_new_weight := LEAST(1.0, COALESCE(v_old_weight, 0) + 0.2);
      UPDATE pedagogical_twins SET
        interests = jsonb_set(
          jsonb_set(interests, '{domains_engaged}', COALESCE(interests -> 'domains_engaged', '{}'::jsonb), true),
          ARRAY['domains_engaged', v_domain],
          jsonb_build_object('weight', v_new_weight, 'count', COALESCE(v_old_count, 0) + 1, 'last_at', p_event.occurred_at)
        ),
        updated_at = now()
      WHERE child_id = p_event.child_id;
    END IF;

  ELSIF p_event.type = 'CHALLENGE_ABANDONED' THEN
    PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'perseverance',
      0.15, 0.08, p_event.id, p_event.occurred_at, 'drivers');

  ELSIF p_event.type = 'INTEREST_EXPRESSED' THEN
    -- Intérêts déclarés : renforce, n'efface jamais un tag retiré (signal doux,
    -- pas une suppression autoritaire — cf. §5 du plan sur la décroissance différée).
    INSERT INTO pedagogical_twins (child_id, user_id) VALUES (p_event.child_id, p_event.user_id)
      ON CONFLICT (child_id) DO NOTHING;
    FOR v_key IN SELECT jsonb_array_elements_text(COALESCE(p_event.payload -> 'interests', '[]'::jsonb))
    LOOP
      SELECT (interests -> 'declared' -> v_key ->> 'weight')::numeric INTO v_old_weight
        FROM pedagogical_twins WHERE child_id = p_event.child_id;
      v_new_weight := CASE WHEN v_old_weight IS NULL THEN 0.6 ELSE LEAST(1.0, v_old_weight + 0.1) END;
      UPDATE pedagogical_twins SET
        interests = jsonb_set(
          jsonb_set(interests, '{declared}', COALESCE(interests -> 'declared', '{}'::jsonb), true),
          ARRAY['declared', v_key],
          jsonb_build_object('weight', v_new_weight, 'last_at', p_event.occurred_at)
        ),
        updated_at = now()
      WHERE child_id = p_event.child_id;
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_apply_observation_to_twin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_observation_to_twin(NEW);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_apply_observation_to_twin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_observation_to_twin(public.observation_events) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_trait_point(uuid, uuid, integer, text, numeric, numeric, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.classify_trait(numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_observation_events_update_twin
  AFTER INSERT ON public.observation_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_observation_to_twin();

-- ── Backfill : rejoue l'historique déjà capté par la Phase 0 ───────────────────────
-- Ordonné chronologiquement (occurred_at) pour que trend/variance reconstitués
-- reflètent la vraie chronologie, pas l'ordre d'écriture de cette migration.
DO $$
DECLARE r public.observation_events%ROWTYPE;
BEGIN
  FOR r IN
    SELECT * FROM public.observation_events
    WHERE type IN ('CHALLENGE_COMPLETED', 'CHALLENGE_ABANDONED', 'INTEREST_EXPRESSED')
    ORDER BY occurred_at ASC
  LOOP
    PERFORM public.apply_observation_to_twin(r);
  END LOOP;
END $$;

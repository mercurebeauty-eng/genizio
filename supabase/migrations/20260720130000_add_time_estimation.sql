-- NAYA 2.0 / Atelier du Temps — mécanique "Estimation" (V3, décision #29/#30)
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md §9, genizio_decisions.md #30)
--
-- Le child (via le parent) prédit combien de temps un défi va lui prendre au moment
-- de l'assigner depuis l'Atelier. À la complétion, on compare l'estimation au temps
-- réellement écoulé — c'est le signal de métacognition temporelle que la Phase 1
-- avait laissé vide faute de source (décision #28 : "champs absents plutôt que
-- valeurs inventées"). Zéro IA ici, uniquement de la mesure + de la comparaison.
--
-- Additif pur : aucune colonne existante modifiée, aucun payload existant réduit,
-- aucune sémantique changée pour les défis qui n'utilisent pas l'Atelier (leurs
-- deux nouvelles colonnes restent NULL, aucune carte de reflet ne s'affiche pour
-- eux — comportement inchangé).

ALTER TABLE public.challenges
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN started_at timestamptz;

-- ── started_at : géré par trigger, pas par le code applicatif ──────────────────────
-- Choix délibéré (cf. décision #30) : contrairement à `completed_at` (déjà géré côté
-- application avant cette session), started_at suit le principe déjà établi en Phase
-- 0/1 — un signal qui ne peut pas être oublié par un futur chemin de mutation. Capturé
-- au premier passage à 'in_progress' seulement (jamais écrasé par une ré-entrée) ;
-- remis à NULL si le défi retourne à 'todo', pour qu'une reprise ultérieure mesure
-- honnêtement SA propre durée plutôt qu'un total agrégé sur plusieurs tentatives.
CREATE OR REPLACE FUNCTION public.set_challenge_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.started_at IS NULL THEN
    NEW.started_at := now();
  ELSIF NEW.status = 'todo' THEN
    NEW.started_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- RETURNS TRIGGER n'est de toute façon pas appelable hors contexte de trigger, mais
-- get_advisors flague l'EXECUTE PUBLIC par défaut de Postgres — même défense en
-- profondeur que le reste de la Phase 0/1 (cf. décision #22).
REVOKE EXECUTE ON FUNCTION public.set_challenge_started_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_challenges_set_started_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_started_at();

-- ── Extension du payload CHALLENGE_COMPLETED (Phase 0) ─────────────────────────────
-- CREATE OR REPLACE préserve l'OID de la fonction : les triggers existants
-- (trg_challenges_observation_*) pointent dessus sans avoir besoin d'être recréés.
-- Tous les champs déjà émis (domain, difficulty, target_intelligences, ai_validated,
-- has_proof_image, days_since_assigned) restent identiques — extension pure.
CREATE OR REPLACE FUNCTION public.log_challenge_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_open numeric;
  v_actual_minutes numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.observation_events (child_id, user_id, type, payload)
    VALUES (
      NEW.child_id, NEW.user_id, 'CHALLENGE_ASSIGNED',
      jsonb_build_object(
        'challenge_id', NEW.id,
        'domain', NEW.domain,
        'difficulty', NEW.difficulty,
        'requires_supervision', NEW.requires_supervision,
        'target_intelligences', NEW.target_intelligences
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_days_open := round((EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 86400.0)::numeric, 2);
    IF NEW.status = 'in_progress' THEN
      INSERT INTO public.observation_events (child_id, user_id, type, payload)
      VALUES (
        NEW.child_id, NEW.user_id, 'CHALLENGE_STARTED',
        jsonb_build_object(
          'challenge_id', NEW.id,
          'domain', NEW.domain,
          'days_since_assigned', v_days_open
        )
      );
    ELSIF NEW.status = 'completed' THEN
      -- Temps réel écoulé UNIQUEMENT si started_at existe (mesure du travail actif,
      -- pas du temps passé dans la liste "à faire" — un défi qui traîne 3 jours avant
      -- d'être commencé ne doit jamais se comparer à une estimation de 30 minutes).
      v_actual_minutes := CASE WHEN NEW.started_at IS NOT NULL
        THEN round((EXTRACT(EPOCH FROM (now() - NEW.started_at)) / 60.0)::numeric, 1)
        ELSE NULL END;
      INSERT INTO public.observation_events (child_id, user_id, type, payload)
      VALUES (
        NEW.child_id, NEW.user_id, 'CHALLENGE_COMPLETED',
        jsonb_build_object(
          'challenge_id', NEW.id,
          'domain', NEW.domain,
          'difficulty', NEW.difficulty,
          'target_intelligences', NEW.target_intelligences,
          'ai_validated', NEW.ai_observations IS NOT NULL,
          'has_proof_image', NEW.proof_image_url IS NOT NULL,
          'days_since_assigned', v_days_open,
          'estimated_duration_minutes', NEW.estimated_duration_minutes,
          'actual_duration_minutes', v_actual_minutes
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'completed'
       AND EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = OLD.child_id) THEN
      INSERT INTO public.observation_events (child_id, user_id, type, payload)
      VALUES (
        OLD.child_id, OLD.user_id, 'CHALLENGE_ABANDONED',
        jsonb_build_object(
          'challenge_id', OLD.id,
          'domain', OLD.domain,
          'status_when_deleted', OLD.status,
          'days_since_assigned',
            round((EXTRACT(EPOCH FROM (now() - OLD.created_at)) / 86400.0)::numeric, 2)
        )
      );
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Extension du dispatcher Phase 1 : nouveau driver N2 "time_awareness" ───────────
-- Décision #30 : ce n'est pas une "Compétence" (N3) — décision #28 a fermé le N3 aux
-- 9 clés Gardner pour éviter la fragmentation, et la précision d'estimation ne
-- correspond à aucune d'elles. C'est un Moteur (N2) au même titre que la persévérance :
-- une capacité de régulation générale, pas un domaine d'intelligence. Signal
-- symétrique (sous- ET sur-estimer comptent pareil), borné [0,1] par construction.
CREATE OR REPLACE FUNCTION public.apply_observation_to_twin(p_event public.observation_events)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_valid_keys CONSTANT text[] := ARRAY[
    'spatial', 'corporelle', 'sociale', 'entrepreneuriale', 'creative',
    'artisanale', 'emotionnelle', 'logico_mathematique', 'linguistique'
  ];
  v_domain text;
  v_old_weight numeric;
  v_new_weight numeric;
  v_old_count integer;
  v_estimated numeric;
  v_actual numeric;
  v_accuracy numeric;
BEGIN
  IF p_event.type = 'CHALLENGE_COMPLETED' THEN
    IF (p_event.payload ->> 'ai_validated')::boolean IS TRUE THEN
      FOR v_key IN SELECT jsonb_array_elements_text(COALESCE(p_event.payload -> 'target_intelligences', '[]'::jsonb))
      LOOP
        IF v_key = ANY(v_valid_keys) THEN
          PERFORM record_trait_point(p_event.child_id, p_event.user_id, 3, v_key,
            1.0, 0.25, p_event.id, p_event.occurred_at, 'competencies');
        END IF;
      END LOOP;
    END IF;

    PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'perseverance',
      0.65, 0.08, p_event.id, p_event.occurred_at, 'drivers');

    -- Time-awareness (N2) : précision de l'estimation ("combien de temps penses-tu ?"
    -- de l'Atelier du Temps) — uniquement si une estimation ET une mesure réelle
    -- existent toutes les deux (défis hors-Atelier : les deux restent NULL, pas de
    -- signal fabriqué, cohérent avec le principe déjà établi en décision #28).
    v_estimated := (p_event.payload ->> 'estimated_duration_minutes')::numeric;
    v_actual := (p_event.payload ->> 'actual_duration_minutes')::numeric;
    IF v_estimated IS NOT NULL AND v_actual IS NOT NULL AND v_estimated > 0 AND v_actual > 0 THEN
      v_accuracy := 1 - LEAST(1, abs(v_actual - v_estimated) / GREATEST(v_estimated, v_actual));
      PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'time_awareness',
        v_accuracy, 0.08, p_event.id, p_event.occurred_at, 'drivers');
    END IF;

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

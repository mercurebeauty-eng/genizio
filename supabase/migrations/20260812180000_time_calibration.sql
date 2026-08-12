-- Calibration du temps par les observations (chantier 4, spec NAYA V4 — analyse §5 suite).
--
-- Principe : `time_pressure` devient un paramètre APPRIS, jamais imposé. Le déclencheur
-- de la boucle vit côté applicatif (`getGentleTimeSuggestion` — N répétitions de
-- TIME_OVER dans un même domaine → proposition de passage en `gentle`, le parent
-- valide, l'admin surmodule déjà via l'onglet Profils). Cette migration ajoute le
-- versant Jumeau : jusqu'ici TIME_OVER n'était consommé nulle part — le dépassement
-- de temps n'alimentait pas le driver time_awareness. Un TIME_OVER est un signal de
-- mauvaise gestion du temps (la limite a été dépassée) : point faible enregistré,
-- comme CHALLENGE_ABANDONED l'est pour la persévérance. Jamais punitif.

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
  v_mode text;
  v_failed integer;
  v_succeeded integer;
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

    -- Signal modalité : cette modalité-là a RÉUSSI (si le défi en portait une).
    v_mode := p_event.payload ->> 'presentation_mode';
    IF v_mode IS NOT NULL THEN
      INSERT INTO pedagogical_twins (child_id, user_id) VALUES (p_event.child_id, p_event.user_id)
        ON CONFLICT (child_id) DO NOTHING;
      SELECT (presentation_signals -> v_mode ->> 'succeeded')::integer INTO v_succeeded
        FROM pedagogical_twins WHERE child_id = p_event.child_id;
      UPDATE pedagogical_twins SET
        presentation_signals = jsonb_set(presentation_signals, ARRAY[v_mode],
          jsonb_build_object(
            'failed', COALESCE((presentation_signals -> v_mode ->> 'failed')::integer, 0),
            'succeeded', COALESCE(v_succeeded, 0) + 1,
            'last_succeeded_at', p_event.occurred_at
          )),
        updated_at = now()
      WHERE child_id = p_event.child_id;
    END IF;

  ELSIF p_event.type IN ('CHALLENGE_ABANDONED', 'CHALLENGE_NOT_COMPLETED') THEN
    PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'perseverance',
      0.15, 0.08, p_event.id, p_event.occurred_at, 'drivers');

    -- Signal modalité : cette modalité-là a ÉCHOUÉ (si le défi en portait une).
    -- C'est le cœur de la boucle de réévaluation : sans ce comptage, le Jumeau
    -- ne peut pas apprendre « quelle manière d'enseigner ne marche pas » (§22-26).
    v_mode := p_event.payload ->> 'presentation_mode';
    IF v_mode IS NOT NULL THEN
      INSERT INTO pedagogical_twins (child_id, user_id) VALUES (p_event.child_id, p_event.user_id)
        ON CONFLICT (child_id) DO NOTHING;
      SELECT (presentation_signals -> v_mode ->> 'failed')::integer INTO v_failed
        FROM pedagogical_twins WHERE child_id = p_event.child_id;
      UPDATE pedagogical_twins SET
        presentation_signals = jsonb_set(presentation_signals, ARRAY[v_mode],
          jsonb_build_object(
            'failed', COALESCE(v_failed, 0) + 1,
            'succeeded', COALESCE((presentation_signals -> v_mode ->> 'succeeded')::integer, 0),
            'last_failed_at', p_event.occurred_at
          )),
        updated_at = now()
      WHERE child_id = p_event.child_id;
    END IF;

  ELSIF p_event.type = 'TIME_OVER' THEN
    -- Calibration du temps (chantier 4, §5 suite) : le dépassement de la limite
    -- (jamais punitif — l'enfant peut continuer) alimente le driver time_awareness
    -- comme un point faible. La suggestion de passage en mode `gentle` (validation
    -- parent) se lit côté applicatif sur les événements bruts.
    PERFORM record_trait_point(p_event.child_id, p_event.user_id, 2, 'time_awareness',
      0.25, 0.08, p_event.id, p_event.occurred_at, 'drivers');

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

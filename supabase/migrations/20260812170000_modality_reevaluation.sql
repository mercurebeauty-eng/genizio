-- Boucle de réévaluation des modalités d'apprentissage (chantier 3, spec NAYA V4 —
-- analyse utilisateur « Évolution de Génizio » §22-26, §35, §38).
--
-- Principe : un échec n'est jamais un verdict. Quand un défi échoue, Naya peut le
-- reformuler dans une AUTRE modalité de présentation (manipulation, histoire,
-- analogie…) en gardant le même objectif pédagogique — jusqu'à 3 essais avant
-- toute conclusion (cf. §36, « l'enfant ne sait-il pas faire, ou n'avons-nous pas
-- trouvé la bonne manière de lui faire démontrer qu'il sait faire ? »).
--
--   • challenges.presentation_mode : modalité de présentation du défi (NULL =
--     non déclarée — les défis existants et les micro-défis classiques).
--   • observation_events.type : 'CHALLENGE_NOT_COMPLETED' ajouté au CHECK — répare
--     le canal troué échec → Jumeau (le trigger ignorait jusqu'ici le passage à
--     status='not_completed', le Jumeau ne voyait jamais les échecs).
--   • log_challenge_observation : branche not_completed + presentation_mode dans
--     les payloads COMPLETED/NOT_COMPLETED.
--   • pedagogical_twins.presentation_signals : comptage par modalité (échecs vs
--     réussites) — le signal « qu'est-ce qui échoue / qu'est-ce qui marche ».

-- ── 1. Modalité de présentation sur les défis ─────────────────────────────────
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS presentation_mode text
    CHECK (presentation_mode IS NULL OR presentation_mode IN (
      'texte', 'image', 'demonstration', 'manipulation', 'histoire',
      'analogie', 'conversation', 'projet', 'situation_concrete'
    ));

-- ── 2. Événement CHALLENGE_NOT_COMPLETED (append-only) ─────────────────────────
ALTER TABLE public.observation_events DROP CONSTRAINT IF EXISTS observation_events_type_check;
ALTER TABLE public.observation_events ADD CONSTRAINT observation_events_type_check
  CHECK (type IN (
    'CHALLENGE_ASSIGNED', 'CHALLENGE_STARTED', 'CHALLENGE_COMPLETED',
    'PROOF_REJECTED', 'CHALLENGE_ABANDONED', 'INTEREST_EXPRESSED',
    'SCHOOL_GRADE_ENTERED', 'BEHAVIOR_FLAG', 'TIME_OVER', 'CHALLENGE_NOT_COMPLETED'
  ));

-- ── 3. Trigger de capture : branche not_completed + modalité dans les payloads ──
CREATE OR REPLACE FUNCTION public.log_challenge_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days_open numeric;
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
        'target_intelligences', NEW.target_intelligences,
        'presentation_mode', NEW.presentation_mode
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
          'presentation_mode', NEW.presentation_mode
        )
      );
    ELSIF NEW.status = 'not_completed' THEN
      -- Canal échec → Jumeau réparé : l'échec déclaré (cause classifiée ou non)
      -- est journalisé comme tout autre signal, pour que le Jumeau puisse apprendre
      -- « quelle manière d'enseigner échoue » (signal modalité, cf. §22-26).
      INSERT INTO public.observation_events (child_id, user_id, type, payload)
      VALUES (
        NEW.child_id, NEW.user_id, 'CHALLENGE_NOT_COMPLETED',
        jsonb_build_object(
          'challenge_id', NEW.id,
          'domain', NEW.domain,
          'presentation_mode', NEW.presentation_mode,
          'cause', NEW.not_completed_cause
        )
      );
    END IF;
    -- Transition completed -> todo (reset) : volontairement sans événement.
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Un défi supprimé sans avoir été complété = signal d'abandon.
    -- Garde EXISTS : lors d'une suppression de profil entier, la cascade
    -- supprime les défis alors que la ligne child_profiles est déjà en cours
    -- de suppression — insérer un événement référençant ce child_id violerait
    -- la FK et ferait échouer toute la suppression du profil. Dans ce cas on
    -- n'émet rien (les événements de l'enfant partent via la même cascade).
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

-- ── 4. Signaux de présentation dans le Jumeau Pédagogique ─────────────────────
-- Exemple : { "manipulation": { "failed": 3, "succeeded": 1, "last_failed_at": … } }
ALTER TABLE public.pedagogical_twins
  ADD COLUMN IF NOT EXISTS presentation_signals jsonb NOT NULL DEFAULT '{}'::jsonb;

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

-- NAYA 2.0 Phase 0 — socle événementiel du Système de Compréhension Développementale
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md, décision #27)
--
-- Journal append-only de tout signal observable sur un enfant. Aucune interprétation
-- ici : les mises à jour du Jumeau Pédagogique (Phase 1) consommeront ces lignes.
-- Capture par triggers DB plutôt que par le code applicatif : aucun chemin de
-- mutation présent ou futur ne peut oublier d'émettre. Seul PROOF_REJECTED, qui ne
-- laisse aucune trace en base par design (une soumission rejetée ne modifie rien),
-- est émis applicativement depuis validateChallengeProof.

CREATE TABLE public.observation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN (
    'CHALLENGE_ASSIGNED', 'CHALLENGE_STARTED', 'CHALLENGE_COMPLETED',
    'PROOF_REJECTED', 'CHALLENGE_ABANDONED', 'INTEREST_EXPRESSED',
    'SCHOOL_GRADE_ENTERED', 'BEHAVIOR_FLAG'
  )),
  source text NOT NULL DEFAULT 'db_trigger' CHECK (source IN ('db_trigger', 'app', 'backfill')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- occurred_at = moment réel de l'événement (le backfill remonte des dates
  -- historiques) ; recorded_at = moment de l'écriture de la ligne.
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false
);

-- Pattern de lecture des Phases 1-2 : l'historique d'un enfant, par type, chronologique.
CREATE INDEX idx_observation_events_child_type_time
  ON public.observation_events (child_id, type, occurred_at DESC);
-- File de traitement de la Phase 1 (updaters du Jumeau Pédagogique).
CREATE INDEX idx_observation_events_unprocessed
  ON public.observation_events (recorded_at) WHERE NOT processed;

ALTER TABLE public.observation_events ENABLE ROW LEVEL SECURITY;

-- Lecture : le parent voit les événements de ses propres enfants uniquement.
CREATE POLICY "Parents read their own observation events"
  ON public.observation_events FOR SELECT
  USING (auth.uid() = user_id);

-- Écriture applicative (ex. PROOF_REJECTED) : uniquement pour soi ET pour un
-- enfant réellement possédé (leçon des décisions #20/#22 : jamais faire
-- confiance à un child_id fourni par le client sans vérifier l'ownership).
CREATE POLICY "Parents insert events for their own children"
  ON public.observation_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = observation_events.child_id AND cp.user_id = auth.uid()
    )
  );

-- Append-only : aucune policy UPDATE/DELETE (pattern consent_events). Le flag
-- processed sera géré côté serveur (service role) par le pipeline de Phase 1.

-- ── Triggers de capture sur challenges ─────────────────────────────────────

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
          'days_since_assigned', v_days_open
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

-- Les fonctions RETURNS TRIGGER ne sont pas appelables hors contexte de trigger,
-- mais Postgres accorde EXECUTE à PUBLIC par défaut et get_advisors le signale
-- (cf. décision #22) — même défense en profondeur ici.
REVOKE EXECUTE ON FUNCTION public.log_challenge_observation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_challenges_observation_insert
  AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.log_challenge_observation();

CREATE TRIGGER trg_challenges_observation_update
  AFTER UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.log_challenge_observation();

CREATE TRIGGER trg_challenges_observation_delete
  AFTER DELETE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.log_challenge_observation();

-- ── Trigger de capture sur child_profiles (centres d'intérêt) ──────────────

CREATE OR REPLACE FUNCTION public.log_interest_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.interests IS NOT NULL AND array_length(NEW.interests, 1) > 0 THEN
      INSERT INTO public.observation_events (child_id, user_id, type, payload)
      VALUES (
        NEW.id, NEW.user_id, 'INTEREST_EXPRESSED',
        jsonb_build_object('interests', to_jsonb(NEW.interests), 'context', 'profile_created')
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.interests IS DISTINCT FROM NEW.interests THEN
    INSERT INTO public.observation_events (child_id, user_id, type, payload)
    VALUES (
      NEW.id, NEW.user_id, 'INTEREST_EXPRESSED',
      jsonb_build_object(
        'interests', to_jsonb(NEW.interests),
        'previous_interests', to_jsonb(OLD.interests),
        'context', 'profile_updated'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_interest_observation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_child_profiles_interest_insert
  AFTER INSERT ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_interest_observation();

CREATE TRIGGER trg_child_profiles_interest_update
  AFTER UPDATE ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_interest_observation();

-- ── Backfill de l'historique existant ──────────────────────────────────────
-- Reconstitue les événements passés depuis l'état actuel de challenges et
-- child_profiles, avec occurred_at historique. Vit dans la migration (jouée une
-- seule fois par environnement) — pas de risque de doublon au rejeu. S'exécute
-- après la création des triggers sans interférence : aucun trigger n'écoute
-- les INSERT sur observation_events elle-même.

INSERT INTO public.observation_events (child_id, user_id, type, source, payload, occurred_at)
SELECT
  c.child_id, c.user_id, 'CHALLENGE_ASSIGNED', 'backfill',
  jsonb_build_object(
    'challenge_id', c.id, 'domain', c.domain, 'difficulty', c.difficulty,
    'requires_supervision', c.requires_supervision,
    'target_intelligences', c.target_intelligences
  ),
  c.created_at
FROM public.challenges c;

INSERT INTO public.observation_events (child_id, user_id, type, source, payload, occurred_at)
SELECT
  c.child_id, c.user_id, 'CHALLENGE_COMPLETED', 'backfill',
  jsonb_build_object(
    'challenge_id', c.id, 'domain', c.domain, 'difficulty', c.difficulty,
    'target_intelligences', c.target_intelligences,
    'ai_validated', c.ai_observations IS NOT NULL,
    'has_proof_image', c.proof_image_url IS NOT NULL,
    'days_since_assigned',
      round((EXTRACT(EPOCH FROM (COALESCE(c.completed_at, c.updated_at) - c.created_at)) / 86400.0)::numeric, 2)
  ),
  COALESCE(c.completed_at, c.updated_at)
FROM public.challenges c
WHERE c.status = 'completed';

INSERT INTO public.observation_events (child_id, user_id, type, source, payload, occurred_at)
SELECT
  c.child_id, c.user_id, 'CHALLENGE_STARTED', 'backfill',
  jsonb_build_object('challenge_id', c.id, 'domain', c.domain, 'approximate_time', true),
  c.updated_at
FROM public.challenges c
WHERE c.status = 'in_progress';

INSERT INTO public.observation_events (child_id, user_id, type, source, payload, occurred_at)
SELECT
  cp.id, cp.user_id, 'INTEREST_EXPRESSED', 'backfill',
  jsonb_build_object('interests', to_jsonb(cp.interests), 'context', 'profile_created'),
  cp.created_at
FROM public.child_profiles cp
WHERE cp.interests IS NOT NULL AND array_length(cp.interests, 1) > 0;

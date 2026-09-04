-- Migration : Ajout du type d'événement CANDIDATE_OBSERVATIONS et source profile_engine
-- Permet à la boucle de rétroaction (Feedback Loop) de persister les micro-signaux pédagogiques.

ALTER TABLE public.observation_events DROP CONSTRAINT IF EXISTS observation_events_type_check;
ALTER TABLE public.observation_events ADD CONSTRAINT observation_events_type_check
  CHECK (type IN (
    'CHALLENGE_ASSIGNED', 'CHALLENGE_STARTED', 'CHALLENGE_COMPLETED',
    'PROOF_REJECTED', 'CHALLENGE_ABANDONED', 'INTEREST_EXPRESSED',
    'SCHOOL_GRADE_ENTERED', 'BEHAVIOR_FLAG', 'TIME_OVER', 'CHALLENGE_NOT_COMPLETED',
    'CANDIDATE_OBSERVATIONS'
  ));

ALTER TABLE public.observation_events DROP CONSTRAINT IF EXISTS observation_events_source_check;
ALTER TABLE public.observation_events ADD CONSTRAINT observation_events_source_check
  CHECK (source IN ('db_trigger', 'app', 'backfill', 'profile_engine'));

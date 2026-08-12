-- Temps adaptatif — le temps devient une composante pédagogique du défi (2026-08-12,
-- analyse utilisateur « Évolution de Génizio » §5).
--
-- La contrainte temporelle n'est PAS un verdict : à l'expiration, l'enfant peut
-- continuer (bannière douce), et un événement TIME_OVER est journalisé pour nourrir
-- le driver time_awareness du Jumeau Pédagogique — jamais d'auto-échec.
--
--   • child_profiles.time_pressure : préférence pédagogique de pression temporelle
--     déclarée par le parent (et surmodulable par l'Admin) —
--       standard : chrono appliqué à l'estimation (×1) ;
--       gentle   : temps rallongé (×1,5) ;
--       none     : pas de chrono (défis sans contrainte temporelle).
--   • challenges.time_limit_minutes : limite calculée au moment de l'assignation
--     (résolution côté applicatif, résolveTimeLimitMinutes) — NULL = pas de chrono.
--   • observation_events.type : 'TIME_OVER' ajouté au CHECK (append-only, émis par
--     la fonction serveur recordChallengeTimeOver quand le chrono expire).

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS time_pressure text NOT NULL DEFAULT 'standard'
    CHECK (time_pressure IN ('standard', 'gentle', 'none'));

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS time_limit_minutes integer;

ALTER TABLE public.observation_events DROP CONSTRAINT IF EXISTS observation_events_type_check;
ALTER TABLE public.observation_events ADD CONSTRAINT observation_events_type_check
  CHECK (type IN (
    'CHALLENGE_ASSIGNED', 'CHALLENGE_STARTED', 'CHALLENGE_COMPLETED',
    'PROOF_REJECTED', 'CHALLENGE_ABANDONED', 'INTEREST_EXPRESSED',
    'SCHOOL_GRADE_ENTERED', 'BEHAVIOR_FLAG', 'TIME_OVER'
  ));

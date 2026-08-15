-- Vague 2 « RLS mentor » du plan multicouche (2026-08-15) — voir docs/memoire/genizio_plan_multicouche.md.
--
-- Matérialise au niveau RLS la distinction spec §14 : ownership (parent) vs assignment
-- (mentor). Le mentor actif assigné (mentors.mentor_user_id = auth.uid() et removed_at
-- IS NULL) peut LIRE le profil et les défis de l'enfant qui lui est assigné — lecture
-- seule, jamais d'écriture : les écritures restent EXCLUSIVEMENT service role +
-- assertMentorOperator (choke-point unique, décision #74).
--
-- Sous-requêtes couvertes par l'index existant mentors_mentor_user_id_idx.
-- Idempotente (DROP POLICY IF EXISTS avant chaque CREATE POLICY).
--
-- ⚠️ NON APPLIQUÉE en prod avant revue (convention du repo).

-- Probes de vérification (à lancer dans Supabase Studio après le push, en tant que
-- compte mentor / parent / étranger) :
--   1. Mentor assigné : SELECT sur child_profiles/challenges de SON enfant → lignes retournées.
--   2. Mentor non assigné (autre enfant) : → 0 ligne.
--   3. Mentor retiré (removed_at NOT NULL) : → 0 ligne.
--   4. Compte étranger (ni parent ni mentor) : → 0 ligne.
--   5. Parent owner : comportement inchangé (voir ses propres enfants + défis).

-- child_profiles : le mentor actif assigné lit le profil de l'enfant.
DROP POLICY IF EXISTS "Mentors read profiles of assigned children" ON public.child_profiles;
CREATE POLICY "Mentors read profiles of assigned children"
  ON public.child_profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.child_profile_id = child_profiles.id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
  ));

-- challenges : même périmètre (lecture seule, hors soft-deleted).
DROP POLICY IF EXISTS "Mentors read challenges of assigned children" ON public.challenges;
CREATE POLICY "Mentors read challenges of assigned children"
  ON public.challenges FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.child_profile_id = challenges.child_id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL
  ));

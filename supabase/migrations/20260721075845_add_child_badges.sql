-- Système de badges (cf. écran 8 du prototype "Genizio Learning Experience
-- Design" — décision utilisateur du 2026-07-21 : "je compte sur toi pour tout
-- construire"). Un badge par domaine de défi (10 domaines, cf. DOMAINS dans
-- challenges.functions.ts), débloqué au 3e défi complété dans ce domaine — le
-- catalogue lui-même (titres/descriptions/seuil) reste côté code, cette table
-- ne stocke que l'attribution réelle par enfant.
CREATE TABLE public.child_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  badge_slug text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (child_id, badge_slug)
);

ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;

-- Même schéma de propriété que le reste de l'app : accès scopé via
-- child_profiles.user_id, pas de table de rôles.
CREATE POLICY "Users can view their children's badges"
  ON public.child_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE child_profiles.id = child_badges.child_id AND child_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert badges for their children"
  ON public.child_badges FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE child_profiles.id = child_badges.child_id AND child_profiles.user_id = auth.uid()
  ));

CREATE INDEX idx_child_badges_child_id ON public.child_badges(child_id);

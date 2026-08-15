-- Témoignages parents collectés DANS l'app (chantier « Preuve sociale réelle »,
-- 2026-08-15).
--
-- Principe : la section « Avis de parents » de la landing s'affiche UNIQUEMENT
-- avec de vrais retours donnés par les parents dans l'application — jamais de
-- contenu rédigé. Le parent écrit son retour dans l'espace parent (après un
-- défi validé), coche son consentement de publication, et le témoignage devient
-- visible publiquement sur la landing (RLS : lecture anon limitée aux lignes
-- `published = true`, écriture réservée au propriétaire via service role).
--
-- Enrichissement : le témoignage emporte des métadonnées factuelles prises au
-- moment de l'écriture (nombre d'enfants inscrits par le parent, défis
-- complétés de l'enfant) — ce sont ces petits détails concrets qui donnent de
-- la valeur à l'avis aux yeux d'un parent qui hésite.
--
--   • author_name / author_city : prénom + ville uniquement, jamais de nom
--     complet ni de coordonnées (même règle que les témoignages papier).
--   • consent_publish : case à cocher obligatoire dans l'app. Tant qu'elle est
--     fausse, le témoignage reste privé (published forcé à false).
--   • published : passage en ligne. Consenti + soumis = publié immédiatement ;
--     un administrateur peut le retirer à tout moment (set false).

CREATE TABLE IF NOT EXISTS public.parent_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_city text NOT NULL DEFAULT '',
  headline text NOT NULL,
  review_body text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  consent_publish boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  children_count smallint NOT NULL DEFAULT 0,
  challenges_completed smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Un parent ne peut avoir qu'un témoignage actif par enfant (évite les
  -- doublons si le prompt est vu plusieurs fois). L'upsert s'appuie dessus.
  UNIQUE (user_id, child_id)
);

-- RLS activée sur une table destinée à être lue publiquement : la politique anon
-- n'expose QUE les lignes publiées, et uniquement les champs utiles à la landing.
ALTER TABLE public.parent_testimonials ENABLE ROW LEVEL SECURITY;

-- Lecture publique : uniquement les témoignages publiés (la landing, sans
-- session, ne doit voir que ce qui a été consenti + mis en ligne).
CREATE POLICY "testimonials_public_read_published"
  ON public.parent_testimonials
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Écriture : personne n'écrit directement dans la table via RLS — l'insertion
-- passe par la server function submitParentTestimonial (service role), qui
-- vérifie la propriété de l'enfant et force les métadonnées. Aucune policy
-- d'insertion/update pour les rôles applicatifs : moindre privilège, comme les
-- tables internes (payments, generation_audits…).

-- Synchronise updated_at à chaque modification.
CREATE OR REPLACE FUNCTION public.touch_parent_testimonial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_parent_testimonial_trigger ON public.parent_testimonials;
CREATE TRIGGER touch_parent_testimonial_trigger
  BEFORE UPDATE ON public.parent_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_parent_testimonial();

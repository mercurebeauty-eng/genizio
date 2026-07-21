-- Ma Guilde — vue communautaire (cf. écran 9 du prototype, genizio-decisions).
-- Contrairement à tout le reste de l'app (strictement cloisonné par famille via
-- RLS), cette fonctionnalité montre délibérément des données d'autres enfants
-- (prénom, âge, guilde) à des familles non liées. Défaut = false (opt-in
-- explicite requis) : aucun enfant n'apparaît nulle part tant que son parent
-- n'a pas activé le partage lui-même — décision utilisateur du 2026-07-21
-- ("un toggle de partage peut être rajouté") en réponse directe à ce risque
-- de confidentialité, signalé avant construction plutôt qu'après.
ALTER TABLE public.child_profiles
ADD COLUMN IF NOT EXISTS guild_participation_opt_in boolean NOT NULL DEFAULT false;

-- RLS sur child_profiles reste strictement familial (accès via user_id) —
-- impossible pour une famille de lire les lignes d'une autre. Cette fonction
-- SECURITY DEFINER est donc le SEUL point de passage qui expose des enfants
-- d'autres familles, et seulement ceux qui ont explicitement opté in : elle
-- ne renvoie jamais que prénom/âge/talents (jamais ville, intérêts, notes,
-- ou tout champ non nécessaire à l'affichage de la guilde).
CREATE OR REPLACE FUNCTION public.list_opted_in_guild_members(p_requesting_child_id uuid)
RETURNS TABLE(id uuid, name text, age integer, talents jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT child_profiles.user_id INTO owner
  FROM public.child_profiles
  WHERE child_profiles.id = p_requesting_child_id;

  IF owner IS NULL THEN
    RAISE EXCEPTION 'Profil enfant introuvable.';
  END IF;
  IF owner <> auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  RETURN QUERY
  SELECT cp.id, cp.name, cp.age, cp.talents
  FROM public.child_profiles cp
  WHERE cp.guild_participation_opt_in = true
    AND cp.id <> p_requesting_child_id;
END;
$$;

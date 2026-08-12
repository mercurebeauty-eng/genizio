-- Âge : la limite « 5-16 ans » devient une vraie contrainte serveur (2026-08-12,
-- analyse utilisateur « Évolution de Génizio » §2).
--
-- Avant : le CHECK acceptait 3-20 et seule l'UI bornait le slider à 5-16. L'insertion
-- passant par le client Supabase (RLS auth.uid() = user_id uniquement), n'importe quel
-- client authentifié pouvait créer un profil hors limite (cas réel reproduit par
-- l'utilisateur : un profil à 19 ans). L'âge est destiné à devenir une donnée
-- structurante du moteur (défis accessibles, difficulté, attentes pédagogiques) —
-- la borne du produit est 5-16, la base doit la faire respecter.
--
-- Données réelles au moment de l'écriture (audit PostgREST) : 1 profil hors bornes
-- (âge 19, profil de test créé le jour même de l'analyse, birthdate 2007-05-21).
-- Il est ramené à 16 ans et sa birthdate effacée : sans cela, la contrainte ferait
-- échouer CHAQUE mise à jour de cette ligne (xp, talents...), le trigger
-- sync_child_age_from_birthdate recalculant 19 à chaque UPDATE. Le profil reste
-- consultable ; créé le jour même, il ne porte aucune donnée pédagogique.
UPDATE public.child_profiles
SET age = 16, birthdate = NULL
WHERE age < 5 OR age > 16;

ALTER TABLE public.child_profiles DROP CONSTRAINT IF EXISTS child_profiles_age_check;
ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_age_check CHECK (age BETWEEN 5 AND 16);

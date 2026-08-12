-- Saison → étiquette ; campagnes 100 % indépendantes (2026-08-12, analyse
-- utilisateur « Évolution de Génizio » §3).
--
-- Décision : la saison n'est plus qu'un repère narratif/promo optionnel (trimestres,
-- diaspora, certificat pour les inscriptions explicites). Elle ne porte plus aucun
-- rôle structurel :
--   • Plus d'auto-inscription de tout nouveau profil à la saison active (le trigger
--     auto_enroll_new_child_in_active_season, ajouté le 2026-08-03, est retiré) —
--     les inscriptions existantes restent (historique/certificat) ;
--   • season_enrollments.season_id devient nullable : les inscriptions ne servent
--     plus qu'aux parcours campagne B2B (campaign_id) et à l'inscription manuelle
--     admin (opt-in). L'accès n'en dépend pas (résolveur child-access.ts) ;
--   • La génération de défis ne lit plus aucune inscription ni saison (retrait du
--     thème narratif dans challenges.functions.ts) — plus aucun biais de saison
--     sur les défis.
DROP TRIGGER IF EXISTS trg_child_profiles_auto_enroll_season ON public.child_profiles;
DROP FUNCTION IF EXISTS public.auto_enroll_new_child_in_active_season();

ALTER TABLE public.season_enrollments
  ALTER COLUMN season_id DROP NOT NULL;

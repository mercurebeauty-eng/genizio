-- Migration pour nettoyer les tables de la fonctionnalitÃ© publications qui a Ã©tÃ© retirÃ©e.

DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;


�-- Migration pour nettoyer les tables de la fonctionnalité publications qui a été retirée.

DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;


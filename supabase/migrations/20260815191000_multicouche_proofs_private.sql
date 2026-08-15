-- Chantier « photos de preuve privées » (2026-08-15) — voir plan multicouche, A2 (reporté).
--
-- Avant : le bucket `proofs` était public + policy SELECT anon → les photos de preuve
-- de TOUS les enfants étaient lisibles sans connexion (héritage du Mur public supprimé),
-- et le code stockait des URLs PUBLIQUES dans challenges.proof_image_url.
--
-- Après : bucket privé, lecture réservée au parent owner et au mentor actif assigné
-- (l'affichage passe par une URL signée temporaire — résolution dans src/lib/proof-image.ts).
--
-- ⚠️ ⚠️ ORDRE DE DÉPLOIEMENT IMPÉRATIF ⚠️ ⚠️
--   1. DÉPLOYER LE CODE D'ABORD (merge de la PR) : l'upload stocke des paths, l'affichage
--      les résout en URLs signées ET gère encore les anciennes URLs publiques → rien ne casse.
--   2. PUIS appliquer cette migration (`supabase db push`) : bucket privé + backfill des
--      anciennes URLs en paths → le code déjà en prod les affiche via URLs signées.
--   NE PAS pousser cette migration avant le déploiement du code (les images casseraient
--   pendant la fenêtre : le code actuel afficherait des paths comme des URLs).

-- 1. Bucket privé + suppression de l'accès public.
UPDATE storage.buckets SET public = false WHERE id = 'proofs';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 2. Lecture réservée : le parent owner de l'enfant (le chemin d'upload est
--    {childId}/…) ou le mentor actif assigné. Même pattern de chemin que la
--    policy INSERT existante (storage.foldername(objects.name)[1] = childId).
CREATE POLICY "Parents and mentors view their proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'proofs'
    AND EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id::text = (storage.foldername(objects.name))[1]
        AND (
          cp.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.mentors m
            WHERE m.child_profile_id = cp.id
              AND m.mentor_user_id = auth.uid()
              AND m.removed_at IS NULL
          )
        )
    )
  );

-- 3. Backfill : les anciennes URLs publiques
--    (…/storage/v1/object/public/proofs/{childId}/{file}) deviennent des paths
--    (`proofs/{childId}/{file}`) — idempotent, ne touche que les lignes ayant
--    encore une URL publique.
UPDATE public.challenges
SET proof_image_url = substring(proof_image_url FROM '/object/public/(.+)$')
WHERE proof_image_url LIKE '%/object/public/proofs/%';

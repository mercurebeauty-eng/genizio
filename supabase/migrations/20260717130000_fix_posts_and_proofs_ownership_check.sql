-- Fix: two more instances of the same bug class as the child_mentors fix
-- (20260717120000) — ownership of a *referenced* child was never verified,
-- only ownership of the row being written.
--
-- 1. posts.child_profile_id: INSERT/UPDATE only checked auth.uid() = parent_id,
--    never that child_profile_id belonged to a child_profiles row owned by
--    that same user. Combined with a client bug (CreatePostModal fetched
--    completed challenges from ALL families, not just the current user's),
--    any authenticated parent could publish a public post — photo, caption,
--    AI talent tag — attributed to any child with a completed challenge,
--    displayed under that child's real name on the public Mur Public feed.
--
-- 2. storage.objects 'proofs' bucket: the INSERT policy only checked
--    bucket_id = 'proofs', with no scoping on the upload path. Proof photos
--    are uploaded to `{childId}/{challengeId}-{random}.{ext}` — any
--    authenticated user could upload arbitrary files into any child's
--    folder. Tightened to require the childId path segment to belong to a
--    child_profiles row owned by the uploader.

DROP POLICY IF EXISTS "Users can insert their own posts." ON public.posts;
CREATE POLICY "Users can insert their own posts."
ON public.posts
FOR INSERT
WITH CHECK (
  auth.uid() = parent_id
  AND (
    child_profile_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = posts.child_profile_id AND cp.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own posts." ON public.posts;
CREATE POLICY "Users can update their own posts."
ON public.posts
FOR UPDATE
USING (auth.uid() = parent_id)
WITH CHECK (
  auth.uid() = parent_id
  AND (
    child_profile_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = posts.child_profile_id AND cp.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proofs'
  AND EXISTS (
    SELECT 1 FROM public.child_profiles cp
    -- Must qualify as objects.name: inside this correlated subquery, an
    -- unqualified `name` resolves to child_profiles.name (which also has a
    -- `name` column) instead of the intended storage.objects.name (the
    -- upload path) — silently matches nothing and blocks every upload.
    WHERE cp.id::text = (storage.foldername(objects.name))[1]
    AND cp.user_id = auth.uid()
  )
);

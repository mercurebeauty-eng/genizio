-- Mur Public: real persistence for likes and comments.
-- Previously feed.tsx's "High-Five" button only updated React state (lost on
-- reload, posts.likes_count never incremented in the DB), and the comment/
-- share icons had no onClick at all. See genizio_backlog.md.

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like as themselves"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own like"
ON public.post_likes FOR DELETE
USING (auth.uid() = user_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON public.comments FOR SELECT
USING (true);

CREATE POLICY "Users can comment as themselves"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Keep posts.likes_count in sync. SECURITY DEFINER is required here: a user
-- liking someone else's post must be able to increment a counter on a row
-- they don't own, which posts' own RLS (auth.uid() = parent_id) would
-- otherwise block — this function is the single, narrow, audited exception.
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER post_likes_count_sync
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- Trigger invocation doesn't need or use these grants (the trigger mechanism
-- calls the function directly under the owner's privileges regardless), but
-- Postgres grants EXECUTE to PUBLIC by default on new functions, which makes
-- this SECURITY DEFINER function callable directly via PostgREST RPC
-- (/rest/v1/rpc/sync_post_likes_count) by anon/authenticated. Revoked as
-- defense in depth even though calling a RETURNS TRIGGER function outside a
-- trigger context already fails at the Postgres level.
REVOKE EXECUTE ON FUNCTION public.sync_post_likes_count() FROM PUBLIC, anon, authenticated;

-- Create the posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_profile_id UUID REFERENCES public.child_profiles(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policies for posts
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.posts FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own posts."
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Users can update their own posts."
    ON public.posts FOR UPDATE
    USING (auth.uid() = parent_id);

CREATE POLICY "Users can delete their own posts."
    ON public.posts FOR DELETE
    USING (auth.uid() = parent_id);

-- Storage bucket for posts
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);

-- Storage policies for posts bucket
-- Named "Public Access posts" (not "Public Access") because RLS policy
-- names must be unique per table, and storage.objects is shared across every
-- bucket — the proofs bucket migration (20260715181500) already claims the
-- unqualified "Public Access" name on this same table.
CREATE POLICY "Public Access posts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

CREATE POLICY "Users can upload their own post images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'posts' AND auth.uid() = owner
);

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'posts' AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'posts' AND auth.uid() = owner
);

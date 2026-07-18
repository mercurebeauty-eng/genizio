-- Create a new storage bucket for mission proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) for the proofs bucket
-- Allow public access to view the proofs (since they are shown on the public feed)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'proofs');

-- Allow authenticated users (parents) to upload proofs
CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proofs');

-- Allow authenticated users to update their own uploads (optional, but good practice)
CREATE POLICY "Users can update their own proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proofs' AND auth.uid() = owner);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proofs' AND auth.uid() = owner);

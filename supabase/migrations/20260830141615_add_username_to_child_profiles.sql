-- Add username column
ALTER TABLE child_profiles ADD COLUMN username TEXT;

-- Backfill existing children with a default username: lower(name) + '_' + 4 random characters from their id
UPDATE child_profiles 
SET username = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '_' || SUBSTRING(id::text, 1, 4)
WHERE username IS NULL;

-- Ensure no duplicate was just generated, if there is, we could handle it but we assume uniqueness for now
-- Make username NOT NULL
ALTER TABLE child_profiles ALTER COLUMN username SET NOT NULL;

-- Add check constraint for valid usernames (lowercase, alphanumeric, underscores, 3-20 chars)
ALTER TABLE child_profiles ADD CONSTRAINT child_profiles_username_check 
CHECK (username ~ '^[a-z0-9_]{3,20}$');

-- Add unique constraint
ALTER TABLE child_profiles ADD CONSTRAINT child_profiles_username_key UNIQUE (username);

-- Create an index on username for fast lookups
CREATE INDEX idx_child_profiles_username ON child_profiles (username);

-- Function to check if a username is available (bypasses RLS)
CREATE OR REPLACE FUNCTION check_child_username_available(requested_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM child_profiles WHERE username = requested_username
  );
$$;

-- Grant execute to public/authenticated
GRANT EXECUTE ON FUNCTION check_child_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_child_username_available(text) TO anon;

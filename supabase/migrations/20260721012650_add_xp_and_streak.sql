-- Add XP and Streak tracking to the child_profiles table
ALTER TABLE child_profiles
ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date timestamp with time zone;

-- Caches Naya's AI-generated parent synthesis on the child profile instead
-- of regenerating it (a real Anthropic API call) on every page load. See
-- getChildAISynthesis in src/lib/challenges.functions.ts, which now only
-- regenerates once ai_synthesis_generated_at is more than 7 days old.
ALTER TABLE public.child_profiles
  ADD COLUMN ai_synthesis TEXT,
  ADD COLUMN ai_synthesis_generated_at TIMESTAMPTZ;

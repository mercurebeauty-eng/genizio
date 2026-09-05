
BEGIN;
DO $ $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'child_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE child_profiles;
  END IF;
END $ $;

DO $ $
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'generation_audits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE generation_audits;
  END IF;
END $ $;
COMMIT;

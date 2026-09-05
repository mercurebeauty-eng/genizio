-- Enable Realtime for safeguarding tables (safety reports & audits)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'child_safety_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.child_safety_reports;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'child_safety_audits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.child_safety_audits;
  END IF;
END $$;

ALTER TABLE public.child_safety_reports REPLICA IDENTITY FULL;
ALTER TABLE public.child_safety_audits REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'child_safety_reports' AND policyname = 'Admin select safety reports policy'
  ) THEN
    CREATE POLICY "Admin select safety reports policy"
      ON public.child_safety_reports
      FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() ->> 'email') = 'mercurebeauty@gmail.com'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'child_safety_audits' AND policyname = 'Admin select safety audits policy'
  ) THEN
    CREATE POLICY "Admin select safety audits policy"
      ON public.child_safety_audits
      FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() ->> 'email') = 'mercurebeauty@gmail.com'
      );
  END IF;
END $$;

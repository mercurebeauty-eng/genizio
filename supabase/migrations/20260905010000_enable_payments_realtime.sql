-- Publication Realtime et RLS policy pour la table payments (Admin OS live sync)
-- Permet la synchronisation en temps réel de la liste des paiements et de la pastille admin.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;

ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- Permet aux administrateurs connectés d'écouter les changements en temps réel via Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin select payments policy'
  ) THEN
    CREATE POLICY "Admin select payments policy"
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() ->> 'email') = 'mercurebeauty@gmail.com'
      );
  END IF;
END $$;

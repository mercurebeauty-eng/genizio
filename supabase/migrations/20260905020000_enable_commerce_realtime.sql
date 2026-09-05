-- Publication Realtime pour les tables liées au commerce (orders, products, child_profiles)

DO $ $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'child_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.child_profiles;
  END IF;
END $ $;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.child_profiles REPLICA IDENTITY FULL;
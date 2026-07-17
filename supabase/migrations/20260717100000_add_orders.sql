-- public.orders table for lightweight order tracking (Phase 3)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  child_id uuid REFERENCES public.child_profiles(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  total_price_xof integer NOT NULL CHECK (total_price_xof >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  delivery_notes text,
  items jsonb NOT NULL DEFAULT '[]', -- array of { product_id: uuid, name: text, price_xof: number }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Parents can view and insert their own orders.
CREATE POLICY "Parents can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

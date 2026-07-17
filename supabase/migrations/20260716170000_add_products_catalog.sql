-- Kit Shop Phase 0: material catalog + tagging challenges with normalized material tags
-- so AI-generated challenge materials can be matched to purchasable products.

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_xof integer NOT NULL CHECK (price_xof >= 0),
  stock_quantity integer,
  image_url text,
  material_tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Parents need to read active products to see kit suggestions on challenge cards.
-- No INSERT/UPDATE/DELETE policy: catalog management goes exclusively through the
-- service-role client in admin server functions (requireAdmin), not direct client writes.
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE INDEX idx_products_material_tags ON public.products USING gin (material_tags);

-- Challenge generation now also emits normalized material tags (e.g. "carton", "cutter")
-- alongside the free-text `materials` list, so kit suggestions can match by tag instead
-- of fuzzy string matching.
ALTER TABLE public.challenges ADD COLUMN material_tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_challenges_material_tags ON public.challenges USING gin (material_tags);

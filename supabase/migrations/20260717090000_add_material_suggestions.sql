-- Kit Shop Phase 1: queue of material tags Naya has generated that aren't covered by
-- any active product yet, so the admin knows what to price next.

CREATE TABLE public.material_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE,
  seen_count integer NOT NULL DEFAULT 1,
  sample_challenge_title text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'catalogued', 'ignored')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.material_suggestions ENABLE ROW LEVEL SECURITY;
-- No policies at all: this is an internal admin queue, read/written exclusively
-- through the service-role client in admin server functions (requireAdmin).

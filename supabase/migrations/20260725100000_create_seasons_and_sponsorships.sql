-- Migration for Saisons (3-month cohorts) and Parrainage (Diaspora / RSE)

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  theme TEXT NOT NULL,
  description TEXT,
  duration_months INT NOT NULL DEFAULT 3,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  price_xof NUMERIC NOT NULL DEFAULT 5000,
  price_eur NUMERIC NOT NULL DEFAULT 7.50,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.season_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_name TEXT,
  sponsor_email TEXT,
  sponsor_message TEXT,
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'sponsored', 'refunded')),
  artifact_url TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sponsorship_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL,
  sponsor_email TEXT NOT NULL,
  sponsor_message TEXT,
  target_child_name TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 5000,
  currency TEXT NOT NULL DEFAULT 'XOF',
  is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_by_child_id UUID REFERENCES public.child_profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for seasons (readable by everyone authenticated)
CREATE POLICY "Seasons are viewable by authenticated users" ON public.seasons
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for season_enrollments (readable by the child owner or sponsor)
CREATE POLICY "Users can view their own child enrollments" ON public.season_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert enrollments for their children" ON public.season_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for sponsorship_tokens (creatable by users, viewable by code)
CREATE POLICY "Anyone authenticated can view sponsorship tokens by code" ON public.sponsorship_tokens
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can create sponsorship tokens" ON public.sponsorship_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

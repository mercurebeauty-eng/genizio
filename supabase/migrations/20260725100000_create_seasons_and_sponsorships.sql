-- Migration for Saisons (3-month cohorts) and Parrainage (Diaspora / RSE)
--
-- Corrigé avant application propre (audit du 2026-07-22) :
-- 1. `payment_status` sur season_enrollments n'autorisait pas 'admin_granted', alors que
--    enrollChildAdmin (seasons.functions.ts) insère exactement cette valeur — la fonctionnalité
--    d'inscription manuelle admin aurait échoué à 100% dès la première utilisation réelle.
-- 2. sponsorship_tokens : ajout de payment_confirmed (nouveau, défaut FALSE). createSponsorshipToken
--    est un server function PUBLIC (page /parrainage, sans authentification) qui ne vérifie
--    aucun paiement réel — sans ce garde-fou, n'importe qui pouvait générer un code de
--    parrainage valide et le rédimer gratuitement. redeemSponsorshipToken doit maintenant
--    vérifier payment_confirmed = TRUE ; un admin le bascule à TRUE une fois le paiement
--    WhatsApp/Mobile Money confirmé manuellement (même pattern que les commandes boutique et
--    le Passeport d'Excellence).
-- 3. RLS : la policy SELECT sur sponsorship_tokens ("Anyone authenticated can view") exposait
--    le code de rédemption et l'email de CHAQUE parrain à N'IMPORTE QUEL compte connecté —
--    même classe de faille que les décisions #20/#22 (accès non filtré par propriétaire).
--    La policy INSERT sur season_enrollments vérifiait auth.uid() = user_id mais jamais que
--    child_id appartient bien à cet utilisateur. Aucune des deux n'est utilisée par un chemin
--    client légitime aujourd'hui (tous les writes passent par supabaseAdmin côté serveur) —
--    retirées plutôt que réparées, principe du moindre privilège.
--
-- Rendu idempotent (ALTER ... ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT/POLICY IF EXISTS avant
-- ADD) : une tentative de push sur une migration voisine a révélé que l'état réel de la base
-- diverge de ce que `supabase migration list` indiquait — CREATE TABLE IF NOT EXISTS seul
-- n'aurait pas appliqué les corrections ci-dessus si les tables existaient déjà sous l'ancien
-- schéma.

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
  payment_status TEXT NOT NULL DEFAULT 'completed',
  artifact_url TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.season_enrollments DROP CONSTRAINT IF EXISTS season_enrollments_payment_status_check;
ALTER TABLE public.season_enrollments ADD CONSTRAINT season_enrollments_payment_status_check
  CHECK (payment_status IN ('pending', 'completed', 'sponsored', 'refunded', 'admin_granted'));

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

ALTER TABLE public.sponsorship_tokens ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for seasons (readable by everyone authenticated — utilisé directement par
-- generateChallenges/generateSingleChallenge via le client standard, pas supabaseAdmin ;
-- contenu non sensible : titre/thème/prix d'une saison, pas de PII)
DROP POLICY IF EXISTS "Seasons are viewable by authenticated users" ON public.seasons;
CREATE POLICY "Seasons are viewable by authenticated users" ON public.seasons
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for season_enrollments : SELECT utilisé directement par generateChallenges/
-- generateSingleChallenge (vérification isEnrolledInActiveSeason). Aucune policy INSERT :
-- les deux seuls chemins d'écriture (redeemSponsorshipToken, enrollChildAdmin) passent par
-- supabaseAdmin (service role, contourne RLS) — ne pas ouvrir un chemin client non utilisé.
DROP POLICY IF EXISTS "Users can view their own child enrollments" ON public.season_enrollments;
CREATE POLICY "Users can view their own child enrollments" ON public.season_enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert enrollments for their children" ON public.season_enrollments;
DROP POLICY IF EXISTS "Anyone authenticated can view sponsorship tokens by code" ON public.sponsorship_tokens;
DROP POLICY IF EXISTS "Anyone authenticated can create sponsorship tokens" ON public.sponsorship_tokens;
-- Aucune policy SELECT/INSERT publique sur sponsorship_tokens : les 4 chemins d'accès
-- (createSponsorshipToken, redeemSponsorshipToken, listSponsorshipsAdmin,
-- confirmSponsorshipPaymentAdmin) passent tous par supabaseAdmin côté serveur. Le code de
-- rédemption et l'email du parrain ne doivent jamais être lisibles directement par un client.

-- Vague 1 « Fondations » du plan multicouche (2026-08-15) — voir docs/memoire/genizio_plan_multicouche.md.
--
-- Deux volets, dans une seule migration idempotente :
--   A1. Index manquants — colonnes filtrées par des policies RLS / triggers / requêtes chaudes,
--       sans index à ce jour (seq scan à chaque accès dès que les volumes grossissent).
--   A2. Sécurité — REVOKE manquant sur activate_season (SECURITY DEFINER appelable publiquement),
--       policies publiques « Mur public » supprimées (le Mur a été retiré du produit en M1 :
--       `notes` = journal du parent, données d'enfants — plus aucune surface ne les lit, et
--       toutes les lectures client sont filtrées par ownership, vérifié).
--   B2. parent_profiles — table miroir du contact parent (email/téléphone) requêtable en SQL :
--       prérequis de la recherche Parent → Enfant → Mentor (spec §23) et fin des scans complets
--       de l'annuaire auth (listAllUsers) dans les chemins chauds.
--
-- ⚠️ REPORTÉ hors de cette migration (2026-08-15) : privatisation du bucket `proofs`.
--   Le code stocke des URLs PUBLIQUES de preuves (`challenges.functions.ts:2092` →
--   `getPublicUrl`, affichées partout via `challenges.proof_image_url`) ; rendre le bucket
--   privé casserait l'affichage de toutes les preuves. La privatisation exige le passage aux
--   URLs signées sur toutes les surfaces d'affichage → vague dédiée (voir plan §4, A2).
--
-- ⚠️ NON APPLIQUÉE en prod avant revue (convention du repo). Après revue :
--   supabase db push + supabase gen types typescript --linked (jamais le MCP, Key Principle #8).
--
-- Décisions porteur prises par défaut (réversibles, à confirmer) : D2 = restreindre les
-- policies publiques (proofs reporté) ; D3 = créer parent_profiles ; D1 (activation par code)
-- = Vague 5, hors de cette migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- A1. INDEX MANQUANTS
-- ─────────────────────────────────────────────────────────────────────────────

-- season_enrollments : AUCUN index du tout (1 ligne par enfant par campagne — la table
-- B2B à plus forte croissance). Utilisée par la policy RLS (user_id), le trigger
-- check_campaign_capacity (campaign_id), resolveChildAccompaniment (child_id).
CREATE INDEX IF NOT EXISTS season_enrollments_campaign_id_idx
  ON public.season_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS season_enrollments_user_id_idx
  ON public.season_enrollments(user_id);
CREATE INDEX IF NOT EXISTS season_enrollments_child_id_idx
  ON public.season_enrollments(child_id);

-- challenges.status : les agrégations admin filtraient sur status sans index.
CREATE INDEX IF NOT EXISTS challenges_status_idx
  ON public.challenges(status);

-- challenges (child_id, status) partiel : couvre les comptages par enfant×statut
-- (portfolio, défis) et les requêtes « défis actifs d'un enfant ».
CREATE INDEX IF NOT EXISTS challenges_child_status_active_idx
  ON public.challenges(child_id, status)
  WHERE deleted_at IS NULL;

-- orders.user_id : policy RLS « auth.uid() = user_id » ; seul index actuel = payment_reference.
CREATE INDEX IF NOT EXISTS orders_user_id_idx
  ON public.orders(user_id);

-- observation_events / trait_series / hypothesis_cycles .user_id : policies RLS SELECT
-- sur des tables qui grossissent à chaque événement.
CREATE INDEX IF NOT EXISTS observation_events_user_id_idx
  ON public.observation_events(user_id);
CREATE INDEX IF NOT EXISTS trait_series_user_id_idx
  ON public.trait_series(user_id);
CREATE INDEX IF NOT EXISTS hypothesis_cycles_user_id_idx
  ON public.hypothesis_cycles(user_id);

-- posts / comments : tri du feed et jointures (Mur public dormants, index à titre préventif).
CREATE INDEX IF NOT EXISTS posts_created_at_idx
  ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_child_profile_id_idx
  ON public.posts(child_profile_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx
  ON public.comments(post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- A2. SÉCURITÉ
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. activate_season : SECURITY DEFINER créée sans REVOKE EXECUTE → RPC d'écriture
--    appelable par PUBLIC/anon (oubli : le repo révoque partout ailleurs). Bascule de
--    la saison active sans aucun contrôle. REVOKE = no-op si le droit n'est pas détenu.
REVOKE EXECUTE ON FUNCTION public.activate_season(uuid) FROM PUBLIC, anon, authenticated;

-- 2. Policies publiques « Mur public » supprimées (Mur retiré en M1, plus aucune surface
--    ne les lit — toutes les lectures client sont filtrées par ownership, vérifié).
--    « Anyone can view completed challenges » exposait TOUTES les colonnes des défis
--    complétés de tous les enfants (dont `notes`, le journal du parent, et proof_image_url).
DROP POLICY IF EXISTS "Anyone can view completed challenges" ON public.challenges;

--    « Public can view profiles with completed challenges » exposait nom/âge/ville/pays/
--    talents des enfants ayant un défi complété à tout compte connecté.
DROP POLICY IF EXISTS "Public can view profiles with completed challenges" ON public.child_profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- B2. PARENT_PROFILES — contact parent requêtable
-- ─────────────────────────────────────────────────────────────────────────────
-- L'email/téléphone du parent vivent dans auth.users (non requêtable en SQL, non indexé,
-- non soumis à RLS) — d'où les scans complets d'annuaire (listAllUsers) pour résoudre
-- 1-5 contacts. Cette table miroir les rend requêtables (recherche admin par email/
-- téléphone, lecture mentor du téléphone) sans jamais exposer auth.users.
-- Maintenue EXCLUSIVEMENT par le trigger ci-dessous : aucune policy d'écriture client.
CREATE TABLE IF NOT EXISTS public.parent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text,
  display_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_profiles_phone_idx
  ON public.parent_profiles(phone);
CREATE INDEX IF NOT EXISTS parent_profiles_email_idx
  ON public.parent_profiles(email);

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

-- Seul le compte parent lit son propre contact ; les lectures mentor/admin passent par
-- service role + assert (choke-point existant assertMentorOperator / requireAdmin).
CREATE POLICY "Parents read their own contact profile"
  ON public.parent_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trigger de synchronisation : toute création/modification de compte auth.users
-- (email, user_metadata) répercute le contact. Le téléphone vit dans user_metadata
-- (décision #24) ; la colonne native auth.users.phone sert de repli.
CREATE OR REPLACE FUNCTION public.sync_parent_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.parent_profiles (user_id, email, phone, display_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'full_name'),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_parent_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_parent_profile ON auth.users;
CREATE TRIGGER trg_sync_parent_profile
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_parent_profile();

-- Backfill des comptes existants (le trigger ne couvre que les évolutions futures).
INSERT INTO public.parent_profiles (user_id, email, phone, display_name)
SELECT
  id,
  email,
  NULLIF(COALESCE(raw_user_meta_data->>'phone', phone), ''),
  COALESCE(NULLIF(raw_user_meta_data->>'name', ''), raw_user_meta_data->>'full_name')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

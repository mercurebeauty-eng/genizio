-- Chantier B2B Campagnes/Superviseurs (2026-07-26) — décisions du porteur du projet :
-- prix officiel de saison 10 000 FCFA, un code se lie à sa saison au moment de l'ACTIVATION
-- (pas de la génération), le chargé de projet ONG ne voit jamais l'identité des enfants.
--
-- Contexte de drift : `campaigns`, `sponsorship_tokens.campaign_id`, `season_enrollments.campaign_id`
-- existent déjà en base (confirmé via les types régénérés) mais n'ont jamais eu de migration —
-- même classe de dérive que les migrations Saisons du 22/07. Idempotent partout pour ne pas
-- supposer un état de départ précis.
--
-- La table `seasons` est confirmée VIDE en production (confirmé par le porteur du projet) :
-- DEFAULT_FALLBACK_SEASON (uuid 00000000-0000-0000-0000-000000000001) n'était qu'une donnée de
-- démo côté TypeScript, jamais insérée en base, alors que sponsorship_tokens_season_id_fkey
-- pointe réellement vers cette table — chaque écriture qui retombait sur ce fallback (page
-- /parrainage, qui ne passe jamais de seasonId) violait la contrainte de clé étrangère. Cette
-- migration seed une vraie Saison 1 sur cet UUID exact pour que les FK existantes se résolvent,
-- et pour qu'aucune saison "fantôme" ne circule plus jamais comme si elle existait en base.

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  manager_user_id uuid references auth.users(id) on delete set null,
  target_count int not null default 100,
  extra_supervisors_quota int not null default 0,
  created_at timestamptz not null default now()
);

-- La table existait déjà sans cette FK (confirmé : aucune relation vers auth.users dans les
-- types générés) — ajoutée séparément car CREATE TABLE IF NOT EXISTS est un no-op sur une table
-- déjà existante, y compris pour ses contraintes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_manager_user_id_fkey'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_manager_user_id_fkey
      FOREIGN KEY (manager_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
-- Aucune policy : les 5 chemins d'accès (createCampaignAdmin, listCampaignsAdmin,
-- getNgoDashboardData, assignCampaignSupervisor, generateCampaignTokensAdmin) passent tous par
-- supabaseAdmin (service role, contourne RLS) — même principe du moindre privilège que
-- sponsorship_tokens (migration 20260725100000).

-- Colonnes de rattachement à une campagne, déjà présentes en base sur sponsorship_tokens et
-- season_enrollments (avec leurs FK) — IF NOT EXISTS pour rejouabilité, pas pour combler un vrai
-- manque ici.
ALTER TABLE public.sponsorship_tokens ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.season_enrollments ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- supervisors.campaign_id : NOUVELLE colonne (n'existait pas du tout). Nécessaire pour que le
-- trigger de quota ci-dessous sache quelle campagne (donc quel extra_supervisors_quota) consulter,
-- et pour qu'un chargé de projet puisse un jour lister "mes superviseurs" séparément de ceux
-- assignés directement par l'admin Génizio.
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Quota superviseur appliqué en base, pas seulement côté serveur applicatif : le chemin admin
-- existant (assignSupervisor, supervisors.functions.ts) n'avait AUCUNE vérification de quota, et
-- le chemin ONG (assignCampaignSupervisor) ne la vérifiait que côté JS avant l'insert — un admin
-- assignant un 6e enfant à un superviseur déjà à sa limite payée l'aurait fait sans erreur. Même
-- classe de bug que check_child_profile_quota (20260717160000) et seasons_single_active_idx
-- (20260726110000) : une règle métier vérifiée applicativement sur un seul chemin d'écriture sur
-- plusieurs. Ici la règle protège une limite facturable (7000 FCFA/superviseur en plus des 5
-- gratuits), donc l'enjeu est directement financier.
CREATE OR REPLACE FUNCTION public.check_supervisor_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  extra_quota integer := 0;
  quota integer;
BEGIN
  SELECT count(*) INTO current_count
  FROM public.supervisors
  WHERE supervisor_user_id = NEW.supervisor_user_id;

  IF NEW.campaign_id IS NOT NULL THEN
    SELECT COALESCE(extra_supervisors_quota, 0) INTO extra_quota
    FROM public.campaigns
    WHERE id = NEW.campaign_id;
  END IF;

  quota := 5 + COALESCE(extra_quota, 0);

  IF current_count >= quota THEN
    RAISE EXCEPTION 'Quota de supervision atteint (% / % enfants pour ce superviseur).', current_count, quota
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_supervisor_quota ON public.supervisors;
CREATE TRIGGER trg_check_supervisor_quota
  BEFORE INSERT ON public.supervisors
  FOR EACH ROW EXECUTE FUNCTION public.check_supervisor_quota();

-- Seed de la vraie Saison 1, sur l'UUID exact utilisé jusqu'ici comme fallback purement
-- TypeScript. Prix tranché par le porteur du projet (2026-07-26) : 10 000 FCFA.
INSERT INTO public.seasons (
  id, title, subtitle, theme, description, duration_months, start_date, end_date,
  price_xof, price_eur, status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Saison 1 : Les Penseurs & Inventeurs',
  'Trimestre d''Éléments (3 Mois)',
  'Exploration des 9 Intelligences Multiples & Physique du Quotidien',
  'Un parcours immersif de 3 mois pour explorer l''ensemble des intelligences de Gardner, construire son portfolio d''artefacts et débloquer son passeport d''excellence.',
  3,
  now(),
  now() + interval '3 months',
  10000,
  15,
  'active'
)
ON CONFLICT (id) DO NOTHING;

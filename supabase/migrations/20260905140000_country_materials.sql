-- Matériaux locaux par pays : table éditable (source de vérité) remplaçant la map
-- codée en dur de src/lib/contextualization.ts (référence : analyse architecture
-- Naya, 2026-09-05). Les constantes TypeScript restent dans le code UNIQUEMENT
-- comme repli de résilience (pays inconnu ou erreur DB) — la génération ne casse
-- jamais. Édition : Admin OS (onglet Naya) ou Supabase Studio.

CREATE TABLE IF NOT EXISTS public.country_materials (
  country_key text PRIMARY KEY, -- clé normalisée via normalizeCountryKey (sans accents ni articles)
  country_label text NOT NULL,  -- libellé lisible affiché dans l'admin
  materials text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.country_materials ENABLE ROW LEVEL SECURITY;

-- Lecture par l'app (server functions du parent, client authentifié) ; l'écriture
-- passe exclusivement par le service role (server functions admin, RLS contournée).
CREATE POLICY "Public authenticated lookup for country_materials"
ON public.country_materials FOR SELECT TO authenticated USING (true);

-- Seed initial : données identiques à l'ancienne map TypeScript (14 pays), pour
-- que le passage au table-backed soit un non-événement côté génération.
INSERT INTO public.country_materials (country_key, country_label, materials) VALUES
  ('cote ivoire', 'Côte d''Ivoire', ARRAY['bois local (iroko, sipo)', 'bambou', 'argile', 'raffia', 'coques de cacao', 'matériaux recyclés']),
  ('senegal', 'Sénégal', ARRAY['bois local', 'argile', 'coquillages', 'textile (pagne)', 'matériaux recyclés']),
  ('cameroun', 'Cameroun', ARRAY['bambou', 'bois (ayous, ébène)', 'raphia', 'argile', 'matériaux recyclés']),
  ('mali', 'Mali', ARRAY['argile (banco)', 'bois', 'coton', 'cuir', 'matériaux recyclés']),
  ('burkina faso', 'Burkina Faso', ARRAY['argile', 'bois', 'coton', 'matériaux recyclés']),
  ('niger', 'Niger', ARRAY['argile', 'bois', 'cuir', 'matériaux recyclés']),
  ('togo', 'Togo', ARRAY['bois', 'argile', 'textile (pagne)', 'matériaux recyclés']),
  ('benin', 'Bénin', ARRAY['bois', 'argile', 'bambou', 'textile', 'matériaux recyclés']),
  ('guinee', 'Guinée', ARRAY['bambou', 'bois', 'argile', 'palmier', 'matériaux recyclés']),
  ('gabon', 'Gabon', ARRAY['bois (okoumé)', 'bambou', 'raphia', 'matériaux recyclés']),
  ('congo', 'Congo', ARRAY['bois', 'bambou', 'argile', 'raphia', 'matériaux recyclés']),
  ('tchad', 'Tchad', ARRAY['argile', 'bois', 'cuir', 'matériaux recyclés']),
  ('madagascar', 'Madagascar', ARRAY['bois', 'bambou', 'raphia', 'matériaux recyclés']),
  ('france', 'France', ARRAY['carton', 'bois', 'bouteilles plastique', 'textile recyclé', 'matériaux de récupération'])
ON CONFLICT (country_key) DO NOTHING;

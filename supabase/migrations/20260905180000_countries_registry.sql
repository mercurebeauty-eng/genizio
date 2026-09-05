-- Registre des pays supportés + listes éditoriales enrichies (suite de
-- 20260905140000_country_materials.sql, décision produit 2026-09-05) :
--
-- 1. La table country_materials devient le REGISTRE OFFICIEL des pays supportés :
--    le sélecteur « Pays » du formulaire de profil (ProfileDialog) s'alimente
--    directement ici (getSupportedCountries) — la boucle admin → onboarding est
--    fermée : un pays ajouté dans l'Admin OS devient sélectionnable à la création
--    d'un profil, et ses matériaux alimentent Naya sans déploiement.
--
-- 2. Les pays détectés par IP mais absents de la table (diaspora Europe/Amérique
--    du Nord + Maghreb, cf. geo.functions.ts COUNTRY_LABELS_FR) deviennent des pays
--    officiels avec leurs propres matériaux — fin du repli générique africain pour
--    un enfant à Montréal ou Casablanca.
--
-- 3. Listes enrichies (10 à 12 matériaux par pays) : choix éditorial fondé sur les
--    filières agricoles et artisanales réellement accessibles (marché, quartier,
--    maison) de chaque pays — cacao/hévéa/palmiste en Côte d'Ivoire, pêche et
--    arachide au Sénégal, karité au Mali/Burkina, cuir et gomme arabique au Tchad/
--    Niger, okoumé au Gabon, ravenala et zébu à Madagascar, poterie/cuir/laiton au
--    Maroc, liège et olives en Tunisie/Algérie, érable au Canada, palettes et bocaux
--    en Europe. ⚠️ Les valeurs actuelles (seed initial identique à l'ancienne map
--    TS) sont REMPLACÉES par cette baseline éditoriale — l'audit/l'ajustement se
--    fait ensuite via l'Admin OS (onglet Naya), sans déploiement.
--
-- Note : les deux Congos partagent la clé normalisée « congo » (normalizeCountryKey
-- réduit « République démocratique du Congo » à « congo ») — une seule ligne couvre
-- le bassin du Congo (matériaux communs : forêt, raphia, palmier).

-- 1. Enrichissement des 14 pays existants
UPDATE public.country_materials SET materials = ARRAY['bois local (iroko, sipo)', 'bambou', 'argile', 'raffia', 'coques de cacao', 'coques de noix de cajou', 'coques de palmiste', 'caoutchouc (hévéa)', 'feuilles de bananier', 'noix de coco', 'sacs de riz vides', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'cote ivoire';

UPDATE public.country_materials SET materials = ARRAY['bois local', 'argile', 'coquillages', 'sable', 'calebasses', 'coques d''arachide', 'tiges de mil', 'tissu (pagne)', 'filets de pêche usagés', 'noix de coco (Casamance)', 'sel marin', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'senegal';

UPDATE public.country_materials SET materials = ARRAY['bambou', 'bois (ayous, ébène)', 'raphia', 'argile', 'calebasses', 'coques de cacao', 'feuilles de bananier', 'noix de palme', 'noix de coco', 'sacs de jute', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'cameroun';

UPDATE public.country_materials SET materials = ARRAY['argile (banco)', 'bois', 'coton', 'cuir', 'calebasses', 'noix de karité', 'tiges de mil', 'sable', 'laterite (pierre)', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'mali';

UPDATE public.country_materials SET materials = ARRAY['argile', 'bois', 'coton', 'noix de karité', 'calebasses', 'laterite (pierre)', 'sable', 'cuir', 'tiges de mil', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'burkina faso';

UPDATE public.country_materials SET materials = ARRAY['argile', 'bois', 'cuir', 'calebasses', 'tiges de mil', 'fibres de palmier doum (vannerie)', 'sable', 'laterite (pierre)', 'gomme arabique', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'niger';

UPDATE public.country_materials SET materials = ARRAY['bois', 'argile', 'textile (pagne)', 'calebasses', 'coques de cacao', 'noix de coco', 'bambou', 'tiges de mil', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'togo';

UPDATE public.country_materials SET materials = ARRAY['bois', 'argile', 'bambou', 'textile (pagne)', 'calebasses', 'coques de cacao', 'noix de palme', 'noix de coco', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'benin';

UPDATE public.country_materials SET materials = ARRAY['bambou', 'bois', 'argile', 'palmier (régimes et huile)', 'calebasses', 'raphia', 'feuilles de bananier', 'paille de riz', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'guinee';

UPDATE public.country_materials SET materials = ARRAY['bois (okoumé)', 'bambou', 'raphia', 'argile', 'écorce de mangue (teinture)', 'noix de coco', 'palmier (régimes)', 'feuilles de bananier', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'gabon';

UPDATE public.country_materials SET materials = ARRAY['bois', 'bambou', 'argile', 'raphia', 'lianes', 'palmier (régimes)', 'noix de coco', 'calebasses', 'feuilles de bananier', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'congo';

UPDATE public.country_materials SET materials = ARRAY['argile', 'bois', 'cuir', 'calebasses', 'tiges de mil', 'paille', 'sable', 'gomme arabique', 'noyaux de dattes', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'tchad';

UPDATE public.country_materials SET materials = ARRAY['bois', 'bambou', 'raphia', 'argile', 'paille de riz', 'sisal', 'feuilles de bananier', 'cornes de zébu', 'fibres de palmier (ravenala)', 'matériaux recyclés'], updated_at = now() WHERE country_key = 'madagascar';

UPDATE public.country_materials SET materials = ARRAY['carton', 'bois (palettes)', 'bouteilles plastique', 'bocaux en verre', 'bouchons de liège', 'canettes aluminium', 'papier et journaux', 'tissu (chutes)', 'matériaux de récupération'], updated_at = now() WHERE country_key = 'france';

-- 2. Nouveaux pays officiels (diaspora Europe/Amérique du Nord + Maghreb —
--    alignés sur les libellés de geo.functions.ts COUNTRY_LABELS_FR)
INSERT INTO public.country_materials (country_key, country_label, materials) VALUES
  ('belgique', 'Belgique', ARRAY['carton', 'bois (palettes)', 'bouteilles plastique', 'bocaux en verre', 'bouchons de liège', 'canettes aluminium', 'papier et journaux', 'tissu (chutes)', 'matériaux de récupération']),
  ('suisse', 'Suisse', ARRAY['bois (épicéa)', 'carton', 'laine', 'bouteilles plastique', 'bocaux en verre', 'canettes aluminium', 'papier et journaux', 'tissu (chutes)', 'matériaux de récupération']),
  ('royaume uni', 'Royaume-Uni', ARRAY['carton', 'bois (palettes)', 'laine', 'bouteilles plastique', 'bocaux en verre', 'bouchons de liège', 'canettes aluminium', 'tissu (chutes)', 'matériaux de récupération']),
  ('canada', 'Canada', ARRAY['bois (bouleau, érable)', 'carton', 'bouteilles plastique', 'bocaux en verre', 'laine', 'neige et glace (hiver)', 'canettes aluminium', 'papier et journaux', 'matériaux de récupération']),
  ('etats unis', 'États-Unis', ARRAY['carton', 'bois (palettes)', 'bouteilles plastique', 'bocaux en verre', 'canettes aluminium', 'tissu (chutes)', 'papier et journaux', 'matériaux de récupération']),
  ('maroc', 'Maroc', ARRAY['argile (poterie)', 'cuir', 'laine', 'bois (cèdre, thuya)', 'noyaux d''olives', 'sable', 'fibres de palmier (doum)', 'laiton (souk)', 'matériaux recyclés']),
  ('tunisie', 'Tunisie', ARRAY['argile (poterie)', 'noyaux d''olives', 'sable', 'laine', 'liège', 'cuir', 'feuilles de palmier', 'sel', 'matériaux recyclés']),
  ('algerie', 'Algérie', ARRAY['argile', 'liège', 'noyaux de dattes', 'laine', 'cuir', 'sable', 'noyaux d''olives', 'feuilles de palmier', 'matériaux recyclés'])
ON CONFLICT (country_key) DO NOTHING;

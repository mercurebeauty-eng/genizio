-- V4 « Pass Enfant » (Vague A, 2026-08-14) — migration de données vers family_coverages.
--
-- Rétro-remplissage idempotent depuis les sources de couverture historiques :
--   1. sponsorship_credits → une ligne source='sponsorship' par compte (ends_at = max) ;
--   2. subscriptions actives/past_due → une ligne source='subscription' (ends_at =
--      current_period_end — le résolveur garde la grâce past_due par la fenêtre) ;
--   3. season_enrollments de campagnes → une ligne source='campaign' par (compte, campagne)
--      (starts_at = start_date, ends_at = end_date de la campagne).
--
-- Le GRAND-PÈRE (5 profils gratuits pour les comptes créés avant 2026-08-04) n'est PAS
-- migré : c'est le plancher du trigger (isGrandfatheredAccount), aucune ligne nécessaire.
-- Chaque bloc est gardé par « il n'existe encore aucune ligne de cette source » — rejouer
-- la migration ne duplique jamais (les écrivains de production partent ensuite de zéro).

-- ── 1. Crédits de parrainage → source='sponsorship' ───────────────────────────
INSERT INTO public.family_coverages (user_id, source, source_ref, starts_at, ends_at,
                                     max_children, sessions, sessions_used, price_xof, status)
SELECT
  sc.user_id,
  'sponsorship',
  NULL,                        -- plusieurs crédits possibles → source_ref non significatif
  min(sc.created_at),
  max(sc.ends_at),
  5,
  0,
  0,
  NULL,
  CASE WHEN max(sc.ends_at) > now() THEN 'active' ELSE 'expired' END
FROM public.sponsorship_credits sc
WHERE NOT EXISTS (SELECT 1 FROM public.family_coverages fc WHERE fc.source = 'sponsorship')
GROUP BY sc.user_id;

-- ── 2. Abonnements actifs/past_due → source='subscription' ────────────────────
-- past_due conserve la couverture jusqu'à la fin de période déjà payée (grâce du résolveur,
-- aucune mutation de masse) — la ligne reprend exactement la fenêtre de la ligne billing.
INSERT INTO public.family_coverages (user_id, source, source_ref, starts_at, ends_at,
                                     max_children, sessions, sessions_used, price_xof, status)
SELECT
  s.user_id,
  'subscription',
  s.id,
  COALESCE(s.current_period_start, s.started_at, now()),
  s.current_period_end,
  5,
  0,
  0,
  s.price_xof,
  CASE WHEN s.current_period_end IS NOT NULL AND s.current_period_end > now()
       THEN 'active' ELSE 'expired' END
FROM public.subscriptions s
WHERE s.status IN ('active','past_due')
  AND NOT EXISTS (SELECT 1 FROM public.family_coverages fc WHERE fc.source = 'subscription');

-- ── 3. Inscriptions de campagne → source='campaign' (une ligne par compte+campagne) ──
-- La couverture famille liée à une campagne vaut pendant la fenêtre fixe de la campagne
-- (start_date/end_date) — le trigger ne la voit active que si starts_at <= now < ends_at.
INSERT INTO public.family_coverages (user_id, source, source_ref, starts_at, ends_at,
                                     max_children, sessions, sessions_used, price_xof, status)
SELECT
  se.user_id,
  'campaign',
  c.id,
  c.start_date,
  c.end_date,
  5,
  0,
  0,
  NULL,
  CASE WHEN c.start_date <= now() AND c.end_date >= now() THEN 'active'
       WHEN c.end_date < now() THEN 'expired' ELSE 'active' END
FROM public.season_enrollments se
JOIN public.campaigns c ON c.id = se.campaign_id
WHERE se.campaign_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.family_coverages fc WHERE fc.source = 'campaign')
GROUP BY se.user_id, c.id, c.start_date, c.end_date;

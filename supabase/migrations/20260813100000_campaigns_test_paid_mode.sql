-- Campagnes B2B : mode test vs payant + prix unitaire par code (refonte Admin OS,
-- 2026-08-13, décision #72).
--
-- Nouveau workflow (demande utilisateur) :
--   • mode 'test' (défaut) : les codes sont confirmés d'office — valider tout le
--     workflow sans facturation ;
--   • mode 'paid' : l'admin génère un LIEN DE PAIEMENT partageable (Paystack,
--     metadata type 'campaign_b2b') ; quand le paiement aboutit (webhook), un lot
--     de codes B2B confirmés est créé — count = montant payé / price_per_token_xof,
--     plafonné au target_count restant de la campagne.
--
-- price_per_token_xof : prix unitaire d'un code dans une campagne payante
-- (NULL tant que la campagne reste en mode test — jamais de lien sans prix).

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'test'
    CHECK (mode IN ('test', 'paid'));

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS price_per_token_xof integer
    CHECK (price_per_token_xof IS NULL OR price_per_token_xof >= 0);

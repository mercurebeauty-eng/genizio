-- Fermeture douce des campagnes (2026-08-13, demande utilisateur : « Comment on
-- supprime une campagne ? » — aucune suppression/fermeture n'existait).
--
-- Une campagne ARCHIVÉE :
--   • disparaît des flux actifs — page publique du lien/QR (getCampaignPublicInfo),
--     génération de tokens, génération de lien de paiement, édition (billing/quota) ;
--   • garde TOUT son historique (codes générés, inscriptions) — jamais de cascade
--     destructive : des tokens distribués ou des enfants inscrits ne peuvent pas être
--     effacés par une action d'admin.
--
-- La suppression PHYSIQUE reste possible (deleteCampaignAdmin) mais uniquement :
--   • sur une campagne déjà archivée ;
--   • sans aucun token généré ni enfant inscrit.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'archived'));

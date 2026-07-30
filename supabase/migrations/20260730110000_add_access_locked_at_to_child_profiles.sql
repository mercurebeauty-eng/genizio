-- Verrouillage d'accès (2026-07-30) : quand un éducateur est retiré d'une campagne
-- (removeCampaignEducator), l'accès aux enfants venus de CETTE campagne et possédés par cet
-- éducateur est coupé — jamais les données de l'enfant, qui restent intactes (talents, xp,
-- défis complétés). NULL = accès normal, non-NULL = verrouillé (avec la date, pour audit).
ALTER TABLE public.child_profiles
ADD COLUMN IF NOT EXISTS access_locked_at TIMESTAMPTZ;

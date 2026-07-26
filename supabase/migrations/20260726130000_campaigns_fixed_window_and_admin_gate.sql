-- Fenêtre fixe pour les campagnes B2B (2026-07-26) — décision du porteur du projet après
-- discussion : le rolling individuel (chaque enfant démarre son propre chrono de 3 mois à sa
-- date d'inscription) est le bon choix pour un parent isolé (B2C, décision #48), mais c'est un
-- risque réel pour une cohorte ONG : si 100 codes sont distribués sur 6 mois, il n'existe jamais
-- de moment où toute la cohorte est "en saison" ensemble, et le Rapport d'Impact devient un
-- instantané qui bouge en permanence au lieu d'un vrai bilan de fin de programme. Une campagne a
-- donc désormais sa propre fenêtre fixe, partagée par tous ses enfants, indépendante de leur date
-- individuelle d'activation.

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 months');

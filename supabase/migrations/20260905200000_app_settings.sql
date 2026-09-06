-- Réglages applicatifs pilotables depuis l'Admin OS (décision 2026-09-06) :
-- contrairement aux variables d'environnement (figées au déploiement), un réglage
-- en base prend effet IMMÉDIATEMENT après la bascule, sans redéploiement.
--
-- Table générique clé → valeur JSONB : les réglages à venir de l'Admin OS y
-- trouvent leur place sans nouvelle migration. RLS activée sans policy — lecture
-- et écriture par les server functions uniquement (service role) ; aucune surface
-- client directe.
--
-- Premier réglage : « substitution_verify » — la vérification back-office des
-- manques matériels (missions de substitution non abouties) :
--   { "enabled": boolean, "rate": number 0..1 }
-- Défauts identiques aux variables d'environnement NAYA_SUBSTITUTION_VERIFY_*,
-- qui restent le repli si la ligne est absente (double sécurité).

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value)
VALUES ('substitution_verify', '{"enabled": true, "rate": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

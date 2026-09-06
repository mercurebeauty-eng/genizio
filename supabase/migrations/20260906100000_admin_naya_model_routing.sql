-- Migration: 20260906100000_admin_naya_model_routing.sql
-- Table de configuration du routage des modèles IA pour Naya (Admin OS)
-- Permet à l'administrateur de basculer dynamiquement le modèle de génération de défis
-- entre DeepSeek V4 Flash, GLM 5.3 Flash et Qwen 3.8 Flash, avec option de fallback de résilience.

CREATE TABLE IF NOT EXISTS public.admin_naya_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    challenge_model TEXT NOT NULL DEFAULT 'deepseek-v4-flash'
        CHECK (challenge_model IN ('deepseek-v4-flash', 'glm-5.3-flash', 'qwen3.8-flash')),
    fallback_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

-- Active RLS
ALTER TABLE public.admin_naya_settings ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "admin_naya_settings_select_authenticated"
    ON public.admin_naya_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Politique de mise à jour restreinte aux administrateurs (service role / requireAdmin dans le code d'application)
CREATE POLICY "admin_naya_settings_update_service"
    ON public.admin_naya_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ligne initiale par défaut
INSERT INTO public.admin_naya_settings (id, challenge_model, fallback_enabled)
VALUES ('default', 'deepseek-v4-flash', true)
ON CONFLICT (id) DO NOTHING;

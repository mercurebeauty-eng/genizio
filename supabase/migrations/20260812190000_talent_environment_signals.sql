-- Fondations « monde réel » (chantier 7, spec NAYA V4 — analyse §19, §29).
--
-- L'application est une INTERFACE entre l'enfant, son potentiel et le monde réel —
-- jamais un univers fermé. Les rencontres réelles (mécanicien, atelier de
-- menuiserie, camps, labs) restent hors de l'application (phase ultérieure) ; ce
-- chantier pose la fondation de DONNÉES : une vue d'agrégation interne qui prépare
-- la réponse à la question « quels environnements favorisent quels talents ? ».
--
-- La vue agrége les complétions VALIDÉES par l'IA (ai_observations non nul —
-- règle « pas de score sans preuve réelle », jamais les valeurs décoratives de
-- création) par environnement (pays, ville, domaine) × talent observé.
--
-- PRINCIPE VISION (non négociable) : ces données servent au développement des
-- enfants, JAMAIS à une exploitation commerciale. La vue est donc strictement
-- INTERNE : aucun accès pour anon/authenticated (REVOKE explicite — même défense
-- en profondeur que les fonctions SECURITY DEFINER du projet) ; seul le rôle
-- privilégié (service role) peut la lire.

CREATE OR REPLACE VIEW public.talent_environment_signals AS
SELECT
  cp.country,
  cp.city,
  ch.domain,
  talent_key,
  COUNT(*) AS validated_completions
FROM public.challenges ch
JOIN public.child_profiles cp ON cp.id = ch.child_id
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(COALESCE(ch.target_intelligences, '[]'::jsonb)) = 'array'
    THEN COALESCE(ch.target_intelligences, '[]'::jsonb)
    ELSE '[]'::jsonb
  END
) AS talent_key
WHERE ch.status = 'completed'
  AND ch.ai_observations IS NOT NULL
GROUP BY cp.country, cp.city, ch.domain, talent_key;

COMMENT ON VIEW public.talent_environment_signals IS
  'Interne (chantier 7, analyse §29) : complétions validées par l''IA par environnement '
  '(pays, ville, domaine) × talent observé — prépare la réponse « quels environnements '
  'favorisent quels talents ? ». Données au service du développement des enfants, '
  'jamais d''exploitation commerciale (vision fondatrice). Accès réservé au service role.';

REVOKE ALL ON public.talent_environment_signals FROM PUBLIC, anon, authenticated;

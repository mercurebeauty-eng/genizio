-- NAYA 2.0 Phase 3a — moteur de génération d'hypothèses causales (premier point IA)
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md §6, décision #32)
--
-- Quand la Phase 2 détecte une anomalie (Z-score sur une note), le moteur de diagnostic
-- (server function ensureHypothesesForChild, rôle *raisonnement* = Sonnet) reçoit le
-- snapshot du Jumeau Pédagogique + l'anomalie et produit un arbre d'hypothèses causales
-- pondérées. Cette table stocke le cycle. La mise à jour bayésienne (défis discriminants)
-- est la Phase 3b — d'où status/current_probability déjà présents mais pas encore mis à
-- jour, et resolved_at/final_diagnosis nullables.

CREATE TABLE public.hypothesis_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  anomaly_trigger_id uuid NOT NULL REFERENCES public.anomaly_triggers(id) ON DELETE CASCADE,
  -- [{cause, prior_probability, current_probability, rationale, evidence_log:[{source_node, fact, weight_impact}]}]
  hypotheses jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  final_diagnosis text,
  model text, -- modèle ayant produit le cycle (audit / traçabilité coût)
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Idempotence au niveau DB : un seul cycle par anomalie, même si deux chargements de
-- Portfolio courent en parallèle (le second INSERT échoue proprement sur la contrainte,
-- rattrapé côté serveur). C'est ce qui rend l'appel "fire-and-forget au chargement" sûr.
CREATE UNIQUE INDEX idx_hypothesis_cycles_anomaly ON public.hypothesis_cycles (anomaly_trigger_id);

CREATE INDEX idx_hypothesis_cycles_child_open
  ON public.hypothesis_cycles (child_id, created_at DESC) WHERE status = 'open';

ALTER TABLE public.hypothesis_cycles ENABLE ROW LEVEL SECURITY;

-- Résultat calculé, pas une saisie : lecture owner-only, aucune policy d'écriture cliente
-- (écrit exclusivement par la server function via supabaseAdmin après vérification
-- d'ownership de l'anomalie) — même principe que anomaly_triggers en Phase 2.
CREATE POLICY "Parents read their own hypothesis cycles"
  ON public.hypothesis_cycles FOR SELECT USING (auth.uid() = user_id);

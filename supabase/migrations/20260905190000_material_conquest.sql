-- Matériau de conquête & missions de substitution (décision produit 2026-09-05,
-- suite de l'analyse product-intelligence-architect) :
--
-- 1. La constitution de Naya n'interdit plus le matériau non garanti : le CŒUR de
--    chaque défi reste réalisable avec les matériaux garantis (listes locales), et
--    Naya peut proposer au plus UN « matériau de conquête » (plus rare, plus
--    ambitieux). Son absence éventuelle ne casse pas le défi : elle déclenche une
--    mission de substitution (trouver, tester et comparer des remplaçants) —
--    l'ingénierie sous contrainte devient le matériau pédagogique.
--
-- 2. Le rôle machine « substitution » rejoint les colonnes typées (cf.
--    20260905130000) pour que l'affichage parent (formatPedagogicalIntention) et
--    les audits suivent le même vocabulaire que discriminant / support_retest.
--
-- 3. Prémices de la boucle « l'enfant capteur de terrain » (gros du chantier gardé
--    en backlog) : chaque signal « matériel introuvable » est capturé de façon
--    structurée (pays, matériau, défi, issue) dans material_gap_events. La
--    vérification back-office (substituts réalistes vs réponse de l'enfant) y
--    écrit son verdict. Le registre country_materials n'est PAS encore corrigé
--    automatiquement — c'est le backlog V4 ; les données commencent à s'accumuler.

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_challenge_role_check;
ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_challenge_role_check
  CHECK (challenge_role IN ('discriminant', 'support_retest', 'substitution'));

CREATE TABLE IF NOT EXISTS public.material_gap_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- La mission de substitution née de ce signal (quand elle a pu être générée)
  substitution_challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  country_key text NOT NULL,   -- clé normalisée du pays de l'enfant
  material text NOT NULL,      -- matériau signalé introuvable (« non précisé » si l'enfant n'a pas tranché)
  -- Cycle de vie : signaled (signal reçu) → substituted (mission réussie) ou
  -- nothing_found (même la substitution n'a pas abouti)
  status text NOT NULL DEFAULT 'signaled'
    CHECK (status IN ('signaled', 'substituted', 'nothing_found')),
  -- Verdict de la vérification back-office (shadow, jamais montré à l'enfant) :
  -- substituts_probables = des remplaçants réalistes existaient (signal
  -- d'investigation vers le Jumeau) ; rare_confirme = aucun substitut réaliste
  -- (signal de correction du modèle de disponibilité → backlog V4)
  verdict text CHECK (verdict IN ('substituts_probables', 'rare_confirme')),
  verified_substitutes text[],
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_gap_events_child
  ON public.material_gap_events (child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_gap_events_registry
  ON public.material_gap_events (country_key, material) WHERE status <> 'signaled';

-- Donnée comportementale d'enfant (même niveau de protection que le Jumeau) :
-- RLS activée, AUCUNE policy → seuls les server functions (service role) lisent et
-- écrivent. Aucune surface client, aucun affichage enfant — la vérification reste
-- structurellement invisible.
ALTER TABLE public.material_gap_events ENABLE ROW LEVEL SECURITY;

-- Résolution de l'issue par trigger (philosophie Phase 0 : capture par triggers,
-- aucun chemin applicatif ne peut oublier d'émettre) : le sort de la mission de
-- substitution met à jour le gap — réussie → substituted, abandonnée → nothing_found.
CREATE OR REPLACE FUNCTION public.resolve_material_gap_outcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.challenge_role = 'substitution' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE public.material_gap_events
      SET status = 'substituted'
      WHERE substitution_challenge_id = NEW.id AND status = 'signaled';
    ELSIF NEW.status = 'not_completed' THEN
      UPDATE public.material_gap_events
      SET status = 'nothing_found'
      WHERE substitution_challenge_id = NEW.id AND status = 'signaled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_material_gap_outcome ON public.challenges;
CREATE TRIGGER trg_material_gap_outcome
  AFTER UPDATE OF status, challenge_role ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.resolve_material_gap_outcome();

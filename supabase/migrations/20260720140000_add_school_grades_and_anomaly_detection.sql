-- NAYA 2.0 Phase 2 — Signaux scolaires + détection d'anomalies (0 IA)
-- (cf. docs/memoire/genizio_naya_systeme_comprehension.md §6, décision #31)
--
-- Capture les notes scolaires que le parent saisit, et détecte par Z-score (code
-- statistique pur, aucun appel IA) quand une note dévie significativement de
-- l'historique DE CET ENFANT dans CETTE matière. La détection alimente une file
-- (anomaly_triggers) que la Phase 3 consommera pour générer des hypothèses — cette
-- phase-ci s'arrête à "capturer + détecter", jamais à interpréter ni à afficher un
-- verdict au parent (§1 du plan : Naya n'affiche jamais de probabilité brute).

CREATE TABLE public.school_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  grade numeric NOT NULL CHECK (grade >= 0),
  max_grade numeric NOT NULL DEFAULT 20 CHECK (max_grade > 0),
  evaluation_type text,
  context text,
  graded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (grade <= max_grade)
);

CREATE INDEX idx_school_grades_child_subject
  ON public.school_grades (child_id, subject, graded_at DESC);

ALTER TABLE public.school_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own children's grades"
  ON public.school_grades FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = school_grades.child_id AND cp.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = school_grades.child_id AND cp.user_id = auth.uid())
  );

-- ── File d'anomalies détectées — consommée par la Phase 3 ──────────────────────────
-- Donnée sensible au même titre que le Jumeau Pédagogique : lecture owner-only,
-- aucune policy d'écriture cliente — seul le trigger SECURITY DEFINER écrit ici.
CREATE TABLE public.anomaly_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  school_grade_id uuid NOT NULL REFERENCES public.school_grades(id) ON DELETE CASCADE,
  z_score numeric NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomaly_triggers_unresolved
  ON public.anomaly_triggers (child_id, created_at DESC) WHERE NOT resolved;

ALTER TABLE public.anomaly_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents read their own anomaly triggers"
  ON public.anomaly_triggers FOR SELECT USING (auth.uid() = user_id);

-- ── Trigger : événement + Z-score à chaque note saisie ──────────────────────────────
-- Comparaison sur grade/max_grade (ratio normalisé [0,1]) et non sur grade brut : deux
-- évaluations sur des barèmes différents (/10, /20, /100) doivent être comparables.
-- Seuil z <= -2.5 : identique à l'exemple du document source NAYA (§ code SQL
-- d'origine). Garde cold-start : au moins 3 notes ANTÉRIEURES dans la même matière
-- avant d'activer la détection (même logique que v_min_n en Phase 1 — sous ce
-- seuil, un écart-type est trop bruité pour être publié).
CREATE OR REPLACE FUNCTION public.detect_grade_anomaly()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ratio numeric;
  v_mean numeric;
  v_stddev numeric;
  v_n integer;
  v_z_score numeric;
BEGIN
  v_ratio := NEW.grade / NEW.max_grade;

  SELECT avg(grade / max_grade), stddev(grade / max_grade), count(*)
    INTO v_mean, v_stddev, v_n
    FROM public.school_grades
    WHERE child_id = NEW.child_id AND subject = NEW.subject AND id <> NEW.id;

  INSERT INTO public.observation_events (child_id, user_id, type, payload)
  VALUES (
    NEW.child_id, NEW.user_id, 'SCHOOL_GRADE_ENTERED',
    jsonb_build_object(
      'school_grade_id', NEW.id,
      'subject', NEW.subject,
      'grade', NEW.grade,
      'max_grade', NEW.max_grade,
      'ratio', round(v_ratio::numeric, 4),
      'evaluation_type', NEW.evaluation_type,
      'graded_at', NEW.graded_at
    )
  );

  IF v_n >= 3 AND v_stddev > 0 THEN
    v_z_score := (v_ratio - v_mean) / v_stddev;
    IF v_z_score <= -2.5 THEN
      INSERT INTO public.anomaly_triggers (child_id, user_id, school_grade_id, z_score)
      VALUES (NEW.child_id, NEW.user_id, NEW.id, round(v_z_score::numeric, 3));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_grade_anomaly() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_school_grades_detect_anomaly
  AFTER INSERT ON public.school_grades
  FOR EACH ROW EXECUTE FUNCTION public.detect_grade_anomaly();

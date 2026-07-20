-- Génizio — étiquetage référentiel académique sur les défis (cf. genizio-decisions #38)
--
-- Pour les défis dans un des 3 domaines académiques (mathématiques, langage, sciences),
-- l'IA étiquette à la génération l'âge auquel correspond RÉELLEMENT le contenu du défi
-- (academic_level_age), indépendamment de l'âge réel de l'enfant. Comparé dans le temps à
-- l'âge réel, c'est le nouveau signal 0 IA qui remplace le Z-score sur notes scolaires
-- (supprimé en décision #37) pour déclencher une investigation Phase 3.
--
-- Nullable, sans défaut : la grande majorité des défis (créatifs, artisanaux, sociaux...)
-- ne relèvent d'aucun des 3 domaines et n'ont simplement pas ce signal.

ALTER TABLE public.challenges
  ADD COLUMN academic_domain text,
  ADD COLUMN academic_level_age integer;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_academic_domain_check
    CHECK (academic_domain IS NULL OR academic_domain IN ('mathematiques', 'langage', 'sciences')),
  ADD CONSTRAINT challenges_academic_level_age_check
    CHECK (academic_level_age IS NULL OR (academic_level_age BETWEEN 3 AND 18));

CREATE INDEX idx_challenges_academic_domain
  ON public.challenges (child_id, academic_domain, completed_at DESC)
  WHERE academic_domain IS NOT NULL AND status = 'completed';

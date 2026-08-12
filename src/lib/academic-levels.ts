// ============================================================================
// NIVEAUX ACADÉMIQUES INTERNATIONAUX — mapping âge → Grade et dernier niveau
// atteint par domaine (décision #59, 2026-08-10).
// ----------------------------------------------------------------------------
// Le référentiel académique (docs/memoire/genizio_referentiel_academique.md)
// est calé sur les standards des meilleurs systèmes éducatifs du monde
// (Common Core US, Singapore Math, NGSS…) et utilise la convention américaine
// « Kindergarten à 5 ans, Grade 1 à 6 ans, etc. » (Grade = âge − 5). Ce module
// expose cette conversion pour l'affichage visible dans l'app, plus l'agrégation
// du dernier academic_level_age par domaine — même logique que
// computeProgressionTargets côté serveur, mais pure et utilisable dans l'UI
// (les données sont déjà chargées côté client, zéro endpoint supplémentaire).
//
// Contrat du module : fonctions pures uniquement, aucune dépendance externe.
// ============================================================================

export interface AcademicLevelSource {
  /** academic_domain d'un défi (absent/null si non étiqueté) */
  academic_domain?: string | null;
  /** academic_level_age : âge auquel correspond réellement le contenu du défi */
  academic_level_age?: number | null;
  /** statut du défi ("completed" seul est pris en compte) */
  status?: string | null;
  /** date de complétion (tri desc pour ne garder que le plus récent par domaine) */
  completed_at?: string | null;
}

export interface DomainAcademicLevel {
  /** Clé technique du domaine (ex: "mathematiques") */
  domain: string;
  /** Dernier academic_level_age atteint dans ce domaine */
  levelAge: number;
  /** Grade international correspondant (ex: "Grade 4") — fallback "N ans" hors bornes */
  grade: string;
}

const MIN_REFERENTIAL_AGE = 4;
const MAX_REFERENTIAL_AGE = 18;

// Convention US du référentiel : Kindergarten à 5 ans, Grade 1 à 6 ans, etc.
// (Grade = âge − 5). Valeur invalide ou hors bornes 4-18 → null.
export function internationalGradeForAge(age: number): string | null {
  if (!Number.isFinite(age)) return null;
  const a = Math.round(age);
  if (a < MIN_REFERENTIAL_AGE || a > MAX_REFERENTIAL_AGE) return null;
  if (a === MIN_REFERENTIAL_AGE) return "Pré-élémentaire";
  if (a === 5) return "Kindergarten";
  return `Grade ${a - 5}`;
}

// Libellé court pour badge (ex: "Niveau international · Grade 3").
export function internationalLevelLabel(age: number): string | null {
  const grade = internationalGradeForAge(age);
  return grade ? `Niveau international · ${grade}` : null;
}

// Dernier academic_level_age atteint par domaine sur les défis COMPLÉTÉS
// uniquement (le plus récent par completed_at desc) — même agrégation que
// computeProgressionTargets, ici pure et prête pour l'affichage.
export function lastAcademicLevelByDomain(challenges: AcademicLevelSource[]): DomainAcademicLevel[] {
  const latest = new Map<string, number>();
  [...challenges]
    .filter(
      (c) =>
        c.status === "completed" &&
        Boolean(c.academic_domain) &&
        typeof c.academic_level_age === "number" &&
        Number.isFinite(c.academic_level_age),
    )
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .forEach((c) => {
      const domain = c.academic_domain as string;
      if (!latest.has(domain)) latest.set(domain, Math.round(c.academic_level_age as number));
    });
  return [...latest.entries()].map(([domain, levelAge]) => ({
    domain,
    levelAge,
    grade: internationalGradeForAge(levelAge) ?? `${levelAge} ans`,
  }));
}

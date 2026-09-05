/**
 * Année scolaire courante (audit UI V3.4) — remplace le "2026-2027" codé en
 * dur dans le handler d'observation académique de l'espace éducateur.
 * Convention française : l'année scolaire commence en septembre.
 */
export function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 8 ? year : year - 1; // mois 8 = septembre
  return `${startYear}-${startYear + 1}`;
}

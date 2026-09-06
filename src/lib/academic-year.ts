/**
 * Année scolaire courante — SOURCE UNIQUE (audit backend C9).
 *
 * Convention du produit : coupure en AOÛT (month >= 7), alignée sur
 * resolveAcademicYearEnd (academic-calendar.ts) qui borne les licences campus
 * au 31 juillet. Les trois helpers divergents (août local ici, août local dans
 * child-schools, août UTC dans academic-calendar) calculaient « la même année »
 * de deux façons — désaccord en août. Un seul helper, une seule coupure.
 */
export function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 7 ? year : year - 1; // mois 7 = août
  return `${startYear}-${startYear + 1}`;
}

/**
 * Gestion du calendrier académique officiel et des échéances scolaires (Génizio Campus).
 *
 * Règle d'or : L'année scolaire se clôture impérativement le 31 juillet à 23:59:59.999 UTC.
 * - Tout abonnement ou licence campus souscrit entre le 1er août (année N) et le 31 juillet (année N+1)
 *   expire au 31 juillet de l'année N+1.
 * - Si souscrit le 1er août (période de pré-rentrée) ou plus tard, cela couvre l'année scolaire qui démarre,
 *   se terminant le 31 juillet suivant.
 */

export function resolveAcademicYearEnd(fromDate: Date = new Date()): Date {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth(); // 0 = Janvier, 6 = Juillet, 7 = Août, 11 = Décembre

  // De août (7) à décembre (11) : l'année scolaire active s'achève au 31 juillet de l'année suivante (year + 1).
  // De janvier (0) à juillet (6) : l'année scolaire active s'achève au 31 juillet de l'année courante (year).
  const targetYear = month >= 7 ? year + 1 : year;
  return new Date(Date.UTC(targetYear, 6, 31, 23, 59, 59, 999));
}

/**
 * Dates limites pour un échéancier en 3 trimestres scolaires (calé sur les frais de scolarité).
 * T1 : Rentrée (15 octobre)
 * T2 : Début 2e trimestre (15 janvier)
 * T3 : Début 3e trimestre (15 avril)
 */
export function resolveSchoolTermDeadlines(fromDate: Date = new Date()): {
  academicYearLabel: string;
  term1Deadline: Date;
  term2Deadline: Date;
  term3Deadline: Date;
  yearEnd: Date;
} {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const academicStartYear = month >= 7 ? year : year - 1;
  const academicEndYear = academicStartYear + 1;

  return {
    academicYearLabel: `${academicStartYear}-${academicEndYear}`,
    term1Deadline: new Date(Date.UTC(academicStartYear, 9, 15, 23, 59, 59)), // 15 Octobre
    term2Deadline: new Date(Date.UTC(academicEndYear, 0, 15, 23, 59, 59)), // 15 Janvier
    term3Deadline: new Date(Date.UTC(academicEndYear, 3, 15, 23, 59, 59)), // 15 Avril
    yearEnd: new Date(Date.UTC(academicEndYear, 6, 31, 23, 59, 59, 999)), // 31 Juillet
  };
}

export interface InstallmentPlan {
  installmentsCount: number;
  amountPerInstallmentXof: number;
  totalXof: number;
  scheduleLabels: string[];
}

/**
 * Calculateur d'échéances pour une licence campus (au comptant ou en 3 trimestres).
 */
export function calculateInstallmentPlan(
  totalPriceXof: number,
  count: 1 | 3 = 3,
): InstallmentPlan {
  const safeCount = count === 1 ? 1 : 3;
  const amountPerInstallmentXof = Math.round(totalPriceXof / safeCount);

  const scheduleLabels =
    safeCount === 1
      ? ["Paiement unique comptant"]
      : [
          "1er Trimestre (Rentrée - Octobre)",
          "2e Trimestre (Janvier)",
          "3e Trimestre (Avril)",
        ];

  return {
    installmentsCount: safeCount,
    amountPerInstallmentXof,
    totalXof: totalPriceXof,
    scheduleLabels,
  };
}

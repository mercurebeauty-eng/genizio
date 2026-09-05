import { describe, it, expect } from "vitest";
import {
  resolveAcademicYearEnd,
  resolveSchoolTermDeadlines,
  calculateInstallmentPlan,
} from "./academic-calendar";

describe("academic-calendar", () => {
  it("calcule la clôture au 31 juillet pour une souscription en septembre (début d'année)", () => {
    // 15 Septembre 2026 -> 31 Juillet 2027
    const septDate = new Date(Date.UTC(2026, 8, 15));
    const yearEnd = resolveAcademicYearEnd(septDate);
    expect(yearEnd.toISOString()).toBe("2027-07-31T23:59:59.999Z");
  });

  it("calcule la clôture au 31 juillet pour une souscription en août (pré-rentrée)", () => {
    // 5 Août 2026 -> 31 Juillet 2027
    const augDate = new Date(Date.UTC(2026, 7, 5));
    const yearEnd = resolveAcademicYearEnd(augDate);
    expect(yearEnd.toISOString()).toBe("2027-07-31T23:59:59.999Z");
  });

  it("calcule la clôture au 31 juillet pour une souscription en janvier (milieu d'année)", () => {
    // 10 Janvier 2027 -> 31 Juillet 2027
    const janDate = new Date(Date.UTC(2027, 0, 10));
    const yearEnd = resolveAcademicYearEnd(janDate);
    expect(yearEnd.toISOString()).toBe("2027-07-31T23:59:59.999Z");
  });

  it("calcule la clôture au 31 juillet pour une souscription en juillet (dernier jour de l'année scolaire)", () => {
    // 31 Juillet 2027 -> 31 Juillet 2027
    const julDate = new Date(Date.UTC(2027, 6, 31));
    const yearEnd = resolveAcademicYearEnd(julDate);
    expect(yearEnd.toISOString()).toBe("2027-07-31T23:59:59.999Z");
  });

  it("génère les 3 dates d'échéances trimestrielles correctes", () => {
    const fromDate = new Date(Date.UTC(2026, 8, 1));
    const deadlines = resolveSchoolTermDeadlines(fromDate);

    expect(deadlines.academicYearLabel).toBe("2026-2027");
    expect(deadlines.term1Deadline.toISOString()).toBe("2026-10-15T23:59:59.000Z");
    expect(deadlines.term2Deadline.toISOString()).toBe("2027-01-15T23:59:59.000Z");
    expect(deadlines.term3Deadline.toISOString()).toBe("2027-04-15T23:59:59.000Z");
    expect(deadlines.yearEnd.toISOString()).toBe("2027-07-31T23:59:59.999Z");
  });

  it("calcule correctement les échéances au comptant et en 3 fois", () => {
    const cashPlan = calculateInstallmentPlan(1250000, 1);
    expect(cashPlan.installmentsCount).toBe(1);
    expect(cashPlan.amountPerInstallmentXof).toBe(1250000);

    const termPlan = calculateInstallmentPlan(1250000, 3);
    expect(termPlan.installmentsCount).toBe(3);
    expect(termPlan.amountPerInstallmentXof).toBe(416667);
    expect(termPlan.scheduleLabels).toHaveLength(3);
  });
});

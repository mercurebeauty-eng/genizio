import { describe, expect, it } from "vitest";
import { currentAcademicYear } from "@/lib/academic-year";

// L'année scolaire bascule en AOÛT (convention du produit, alignée sur
// resolveAcademicYearEnd / licences campus) : en juillet 2026 on est encore en
// 2025-2026, en août 2026 on passe en 2026-2027.

describe("currentAcademicYear", () => {
  it("août → nouvelle année scolaire", () => {
    expect(currentAcademicYear(new Date(2026, 7, 1))).toBe("2026-2027"); // 1er août 2026
    expect(currentAcademicYear(new Date(2026, 8, 1))).toBe("2026-2027"); // sept 2026
    expect(currentAcademicYear(new Date(2026, 11, 15))).toBe("2026-2027"); // déc 2026
  });

  it("juillet et avant → année scolaire précédente", () => {
    expect(currentAcademicYear(new Date(2026, 6, 31))).toBe("2025-2026"); // 31 juil 2026
    expect(currentAcademicYear(new Date(2026, 0, 10))).toBe("2025-2026"); // janv 2026
    expect(currentAcademicYear(new Date(2026, 5, 20))).toBe("2025-2026"); // juin 2026
  });

  it("changement de millénaire cohérent", () => {
    expect(currentAcademicYear(new Date(2025, 9, 5))).toBe("2025-2026");
    expect(currentAcademicYear(new Date(2024, 3, 2))).toBe("2023-2024");
  });
});

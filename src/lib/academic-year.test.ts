import { describe, expect, it } from "vitest";
import { currentAcademicYear } from "@/lib/academic-year";

// L'année scolaire bascule en SEPTEMBRE : en juin 2026 on est en 2025-2026,
// en septembre 2026 on passe en 2026-2027.

describe("currentAcademicYear", () => {
  it("septembre → nouvelle année scolaire", () => {
    expect(currentAcademicYear(new Date(2026, 8, 1))).toBe("2026-2027"); // 1er sept 2026
    expect(currentAcademicYear(new Date(2026, 11, 15))).toBe("2026-2027"); // déc 2026
  });

  it("août et avant → année scolaire précédente", () => {
    expect(currentAcademicYear(new Date(2026, 7, 31))).toBe("2025-2026"); // 31 août 2026
    expect(currentAcademicYear(new Date(2026, 0, 10))).toBe("2025-2026"); // janv 2026
    expect(currentAcademicYear(new Date(2026, 5, 20))).toBe("2025-2026"); // juin 2026
  });

  it("changement de millénaire cohérent", () => {
    expect(currentAcademicYear(new Date(2025, 9, 5))).toBe("2025-2026");
    expect(currentAcademicYear(new Date(2024, 3, 2))).toBe("2023-2024");
  });
});

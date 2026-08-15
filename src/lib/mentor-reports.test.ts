import { describe, it, expect } from "vitest";
import { nextReportStatus, isOpenReport } from "@/lib/mentor-reports";

// Mentor Copilote (décision #74) — machine à états du bilan de fin : le parent
// valide explicitement le bilan ; un rejet renvoie en édition.

describe("nextReportStatus", () => {
  it("draft → submit → submitted", () => {
    expect(nextReportStatus("draft", "submit")).toBe("submitted");
  });

  it("rejected → submit → submitted (retour en édition après rejet)", () => {
    expect(nextReportStatus("rejected", "submit")).toBe("submitted");
  });

  it("submitted → validate → validated", () => {
    expect(nextReportStatus("submitted", "validate")).toBe("validated");
  });

  it("submitted → reject → rejected", () => {
    expect(nextReportStatus("submitted", "reject")).toBe("rejected");
  });

  it("un brouillon ne peut pas être validé directement (le parent ne valide que le soumis)", () => {
    expect(() => nextReportStatus("draft", "validate")).toThrow();
  });

  it("un bilan validé est définitif (aucune transition de sortie)", () => {
    expect(() => nextReportStatus("validated", "submit")).toThrow();
    expect(() => nextReportStatus("validated", "reject")).toThrow();
  });

  it("un brouillon ne peut pas être rejeté", () => {
    expect(() => nextReportStatus("draft", "reject")).toThrow();
  });
});

describe("isOpenReport", () => {
  it("draft et submitted sont ouverts (l'index partiel ne garantit qu'une ligne ouverte)", () => {
    expect(isOpenReport("draft")).toBe(true);
    expect(isOpenReport("submitted")).toBe(true);
  });

  it("validated et rejected sont fermés (une nouvelle période peut commencer)", () => {
    expect(isOpenReport("validated")).toBe(false);
    expect(isOpenReport("rejected")).toBe(false);
  });
});

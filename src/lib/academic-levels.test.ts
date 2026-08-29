import { describe, it, expect } from "vitest";
import {
  internationalGradeForAge,
  internationalLevelLabel,
  lastAcademicLevelByDomain,
  type AcademicLevelSource,
} from "@/lib/academic-levels";

// ===========================================================================
// Décision #59 — mapping âge → Grade international et dernier niveau atteint
// par domaine. Ces fonctions pures alimentent l'affichage « Niveau international »
// de l'app : la conversion suit la convention US du référentiel académique
// (Kindergarten à 5 ans, Grade 1 à 6 ans, Grade = âge − 5).
// ===========================================================================

describe("internationalGradeForAge — convention US du référentiel", () => {
  it("Kindergarten à 5 ans, Grade 1 à 6 ans (Grade = âge − 5)", () => {
    expect(internationalGradeForAge(5)).toBe("Kindergarten");
    expect(internationalGradeForAge(6)).toBe("Grade 1");
    expect(internationalGradeForAge(8)).toBe("Grade 3");
    expect(internationalGradeForAge(14)).toBe("Grade 9");
  });

  it("Pré-élémentaire à 4 ans ; null hors bornes ou valeur invalide", () => {
    expect(internationalGradeForAge(4)).toBe("Pré-élémentaire");
    expect(internationalGradeForAge(3)).toBeNull();
    expect(internationalGradeForAge(22)).toBeNull();
    expect(internationalGradeForAge(NaN)).toBeNull();
  });

  it("arrondit les valeurs non entières (le modèle IA produit parfois des floats)", () => {
    expect(internationalGradeForAge(7.6)).toBe("Grade 3");
    expect(internationalGradeForAge(9.2)).toBe("Grade 4");
  });
});

describe("internationalLevelLabel — libellé court de badge", () => {
  it("préfixe le libellé de badge", () => {
    expect(internationalLevelLabel(8)).toBe("Niveau international · Grade 3");
    expect(internationalLevelLabel(5)).toBe("Niveau international · Kindergarten");
  });

  it("null quand le grade est hors bornes", () => {
    expect(internationalLevelLabel(22)).toBeNull();
  });
});

describe("lastAcademicLevelByDomain — dernier niveau atteint par domaine", () => {
  const c = (partial: Partial<AcademicLevelSource>): AcademicLevelSource => ({
    status: "completed",
    completed_at: null,
    academic_domain: null,
    academic_level_age: null,
    ...partial,
  });

  it("garde le plus récent défi complété par domaine (tri completed_at desc)", () => {
    const challenges = [
      c({ academic_domain: "mathematiques", academic_level_age: 8, completed_at: "2026-06-01" }),
      c({ academic_domain: "mathematiques", academic_level_age: 9, completed_at: "2026-07-01" }),
      c({ academic_domain: "langage", academic_level_age: 7, completed_at: "2026-05-01" }),
    ];
    expect(lastAcademicLevelByDomain(challenges)).toEqual([
      { domain: "mathematiques", levelAge: 9, grade: "Grade 4" },
      { domain: "langage", levelAge: 7, grade: "Grade 2" },
    ]);
  });

  it("ignore les défis non complétés et les défis sans niveau étiqueté", () => {
    const challenges = [
      c({ academic_domain: "sciences", academic_level_age: 10, status: "todo" }),
      c({ academic_domain: "sciences", academic_level_age: null, status: "completed" }),
      c({ academic_domain: null, academic_level_age: 8, status: "completed" }),
      c({ academic_domain: "spatiale", academic_level_age: 6, completed_at: "2026-01-01" }),
    ];
    expect(lastAcademicLevelByDomain(challenges)).toEqual([
      { domain: "spatiale", levelAge: 6, grade: "Grade 1" },
    ]);
  });

  it("retourne vide sans aucun défi étiqueté complété", () => {
    expect(lastAcademicLevelByDomain([])).toEqual([]);
  });

  it("fallback « N ans » si le niveau sort des bornes du référentiel", () => {
    const challenges = [
      c({ academic_domain: "mathematiques", academic_level_age: 22, completed_at: "2026-01-01" }),
    ];
    expect(lastAcademicLevelByDomain(challenges)).toEqual([
      { domain: "mathematiques", levelAge: 22, grade: "22 ans" },
    ]);
  });
});

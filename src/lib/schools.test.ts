import { describe, it, expect } from "vitest";
import {
  slugify,
  generateSchoolCode,
  formatSchoolCode,
} from "./schools.functions";

/**
 * Règle métier : calcul de conformité des quotas d'un établissement
 */
export function evaluateCampusLicense(school: {
  status: string;
  pricingTier: string;
  licensedStudentsQuota: number;
  licenseValidUntil?: string | null;
  activeStudentsCount: number;
}): {
  isOverQuota: boolean;
  remainingSlots: number;
  hasActiveCampusPass: boolean;
} {
  const isExpired = school.licenseValidUntil
    ? new Date(school.licenseValidUntil).getTime() < Date.now()
    : false;

  const hasActiveCampusPass =
    (school.status === "partner_campus" || school.pricingTier !== "free") && !isExpired;

  const quota = school.licensedStudentsQuota ?? 0;
  const remainingSlots = Math.max(0, quota - school.activeStudentsCount);
  const isOverQuota = quota > 0 && school.activeStudentsCount > quota;

  return {
    isOverQuota,
    remainingSlots,
    hasActiveCampusPass,
  };
}

describe("Génizio Campus - Logique Métier Établissements & Écoles", () => {
  describe("slugify", () => {
    it("normalise correctement les accents et caractères spéciaux", () => {
      expect(slugify("Lycée Saint-Exupéry")).toBe("lycee-saint-exupery");
      expect(slugify("Complexe Scolaire Notre-Dame de l'Espérance")).toBe(
        "complexe-scolaire-notre-dame-de-l-esperance",
      );
      expect(slugify("  Collège Privé Moderne - Bouaké  ")).toBe(
        "college-prive-moderne-bouake",
      );
    });

    it("gère les caractères alphanumériques et tirets multiples", () => {
      expect(slugify("Groupe Scolaire ABC & 123")).toBe("groupe-scolaire-abc-123");
      expect(slugify("---test--école---")).toBe("test-ecole");
    });
  });

  describe("generateSchoolCode", () => {
    it("génère un code d'établissement mémorisable avec préfixe # et ville tronquée à 5 caractères", () => {
      const code = generateSchoolCode("Lycée Classique d'Abidjan", "Abidjan");
      expect(code.startsWith("#")).toBe(true);
      expect(code).toContain("ABIDJ");
      // Mots signifiants : "CLASSIQUE", "ABIDJAN" -> Initiales "CA"
      expect(code).toBe("#CA-ABIDJ");
    });

    it("filtre les mots vides administratifs (Lycée, Ecole, Collège, Groupe, De, Du, etc.)", () => {
      const code = generateSchoolCode("Groupe Scolaire Wend-Manegda", "Ouagadougou");
      expect(code.startsWith("#")).toBe(true);
      expect(code).toBe("#WM-OUAGA");
    });

    it("gère les noms courts ou sans mots vides", () => {
      const code = generateSchoolCode("Horizon", "Dakar");
      expect(code).toBe("#HORI-DAKAR");
    });

    it("sécurise la casse et les caractères spéciaux dans le nom de la ville", () => {
      const code = generateSchoolCode("Institut Mandela", "Yaoundé");
      expect(code).toBe("#MAND-YAOUN");
    });
  });

  describe("formatSchoolCode", () => {
    it("ajoute le dièse # s'il est absent et convertit en majuscules", () => {
      expect(formatSchoolCode("csv-ouaga")).toBe("#CSV-OUAGA");
      expect(formatSchoolCode(" lca-abidjan ")).toBe("#LCA-ABIDJAN");
    });

    it("préserve le dièse s'il est déjà présent", () => {
      expect(formatSchoolCode("#CSV-OUAGA")).toBe("#CSV-OUAGA");
      expect(formatSchoolCode("  #LCA-ABIDJAN  ")).toBe("#LCA-ABIDJAN");
    });
  });

  describe("evaluateCampusLicense (Quotas institutionnels)", () => {
    it("un établissement partenaire avec quota suffisant a un pass actif sans dépassement", () => {
      const evaluation = evaluateCampusLicense({
        status: "partner_campus",
        pricingTier: "standard_campus",
        licensedStudentsQuota: 500,
        licenseValidUntil: new Date(Date.now() + 180 * 86400000).toISOString(),
        activeStudentsCount: 320,
      });

      expect(evaluation.hasActiveCampusPass).toBe(true);
      expect(evaluation.isOverQuota).toBe(false);
      expect(evaluation.remainingSlots).toBe(180);
    });

    it("détecte le dépassement de quota lorsqu'un établissement dépasse ses licences allouées", () => {
      const evaluation = evaluateCampusLicense({
        status: "partner_campus",
        pricingTier: "standard_campus",
        licensedStudentsQuota: 100,
        licenseValidUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        activeStudentsCount: 115,
      });

      expect(evaluation.isOverQuota).toBe(true);
      expect(evaluation.remainingSlots).toBe(0);
    });

    it("invalide le campus pass si la date de validité est expirée", () => {
      const evaluation = evaluateCampusLicense({
        status: "partner_campus",
        pricingTier: "pilot",
        licensedStudentsQuota: 200,
        licenseValidUntil: "2025-01-01T00:00:00.000Z",
        activeStudentsCount: 50,
      });

      expect(evaluation.hasActiveCampusPass).toBe(false);
    });
  });
});

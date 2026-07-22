import { describe, it, expect } from "vitest";
import { TALENT_SUBFORMS } from "@/lib/challenges.functions";
import { TALENT_SUBFORM_OPPORTUNITIES } from "@/lib/opportunity-compass";

// Verrouille l'extension de la Boussole d'Opportunités aux 9 domaines (2026-07-22, cf.
// genizio-decisions #40) : chaque sous-forme définie dans TALENT_SUBFORMS doit avoir des pistes
// correspondantes ici, sinon l'encart "Boussole d'Opportunités" affiche silencieusement moins
// que ce que le Profil d'Aptitudes a mesuré.
describe("TALENT_SUBFORM_OPPORTUNITIES", () => {
  it("couvre toutes les sous-formes des 9 domaines avec au moins 2 pistes chacune", () => {
    const allSubforms = Object.values(TALENT_SUBFORMS).flat();
    for (const subform of allSubforms) {
      expect(TALENT_SUBFORM_OPPORTUNITIES[subform], `pistes manquantes pour "${subform}"`).toBeDefined();
      expect(TALENT_SUBFORM_OPPORTUNITIES[subform].length).toBeGreaterThanOrEqual(2);
    }
  });

  it("ne contient aucune clé orpheline (sans domaine parent dans TALENT_SUBFORMS)", () => {
    const allSubforms = new Set(Object.values(TALENT_SUBFORMS).flat());
    for (const key of Object.keys(TALENT_SUBFORM_OPPORTUNITIES)) {
      expect(allSubforms.has(key), `"${key}" n'appartient à aucun domaine de TALENT_SUBFORMS`).toBe(true);
    }
  });
});

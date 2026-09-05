import { describe, it, expect } from "vitest";
import {
  isValidHandleFormat,
  generateSuggestedHandle,
  formatHandle,
  getCleanHandle,
  canTransitionRelation,
} from "./child-relations";

describe("child-relations", () => {
  describe("isValidHandleFormat", () => {
    it("accepte les handles valides", () => {
      expect(isValidHandleFormat("leo_42")).toBe(true);
      expect(isValidHandleFormat("sarah_9")).toBe(true);
      expect(isValidHandleFormat("a12")).toBe(true); // 3 chars
      expect(isValidHandleFormat("jean_baptiste_1234")).toBe(true);
    });

    it("rejette les handles invalides", () => {
      expect(isValidHandleFormat("le")).toBe(false); // trop court
      expect(isValidHandleFormat("1leo")).toBe(false); // commence par chiffre
      expect(isValidHandleFormat("leo-42")).toBe(false); // tiret interdit
      expect(isValidHandleFormat("Léo_42")).toBe(false); // majuscule et accent
      expect(isValidHandleFormat("this_handle_is_way_too_long_for_the_system")).toBe(false);
    });
  });

  describe("generateSuggestedHandle", () => {
    it("génère un handle valide à partir d'un prénom", () => {
      const handle = generateSuggestedHandle("Léo");
      expect(isValidHandleFormat(handle)).toBe(true);
      expect(handle.startsWith("leo_")).toBe(true);
    });

    it("gère les prénoms composés et noms", () => {
      const handle = generateSuggestedHandle("Jean-Baptiste", "Dupont");
      expect(isValidHandleFormat(handle)).toBe(true);
      expect(handle.startsWith("jeanbaptiste_du")).toBe(true);
    });

    it("gère les prénoms avec des caractères complexes", () => {
      const handle = generateSuggestedHandle("★★★");
      expect(isValidHandleFormat(handle)).toBe(true);
      expect(handle.startsWith("user_")).toBe(true);
    });
  });

  describe("formatHandle & getCleanHandle", () => {
    it("formate correctement pour l'affichage", () => {
      expect(formatHandle("leo_42")).toBe("@leo_42");
      expect(formatHandle("@sarah_9")).toBe("@sarah_9");
      expect(formatHandle("LÉO")).toBe("@lo"); // Nettoyage agressif des accents par replace
    });

    it("nettoie l'input pour la recherche", () => {
      expect(getCleanHandle("@leo_42")).toBe("leo_42");
      expect(getCleanHandle(" Sarah_9 ")).toBe("sarah_9");
    });
  });

  describe("canTransitionRelation", () => {
    it("valide la création initiale", () => {
      expect(canTransitionRelation(null, "pending", false)).toBe(true);
      expect(canTransitionRelation(null, "accepted", false)).toBe(false);
    });

    it("valide l'acceptation par un parent", () => {
      expect(canTransitionRelation("pending", "accepted", true)).toBe(true);
      expect(canTransitionRelation("pending", "mentor_verified", false)).toBe(false);
    });

    it("valide la vérification mentor", () => {
      expect(canTransitionRelation("accepted", "mentor_verified", false)).toBe(true);
      expect(canTransitionRelation("pending", "mentor_verified", false)).toBe(false);
    });

    it("valide la révocation par le parent", () => {
      expect(canTransitionRelation("accepted", "rejected", true)).toBe(true);
      expect(canTransitionRelation("mentor_verified", "rejected", true)).toBe(true);
    });
  });
});

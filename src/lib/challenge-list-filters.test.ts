import { describe, it, expect } from "vitest";
import { followFilterAfterStart } from "@/lib/challenge-list-filters";

// Clôture décision #51 (2026-08-13) : le clic « Commencer le défi » semblait sans effet
// car la mise à jour optimiste retirait la carte du filtre « À faire » sans suivre —
// le filtre suit désormais la carte vers « En cours » (correctif 2026-08-05). Ces tests
// verrouillent la non-régression de ce correctif.

describe("followFilterAfterStart — le clic 'Commencer le défi' a un effet visible", () => {
  it("depuis « À faire », le filtre suit la carte vers « En cours »", () => {
    expect(followFilterAfterStart("todo", "todo", "in_progress")).toBe("in_progress");
  });

  it("depuis « Tous », inchangé (la carte reste visible dans les deux états)", () => {
    expect(followFilterAfterStart("all", "todo", "in_progress")).toBe("all");
  });

  it("depuis « En cours », inchangé (la carte y est déjà)", () => {
    expect(followFilterAfterStart("in_progress", "todo", "in_progress")).toBe("in_progress");
  });

  it("ce n'est pas un démarrage (autre statut d'arrivée) → filtre inchangé", () => {
    expect(followFilterAfterStart("todo", "todo", "completed")).toBe("todo");
  });

  it("la carte ne partait pas de « À faire » → filtre inchangé", () => {
    expect(followFilterAfterStart("todo", "in_progress", "in_progress")).toBe("todo");
  });
});

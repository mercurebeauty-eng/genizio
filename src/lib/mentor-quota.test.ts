import { describe, it, expect } from "vitest";
import { computeSupervisorQuota } from "@/lib/supervisor-quota";

// Même bascule que child-profile-quota (5 → 1), appliquée côté organisations. Référence de
// grand-père : la date de création de la CAMPAGNE (le contrat a été signé sur ces conditions),
// ou celle du compte superviseur pour le chemin d'assignation admin direct hors campagne.
describe("computeSupervisorQuota", () => {
  it("une campagne créée avant le cutover garde 5 de base", () => {
    expect(computeSupervisorQuota({ referenceCreatedAt: "2026-07-20T00:00:00.000Z", extraQuota: 0 })).toBe(5);
  });

  it("une campagne créée après le cutover n'a droit qu'à 1 de base", () => {
    expect(computeSupervisorQuota({ referenceCreatedAt: "2026-08-10T00:00:00.000Z", extraQuota: 0 })).toBe(1);
  });

  // Décision utilisateur (2026-08-08) : le suivi des enfants est rigoureux — un superviseur
  // ne suit QUE 5 enfants maximum ("5 par 5"), quel que soit l'extra accordé (miroir du
  // LEAST(quota, 5) du trigger check_supervisor_quota, migration 20260809120000).
  it("le quota supplémentaire s'ajoute dans la limite du plafond de 5", () => {
    expect(computeSupervisorQuota({ referenceCreatedAt: "2026-07-20T00:00:00.000Z", extraQuota: 3 })).toBe(5);
    expect(computeSupervisorQuota({ referenceCreatedAt: "2026-08-10T00:00:00.000Z", extraQuota: 3 })).toBe(4);
  });

  it("une référence manquante n'est jamais grand-pérée", () => {
    expect(computeSupervisorQuota({ referenceCreatedAt: null, extraQuota: 0 })).toBe(1);
  });
});

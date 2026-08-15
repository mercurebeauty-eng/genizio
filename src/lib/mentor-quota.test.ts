import { describe, it, expect } from "vitest";
import { computeMentorQuota } from "@/lib/mentor-quota";

// Même bascule que child-profile-quota (5 → 1), appliquée côté organisations. Référence de
// grand-père : la date de création de la CAMPAGNE (le contrat a été signé sur ces conditions),
// ou celle du compte mentor pour le chemin d'assignation admin direct hors campagne.
describe("computeMentorQuota", () => {
  it("une campagne créée avant le cutover garde 5 de base", () => {
    expect(computeMentorQuota({ referenceCreatedAt: "2026-07-20T00:00:00.000Z", extraQuota: 0 })).toBe(5);
  });

  it("une campagne créée après le cutover n'a droit qu'à 1 de base", () => {
    expect(computeMentorQuota({ referenceCreatedAt: "2026-08-10T00:00:00.000Z", extraQuota: 0 })).toBe(1);
  });

  // Décision utilisateur (2026-08-08) : le suivi des enfants est rigoureux — un mentor
  // ne suit QUE 5 enfants maximum ("5 par 5"), quel que soit l'extra accordé (miroir du
  // LEAST(quota, 5) du trigger check_mentor_quota, migration 20260809120000).
  it("le quota supplémentaire s'ajoute dans la limite du plafond de 5", () => {
    expect(computeMentorQuota({ referenceCreatedAt: "2026-07-20T00:00:00.000Z", extraQuota: 3 })).toBe(5);
    expect(computeMentorQuota({ referenceCreatedAt: "2026-08-10T00:00:00.000Z", extraQuota: 3 })).toBe(4);
  });

  it("une référence manquante n'est jamais grand-pérée", () => {
    expect(computeMentorQuota({ referenceCreatedAt: null, extraQuota: 0 })).toBe(1);
  });
});

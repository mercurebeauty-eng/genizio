import { describe, it, expect } from "vitest";
import {
  requestSupervision,
  acceptSupervision,
  revokeSupervision,
  isSupervisionValid,
  hasSupervisionPermission,
  refreshSupervisionStatus
} from "./supervision";

describe("Relations de Supervision Contextualisées", () => {
  it("crée une relation en statut pending", () => {
    const rel = requestSupervision("sup1", "child1", "Fab Lab Abidjan");
    expect(rel.status).toBe("pending");
    expect(rel.supervisorId).toBe("sup1");
    expect(rel.contextName).toBe("Fab Lab Abidjan");
    expect(isSupervisionValid(rel)).toBe(false); // Pas encore active
  });

  it("active la relation une fois acceptée", () => {
    let rel = requestSupervision("sup1", "child1", "Marathon #04");
    rel = acceptSupervision(rel);
    
    expect(rel.status).toBe("active");
    expect(isSupervisionValid(rel)).toBe(true);
    expect(hasSupervisionPermission(rel, "observe")).toBe(true);
  });

  it("refuse l'acceptation si la relation n'est pas pending", () => {
    let rel = requestSupervision("sup1", "child1", "Marathon #04");
    rel = acceptSupervision(rel); // Active
    
    expect(() => acceptSupervision(rel)).toThrow("Seule une demande 'pending' peut être acceptée.");
  });

  it("désactive la relation après expiration temporelle", () => {
    let rel = requestSupervision("sup1", "child1", "Campagne", 2); // valide 2 jours
    rel = acceptSupervision(rel);
    
    // Dans 3 jours
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    expect(isSupervisionValid(rel, in3Days)).toBe(false);
    expect(hasSupervisionPermission(rel, "assign_role", in3Days)).toBe(false);
    
    // Refresh status
    rel = refreshSupervisionStatus(rel, in3Days);
    expect(rel.status).toBe("expired");
  });

  it("désactive immédiatement en cas de révocation", () => {
    let rel = requestSupervision("sup1", "child1", "Atelier");
    rel = acceptSupervision(rel);
    expect(isSupervisionValid(rel)).toBe(true);

    rel = revokeSupervision(rel);
    expect(rel.status).toBe("revoked");
    expect(isSupervisionValid(rel)).toBe(false);
  });
});

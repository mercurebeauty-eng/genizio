import { describe, it, expect } from "vitest";
import { extractOutOfScope } from "./educator-copilot";

/**
 * Contrat « out_of_scope » (doc refonte pro §16) : le Copilote enseignant est
 * un copilote pédagogique spécialisé — il refuse hors périmètre et redirige
 * vers un assistant généraliste. extractOutOfScope détecte ce refus dans la
 * réponse brute du LLM (fences, JSON, prose) et échoue silencieusement sinon.
 */
describe("extractOutOfScope (périmètre du Copilote enseignant)", () => {
  it("détecte un refus JSON explicite avec redirection", () => {
    const raw = `{"out_of_scope": true, "redirect": "Utilisez ChatGPT pour ce type de demande."}`;
    expect(extractOutOfScope(raw)).toBe("Utilisez ChatGPT pour ce type de demande.");
  });

  it("détecte un refus dans une réponse avec fences markdown", () => {
    const raw = "```json\n{\"out_of_scope\": true}\n```";
    expect(extractOutOfScope(raw)).toBe(
      "Le Copilote est spécialisé dans la pédagogie : un assistant généraliste comme ChatGPT ou Gemini sera plus adapté à cette demande.",
    );
  });

  it("retourne null pour une fiche normale (pas un refus)", () => {
    const raw = `{"subject":"Mathématiques","topic":"Fractions","channel_groups":[]}`;
    expect(extractOutOfScope(raw)).toBeNull();
  });

  it("retourne null pour out_of_scope false", () => {
    const raw = `{"out_of_scope": false}`;
    expect(extractOutOfScope(raw)).toBeNull();
  });

  it("retourne null sur une réponse partielle ou non JSON (fail-open)", () => {
    expect(extractOutOfScope("")).toBeNull();
    expect(extractOutOfScope("Je prépare votre fiche de leçon...")).toBeNull();
    expect(extractOutOfScope("{ tronqué")).toBeNull();
  });
});

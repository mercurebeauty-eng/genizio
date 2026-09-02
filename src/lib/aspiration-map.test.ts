import { describe, it, expect } from "vitest";
import {
  ASPIRATION_BRIDGES,
  findAspirationBridge,
  GENERIC_ASPIRATION_BRIDGE,
  normalizeAspirationLabel,
} from "@/lib/aspiration-map";
import { DOMAINS } from "@/lib/challenges.functions";

// Ponts d'aspiration (2026-08-12, analyse §11-12) : le mapping curé relie une
// aspiration à ses compétences fondamentales — le système ne casse jamais.

describe("findAspirationBridge", () => {
  it("clé canonique exacte (minuscules, sans accents)", () => {
    const bridge = findAspirationBridge("Menuiserie");
    expect(bridge).toBe(ASPIRATION_BRIDGES.menuiserie);
    expect(bridge.talentKeys).toContain("artisanale");
    expect(bridge.skillsHint).toContain("mesurer");
  });

  it("matching tolérant par tokens : 'menuiserie', 'atelier de menuiserie', 'menuisier'", () => {
    expect(findAspirationBridge("menuiserie")).toBe(ASPIRATION_BRIDGES.menuiserie);
    expect(findAspirationBridge("Atelier de Menuiserie")).toBe(ASPIRATION_BRIDGES.menuiserie);
    expect(findAspirationBridge("menuisier")).toBe(ASPIRATION_BRIDGES.menuiserie);
  });

  it("normalisation : accents et casse neutralisés", () => {
    expect(normalizeAspirationLabel("Mécanique")).toBe("mecanique");
    expect(findAspirationBridge("Mécanique")).toBe(ASPIRATION_BRIDGES.mecanique);
  });

  it("label libre inconnu → pont générique (jamais null)", () => {
    const bridge = findAspirationBridge("Astronaute");
    expect(bridge).toBe(GENERIC_ASPIRATION_BRIDGE);
    expect(bridge.talentKeys).toEqual([]);
  });

  it("label vide → pont générique", () => {
    expect(findAspirationBridge("")).toBe(GENERIC_ASPIRATION_BRIDGE);
    expect(findAspirationBridge("   ")).toBe(GENERIC_ASPIRATION_BRIDGE);
  });

  it("chaque pont du vocabulaire a des compétences et un ancrage monde réel", () => {
    for (const [key, bridge] of Object.entries(ASPIRATION_BRIDGES)) {
      expect(bridge.talentKeys.length, key).toBeGreaterThan(0);
      expect(bridge.domains.length, key).toBeGreaterThan(0);
      expect(bridge.skillsHint.length, key).toBeGreaterThan(0);
      expect(bridge.worldAnchor.length, key).toBeGreaterThan(0);
    }
  });

  it("chaque domaine d'un pont appartient au vocabulaire fermé DOMAINS (review 2026-08-12, P1)", () => {
    // 16/20 domaines étaient des libellés d'affichage (« Sciences & Ingénierie »…) alors
    // que challenges.domain stocke les valeurs canoniques — le comptage d'essais, la
    // garde « défi récent » et le vocabulaire inséré en base étaient tous faussés.
    for (const [key, bridge] of Object.entries(ASPIRATION_BRIDGES)) {
      for (const domain of bridge.domains) {
        expect(DOMAINS, `${key} → ${domain}`).toContain(domain);
      }
    }
  });

  it("toutes les suggestions de ASPIRATION_SUGGESTIONS résolvent vers un pont dédié non-générique", async () => {
    const { ASPIRATION_SUGGESTIONS } = await import("@/lib/profile-context");
    for (const suggestion of ASPIRATION_SUGGESTIONS) {
      const bridge = findAspirationBridge(suggestion);
      expect(
        bridge,
        `La suggestion '${suggestion}' doit avoir un pont dédié non générique`,
      ).not.toBe(GENERIC_ASPIRATION_BRIDGE);
      expect(bridge.talentKeys.length).toBeGreaterThan(0);
    }
  });
});

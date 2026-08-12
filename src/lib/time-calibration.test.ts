import { describe, it, expect } from "vitest";
import {
  suggestTimePressureChange,
  GENTLE_SUGGESTION_THRESHOLD,
  GENTLE_SUGGESTION_WINDOW_DAYS,
} from "@/lib/time-calibration.functions";

// Chantier 4 — calibration du temps par les observations (analyse §5 suite) :
// `time_pressure` devient appris, jamais imposé — la suggestion est dérivée à la
// lecture (0 table dédiée) et jamais automatique (le parent valide).

function event(domain: string, daysAgo: number): { domain: string | null; occurredAt: string } {
  return { domain, occurredAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() };
}

describe("suggestTimePressureChange — seuil, fenêtre et modes", () => {
  it("propose quand un domaine atteint le seuil de 3 dépassements", () => {
    const res = suggestTimePressureChange(
      [event("Mathématiques", 1), event("Mathématiques", 2), event("Mathématiques", 3)],
      "standard"
    );
    expect(res.suggested).toBe(true);
    expect(res.domains).toEqual(["Mathématiques"]);
  });

  it("ne propose pas sous le seuil (2 dépassements)", () => {
    const res = suggestTimePressureChange(
      [event("Mathématiques", 1), event("Mathématiques", 2)],
      "standard"
    );
    expect(res.suggested).toBe(false);
    expect(res.domains).toEqual([]);
  });

  it("ignore les dépassements hors fenêtre (au-delà de 30 jours)", () => {
    const res = suggestTimePressureChange(
      [
        event("Mathématiques", 1),
        event("Mathématiques", 2),
        event("Mathématiques", 31), // hors fenêtre
      ],
      "standard"
    );
    expect(res.suggested).toBe(false);
  });

  it("ne propose jamais en mode gentle ou none (déjà adapté, pas de bruit)", () => {
    const events = [event("Mathématiques", 1), event("Mathématiques", 2), event("Mathématiques", 3)];
    expect(suggestTimePressureChange(events, "gentle").suggested).toBe(false);
    expect(suggestTimePressureChange(events, "none").suggested).toBe(false);
  });

  it("compte séparément par domaine (3 domaines différents ne suffisent pas)", () => {
    const res = suggestTimePressureChange(
      [event("Sciences", 1), event("Sciences", 2), event("Arts", 1), event("Arts", 2)],
      "standard"
    );
    expect(res.suggested).toBe(false);
  });

  it("expose les constantes du contrat (seuil 3, fenêtre 30 jours)", () => {
    expect(GENTLE_SUGGESTION_THRESHOLD).toBe(3);
    expect(GENTLE_SUGGESTION_WINDOW_DAYS).toBe(30);
  });
});

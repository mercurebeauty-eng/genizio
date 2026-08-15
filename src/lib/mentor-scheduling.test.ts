import { describe, it, expect } from "vitest";
import {
  isOnTime,
  computePunctualityScore,
  punctualityFromSessions,
} from "./mentor-scheduling";

// Planification des séances + ponctualité (2026-08-15) — helpers purs.
// La ponctualité = écart entre l'heure planifiée (scheduled_at) et l'heure déclarée
// (occurred_at) d'une séance liée à un créneau, dans la fenêtre ±30 min.

describe("isOnTime", () => {
  const planned = "2026-08-15T10:00:00.000Z";

  it("écart nul : à l'heure", () => {
    expect(isOnTime(planned, "2026-08-15T10:00:00.000Z")).toBe(true);
  });

  it("écart dans la fenêtre ±30 min : à l'heure (bornes incluses)", () => {
    expect(isOnTime(planned, "2026-08-15T09:30:00.000Z")).toBe(true);
    expect(isOnTime(planned, "2026-08-15T10:30:00.000Z")).toBe(true);
  });

  it("écart hors fenêtre : en retard ou en avance", () => {
    expect(isOnTime(planned, "2026-08-15T10:31:00.000Z")).toBe(false);
    expect(isOnTime(planned, "2026-08-15T09:29:00.000Z")).toBe(false);
  });

  it("fenêtre personnalisée (ex. 60 min)", () => {
    expect(isOnTime(planned, "2026-08-15T10:45:00.000Z", 60)).toBe(true);
    // 61 min d'écart > 60 min → hors fenêtre.
    expect(isOnTime(planned, "2026-08-15T11:01:00.000Z", 60)).toBe(false);
  });
});

describe("computePunctualityScore", () => {
  it("aucune séance planifiée → null (composante absente — le score global renormalise)", () => {
    expect(computePunctualityScore({ plannedSessions: 0, onTimeSessions: 0 })).toBeNull();
  });

  it("tout à l'heure : 100", () => {
    expect(computePunctualityScore({ plannedSessions: 3, onTimeSessions: 3 })).toBe(100);
  });

  it("partiel : 2/3 ≈ 67", () => {
    expect(computePunctualityScore({ plannedSessions: 3, onTimeSessions: 2 })).toBe(67);
  });

  it("aucune à l'heure : 0", () => {
    expect(computePunctualityScore({ plannedSessions: 2, onTimeSessions: 0 })).toBe(0);
  });
});

describe("punctualityFromSessions", () => {
  it("séances sans scheduled_at ignorées (déclarées sans créneau planifié) → null", () => {
    expect(
      punctualityFromSessions([
        { occurred_at: "2026-08-15T10:00:00.000Z", scheduled_at: null },
        { occurred_at: "2026-08-16T10:00:00.000Z", scheduled_at: undefined },
      ]),
    ).toBeNull();
  });

  it("mélange planifiées (à l'heure / retard) et non planifiées", () => {
    const score = punctualityFromSessions([
      { occurred_at: "2026-08-15T10:00:00.000Z", scheduled_at: "2026-08-15T10:00:00.000Z" },
      // 60 min d'écart → hors fenêtre (±30) → pas à l'heure.
      { occurred_at: "2026-08-16T11:00:00.000Z", scheduled_at: "2026-08-16T10:00:00.000Z" },
      { occurred_at: "2026-08-17T10:00:00.000Z", scheduled_at: null },
    ]);
    expect(score).toBe(50);
  });

  it("toutes les planifiées à l'heure → 100 (les non planifiées n'entrent pas au dénominateur)", () => {
    const score = punctualityFromSessions([
      { occurred_at: "2026-08-15T10:00:00.000Z", scheduled_at: "2026-08-15T10:00:00.000Z" },
      { occurred_at: "2026-08-16T10:00:00.000Z", scheduled_at: "2026-08-16T10:15:00.000Z" },
      { occurred_at: "2026-08-17T10:00:00.000Z", scheduled_at: null },
    ]);
    expect(score).toBe(100);
  });
});

import { describe, it, expect } from "vitest";
import {
  defaultEstimateForDifficulty,
  formatTimePressureNote,
  resolveTimeLimitMinutes,
} from "@/lib/time-limit";

// Temps adaptatif (2026-08-12, analyse « Évolution de Génizio » §5) — la contrainte
// temporelle est un paramètre pédagogique : jamais un verdict, toujours configurable
// (standard / gentle / none) et bornée.

describe("resolveTimeLimitMinutes", () => {
  it("time_pressure none → pas de chrono (null), même avec une estimation", () => {
    expect(
      resolveTimeLimitMinutes({ estimatedMinutes: 30, age: 9, timePressure: "none", difficulty: "moyen" })
    ).toBeNull();
  });

  it("standard : estimation × facteur d'âge (8-12 ans → ×1,25)", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 20, age: 9, timePressure: "standard" })).toBe(25);
  });

  it("les plus jeunes (≤ 7 ans) reçoivent plus de temps (×1,5)", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 20, age: 6, timePressure: "standard" })).toBe(30);
  });

  it("12 ans et plus : temps à l'estimation (×1)", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 20, age: 14, timePressure: "standard" })).toBe(20);
  });

  it("gentle : ×1,5 en plus", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 20, age: 14, timePressure: "gentle" })).toBe(30);
  });

  it("sans estimation : repli sur la difficulté (facile 15, moyen 25, difficile 40)", () => {
    expect(resolveTimeLimitMinutes({ age: 14, timePressure: "standard", difficulty: "facile" })).toBe(15);
    expect(resolveTimeLimitMinutes({ age: 14, timePressure: "standard", difficulty: "moyen" })).toBe(25);
    expect(resolveTimeLimitMinutes({ age: 14, timePressure: "standard", difficulty: "difficile" })).toBe(40);
    expect(resolveTimeLimitMinutes({ age: 14, timePressure: "standard" })).toBe(25);
  });

  it("bornes : jamais moins de 3 min, jamais plus de 120 min", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 1, age: 14, timePressure: "standard" })).toBe(3);
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 300, age: 6, timePressure: "gentle" })).toBe(120);
  });

  it("estimation invalide (0 ou négatif) : traité comme absent", () => {
    expect(resolveTimeLimitMinutes({ estimatedMinutes: 0, age: 14, timePressure: "standard" })).toBe(25);
    expect(resolveTimeLimitMinutes({ estimatedMinutes: -5, age: 14, timePressure: "standard" })).toBe(25);
  });
});

describe("defaultEstimateForDifficulty", () => {
  it("repli par difficulté", () => {
    expect(defaultEstimateForDifficulty("facile")).toBe(15);
    expect(defaultEstimateForDifficulty("moyen")).toBe(25);
    expect(defaultEstimateForDifficulty("difficile")).toBe(40);
    expect(defaultEstimateForDifficulty(null)).toBe(25);
    expect(defaultEstimateForDifficulty(undefined)).toBe(25);
  });
});

describe("formatTimePressureNote", () => {
  it("standard : durée honnête comme base du chrono", () => {
    expect(formatTimePressureNote("standard")).toContain("chrono");
    expect(formatTimePressureNote(null)).toContain("chrono");
  });

  it("gentle : le chrono sera rallongé de lui-même", () => {
    expect(formatTimePressureNote("gentle")).toContain("généreux");
  });

  it("none : pas de contrainte temporelle", () => {
    expect(formatTimePressureNote("none")).toContain("SANS chronomètre");
  });
});

import { describe, it, expect } from "vitest";
import {
  GRADE_LEVEL_METADATA,
  CURRICULUM_TOPICS,
  DRIVER_FUSION_GUIDANCE,
  calculateZPADifficulty,
  getCurriculumTopics,
  findCurriculumTopic,
  GradeLevel,
  AcademicSubject,
  BehavioralDriver,
  BEHAVIORAL_DRIVERS,
  GRADE_LEVELS,
  ACADEMIC_SUBJECTS,
} from "@/lib/academic-homework.functions";
import { z } from "zod";

// Re-create input schema from challenges.functions.ts to validate schema rules directly
const GenerateAcademicHomeworkInputSchema = z.object({
  childId: z.string().uuid(),
  subject: z.enum(["maths", "francais", "sciences", "histoire_geo", "anglais"]),
  gradeLevel: z.enum(["CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]),
  homeworkInstruction: z.string().min(2).max(500),
  suggestedTopicId: z.string().optional().nullable(),
  behavioralDriver: z.enum(["deconstruire", "schematiser", "simuler", "enqueter", "optimiser"]).optional().nullable(),
  timeAvailable: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
  masteryScore: z.number().optional(),
  hypothesisCauses: z.array(z.string()).optional(),
  anxietyProb: z.number().optional(),
  currentLevel: z.number().optional(),
});

describe("Challenger Stress Suite — Extreme Anxiety Probabilities P(A)", () => {
  it("damps difficulty to level <= 2 and HIGH_SUPPORT when P(A) = 0.95 (extreme anxiety)", () => {
    const resExtreme = calculateZPADifficulty(5, [], 0.95);
    expect(resExtreme.isAnxietyDamped).toBe(true);
    expect(resExtreme.level).toBeLessThanOrEqual(2);
    expect(resExtreme.level).toBeGreaterThanOrEqual(1);
    expect(resExtreme.supportMode).toBe("HIGH_SUPPORT");
    expect(resExtreme.rationale).toContain("P=95%");
    expect(resExtreme.rationale).toContain("étayage maximal");
  });

  it("handles maximum anxiety probability P(A) = 1.0 correctly", () => {
    const resMax = calculateZPADifficulty(5, [], 1.0);
    expect(resMax.isAnxietyDamped).toBe(true);
    expect(resMax.level).toBeLessThanOrEqual(2);
    expect(resMax.supportMode).toBe("HIGH_SUPPORT");
    expect(resMax.rationale).toContain("P=100%");
  });

  it("respects anxiety threshold boundary: 0.40 (not damped) vs 0.4001 (damped)", () => {
    const atBoundary = calculateZPADifficulty(5, [], 0.40);
    expect(atBoundary.isAnxietyDamped).toBe(false);
    expect(atBoundary.level).toBe(5);
    expect(atBoundary.supportMode).toBe("CHALLENGE_PLUS");

    const aboveBoundary = calculateZPADifficulty(5, [], 0.4001);
    expect(aboveBoundary.isAnxietyDamped).toBe(true);
    expect(aboveBoundary.level).toBeLessThanOrEqual(2);
    expect(aboveBoundary.supportMode).toBe("HIGH_SUPPORT");
  });

  it("prioritizes PERFORMANCE_ANXIETY safety damping over READY_FOR_MORE boost", () => {
    // READY_FOR_MORE would normally boost score 4 -> 5, but anxiety forces dampening to <= 2
    const conflicting = calculateZPADifficulty(4, ["READY_FOR_MORE", "PERFORMANCE_ANXIETY"], 0.95);
    expect(conflicting.isAnxietyDamped).toBe(true);
    expect(conflicting.level).toBeLessThanOrEqual(2);
    expect(conflicting.supportMode).toBe("HIGH_SUPPORT");
  });
});

describe("Challenger Stress Suite — Boundary Grade Levels (CP and 3ème)", () => {
  it("correctly models youngest boundary grade level CP (Age 6, Cycle 2)", () => {
    const cpMeta = GRADE_LEVEL_METADATA.CP;
    expect(cpMeta).toEqual({
      label: "CP",
      cycle: "Cycle 2 (Apprentissages fondamentaux)",
      nominalAge: 6,
    });

    for (const subject of ACADEMIC_SUBJECTS) {
      const topics = getCurriculumTopics("CP", subject);
      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics) {
        expect(topic.id).toMatch(new RegExp(`^[a-z]+_cp_`));
        expect(topic.name.length).toBeGreaterThan(3);
        expect(topic.hook.length).toBeGreaterThan(10);
      }
    }
  });

  it("correctly models oldest boundary grade level 3ème (Age 14, Cycle 4)", () => {
    const troisiemeMeta = GRADE_LEVEL_METADATA["3eme"];
    expect(troisiemeMeta).toEqual({
      label: "3ème",
      cycle: "Cycle 4 (Approfondissements)",
      nominalAge: 14,
    });

    for (const subject of ACADEMIC_SUBJECTS) {
      const topics = getCurriculumTopics("3eme", subject);
      expect(topics.length).toBeGreaterThan(0);
      for (const topic of topics) {
        expect(topic.id).toMatch(new RegExp(`^[a-z]+_3e_`));
        expect(topic.name.length).toBeGreaterThan(3);
        expect(topic.hook.length).toBeGreaterThan(10);
      }
    }
  });

  it("verifies full spectrum of grade levels from CP to 3ème is strictly sequential in age", () => {
    let expectedAge = 6;
    for (const grade of GRADE_LEVELS) {
      const meta = GRADE_LEVEL_METADATA[grade];
      expect(meta.nominalAge).toBe(expectedAge);
      expectedAge += 1;
    }
    expect(expectedAge).toBe(15); // Ended at age 14 for 3eme
  });
});

describe("Challenger Stress Suite — Homework Instructions Validation & Input Resilience", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts custom explicit homework prompts with special characters, quotes, and accents", () => {
    const customPrompt = `Révise l'accord du participe passé avec l'auxiliaire "avoir" & "être" (ex: "les pommes qu'il a mangées").`;
    const input = {
      childId: validUuid,
      subject: "francais",
      gradeLevel: "CM2",
      homeworkInstruction: customPrompt,
    };
    const parsed = GenerateAcademicHomeworkInputSchema.parse(input);
    expect(parsed.homeworkInstruction).toBe(customPrompt);
  });

  it("rejects empty homework instructions", () => {
    const input = {
      childId: validUuid,
      subject: "maths",
      gradeLevel: "CP",
      homeworkInstruction: "",
    };
    expect(() => GenerateAcademicHomeworkInputSchema.parse(input)).toThrow(z.ZodError);
  });

  it("rejects 1-character homework instructions (min length is 2)", () => {
    const input = {
      childId: validUuid,
      subject: "maths",
      gradeLevel: "CP",
      homeworkInstruction: "x",
    };
    expect(() => GenerateAcademicHomeworkInputSchema.parse(input)).toThrow(z.ZodError);
  });

  it("rejects homework instructions exceeding maximum allowed length of 500 chars", () => {
    const overlongPrompt = "A".repeat(501);
    const input = {
      childId: validUuid,
      subject: "sciences",
      gradeLevel: "6eme",
      homeworkInstruction: overlongPrompt,
    };
    expect(() => GenerateAcademicHomeworkInputSchema.parse(input)).toThrow(z.ZodError);
  });

  it("rejects undefined or null homework instructions", () => {
    const inputNoPrompt = {
      childId: validUuid,
      subject: "maths",
      gradeLevel: "CE1",
    };
    expect(() => GenerateAcademicHomeworkInputSchema.parse(inputNoPrompt)).toThrow(z.ZodError);
  });
});

describe("Challenger Stress Suite — All 5 Behavioral Drivers Coverage", () => {
  it("contains rich fusion guidance for all 5 drivers", () => {
    const expectedDrivers: BehavioralDriver[] = [
      "deconstruire",
      "schematiser",
      "simuler",
      "enqueter",
      "optimiser",
    ];

    expect(BEHAVIORAL_DRIVERS).toEqual(expectedDrivers);

    for (const driver of expectedDrivers) {
      const guidance = DRIVER_FUSION_GUIDANCE[driver];
      expect(guidance).toBeDefined();
      expect(guidance.length).toBeGreaterThan(100);
      expect(guidance).toContain("MÉCANIQUE DE FUSION");
      expect(guidance.toUpperCase()).toContain(driver.toUpperCase().replace("DECONSTRUIRE", "DÉCONSTRUIRE").replace("SCHEMATISER", "SCHÉMATISER").replace("ENQUETER", "ENQUÊTER"));
      expect(guidance).toContain("Exemples :");
    }
  });

  it("allows selecting each driver explicitly in input schema", () => {
    for (const driver of BEHAVIORAL_DRIVERS) {
      const input = {
        childId: "123e4567-e89b-12d3-a456-426614174000",
        subject: "histoire_geo",
        gradeLevel: "4eme",
        homeworkInstruction: "La Révolution Française et les cahiers de doléances",
        behavioralDriver: driver,
      };
      const parsed = GenerateAcademicHomeworkInputSchema.parse(input);
      expect(parsed.behavioralDriver).toBe(driver);
    }
  });
});

describe("Challenger Stress Suite — ZPA Causal Hypotheses & Step Bounding", () => {
  it("enforces step changes of at most +/- 1 when currentLevel is supplied", () => {
    // Jump from 1 to 5 -> capped at 2
    expect(calculateZPADifficulty(5, [], 0, 1).level).toBe(2);
    // Jump from 5 to 1 -> capped at 4
    expect(calculateZPADifficulty(1, [], 0, 5).level).toBe(4);
    // Jump from 3 to 5 -> capped at 4
    expect(calculateZPADifficulty(5, [], 0, 3).level).toBe(4);
    // Same level 3 -> stays 3
    expect(calculateZPADifficulty(3, [], 0, 3).level).toBe(3);
  });

  it("adjusts raw level correctly for CONCEPTUAL_GAP and METHOD_MISMATCH", () => {
    const conceptual = calculateZPADifficulty(3, ["CONCEPTUAL_GAP"]);
    expect(conceptual.level).toBe(2);

    const method = calculateZPADifficulty(3, ["METHOD_MISMATCH"]);
    expect(method.level).toBe(2);
  });
});

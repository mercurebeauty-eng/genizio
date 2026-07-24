import { describe, it, expect, vi } from "vitest";
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
} from "@/lib/academic-homework.functions";
import { generateAcademicHomeworkChallenge, assignTemplateChallenge } from "@/lib/challenges.functions";

describe("Academic Homework Generation Engine — Grade & Topic Mapping", () => {
  it("maps grade levels to correct nominal age and cycle metadata", () => {
    expect(GRADE_LEVEL_METADATA.CP).toEqual({
      label: "CP",
      cycle: "Cycle 2 (Apprentissages fondamentaux)",
      nominalAge: 6,
    });
    expect(GRADE_LEVEL_METADATA.CE1.nominalAge).toBe(7);
    expect(GRADE_LEVEL_METADATA.CE2.nominalAge).toBe(8);
    expect(GRADE_LEVEL_METADATA.CM1.nominalAge).toBe(9);
    expect(GRADE_LEVEL_METADATA.CM2.nominalAge).toBe(10);
    expect(GRADE_LEVEL_METADATA["6eme"]).toEqual({
      label: "6ème",
      cycle: "Cycle 3 (Consolidation)",
      nominalAge: 11,
    });
    expect(GRADE_LEVEL_METADATA["5eme"].nominalAge).toBe(12);
    expect(GRADE_LEVEL_METADATA["4eme"].nominalAge).toBe(13);
    expect(GRADE_LEVEL_METADATA["3eme"].nominalAge).toBe(14);
  });

  it("resolves curriculum topics across all grades and subjects", () => {
    const grades: GradeLevel[] = ["CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"];
    const subjects: AcademicSubject[] = ["maths", "francais", "sciences", "histoire_geo", "anglais"];

    for (const grade of grades) {
      for (const subject of subjects) {
        const topics = getCurriculumTopics(grade, subject);
        expect(Array.isArray(topics)).toBe(true);
        expect(topics.length).toBeGreaterThan(0);
        expect(topics[0]).toHaveProperty("id");
        expect(topics[0]).toHaveProperty("name");
        expect(topics[0]).toHaveProperty("hook");
      }
    }
  });

  it("finds specific curriculum topic by topic ID", () => {
    const topic = findCurriculumTopic("CM1", "maths", "maths_cm1_1");
    expect(topic).toBeDefined();
    expect(topic?.name).toContain("Fractions");

    const missing = findCurriculumTopic("CP", "maths", "non_existent_id");
    expect(missing).toBeUndefined();
  });

  it("formats driver guidance mechanics for all 5 behavioral drivers", () => {
    const drivers: BehavioralDriver[] = [
      "deconstruire",
      "schematiser",
      "simuler",
      "enqueter",
      "optimiser",
    ];

    for (const driver of drivers) {
      const guidance = DRIVER_FUSION_GUIDANCE[driver];
      expect(typeof guidance).toBe("string");
      expect(guidance.length).toBeGreaterThan(20);
      expect(guidance).toContain("MÉCANIQUE DE FUSION");
    }
  });
});

describe("ZPA Bayesian Telemetry Difficulty Algorithm", () => {
  it("calculates nominal ZPA difficulty level (1 to 5)", () => {
    const resLevel1 = calculateZPADifficulty(1, [], 0.05);
    expect(resLevel1.level).toBe(1);
    expect(resLevel1.supportMode).toBe("HIGH_SUPPORT");

    const resLevel3 = calculateZPADifficulty(3, [], 0.05);
    expect(resLevel3.level).toBe(3);
    expect(resLevel3.supportMode).toBe("STANDARD");

    const resLevel5 = calculateZPADifficulty(5, [], 0.05);
    expect(resLevel5.level).toBe(5);
    expect(resLevel5.supportMode).toBe("CHALLENGE_PLUS");
  });

  it("applies anxiety safety damping when P(Anxiety) > 0.40 or PERFORMANCE_ANXIETY cause", () => {
    // High anxiety probability -> cap at level 1 or 2 with HIGH_SUPPORT
    const highAnxiety = calculateZPADifficulty(5, [], 0.50);
    expect(highAnxiety.isAnxietyDamped).toBe(true);
    expect(highAnxiety.level).toBeLessThanOrEqual(2);
    expect(highAnxiety.supportMode).toBe("HIGH_SUPPORT");

    // PERFORMANCE_ANXIETY hypothesis cause -> cap at level 1 or 2 with HIGH_SUPPORT
    const anxietyCause = calculateZPADifficulty(4, ["PERFORMANCE_ANXIETY"], 0.10);
    expect(anxietyCause.isAnxietyDamped).toBe(true);
    expect(anxietyCause.level).toBeLessThanOrEqual(2);
    expect(anxietyCause.supportMode).toBe("HIGH_SUPPORT");
  });

  it("enforces anti-spike step bounds (+/- 1 max step change)", () => {
    // Current level 1, raw target 5 -> clamped to 2 (+1 step)
    const stepUp = calculateZPADifficulty(5, [], 0.05, 1);
    expect(stepUp.level).toBe(2);
    expect(stepUp.isAnxietyDamped).toBe(false);

    // Current level 5, raw target 1 -> clamped to 4 (-1 step)
    const stepDown = calculateZPADifficulty(1, [], 0.05, 5);
    expect(stepDown.level).toBe(4);
  });

  it("adjusts difficulty based on causal hypotheses", () => {
    // READY_FOR_MORE -> boosts level by +1
    const readyMore = calculateZPADifficulty(3, ["READY_FOR_MORE"], 0.05);
    expect(readyMore.level).toBe(4);

    // CONCEPTUAL_GAP -> lowers level by -1
    const gap = calculateZPADifficulty(3, ["CONCEPTUAL_GAP"], 0.05);
    expect(gap.level).toBe(2);
  });
});

describe("generateAcademicHomeworkChallenge & assignTemplateChallenge Server Function Structure", () => {
  it("is defined as a valid TanStack createServerFn", () => {
    expect(generateAcademicHomeworkChallenge).toBeDefined();
    expect(typeof generateAcademicHomeworkChallenge).toBe("function");
    expect(assignTemplateChallenge).toBeDefined();
    expect(typeof assignTemplateChallenge).toBe("function");
  });
});

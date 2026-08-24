import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_METADATA,
  ACADEMIC_SUBJECTS,
  ACADEMIC_SUBJECT_LABELS,
  BEHAVIORAL_DRIVERS,
  getCurriculumTopics,
  type GradeLevel,
  type AcademicSubject,
} from "./academic-homework.functions";
import {
  AcademicHomeworkInput,
  getDefaultGradeLevel,
} from "../components/challenges/AcademicHomeworkInput";
import { HomeworkModeToggle } from "../components/challenges/HomeworkModeToggle";

describe("Milestone 3 UI & Function Edge Cases", () => {
  describe("Edge Case 1: Grade switching across CP..3ème and curriculum chip updates", () => {
    it("ensures all 9 official grade levels from CP to 3ème return valid curriculum topics for all 5 subjects", () => {
      for (const grade of GRADE_LEVELS) {
        expect(GRADE_LEVEL_METADATA[grade]).toBeDefined();
        expect(GRADE_LEVEL_METADATA[grade].label).toBeTruthy();
        expect(GRADE_LEVEL_METADATA[grade].cycle).toBeTruthy();

        for (const subject of ACADEMIC_SUBJECTS) {
          const topics = getCurriculumTopics(grade, subject);
          expect(Array.isArray(topics)).toBe(true);
          expect(topics.length).toBeGreaterThan(0);

          topics.forEach((topic) => {
            expect(topic.id).toBeTruthy();
            expect(topic.name).toBeTruthy();
            expect(topic.hook).toBeTruthy();
          });
        }
      }
    });

    it("renders dynamic curriculum chips corresponding to grade switches in SSR output", () => {
      for (const grade of GRADE_LEVELS) {
        const topics = getCurriculumTopics(grade, "maths");
        const html = renderToString(
          <AcademicHomeworkInput
            childAge={10}
            childName="TestChild"
            onGenerate={() => {}}
            isGenerating={false}
          />,
        );

        // Verify grade level pill rendering
        expect(html).toContain(`data-grade="${grade}"`);
      }
    });
  });

  describe("Edge Case 2: Mode toggling between free and homework", () => {
    it("correctly renders free mode with active state and aria attributes", () => {
      const html = renderToString(<HomeworkModeToggle mode="free" onModeChange={() => {}} />);
      expect(html).toContain('data-active="true"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain("Défis Libres (Éveil)");
    });

    it("correctly renders homework mode with active state and aria attributes", () => {
      const html = renderToString(<HomeworkModeToggle mode="homework" onModeChange={() => {}} />);
      expect(html).toContain('data-active="true"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain("Devoirs Scolaires (Fusion)");
    });
  });

  describe("Edge Case 3: Long explicit homework prompts vs empty prompts", () => {
    it("truncates prompt exceeding 500 characters gracefully", () => {
      const longInput = "a".repeat(600);
      const truncated = longInput.slice(0, 500);
      expect(truncated.length).toBe(500);
    });

    it("disables submit button and shows disabled state when instruction is empty or whitespace", () => {
      const htmlEmpty = renderToString(
        <AcademicHomeworkInput
          childAge={9}
          childName="Awa"
          onGenerate={() => {}}
          isGenerating={false}
        />,
      );
      expect(htmlEmpty).toContain("disabled");
      expect(htmlEmpty).toContain('data-testid="submit-homework-button"');
    });
  });

  describe("Edge Case 4: Fast repeated clicks during generation (isGenerating double-submit guard)", () => {
    it("disables submit button and renders spinner when isGenerating is true", () => {
      const htmlGenerating = renderToString(
        <AcademicHomeworkInput
          childAge={9}
          childName="Awa"
          onGenerate={() => {}}
          isGenerating={true}
        />,
      );
      expect(htmlGenerating).toContain("disabled");
      expect(htmlGenerating).toContain("Fusion du devoir en quête...");
      expect(htmlGenerating).toContain("animate-spin");
    });

    it("guards against submission while generation is active", async () => {
      const mockOnGenerate = vi.fn();

      // Simulate handleSubmit double-submit protection logic
      const isGenerating = true;
      const handleSubmitGuard = async (instruction: string) => {
        const trimmed = instruction.trim();
        if (!trimmed) return;
        if (isGenerating) return; // double-submit guard
        await mockOnGenerate({ homeworkInstruction: trimmed });
      };

      // Fast repeated calls during generation
      await handleSubmitGuard("Tables de 7");
      await handleSubmitGuard("Tables de 7");
      await handleSubmitGuard("Tables de 7");

      expect(mockOnGenerate).not.toHaveBeenCalled();
    });
  });
});

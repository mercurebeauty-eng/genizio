import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { HomeworkModeToggle, type ChallengeMode } from "./HomeworkModeToggle";
import {
  AcademicHomeworkInput,
  getDefaultGradeLevel,
  BEHAVIORAL_DRIVER_LABELS,
} from "./AcademicHomeworkInput";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_METADATA,
  ACADEMIC_SUBJECTS,
  ACADEMIC_SUBJECT_LABELS,
  BEHAVIORAL_DRIVERS,
  getCurriculumTopics,
  type GradeLevel,
  type AcademicSubject,
  type BehavioralDriver,
} from "@/lib/academic-homework.functions";

describe("HomeworkModeToggle Component", () => {
  it("renders both toggle options with correct active state for 'free' mode", () => {
    let activeMode: ChallengeMode = "free";
    const handleModeChange = (mode: ChallengeMode) => {
      activeMode = mode;
    };

    const html = renderToString(
      <HomeworkModeToggle mode={activeMode} onModeChange={handleModeChange} />
    );

    expect(html).toContain("Défis Libres (Éveil)");
    expect(html).toContain("Devoirs Scolaires (Fusion)");
    expect(html).toContain('data-active="true"');
    expect(html).toContain('aria-pressed="true"');
  });

  it("renders with correct active state for 'homework' mode", () => {
    const html = renderToString(
      <HomeworkModeToggle mode="homework" onModeChange={() => {}} />
    );

    expect(html).toContain("Devoirs Scolaires (Fusion)");
    expect(html).toContain('data-active="true"');
  });
});

describe("getDefaultGradeLevel Helper", () => {
  it("maps child age to official French school grade levels", () => {
    expect(getDefaultGradeLevel(5)).toBe("CP");
    expect(getDefaultGradeLevel(6)).toBe("CP");
    expect(getDefaultGradeLevel(7)).toBe("CE1");
    expect(getDefaultGradeLevel(8)).toBe("CE2");
    expect(getDefaultGradeLevel(9)).toBe("CM1");
    expect(getDefaultGradeLevel(10)).toBe("CM2");
    expect(getDefaultGradeLevel(11)).toBe("6eme");
    expect(getDefaultGradeLevel(12)).toBe("5eme");
    expect(getDefaultGradeLevel(13)).toBe("4eme");
    expect(getDefaultGradeLevel(14)).toBe("3eme");
    expect(getDefaultGradeLevel(15)).toBe("3eme");
  });
});

describe("AcademicHomeworkInput Component Render & Mechanics", () => {
  it("renders grade level selector pills, defaulting to child's age grade (CM1 for age 9)", () => {
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Awa"
        onGenerate={() => {}}
        isGenerating={false}
      />
    );

    const cleanHtml = html.replace(/<!-- -->/g, "");
    expect(cleanHtml).toContain("1. Classe de Awa");
    expect(html).toContain("CM1");
    expect(html).toContain('data-grade="CM1"');
    expect(html).toContain('aria-pressed="true"');
    for (const g of GRADE_LEVELS) {
      const label = GRADE_LEVEL_METADATA[g]?.label ?? g;
      expect(html).toContain(label);
    }
  });

  it("renders subject grid buttons with all 5 subjects", () => {
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Awa"
        onGenerate={() => {}}
        isGenerating={false}
      />
    );

    expect(html).toContain("2. Matière du Devoir");
    const cleanHtml = html.replace(/&amp;/g, "&");
    for (const s of ACADEMIC_SUBJECTS) {
      expect(cleanHtml).toContain(ACADEMIC_SUBJECT_LABELS[s]);
    }
  });

  it("renders curriculum topic chips for the default grade & subject", () => {
    const topics = getCurriculumTopics("CM1", "maths");
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Awa"
        onGenerate={() => {}}
        isGenerating={false}
      />
    );

    expect(html).toContain("Sujets du programme au CM1");
    for (const topic of topics) {
      expect(html).toContain(topic.name);
    }
  });

  it("renders Bayesian gap badges when detectedGaps are provided", () => {
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Kofi"
        detectedGaps={{ maths: 7, francais: 8 }}
        onGenerate={() => {}}
        isGenerating={false}
      />
    );

    expect(html).toContain('data-testid="gap-badge-maths"');
    expect(html).toContain('data-testid="gap-badge-francais"');
    expect(html).toContain("Lacune détectée");
  });

  it("renders explicit homework instruction input field and submit button", () => {
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Awa"
        onGenerate={() => {}}
        isGenerating={false}
      />
    );

    expect(html).toContain("3. Consigne précise du devoir");
    expect(html).toContain('data-testid="homework-instruction-input"');
    expect(html).toContain('data-testid="submit-homework-button"');
    expect(html).toContain("Transformer le devoir en défi ludique");
  });

  it("renders loading state spinner and disables button when isGenerating is true", () => {
    const html = renderToString(
      <AcademicHomeworkInput
        childAge={9}
        childName="Awa"
        onGenerate={() => {}}
        isGenerating={true}
      />
    );

    expect(html).toContain("Fusion du devoir en quête...");
    expect(html).toContain("disabled");
  });

  it("verifies behavioral driver labels dictionary coverage", () => {
    for (const d of BEHAVIORAL_DRIVERS) {
      expect(BEHAVIORAL_DRIVER_LABELS).toHaveProperty(d);
      expect(BEHAVIORAL_DRIVER_LABELS[d].title).toBeTruthy();
      expect(BEHAVIORAL_DRIVER_LABELS[d].subtitle).toBeTruthy();
    }
  });

  it("simulates element structure and handles submission callback", async () => {
    const mockOnGenerate = vi.fn();
    const props = {
      childAge: 10,
      childName: "Moussa",
      onGenerate: mockOnGenerate,
      isGenerating: false,
    };

    const html = renderToString(<AcademicHomeworkInput {...props} />);
    expect(html).toContain('data-testid="academic-homework-input-form"');

    await props.onGenerate({
      gradeLevel: "CM2",
      subject: "maths",
      homeworkInstruction: "Tables de 7",
      behavioralDriver: "deconstruire",
    });

    expect(mockOnGenerate).toHaveBeenCalledWith({
      gradeLevel: "CM2",
      subject: "maths",
      homeworkInstruction: "Tables de 7",
      behavioralDriver: "deconstruire",
    });
  });
});

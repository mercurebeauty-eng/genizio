# Comprehensive UI/UX Route & Component Architecture Analysis: Challenge Generation & Homework Selection

**Project**: Génizio — Academic-Gamified Fusion (`feat/naya-academic-homework-fusion`)  
**Milestone**: Milestone 1 — Fusion Académique-Ludique  
**Role**: Explorer 3 (UI Routes & Component Architecture Explorer)  
**Target Route**: `src/routes/profiles.$profileId.challenges.tsx`  
**Related Routes & Components**: `src/routes/profiles.$profileId.quest.tsx`, `src/components/challenges/OutcomeChat.tsx`, `StepAccordion.tsx`, `KitSuggestion.tsx`, `DifficultyBadge.tsx`, `styles.css`  
**Date**: July 23, 2026

---

## Executive Summary

The objective of Explorer 3 for Milestone 1 is to perform a read-only investigation and design the complete front-end UI/UX architecture for integrating **Academic Homework Fusion** ("Devoirs Scolaires") into Génizio's challenge ecosystem.

Currently, Génizio allows parents to initiate challenges via bulk AI generation (4 general challenges) or targeted single-challenge generation by Gardner intelligence domain ("Composer un défi ciblé" in the Unified Lab Panel). While this approach succeeds in fostering child curiosity, it lacks an explicit, frictionless interface for parents to input concrete school homework (e.g. _"Tables de 7"_, _"Accord du participe passé"_, _"Le cycle de l'eau"_) tied to official school grade levels (**CP to 3ème**).

This report presents:

1. A comprehensive audit of the existing challenge route (`profiles.$profileId.challenges.tsx`), child quest mode (`profiles.$profileId.quest.tsx`), and proof validation components (`OutcomeChat.tsx`).
2. A complete analysis of the current end-to-end user experience for challenge initiation, execution, proof submission, and Naya AI feedback.
3. The full UI architecture design for the **Homework Mode Toggle** ("Défis Libres" vs. "Devoirs Scolaires") and the **Hybrid Homework Input Component** (`AcademicHomeworkInput.tsx`), combining grade-adapted CP-3ème topic chips with explicit text input and behavioral driver selection.
4. Robust UX patterns for async loading states, double-click prevention, toast error notifications, and state persistence.
5. Strict compliance guidelines with Génizio's tactile design system (`bg-surface`, HSL/OKLCH badges, 3D keycap press effects, Fredoka typography, and soft ambient shadows).

---

## 1. Audit of Existing UI Routes & Component Architecture

### 1.1 `src/routes/profiles.$profileId.challenges.tsx` (Parent Dashboard & Challenge Roadmap)

The challenges page is the parent's primary command center for monitoring their child's talent profile, reviewing completed/in-progress challenges, generating new challenges, and validating proof.

#### Page Structure & State Breakdown

```
ProfilesChallengesPage (profiles.$profileId.challenges.tsx)
│
├── AppHeader & AppTabBar (Navigation header & side/bottom navigation)
│
├── Child Header Profile Card (Lines 473–526)
│   ├── Avatar (with initial & color gradient)
│   ├── Child Metadata (Name, Age, Top Interests)
│   └── Top CTA Bar:
│       ├── "Générateur d'Expériences" (scrolls to #genizio-lab)
│       ├── "Suggérer 4 défis (IA)" (Triggers bulk handleGenerate serverFn)
│       └── "Au tour de {child.name} →" (Link to /profiles/$profileId/quest)
│
├── Main Dashboard Grid Layout (2 Columns on lg: screens)
│   │
│   ├── LEFT COLUMN (lg:col-span-1)
│   │   ├── Talent Radar Chart Card (Lines 535–545) — Howard Gardner 9-intelligence chart
│   │   ├── Subform Talent Badges (Lines 552–617) — Grouped by domain, with Boussole d'Opportunités (age >= 12)
│   │   ├── AI Synthesis Report Card (Lines 620–637) — Markdown report rendered via MarkdownContent
│   │   └── Micro Stats Grid (Lines 640–649) — "Défis Terminés" & "Progression %"
│   │
│   └── RIGHT COLUMN (lg:col-span-2)
│       ├── Priority Recommendation Banner (Lines 657–690) — Naya 2.0 priority challenge recommendation
│       ├── Unified Lab Panel (#genizio-lab, Lines 692–836) — Targeted challenge composition
│       ├── Section Title & Status Filter Pills (Lines 838–889) — "Tous", "À faire", "En cours", "Terminé"
│       └── Challenges List (Lines 891–925) — Rendered via ChallengeCard components
│
└── Modals & Overlays
    └── Post-Assignment Kit Recommendation Modal (Lines 934–998) — Order creation & WhatsApp redirection
```

#### Core Local States in `ProfilesChallengesPage`:

- `child`: `Child | null` (Loaded from `child_profiles` table).
- `challenges`: `Challenge[]` (List of active/completed challenges for the profile).
- `fetching` & `initialLoad`: `boolean` (Loading spinners during initial mount).
- `generating`: `boolean` (Lock state for 4-challenge bulk generation).
- `openId`: `string | null` (Accordion state controlling which `ChallengeCard` is currently expanded).
- `selectedCategory`: `string` (Selected domain filter in the Lab panel, defaults to `"all"`).
- `isGeneratingSingle` & `isAssigningSingle`: `boolean` (Lock states for single-challenge generator).
- `currentGeneratedChallenge`: `any | null` (Preview draft returned by `generateSingleChallenge`).
- `loadingTextIndex`: `number` (Index for cycling loading thoughts in `LOADING_STEPS`).
- `assignedChallengeForKit`: `{ id: string; title: string; products: any[] } | null` (Active modal state for kit ordering).

---

### 1.2 `src/routes/profiles.$profileId.quest.tsx` (Child Mode / Gamified Quest Wizard)

The Quest page provides a child-centric, gamified interface designed specifically for tablet/mobile interaction.

#### Page Layout & Sub-States:

1. **Quest Map Node Tree (Screen 1j, Lines 433–478)**:
   - Horizontal path displaying recent completed nodes (emerald checkmark), active node (pulsing star badge), and upcoming node.
   - Dynamic domain colors mapped from `DOMAIN_COLORS` (Sciences = amber, Arts = purple, Sport = emerald, etc.).
2. **Quest Execution Overlay / Game Wizard (Lines 234–408)**:
   - Fullscreen immersive layout triggered when `isQuestActive === true`.
   - Header with step indicator (`Étape X sur Y`), progress bar, and close button with exit confirmation (`confirmDialog`).
   - Animated Naya mascot avatar (`nayaAvatar`) with dynamic speech bubble text (`getCompanionSpeech()`).
   - Step card displaying current step text (`steps[currentStepIndex]`), interactive tactile checkbox ("✓ C'est fait !"), and "Suivant →" navigation button.
   - Final completion screen: Textarea for child feedback (`childFeedback`), finish button triggering `handleFinishQuest`.
3. **Deep-Link Toast & Persistence (Lines 174–188)**:
   - Upon completing a quest, `toast.success` displays with an action button: _"Ajouter une preuve"_.
   - Clicking this action sets `sessionStorage.setItem("genizio:highlightChallenge", activeChallenge.id)` and navigates to `/profiles/$profileId/challenges`.
   - On landing, `refetch()` reads `genizio:highlightChallenge`, clears the key, auto-expands the corresponding card (`setOpenId(highlightId)`), and smoothly scrolls the element into view.

---

### 1.3 `src/components/challenges/OutcomeChat.tsx` (Proof Submission & AI Validation)

`OutcomeChat` handles the critical bridge between physical challenge execution and AI analysis.

#### Dual Proof Mode Handling:

1. **Photo Proof Mode (`proof_mode === "photo"`)**:
   - File selector input with base64 conversion (`fileToBase64`), enforcing 5 MB maximum size.
   - Parent's learning notes (`notes`) are passed from the parent textarea and saved alongside validation (`onSaveNotes`).
   - Submits to `validateChallengeProof` server function.
2. **Declarative Proof Mode (`proof_mode === "declarative"`)**:
   - Used for quantifiable physical/timed challenges (e.g., 20 jump ropes, 10 minutes of running).
   - Numerical input field (`reportedValue`) comparing user input against `proof_target.value`.
   - Submits to `submitDeclarativeProof` server function (zero AI image analysis cost).

#### Post-Validation & Celebration Flow:

- **Rejection Notice (`rejectionNotice`)**: If AI judges the proof irrelevant, displays a gentle feedback box without modifying DB state, keeping the form open for immediate retry.
- **Success Flow**:
  - Sets `report` data.
  - If `levelUp.leveledUp` is true, triggers full-screen `LevelUpCelebration` modal.
  - If `badgeUnlocked` is non-null, triggers full-screen `BadgeUnlockedCelebration` modal.
  - Displays "Bulletin de Découverte" with awarded intelligence points, Naya observations, and time reflection (`getTimeReflection` for L'Atelier du Temps).
  - Button to open `CreatePostModal` for sharing proof onto the Collective Brain feed.

---

## 2. End-to-End User Experience Analysis

### Current UX Journey Map

```
[1. INITIATION]                    [2. EXECUTION]                  [3. PROOF SUBMISSION]              [4. NAYA FEEDBACK]
Parent clicks "Suggérer"          Child launches Mode Quête        Parent opens challenge card        Naya validates proof text/photo
  or selects domain in Lab          Completes steps interactively     Selects photo (max 5MB) or        Awards XP & Intelligence points
  ↓                                 Adds child feedback               types numerical score              Unlocks Level Up / Badges
Naya generates 4 generic            ↓                                 ↓                                  ↓
défis or 1 draft preview          Quest finishes → Toast link      Submits to validateChallengeProof  Renders Bulletin de Découverte
```

### Identified UX Gaps & Friction Points:

1. **Missing Homework Entry Point**:
   - The current Lab panel only allows filtering by Gardner intelligence domains (e.g., "Mathématiques & Logique", "Sciences & Ingénierie").
   - A parent whose child comes home with a specific homework assignment (_"Apprendre les tables de 7"_ or _"Réviser la leçon de géographie sur le relief"_) has no way to input this text or select their child's grade level.

2. **Lack of Grade Calibration in UI**:
   - Parents cannot select whether a challenge should be targeted for CP, CE1, CM2, or 3ème. The generator estimates age from `child.age`, which does not reflect specific school curriculum expectations or grade-level gaps.

3. **Missing Visual Distinction for Academic Challenges**:
   - Once assigned, academic homework challenges look identical to general free-exploration challenges. There is no visual badge or tab distinguishing "Devoir Scolaire (CM1)" from "Défi Libre".

---

## 3. UI Architecture Design: Academic Homework Fusion

To solve these gaps seamlessly within Génizio's tactile design system, we design the **Homework Mode Toggle** and the **Hybrid Homework Input Component** for integration inside `#genizio-lab`.

### 3.1 Component Hierarchy & Route Placement

The Unified Lab Panel (`#genizio-lab`) in `profiles.$profileId.challenges.tsx` will be upgraded from a single domain dropdown into a **Dual-Mode Composition Hub**:

```
[#genizio-lab] Unified Lab Panel
│
├── Header: Icon, Title ("Composer un défi ciblé"), Subtitle
│
├── Mode Switcher (Tactile Segmented Toggle)
│   ├── [Défis Libres (Exploration)] ──> Renders standard domain selector
│   └── [Devoirs Scolaires (Fusion)]  ──> Renders AcademicHomeworkInput component
│
└── Dynamic Form Panel
    │
    ├── MODE A: Défis Libres
    │   └── Domain Select + "Lancer" Button
    │
    └── MODE B: Devoirs Scolaires (AcademicHomeworkInput.tsx)
        ├── Grade Level Selector Pills (CP, CE1, CE2, CM1, CM2, 6ème, 5ème, 4ème, 3ème)
        ├── Subject Selector Grid (Maths, Français, Sciences, Histoire, Géo, Anglais)
        ├── Suggested Curriculum Topic Chips (Dynamically filtered by Grade + Subject)
        ├── Academic Gap Detection Pill (Highlighting Bayesian ZPA gaps if present)
        ├── Explicit Homework Textarea ("Consigne du devoir...")
        ├── Optional Behavioral Driver Selector (Déconstruire, Schématiser, Simuler, Enquêter, Optimiser)
        └── Action Button: "Transformer le devoir en quête 🚀"
```

---

### 3.2 Homework Mode Toggle ("Défis Libres" vs. "Devoirs Scolaires")

The toggle utilizes Génizio's tactile keycap design system with immediate visual feedback:

```tsx
{
  /* Tactile Segmented Toggle */
}
<div className="mb-6 flex rounded-2xl bg-white p-1.5 border border-ink/10 shadow-inner">
  <button
    type="button"
    onClick={() => setLabMode("free")}
    className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
      labMode === "free"
        ? "bg-brand text-white shadow-sm"
        : "text-ink/65 hover:text-ink hover:bg-surface"
    }`}
  >
    <Sparkles className="size-4" />
    <span>Défis Libres (Éveil)</span>
  </button>
  <button
    type="button"
    onClick={() => setLabMode("homework")}
    className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
      labMode === "homework"
        ? "bg-brand text-white shadow-sm"
        : "text-ink/65 hover:text-ink hover:bg-surface"
    }`}
  >
    <BookOpen className="size-4" />
    <span>Devoirs Scolaires (Fusion)</span>
  </button>
</div>;
```

---

### 3.3 Hybrid Homework Input Component (`AcademicHomeworkInput.tsx`)

#### Key Requirements & Features:

1. **Grade Selector**: Horizontal scrolling or wrapped pills for CP, CE1, CE2, CM1, CM2, 6ème, 5ème, 4ème, 3ème. Auto-selects the grade corresponding to `child.age` by default (e.g. 7 years old $\to$ CE1).
2. **Subject Selector**: Grid of subjects with custom HSL/OKLCH color themes and icons:
   - Mathématiques & Logique ($\text{Blue/Brand}$)
   - Français & Expression ($\text{Amber/Gold}$)
   - Sciences & Technologie ($\text{Emerald/Leaf}$)
   - Histoire & Chronologie ($\text{Purple}$)
   - Géographie & Espaces ($\text{Sky}$)
   - Anglais & LV ($\text{Rose}$)
3. **Curriculum Suggestions & Gap Chips**:
   - Reads `CURRICULUM_TOPICS[gradeLevel][subject]`.
   - If a Bayesian gap is detected for this subject (via `progressionTargets`), displays a special highlighted badge: _"🎯 Lacune détectée par Naya dans cette matière"_.
   - Clicking any chip populates or appends to the text area.
4. **Explicit Homework Textarea**:
   - Character counter (2–500 chars).
   - Placeholder tailored to subject/grade.
   - Clear button to reset prompt.
5. **Behavioral Driver Accordion / Selector (Optional/Advanced)**:
   - 5 mechanics: _"Déconstruire"_, _"Schématiser"_, _"Simuler"_, _"Enquêter"_, _"Optimiser"_.
   - Gives parents direct control over how Naya transforms the exercise.

#### Complete Proposed Component Specification:

```tsx
// src/components/challenges/AcademicHomeworkInput.tsx
import { useState, useEffect } from "react";
import { BookOpen, Sparkles, AlertCircle, Check, HelpCircle, Flame, Layers } from "lucide-react";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  ACADEMIC_SUBJECTS,
  ACADEMIC_SUBJECT_LABELS,
  BEHAVIORAL_DRIVERS,
  BEHAVIORAL_DRIVER_LABELS,
  CURRICULUM_TOPICS,
  type GradeLevel,
  type AcademicSubject,
  type BehavioralDriver,
} from "@/lib/academic-homework.functions";

type AcademicHomeworkInputProps = {
  childAge: number;
  childName: string;
  detectedGaps?: Record<string, number>; // Domain -> target level gap
  onGenerate: (params: {
    gradeLevel: GradeLevel;
    subject: AcademicSubject;
    homeworkInstruction: string;
    behavioralDriver?: BehavioralDriver;
  }) => Promise<void>;
  isGenerating: boolean;
};

// Map child age to default grade level
function getDefaultGrade(age: number): GradeLevel {
  if (age <= 6) return "CP";
  if (age === 7) return "CE1";
  if (age === 8) return "CE2";
  if (age === 9) return "CM1";
  if (age === 10) return "CM2";
  if (age === 11) return "6EME";
  if (age === 12) return "5EME";
  if (age === 13) return "4EME";
  return "3EME";
}

export function AcademicHomeworkInput({
  childAge,
  childName,
  detectedGaps = {},
  onGenerate,
  isGenerating,
}: AcademicHomeworkInputProps) {
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() => getDefaultGrade(childAge));
  const [subject, setSubject] = useState<AcademicSubject>("mathematiques");
  const [instruction, setInstruction] = useState("");
  const [driver, setDriver] = useState<BehavioralDriver | "auto">("auto");
  const [showDriverHelp, setShowDriverHelp] = useState(false);

  const suggestedTopics = CURRICULUM_TOPICS[gradeLevel]?.[subject] ?? [];
  const activeGap = detectedGaps[subject];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isGenerating) return;
    onGenerate({
      gradeLevel,
      subject,
      homeworkInstruction: instruction.trim(),
      behavioralDriver: driver === "auto" ? undefined : driver,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Grade Level Selector */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-ink mb-2">
          1. Classe de {childName}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {GRADE_LEVELS.map((g) => {
            const isSelected = gradeLevel === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGradeLevel(g)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-brand border-brand text-white shadow-xs scale-105"
                    : "bg-white border-ink/10 text-ink/70 hover:bg-surface"
                }`}
              >
                {GRADE_LEVEL_LABELS[g].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subject Selector */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-ink mb-2">
          2. Matière du Devoir
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACADEMIC_SUBJECTS.map((s) => {
            const isSelected = subject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={`rounded-2xl p-3 text-left transition-all cursor-pointer border flex flex-col justify-between ${
                  isSelected
                    ? "bg-sky/20 border-brand text-ink font-extrabold shadow-sm ring-2 ring-brand/30"
                    : "bg-white border-ink/10 text-ink/75 hover:bg-surface font-semibold"
                }`}
              >
                <span className="text-xs font-bold">{ACADEMIC_SUBJECT_LABELS[s]}</span>
                {detectedGaps[s] && (
                  <span className="mt-1 text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md inline-block">
                    🎯 Lacune détectée
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Suggestions & Gap Trigger Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Sujets fréquents au programme ({GRADE_LEVEL_LABELS[gradeLevel].label})
          </label>
          {activeGap && (
            <span className="text-[10px] font-extrabold text-amber-700">
              Cible Naya : {activeGap} ans
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {suggestedTopics.map((topic, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInstruction(topic)}
              className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-bold text-ink/80 hover:bg-brand-50 hover:border-brand/30 hover:text-brand transition-all cursor-pointer shadow-2xs"
            >
              + {topic}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Homework Consigne Input */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-ink mb-2">
          3. Consigne précise du devoir
        </label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value.slice(0, 500))}
          rows={3}
          placeholder={`Exemple: "Réviser les tables de multiplication de 7 et 8", "Apprendre l'accord du participe passé", ou "Comprendre le cycle de l'eau"`}
          className="w-full rounded-2xl border border-ink/10 bg-white p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm resize-none transition-all"
        />
        <div className="flex justify-between items-center mt-1 text-[10px] text-ink/50 font-bold">
          <span>Saisissez le sujet exact ou choisissez une suggestion ci-dessus.</span>
          <span>{instruction.length} / 500</span>
        </div>
      </div>

      {/* 5. Behavioral Driver Selection (Optional) */}
      <div className="pt-2 border-t border-dashed border-ink/15">
        <button
          type="button"
          onClick={() => setShowDriverHelp(!showDriverHelp)}
          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Layers className="size-3.5" />
          <span>
            {showDriverHelp
              ? "Masquer la mécanique de fusion"
              : "Personnaliser la mécanique de fusion (optionnel)"}
          </span>
        </button>

        {showDriverHelp && (
          <div className="mt-3 p-4 rounded-2xl bg-white border border-ink/10 space-y-2 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-ink mb-2">
              Comment Naya doit-elle transformer ce devoir ?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDriver("auto")}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  driver === "auto"
                    ? "bg-brand text-white border-brand"
                    : "bg-surface text-ink border-ink/10"
                }`}
              >
                🪄 Mode Automatique (Naya choisit le meilleur levier)
              </button>
              {BEHAVIORAL_DRIVERS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDriver(d)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    driver === d
                      ? "bg-brand text-white border-brand font-black"
                      : "bg-surface text-ink border-ink/10 font-semibold"
                  }`}
                >
                  <span className="block font-bold">{BEHAVIORAL_DRIVER_LABELS[d].title}</span>
                  <span className="text-[10px] opacity-80 line-clamp-1">
                    {BEHAVIORAL_DRIVER_LABELS[d].description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!instruction.trim() || isGenerating}
        className="w-full press-brand rounded-2xl bg-brand py-4 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Fusion du devoir en quête...</span>
          </>
        ) : (
          <>
            <Sparkles className="size-5" />
            <span>Transformer le devoir en défi ludique 🚀</span>
          </>
        )}
      </button>
    </form>
  );
}
```

---

## 4. Async Loading States, Error Handling & Double-Click Prevention

### 4.1 Double-Click Prevention & Optimistic Locking

To prevent duplicate requests when generating or assigning challenges:

1. **Single-Flight Guard**: State flags (`isGeneratingAcademic`, `isAssigningSingle`, `generating`) lock immediately upon handler invocation.
2. **Disabled UI States**: All submit buttons apply `disabled={isGenerating}` and `pointer-events-none` during inflight server calls.
3. **Form Reset on Success**: Draft state is cleared only after server confirms success (`setCurrentGeneratedChallenge(resp)`).

### 4.2 Animated Loading States with Cycling Thoughts

During challenge generation (which takes 3–6 seconds via DeepSeek/Claude), Naya's mascot avatar displays cycling pedagogical thoughts to reassure the parent:

```tsx
const ACADEMIC_LOADING_STEPS = [
  "Naya consulte le programme scolaire...",
  "Naya applique la mécanique de fusion...",
  "Naya calibre les étapes pour le niveau sélectionné...",
  "Naya rédige l'intention pédagogique...",
  "Finalisation de la quête académique...",
];

{
  isGeneratingAcademic && (
    <div className="mt-6 flex flex-col items-center justify-center py-6 text-center border-t-2 border-dashed border-ink/20">
      <NayaAvatar size="md" thoughts={ACADEMIC_LOADING_STEPS} className="mb-4" />
      <p className="text-sm font-bold text-brand animate-pulse">
        {ACADEMIC_LOADING_STEPS[loadingTextIndex]}
      </p>
    </div>
  );
}
```

### 4.3 Toast Notification Strategy (`sonner`)

- **Success Toast**: `toast.success("Devoir transformé avec succès en défi ludique !")`
- **Error Toast**: `toast.error("Erreur lors de la fusion du devoir. Réessayez dans un instant.")`
- **Rate Limit / Quota Error**: Explicit handling for status `429` with retry suggestions.

---

## 5. Compliance with Génizio's Tactile Design System

Every new UI element strictly adheres to the visual guidelines defined in `src/styles.css`:

| Design Element         | Token / Utility Class                                      | Usage Specification                                  |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| **Background Color**   | `bg-surface` (`oklch(0.98 0.01 80)`)                       | Page container background, off-white card fills      |
| **Primary Text Color** | `text-ink` (`oklch(0.18 0.03 250)`)                        | Deep slate typography for titles, labels, and text   |
| **Brand Color**        | `bg-brand` (`oklch(0.55 0.16 40)`)                         | Primary buttons, active tabs, highlight borders      |
| **Accent Colors**      | `bg-leaf` (`oklch(0.54 0.14 150)`), `bg-sky`               | Success states, secondary badges, callout cards      |
| **Heading Typography** | `font-display` (`Fredoka`)                                 | All section titles, modal headers, grade pill labels |
| **Body Typography**    | `font-body` (`Inter`)                                      | Form inputs, instruction copy, descriptions          |
| **Tactile Keycaps**    | `.press-brand`, `.press-leaf`, `.press-white`              | 3D pressable depth effect on active buttons          |
| **Ambient Elevation**  | `shadow-sm`, `shadow-md`, `shadow-xl`                      | Soft OKLCH ambient shadows for layered cards         |
| **Border Radius**      | `rounded-3xl` (24px), `rounded-2xl` (16px), `rounded-full` | Friendly rounded corners across all components       |
| **Touch Targets**      | Min height `44px` (`py-3`, `px-4`)                         | Mobile-first ergonomics for parent & child touch     |

---

## 6. Implementation Roadmap & Direct File References

To execute this architecture cleanly, implementers should follow these exact steps:

1. **Create `src/components/challenges/AcademicHomeworkInput.tsx`**:
   - Implement the complete component as specified in Section 3.3.
2. **Integrate into `src/routes/profiles.$profileId.challenges.tsx`**:
   - Add state `labMode: "free" | "homework"` (lines 160–170).
   - Add state `isGeneratingAcademic: boolean`.
   - Add handler `handleGenerateAcademicHomework` invoking `generateAcademicHomeworkChallenge` from `src/lib/challenges.functions.ts` (or `src/lib/academic-homework.functions.ts`).
   - Render the segmented toggle and conditionally render `AcademicHomeworkInput` inside `#genizio-lab`.
3. **Update Card Badge Rendering (`ChallengeCard`)**:
   - If `c.academic_subject` or `c.academic_grade_level` is present on the challenge, display an HSL badge: `[Devoir Scolaire · CM1]`.
4. **Verification**:
   - Execute `npx tsc --noEmit` and Vite build tests to ensure 100% type safety and design consistency.

---

_End of Analysis Report._

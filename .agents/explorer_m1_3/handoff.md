# Handoff Report: Milestone 1 — UI Routes & Component Architecture for Challenge Generation & Homework Selection

**Milestone**: Milestone 1 — Fusion Académique-Ludique (`feat/naya-academic-homework-fusion`)  
**Agent**: Explorer 3 (`explorer_m1_3`)  
**Date**: 2026-07-23  
**Working Directory**: `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\`  
**Handoff Type**: Hard Handoff (Investigation & UI Architecture Design Completed)

---

## 1. Observation

### 1.1 Existing UI Route & Component Structure

- **Parent Challenge Route (`src/routes/profiles.$profileId.challenges.tsx`)**:
  - Lines 473–526: Header with profile avatar, metadata, and CTA buttons (`Suggérer 4 défis (IA)`, `Au tour de {child.name} →`).
  - Lines 535–650: Left column containing `TalentRadarChart`, subform counts, `getChildAISynthesis` report card, and micro stats.
  - Lines 657–690: `recommendation` priority card.
  - Lines 692–836: Unified Lab Panel (`#genizio-lab`) with category selector (`CATEGORIES`, lines 49–60), single-challenge generator (`handleGenerateSingle`), and preview draft card.
  - Lines 866–925: Challenge roadmap with status filter pills ("Tous", "À faire", "En cours", "Terminé") and expandable `ChallengeCard` list.
  - Lines 934–998: Modal for ordering physical kits via WhatsApp and Supabase `createOrder`.
- **Child Quest Mode Route (`src/routes/profiles.$profileId.quest.tsx`)**:
  - Lines 433–478: Map Node Tree showing completed, active (pulsing star), and upcoming nodes.
  - Lines 234–408: Gamified step-by-step game wizard with dynamic Naya mascot speech bubble, interactive checkboxes, step navigation, and completion screen.
  - Lines 174–188: Toast action _"Ajouter une preuve"_ setting `sessionStorage.setItem("genizio:highlightChallenge", activeChallenge.id)` to deep-link and auto-expand card on challenges page reload.
- **Proof Submission Component (`src/components/challenges/OutcomeChat.tsx`)**:
  - Lines 97–105: Dual proof mode support (`proof_mode === "declarative"` vs `proof_mode === "photo"`).
  - Lines 117–145: Image base64 conversion and submission to `validateChallengeProof`.
  - Lines 175–190: Fullscreen celebration modals (`LevelUpCelebration` and `BadgeUnlockedCelebration`).
  - Lines 287–294: Rejection notice handling (`rejectionNotice`) keeping the form open for immediate retry without corrupting DB state.
- **Génizio Tactile Design System (`src/styles.css`)**:
  - Theme variables: `--surface` (`oklch(0.98 0.01 80)`), `--ink` (`oklch(0.18 0.03 250)`), `--brand` (`oklch(0.55 0.16 40)`), `--leaf`, `--sky`.
  - Fonts: `--font-display` (`Fredoka`), `--font-body` (`Inter`).
  - Keycap press classes: `.press-brand`, `.press-leaf`, `.press-sky`, `.press-white`.
  - Ambient shadows: `--shadow-sm`, `--shadow-md`, `--shadow-xl`, `--shadow-glow-brand`.

### 1.2 Identified UI/UX Gaps

- Currently, `#genizio-lab` only allows selecting Gardner domains (e.g. "Mathématiques", "Sciences").
- Parents cannot input specific school homework (e.g. _"Tables de 7"_, _"Le cycle de l'eau"_) or select a target grade level (CP to 3ème).
- There is no visual badge or tab distinguishing "Devoir Scolaire (CM1)" from generic "Défi Libre".

---

## 2. Logic Chain

1. **Observation 1**: `profiles.$profileId.challenges.tsx` currently contains the Unified Lab Panel (`#genizio-lab`), which allows composing targeted challenges by selecting a Gardner domain.
2. **Observation 2**: `src/lib/academic-homework.functions.ts` (designed by Explorer 1) and `CURRICULUM_TOPICS` (designed by Explorer 2) require front-end inputs for `gradeLevel` (CP-3ème), `subject`, `homeworkInstruction`, and optional `behavioralDriver`.
3. **Observation 3**: The user experience must allow switching seamlessly between free exploration ("Défis Libres") and academic homework fusion ("Devoirs Scolaires") without cluttering the parent dashboard.
4. **Deduction**:
   - Adding a **Tactile Segmented Mode Switcher** inside `#genizio-lab` allows parents to toggle between Mode A ("Défis Libres") and Mode B ("Devoirs Scolaires").
   - Designing `AcademicHomeworkInput.tsx` with grade pills (auto-defaulted by child age), subject grids, dynamic curriculum chips, gap indicators, text input, and driver selection solves the initiation friction completely.
   - Using double-click prevention (`isGenerating` locks), animated step loaders with mascot thoughts, and `sonner` toasts ensures robust async state handling compliant with Génizio's tactile design system.

---

## 3. Caveats

- **Read-Only Investigation**: Explorer 3 did NOT modify any source code in `src/` (compliance with Explorer rules).
- **Backend Dependency**: `AcademicHomeworkInput` relies on the API signatures designed in `src/lib/academic-homework.functions.ts` by Explorer 1 and the schema additions (`school_grade`) from Explorer 2.

---

## 4. Conclusion

1. **Exhaustive UI Audit Completed**: All challenge routes (`challenges.tsx`, `quest.tsx`), forms (`OutcomeChat.tsx`), dialogs, and design tokens (`styles.css`) have been audited and documented.
2. **UI Architecture Fully Designed**:
   - Designed the **Homework Mode Toggle** ("Défis Libres" vs. "Devoirs Scolaires").
   - Designed the **Hybrid Homework Input Component** (`AcademicHomeworkInput.tsx`) integrating CP-3ème grade levels, subject grids, topic suggestion chips, Bayesian gap badges, consigne text input, and behavioral driver selection.
   - Formulated async loading, double-click prevention, toast notifications, and deep-linking UX.
3. **Detailed Artifacts Created**:
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\analysis.md` (Full detailed UI analysis & code specifications)
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\handoff.md` (This handoff report)

---

## 5. Verification Method

To independently verify the exploration findings and UI designs:

1. **Inspect Analysis Report**:
   - View `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\analysis.md` for complete design specifications, JSX code templates, and design system compliance tables.
2. **Inspect Route & Component Source Code**:
   - `src/routes/profiles.$profileId.challenges.tsx` (lines 692–836: `#genizio-lab`)
   - `src/routes/profiles.$profileId.quest.tsx` (lines 174–188: deep-link toast)
   - `src/components/challenges/OutcomeChat.tsx` (lines 97–175: proof modes & celebration flow)
   - `src/styles.css` (lines 7–74: design system tokens)
3. **Invalidation Conditions**:
   - If `#genizio-lab` is removed from `profiles.$profileId.challenges.tsx`, the placement of `AcademicHomeworkInput` would need to be re-anchored.

---

_End of Handoff Report._

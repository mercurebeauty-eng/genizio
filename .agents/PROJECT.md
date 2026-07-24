# Project: Fusion Académique-Ludique (feat/naya-academic-homework-fusion)

## Architecture
- **Challenge Generation Engine**: `src/lib/challenges.functions.ts` enriched with academic homework fusion modules (`src/lib/academic-homework.functions.ts` / academic curriculum definitions & drivers mapper).
- **Academic Subjects & Grade Curriculum (CP à 3ème)**: Standard subjects (Maths, Français, Sciences, Histoire-Géo, Anglais) mapped to grade levels (CP, CE1, CE2, CM1, CM2, 6ème, 5ème, 4ème, 3ème) and behavioral drivers (*déconstruire*, *schématiser*, *simuler*, *enquêter*).
- **ZPA & Telemetry Engine**: Integration with `src/lib/naya-telemetry.ts` and `hypothesis_cycles` for Bayesian progression metrics and performance anxiety prevention.
- **Hybrid UI Components**:
  - `src/components/challenges/HomeworkModeToggle.tsx`: Toggle between Free Challenges ("Défis Libres") and Homework ("Devoirs Scolaires").
  - `src/components/challenges/HybridHomeworkInput.tsx`: Dual-mode input allowing parents to enter explicit homework tasks or pick grade-adapted suggestions/gaps.
- **Verification & Testing**: Dedicated Vitest suite `src/lib/academic-homework.test.ts` verifying homework generation, behavioral driver fusion, and ZPA difficulty telemetry.

## Code Layout
- `src/lib/challenges.functions.ts`: Main entry point for Naya AI challenge generation.
- `src/lib/academic-homework.functions.ts`: Helper definitions for subjects, curriculum topics (CP to 3ème), behavioral drivers mapping, and ZPA adjustment.
- `src/lib/naya-telemetry.ts`: Telemetry tracking for AI calls, ZPA difficulty progression, and hypothesis cycles.
- `src/routes/profiles.$profileId.challenges.tsx` (or related challenge routes/components): Parent & child challenge interface with hybrid input & mode toggle.
- `src/components/challenges/`: Dedicated UI components for homework selection, custom topic input, and mode toggle.
- `src/lib/academic-homework.test.ts`: Automated Vitest unit test suite.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploratory Analysis & Blueprint (R1, R2, R3) | Deep investigation of `challenges.functions.ts`, existing profile data model, grade levels, behavioral drivers, ZPA telemetry, and UI routes. Blueprint for academic fusion. | none | DONE |
| 2 | Engine Fusion & Academic Domain Logic (R1, R3) | Enrich Naya engine with academic subjects (Maths, Français, Sciences, Histoire, etc.), behavioral driver fusion (déconstruire, schématiser, simuler, enquêter), ZPA Bayesian difficulty adjustment, telemetry, and unit tests. | M1 | DONE |
| 3 | Hybrid Parent UI & Homework Mode Toggle (R2, R3) | Hybrid input UI (explicit prompt vs CP-3ème suggestions/gaps), mode toggle (Défis Libres vs Devoirs Scolaires), profile integration, and UI component tests. | M1, M2 | IN_PROGRESS |
| 4 | E2E Verification, Vitest Suite & Forensic Audit | `npx tsc --noEmit` (0 errors), dedicated Vitest test suite validation (100% pass), Challenger execution verification, and Forensic Audit (`teamwork_preview_auditor`) CLEAN verdict. | M1, M2, M3 | PLANNED |

## Interface Contracts & Quality Standards
- Strict Zero Error Swallowing: `catch {}` and `.catch(() => null)` must log errors and display UI notification toast.
- Async UX Safety: Double-click prevention, loading indicators, empty states, and error fallbacks.
- Automated Checks: `npx tsc --noEmit` must pass with 0 errors. `npx vitest run` must pass with 100% green tests.
- Integrity: CLEAN verdict required from Forensic Auditor.

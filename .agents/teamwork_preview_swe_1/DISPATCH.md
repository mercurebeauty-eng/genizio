# Dispatch History

## 2026-08-29T17:41:45Z
Investigate and fix the persistent "Réponse IA invalide" error occurring during AI challenge generation via DeepSeek (or Gemini) on the Genizio project. Ensure no regressions are introduced while parsing or validating the AI's JSON output.

Working directory: c:\Users\USER\Documents\GENIZIO
Integrity mode: demo

Requirements:
- R1. Investigate and Fix Parsing/Validation: Identify the exact root cause of the "Réponse IA invalide" error in `src/lib/challenges.functions.ts`. The error is suspected to be caused by strict Zod schema validation failing on the AI's output (e.g., due to the recent age limit extension to 21, causing the AI to output higher grade levels or unexpected subjects).
- R2. Prevent Regressions: Apply a robust fix to the validation logic and/or database constraints that resolves the issue without breaking existing functionality. You must read existing test source code to understand expected behavior before modifying the code.

Acceptance Criteria:
- A local programmatic test script is created (e.g., in `scratch/test-validation.ts`) that directly tests `ChallengeSchema` or `generateChallengesCore` against simulated AI output containing edge cases (like "Terminale" for grade level).
- The test script successfully reproduces the error before the fix, and passes after the fix.
- Existing unit tests for challenges pass (`npx vitest run src/lib/challenges.functions.ts` or similar).

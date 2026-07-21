## 2026-07-21T09:33:05Z
You are Worker 2 (Remediation Worker) for Iteration 2 of the Naya prompt system update project.
Your assigned working directory is `C:\Users\USER\Documents\GENIZIO\.agents\worker_m2_remediation\`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Objective:
Execute the remediation strategy documented by Explorer 4 in `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m2_remediation\handoff.md` to resolve the Forensic Audit scope and test suite violations.

Steps to execute:
1. Revert UI component modifications in `C:\Users\USER\Documents\GENIZIO\`:
   - Run `git restore src/components/profiles/ProfileDialog.tsx src/components/profiles/shared.ts`.
2. Remove untracked UI test files:
   - Remove `src/components/profiles/ProfileDialog.schema.test.ts` and `src/components/profiles/ProfileDialog.test.ts`.
3. Check `git status`:
   - Confirm that ONLY `src/lib/challenges.functions.ts`, `src/lib/hypotheses.functions.ts`, and `src/lib/recommendations.functions.ts` remain modified in the working tree. No files under `src/components/` should be modified.
4. Verify backend prompt system updates in `src/lib/*.ts`:
   - Ensure `formatChildInterestsPayload` is exported and used across all 5 AI call sites (`generateChallenges`, `generateSingleChallenge`, `getChildAISynthesis`, `generateDiscriminantChallenge`, `recommendChallengesForChild`).
   - Ensure `GENIZIO_PRINCIPLES` Rule 4 contains the Behavioral Driver Directive.
5. Run Verification Suite:
   - Run `npx vitest run` and confirm 100% of tests pass (30/30 passed across 3 test files, 0 failures).
   - Run `npx tsc --noEmit` and confirm 0 TypeScript errors (exit code 0).
6. Deliver handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\worker_m2_remediation\handoff.md` and send a summary message back to the orchestrator.

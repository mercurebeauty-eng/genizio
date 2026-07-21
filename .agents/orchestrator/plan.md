# Execution Plan — Naya Prompt System Update

## Phase 1: Investigation & Audit (Milestone 1)
- Dispatch `teamwork_preview_explorer` to inspect `C:\Users\USER\Documents\GENIZIO\` codebase.
- Locate AI call function (e.g. `src/lib/challenges.functions.ts` or edge functions).
- Analyze current handling of `childProfile.interests` and existing system prompts for Naya.

## Phase 2: Implementation (Milestone 2)
- Dispatch `teamwork_preview_worker` to perform the prompt rewrite and payload context injection.
- Re-evaluate prompt requirements (treat interests as deep behavioral drivers: e.g. "démonte pour comprendre" -> deconstruction & logical analysis).
- Ensure strictly prompt and payload context injection changes are made.

## Phase 3: Verification & Auditing (Milestone 3)
- Dispatch `teamwork_preview_reviewer` to review changes.
- Dispatch `teamwork_preview_challenger` to run `npx tsc --noEmit` and check for UI/DB regressions.
- Dispatch `teamwork_preview_auditor` to conduct forensic integrity verification.

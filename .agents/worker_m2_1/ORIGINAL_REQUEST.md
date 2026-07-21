## 2026-07-21T09:28:24Z

You are Worker 1 for Milestone 2 of the Naya prompt system update project.
Your assigned working directory is `C:\Users\USER\Documents\GENIZIO\.agents\worker_m2_1\`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Scope:
You are implementing prompt system updates and payload context injection in `C:\Users\USER\Documents\GENIZIO\`.
Please read:
- `C:\Users\USER\Documents\GENIZIO\.agents\PROJECT.md`
- `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_1\handoff.md`
- `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\handoff.md`
- `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\handoff.md`

Tasks to execute:
1. Create a helper function `formatChildInterestsPayload(interests?: string[])` in `src/lib/challenges.functions.ts` (or exported for shared use in `src/lib/hypotheses.functions.ts` and `src/lib/recommendations.functions.ts`).
   - The helper looks up each interest tag in `INTERESTS_BY_TALENT` from `src/components/profiles/shared.ts`.
   - Formats the tags to include their cognitive posture/talent category: e.g. `- [Logico-Mathematique / Cause à Effet] "Démonte pour comprendre"`.
   - Handles empty or unknown tags gracefully.
2. Update `GENIZIO_PRINCIPLES` in `src/lib/challenges.functions.ts`:
   - Replace old Rule 4 ("CENTRES D'INTÉRÊT COMME TREMPLIN...") with the new Behavioral Driver Directive (treating `interests` as deep behavioral postures, cognitive mechanisms, and action modalities rather than surface hobbies or literal subjects).
3. Update prompt call sites in:
   - `src/lib/challenges.functions.ts`: `generateChallenges`, `generateSingleChallenge`, `getChildAISynthesis`.
   - `src/lib/hypotheses.functions.ts`: `generateDiscriminantChallenge`.
   - `src/lib/recommendations.functions.ts`: `recommendChallengesForChild` (ESSAIMAGE and STABILISATION pathways).
4. Reframe any references to "parental bias" in prompts (e.g. `generateChallenges` line 847, `generateSingleChallenge` lines 1461-1463) into "Pedagogical Synthesis" that uses parent-observed behavioral postures as natural entry points to explore less-explored talents.
5. Strict Constraints:
   - Do NOT touch database schemas, Supabase migrations, or React UI components.
   - Edit ONLY prompt strings, context injection payload builders, and helper formatting functions in `src/lib/*.ts`.
6. Verification:
   - Run `npx tsc --noEmit` to verify type safety and build correctness.
   - Document changes, affected files, line numbers, and verification output in `C:\Users\USER\Documents\GENIZIO\.agents\worker_m2_1\handoff.md`.
   - Send a summary message back to the orchestrator.

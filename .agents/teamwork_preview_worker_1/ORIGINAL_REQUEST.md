## 2026-07-21T09:05:09Z

<USER_REQUEST>
You are teamwork_preview_worker (Worker 1).
Your working directory is C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_1\.
Project root is C:\Users\USER\Documents\GENIZIO\.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OBJECTIVE:
Refactor `src/components/profiles/ProfileDialog.tsx` to implement Progressive Disclosure for interest tag selection according to user requirements R1, R2, R3, and the strategy from Explorer reports (`PROJECT.md`).

REQUIREMENTS TO IMPLEMENT:
1. **R1. Progressive Disclosure UI**:
   - In `ProfileDialog.tsx`, replace the wall-of-tags view (which shows all 33 tags across 9 categories at once) with a 2-step progressive selection:
     - **Step 1 (Universes Selection)**: Render the 9 Gardner talent categories (`INTERESTS_BY_TALENT` keys: `spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`) as visual Universe selection buttons. Parent can select 2 to 3 main universes. Display a counter (e.g. `1/3`, `2/3`, `3/3`) and guidance text ("2 à 3 univers recommandés").
     - **Step 2 (Filtered Sub-tags Selection)**: Render ONLY the interest tags belonging to the selected universes from Step 1. Never display all 33 tags simultaneously. If no universe is selected yet, display a helpful placeholder banner prompting the user to select at least 1 universe above.
2. **Hydration for Profile Editing**:
   - When editing an existing profile (`initial` prop is present), automatically initialize `selectedUniverses` by detecting which talent groups in `INTERESTS_BY_TALENT` contain tags present in `initial.interests`.
3. **Universe Deselection Handling**:
   - When a parent unselects a universe in Step 1, purge any sub-tags belonging to that universe from `draft.interests`.
4. **R2. Design System & Aesthetics**:
   - Use strictly existing tokens and styles (`var(--brand)`, `bg-surface`, `bg-brand`, `border-ink`, `text-ink`, `font-bold`, rounded-xl / rounded-full chips).
   - Do NOT install or import any external UI libraries.
5. **R3. Data Integrity & Schema Preservation**:
   - `shared.ts` MUST NOT BE MODIFIED OR EDITED IN ANY WAY. `INTERESTS_BY_TALENT` is the untouched source of truth.
   - `save()` MUST continue sending `interests: draft.interests` as a flat `string[]` to Supabase `child_profiles`.
6. **Code Quality & Verification**:
   - Run `npx tsc --noEmit` and ensure 0 type errors.
   - Run `npm run test` and ensure all unit tests pass.
   - Run `npm run build` to verify clean compilation.

OUTPUT:
Write your handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_1\handoff.md` detailing:
- Changes made to `src/components/profiles/ProfileDialog.tsx`
- Build/test verification results (`npx tsc --noEmit`, `npm run test`, `npm run build`)
- Confirmation that `shared.ts` remains unchanged.
Send a message back to main agent with your implementation summary.
</USER_REQUEST>

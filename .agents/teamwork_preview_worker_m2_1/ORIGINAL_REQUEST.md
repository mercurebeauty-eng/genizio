## 2026-07-26T17:57:36Z
You are Worker 1 for Milestone 2 (M2: Challenge Separation R2 & Portfolio Fusion R3) of the Génizio project refactoring.

Working directory: C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m2_1
Project root: C:\Users\USER\Documents\GENIZIO

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks for Requirements R2 and R3:

### Task 1: R2 — Separate Parent / Child Modes on Challenges Page
1. Modify `src/routes/profiles.$profileId.challenges.tsx`:
   - Add a prominent Mode Switcher / toggle at the top of the header: **"Espace Parent 🧑🏫"** (default) vs **"Mode Enfant 🎮"**.
   - **Vue Parent**: Shows the full Pedagogical Generation Lab (`#genizio-lab`), priority recommendation card, challenge roadmap with filters (Tous, À faire, En cours, Terminé), pedagogical intent, parent notes journal, proof validation (`OutcomeChat`).
   - **Vue Enfant / Mode Quête**: Displays a simplified child-friendly layout with active challenge, step progress, and a prominent **"Lancer la Quête 🚀"** button pointing to `/profiles/$profileId/quest`.
2. Modify `src/routes/profiles.$profileId.quest.tsx`:
   - Update `handleFinishQuest` and quest completion step: when quest completes, show a celebration screen **in-view** ("Bravo ! 🎉", mascot praise, confetti/celebration UI, photo upload option) instead of redirecting the child back to the adult `/challenges` Parent View. Button after celebration returns child to the Child View.

### Task 2: R3 — Merge `/parcours` into `/portfolio`
1. Modify `src/routes/profiles.$profileId.portfolio.tsx`:
   - Integrate all elements from `parcours.tsx` into `portfolio.tsx`:
     1. Talent Radar (9 Gardner intelligences)
     2. Guild XP / Level progress bar & Top Domains ("Terrains de jeu favoris")
     3. Achievement Timeline (monthly history with photos, `groupByMonth`)
     4. Potential Cards (9 evolving collectible cards `TALENT_DETAILS`)
     5. Season Section (enrollment + status + renewal modal)
     6. Passport of Excellence (unlock + PDF download for 14+)
2. Update links referencing `/parcours`:
   - Check `src/routes/profiles.index.tsx` (line 465) and any other references to `/parcours`, updating them to `/portfolio`.
3. Delete `src/routes/profiles.$profileId.parcours.tsx`.

### Task 3: Build & Verification
1. Run `npx tsc --noEmit` to confirm 0 errors and auto-regeneration of `src/routeTree.gen.ts`.
2. Run `npm run test` to confirm all tests pass.
3. Run `npm run build` to verify clean production build.
4. Write summary to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m2_1\changes.md` and handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m2_1\handoff.md`.
5. Send a message to caller ("parent", conversation ID: c22bddf0-6dad-40a0-86a2-7b70322d7990) with handoff path and test results.

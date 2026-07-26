## 2026-07-26T17:51:35Z

You are Worker 1 for Milestone 1 (M1: Cleanup & Feed Removal R1) of the Génizio project refactoring.

Working directory: C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m1_1
Project root: C:\Users\USER\Documents\GENIZIO

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks for Requirement R1:
1. Delete these feed files:
   - `src/routes/feed.tsx`
   - `src/routes/p.$postId.tsx`
   - `src/components/feed/CreatePostModal.tsx` (and directory `src/components/feed/`)
2. Modify `src/components/challenges/OutcomeChat.tsx`:
   - Remove `CreatePostModal` import (line 9).
   - Remove `showPostModal` state (line 86).
   - Remove "Partager sur le Cerveau Collectif" button (lines 240-246).
   - Remove `<CreatePostModal ... />` JSX block (lines 255-269).
3. Modify `src/routes/profiles.$profileId.guild.tsx`:
   - Remove `<Link to="/feed">Voir le Mur Public →</Link>` button (lines 196-200).
   - Clean up text copy referencing "Mur Public".
4. Modify `src/lib/guilds.functions.ts`:
   - Remove the `posts` database query in `getGuildCommunity` (lines 69-74).
   - Return `recentActivity: []`.
5. Run build and tests:
   - Run `npx tsc --noEmit` and confirm 0 errors.
   - Run `npm run test` and confirm all tests pass.
   - Run `npm run build` to auto-regenerate `src/routeTree.gen.ts` and verify clean build.
6. Write a summary of changes to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m1_1\changes.md` and handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m1_1\handoff.md`.
7. Once finished, send a message to your caller ("parent", conversation ID: c22bddf0-6dad-40a0-86a2-7b70322d7990) with the path to your handoff report and test results.

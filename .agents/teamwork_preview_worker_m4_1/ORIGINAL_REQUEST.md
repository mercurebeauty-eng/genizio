## 2026-07-26T18:15:10Z
You are Worker 1 for Milestone 4 (M4: Unified Taxonomies R7 & Final Verification) of the Génizio project refactoring.

Working directory: C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m4_1
Project root: C:\Users\USER\Documents\GENIZIO

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks for Requirement R7 and Final Verification:

### Task 1: R7 — Create Canonical Gardner Taxonomy (`src/lib/gardner.ts`)
1. Create `src/lib/gardner.ts` establishing the single source of truth for the 9 Gardner intelligences with short labels containing emojis:
   - `logico_mathematique`: "🧠 Logique"
   - `creative`: "🎨 Créative"
   - `corporelle`: "🏃 Corporelle"
   - `linguistique`: "🗣️ Linguistique"
   - `spatial`: "📐 Spatiale"
   - `sociale`: "🤝 Sociale"
   - `emotionnelle`: "🪞 Émotionnelle"
   - `artisanale`: "🪵 Artisanale"
   - `entrepreneuriale`: "💡 Entreprendre"
2. Update `src/lib/talent-buckets.ts`:
   - Map `TALENT_KEY_LABELS` to use these short emoji labels from `gardner.ts`. Keep `VALID_TALENT_KEYS` backend keys unchanged.

### Task 2: R7 — Explicit Guild Copy & Talent Connections
1. Update `src/lib/guilds.ts`:
   - Enhance Guild descriptions in `GUILDS` to make explicit linkages to their underlying Gardner talents (e.g. *Les Bâtisseurs* -> 📐 Spatiale & 🪵 Artisanale).
2. Update `src/routes/profiles.$profileId.guild.tsx`:
   - Render badges/text showing the exact Gardner talents connected to each Guild.

### Task 3: R7 — Harmonize User-Facing Talent Display Across UI Components
1. Update UI components (`TalentRadarChart.tsx`, `AdminTalentsCitiesTab.tsx`, `ProfileDialog.tsx`, `shared.ts`, `profiles.$profileId.portfolio.tsx`, `profiles.$profileId.challenges.tsx`, `profiles.$profileId.passport-print.tsx`, `b2b.index.tsx`, `index.tsx`) to display the consistent 9 short emoji labels everywhere talents are shown to the user.

### Task 4: Final Verification
1. Run `npx tsc --noEmit` to confirm 0 TypeScript errors.
2. Run `npm run test` to confirm all unit/integration tests pass.
3. Run `npm run build` to verify clean production build.
4. Verify responsive layout styling on mobile (360px) and desktop (1280px+).
5. Write summary to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m4_1\changes.md` and handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m4_1\handoff.md`.
6. Send a message to caller ("parent", conversation ID: c22bddf0-6dad-40a0-86a2-7b70322d7990) with handoff path and test results.

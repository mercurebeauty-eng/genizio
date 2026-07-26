## 2026-07-26T18:06:56Z
You are Worker 1 for Milestone 3 (M3: Admin OS Improvements R4, R5, R6) of the Génizio project refactoring.

Working directory: C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m3_1
Project root: C:\Users\USER\Documents\GENIZIO

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks for Requirements R4, R5, R6:

### Task 1: R4 — Export B2B Campaign Tokens in Admin
1. Modify `src/lib/campaigns.functions.ts`:
   - Add server function `listCampaignTokensAdmin` that takes `{ campaignId: string }`, checks admin authorization, queries `sponsorship_tokens` for the campaign, joins `child_profiles` for redeemed tokens to retrieve beneficiary child name, and returns the token details array.
2. Modify `src/components/admin/AdminCampaignsTab.tsx`:
   - Add a "📋 Voir les codes" button on each campaign card.
   - Add a modal component (`ViewCampaignTokensModal`) that displays all campaign codes, activation status (activé/non activé), and beneficiary name if activated.
   - Include a "📥 Exporter CSV" button that generates and downloads a CSV file with columns: `Code;Statut;Date d'activation;Nom Enfant;Email Parent;Date de création`.
   - Include a "📋 Copier tous les codes non-activés" button that copies unactivated codes separated by newlines to clipboard.

### Task 2: R5 — Harmonize Supervisor Assignment (`campaign_id`)
1. Modify `src/lib/supervisors.functions.ts`:
   - Update `assignSupervisor`: before inserting into `supervisors`, query `season_enrollments` for `child_id = childProfileId` where `campaign_id IS NOT NULL` (ordered by `enrolled_at desc`, limit 1).
   - If an enrollment exists, include `campaign_id: enrollment.campaign_id` in the `supervisors` table insert payload instead of leaving it `NULL`.

### Task 3: R6 — Unified 8-Tab Admin Navigation Hub
1. Modify `src/components/admin/AdminNavTabBar.tsx`:
   - Expand `AdminTab` type and `ADMIN_TABS` array to include 8 tabs: Exécutif, Campagnes B2B, Superviseurs, Produits, Talents & Villes, IA Naya, Commerce, Seasons.
2. Modify `src/routes/admin.index.tsx`:
   - Import/render supervisor management view and product catalogue view when their tabs are active.
3. Update `src/routes/admin.supervisors.tsx` and `src/routes/admin.products.tsx` to remain compatible.

### Task 4: Build & Verification
1. Run `npx tsc --noEmit` to confirm 0 TypeScript errors.
2. Run `npm run test` to confirm all tests pass.
3. Run `npm run build` to verify clean build.
4. Write summary to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m3_1\changes.md` and handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\teamwork_preview_worker_m3_1\handoff.md`.
5. Send a message to caller ("parent", conversation ID: c22bddf0-6dad-40a0-86a2-7b70322d7990) with handoff path and test results.

Begin immediately.

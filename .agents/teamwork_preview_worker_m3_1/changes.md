# Changes Summary — Milestone 3 (R4, R5, R6)

## Requirement R4: Export B2B Campaign Tokens in Admin
- **`src/lib/campaigns.functions.ts`**:
  - Defined interface `CampaignTokenDetail` with fields: `id`, `code`, `campaign_id`, `is_redeemed`, `redeemed_at`, `redeemed_by_child_id`, `created_at`, `sponsor_name`, `sponsor_email`, `child_name`, and `parent_email`.
  - Added server function `listCampaignTokensAdmin` taking `{ campaignId: string }`, requiring admin authentication (`requireAdmin`), querying `sponsorship_tokens` for the specified campaign, joining `child_profiles` for redeemed tokens to retrieve beneficiary child name, and looking up parent email via `listAllUsers`.
- **`src/components/admin/AdminCampaignsTab.tsx`**:
  - Added "📋 Voir les codes" button on each campaign card alongside "Générer".
  - Implemented modal component `ViewCampaignTokensModal` displaying all campaign tokens, total count, activated count, non-activated count, activation status badges, and beneficiary child details when activated.
  - Implemented "📥 Exporter CSV" button exporting a UTF-8 BOM CSV file formatted with semicolon separators (`Code;Statut;Date d'activation;Nom Enfant;Email Parent;Date de création`).
  - Implemented "📋 Copier tous les codes non-activés" button copying unactivated token codes separated by newlines to clipboard with toast notification feedback.

## Requirement R5: Harmonize Supervisor Assignment (`campaign_id`)
- **`src/lib/supervisors.functions.ts`**:
  - Updated `assignSupervisor` server function: before inserting into `supervisors`, queries `season_enrollments` for `child_id = childProfileId` where `campaign_id IS NOT NULL` ordered by `enrolled_at desc` limit 1.
  - If a matching campaign enrollment exists, populates `campaign_id: enrollment.campaign_id` in the `supervisors` table insert payload instead of leaving it `NULL`.

## Requirement R6: Unified 8-Tab Admin Navigation Hub
- **`src/components/admin/AdminNavTabBar.tsx`**:
  - Expanded `AdminTab` union type to include 8 tab identifiers: `"executive" | "b2b" | "supervisors" | "products" | "talents" | "naya" | "commerce" | "seasons"`.
  - Expanded `ADMIN_TABS` metadata array with icons, badges, labels, and sublabels for all 8 tabs.
  - Updated grid layout responsive design to `lg:grid-cols-8`.
- **`src/components/admin/AdminSupervisorsTab.tsx`**:
  - Extracted reusable `AdminSupervisorsTab` component for supervisor management view.
- **`src/components/admin/AdminProductsTab.tsx`**:
  - Extracted reusable `AdminProductsTab` component for product catalogue, material suggestions, orders, and stats view.
- **`src/routes/admin.index.tsx`**:
  - Integrated and rendered `AdminSupervisorsTab` and `AdminProductsTab` when their respective tabs (`supervisors`, `products`) are active in the unified 8-tab hub.
- **`src/routes/admin.supervisors.tsx` & `src/routes/admin.products.tsx`**:
  - Updated standalone sub-routes to render `AdminSupervisorsTab` and `AdminProductsTab` within their respective routes to preserve complete route compatibility.

## Tests & Verification
- **`src/lib/admin-route.test.ts`**: Updated test suite to validate all 8 tabs in `ADMIN_TABS`.
- **`src/lib/m3-admin-os.test.ts`**: Created unit tests covering R4 token listing & CSV/clipboard export formatting and R5 supervisor assignment.

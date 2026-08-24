# Detailed Functional Audit Report — User Flows 4–6

**Project**: Génizio End-to-End Functional Audit & Systemic Reliability Fix  
**Auditor**: Explorer 2 (Milestone 1)  
**Date**: 2026-07-21  
**Working Directory**: `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m2_1`

---

## 1. Executive Summary & Audit Scope

This report presents a thorough functional, UX, data-flow, and resilience audit of **User Flows 4, 5, and 6** in the Génizio web application codebase.

### Scope Covered:

1. **User Flow 4 ("Ton Parcours" & Portfolio)**:
   - Routes: `/profiles/$profileId/parcours` (`src/routes/profiles.$profileId.parcours.tsx`), `/profiles/$profileId/portfolio` (`src/routes/profiles.$profileId.portfolio.tsx`)
   - Components: `TalentRadarChart.tsx`, `AppTabBar.tsx`, `AppHeader.tsx`, timeline components.
   - Core Logic: Gardner 9 intelligences radar chart rendering, level/XP calculations, domain grouping, interest migration/discovery.
2. **User Flow 5 (PDF Passport Generation & Print)**:
   - Route: `/profiles/$profileId/passport-print` (`src/routes/profiles.$profileId.passport-print.tsx`)
   - Core Logic: Child profile data mapping, guild & XP calculation, Naya synthesis & orientation letter, browser print triggers, CSS `@media print` & page layout, `@react-pdf/renderer` spec alignment.
3. **User Flow 6 (Génizio Admin OS)**:
   - Route & Layout: `/admin` (`src/routes/admin.tsx`), `/admin/` (`src/routes/admin.index.tsx`), `/admin/products` (`src/routes/admin.products.tsx`), `/admin/supervisors` (`src/routes/admin.supervisors.tsx`)
   - Admin OS Tabs: Executive Overview (`AdminExecutiveTab.tsx`), Talents & Cities (`AdminTalentsCitiesTab.tsx`), Naya Telemetry & Costs (`AdminNayaTab.tsx`), Commerce/Orders/Slots (`AdminCommerceTab.tsx`).
   - Server Functions & Utilities: `admin-os.functions.ts`, `products.functions.ts`, `supervisors.functions.ts`.

---

## 2. Automated Baseline Status

- **TypeScript Type Check (`npx tsc --noEmit`)**: 0 errors (Passed).
- **Vitest Test Suite (`npx vitest run`)**: 149 / 149 tests passed across 11 test suites (100% green).

---

## 3. Deep Audit by User Flow

### 3.1 User Flow 4: "Ton Parcours" & Portfolio

#### Execution Chain Analysis:

- **Trigger**: User navigates to `/profiles/$profileId/parcours` or `/profiles/$profileId/portfolio`.
- **Data Fetching**: `useEffect` fires `Promise.all` querying Supabase tables `child_profiles`, `challenges`, `child_mentors`, and `hypothesis_cycles`.
- **Logic & State**: Computes XP level (`getLevelInfo` / `Math.floor(xp / 500) + 1`), groups completed challenges by month or domain, calculates top domains, renders Gardner 9 intelligences radar chart (`TalentRadarChart`).
- **Defects Identified**:
  1. **D-F4-01**: Missing `.catch()` on `Promise.all` in both `parcours.tsx` (lines 122–138) and `portfolio.tsx` (lines 183–210). On network failure or RLS rejection, `fetching` remains `true` forever, freezing the UI on `<GenizioLoader>` with zero error feedback.
  2. **D-F4-02**: Missing empty state on `parcours.tsx` (line 275) when `child.talents` is empty or null. The "Carte des talents" card is hidden without any indication or explanation to the user.
  3. **D-F4-03**: Optimistic state mutation in `acceptDiscovery` (`portfolio.tsx`, lines 237–243) without error handling or rollback on DB update failure.
  4. **D-F4-04**: Swallowed errors in AI synthesis (`fetchSynthesis`) and hypothesis generation (`ensureHypotheses`) in `portfolio.tsx`.

---

### 3.2 User Flow 5: PDF Passport Generation & Print

#### Execution Chain Analysis:

- **Trigger**: User opens `/profiles/$profileId/passport-print`.
- **Data Fetching**: `useEffect` loads child profile, completed challenges, earned badges, AI synthesis, and passport orientation letter (`getPassportLetter`).
- **Print Trigger**: An `useEffect` timer schedules `window.print()` after 1.5s delay when data is loaded.
- **Defects Identified**:
  1. **D-F5-01**: **Automatic Print Trigger Bug on Locked Passports & Zero-Challenge Profiles**.
     - `useEffect` (lines 161–168) runs before the `!isUnlocked` guard check (line 193). If `child.pdf_unlocked` is `false`, but the child has completed challenges and cached synthesis, the timer fires `window.print()` after 1.5s, opening the print dialog on the **Locked Access Screen** ("Passeport d'Excellence Verrouillé")!
     - In addition, if `challenges.length === 0` or `synthesis` fails to load, `challenges.length > 0 && synthesis` evaluates to `false`, preventing `window.print()` from ever auto-triggering on valid unlocked passports.
  2. **D-F5-02**: **Spec Discrepancy & Missing `@react-pdf/renderer` Dependency**.
     - System scope specifies `@react-pdf/renderer` for PDF Passport rendering. The codebase uses pure HTML/CSS `@media print` with `window.print()`. `@react-pdf/renderer` is missing from `package.json`.
  3. **D-F5-03**: **Incorrect Dynamic Page Numbering in Print Footers**.
     - Hardcoded total page calculation `Math.min(6, 3 + Math.ceil(challenges.length / 2))` in page footers produces incorrect numbers if synthesis is empty or if challenge count exceeds 6 pages.
  4. **D-F5-04**: Unhandled `Promise.all` rejections and swallowed server function errors during initial data load.

---

### 3.3 User Flow 6: Génizio Admin OS

#### Execution Chain Analysis:

- **Trigger**: Admin user enters `/admin`.
- **Guard Check**: `AdminLayout` calls `checkAdminStatus` server function.
- **Tab Navigation**: `AdminIndexPage` renders `AdminNavTabBar` managing 4 tabs: Executive (`AdminExecutiveTab`), Talents & Cities (`AdminTalentsCitiesTab`), Naya Telemetry (`AdminNayaTab`), Commerce (`AdminCommerceTab`).
- **Defects Identified**:
  1. **D-F6-01**: `checkAdmin()` in `admin.tsx` (lines 28–30) lacks `.catch()`. An unhandled server rejection sets `checking = false` with `isAdmin = false`, misdirecting the user to "Accès Interdit" without error logging.
  2. **D-F6-02**: Missing action-level pending state & double-click protection on Order Status dropdowns and Passport toggle buttons in `AdminCommerceTab.tsx` and `AdminExecutiveTab.tsx`.
  3. **D-F6-03**: Discrepancy between `uniqueCitiesCount` (excludes "Ville non renseignée") and total children in `AdminTalentsCitiesTab.tsx` when location data is missing.
  4. **D-F6-04**: Unhandled rejection in `handleUpdateOrderStatus` (`admin.index.tsx`, lines 101–107) if `updateOrderStatusFn` throws a server error.

---

## 4. Complete Defect Inventory (Flows 4–6)

| Defect ID   | User Flow | File Path                                                                                       | Line Numbers                                           | Description                                                                                        | Impact                                                                                  | Proposed Fix                                                                           |
| ----------- | --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **D-F4-01** | Flow 4    | `src/routes/profiles.$profileId.parcours.tsx`<br>`src/routes/profiles.$profileId.portfolio.tsx` | parcours: 122–138<br>portfolio: 183–210                | `Promise.all` data fetch lacks `.catch()` error block                                              | Infinite loading UI lock on network/RLS errors                                          | Add `.catch()` block, log error, set `fetching = false`, and display toast/error state |
| **D-F4-02** | Flow 4    | `src/routes/profiles.$profileId.parcours.tsx`                                                   | 275–282                                                | No empty state when `child.talents` is null or empty                                               | "Carte des talents" vanishes silently for new profiles                                  | Add an explicit placeholder card encouraging completion of the first challenge         |
| **D-F4-03** | Flow 4    | `src/routes/profiles.$profileId.portfolio.tsx`                                                  | 237–243                                                | `acceptDiscovery` performs optimistic state update without DB error handling                       | DB write failure leaves UI out of sync with backend                                     | Wrap DB update in `try/catch`, revert state and show toast error on failure            |
| **D-F4-04** | Flow 4    | `src/routes/profiles.$profileId.portfolio.tsx`                                                  | 260–264, 276–278                                       | `fetchSynthesis` and `ensureHypotheses` swallow errors silently                                    | Violates zero error swallowing contract                                                 | Log errors and display Sonner toast or UI alert                                        |
| **D-F5-01** | Flow 5    | `src/routes/profiles.$profileId.passport-print.tsx`                                             | 161–168, 193–213                                       | Auto-print `useEffect` triggers `window.print()` on Locked Access screen and fails on 0 challenges | Severe UX bug: prints locked screen; fails to print unlocked profiles with 0 challenges | Check `child.pdf_unlocked === true` inside hook; fix auto-print conditions             |
| **D-F5-02** | Flow 5    | `package.json`<br>`src/routes/profiles.$profileId.passport-print.tsx`                           | package.json<br>passport-print: 260+                   | Missing `@react-pdf/renderer` dependency; uses browser CSS print instead                           | Architecture discrepancy with project scope requirement                                 | Document divergence or integrate `@react-pdf/renderer` for pure PDF export             |
| **D-F5-03** | Flow 5    | `src/routes/profiles.$profileId.passport-print.tsx`                                             | 515, 556, 646–649                                      | Hardcoded page numbering formula `Math.min(6, 3 + ...)` miscalculates total pages                  | Incorrect page numbers in print footers                                                 | Compute `totalPages` dynamically in a single helper variable                           |
| **D-F5-04** | Flow 5    | `src/routes/profiles.$profileId.passport-print.tsx`                                             | 112–136, 138–158                                       | Unhandled `Promise.all` rejection and swallowed synthesis errors                                   | Loading lock on failure; silent error swallowing                                        | Add `.catch()` to initial fetch and display error fallback                             |
| **D-F6-01** | Flow 6    | `src/routes/admin.tsx`                                                                          | 28–30                                                  | `checkAdmin()` server call lacks `.catch()` block                                                  | Misleads user to "Accès Interdit" on network/server error                               | Add `.catch()` with error toast and fallback error screen                              |
| **D-F6-02** | Flow 6    | `src/components/admin/AdminExecutiveTab.tsx`<br>`src/components/admin/AdminCommerceTab.tsx`     | ExecutiveTab: 239–258<br>CommerceTab: 318–329, 441–460 | Action buttons and status selects lack row-level pending state                                     | Risk of double clicks and race conditions                                               | Add row-specific pending tracking and disable controls during async operations         |
| **D-F6-03** | Flow 6    | `src/lib/admin-os.functions.ts`<br>`src/components/admin/AdminTalentsCitiesTab.tsx`             | admin-os: 417–421, 712–714<br>TalentsTab: 203          | Unhandled location data discrepancy when "Ville non renseignée" dominates                          | Confusing KPI vs table stats in Admin OS                                                | Add callout banner for unassigned cities and improve data completeness                 |
| **D-F6-04** | Flow 6    | `src/routes/admin.index.tsx`                                                                    | 101–107                                                | `handleUpdateOrderStatus` lacks `try/catch` block for server errors                                | Unhandled promise rejection on server error during status update                        | Wrap call in `try/catch` and display `toast.error(...)`                                |

---

## 5. Verification Method

To verify these observations independently:

1. **TypeScript Verification**: Run `npx tsc --noEmit` in project root (`C:\Users\USER\Documents\GENIZIO`). Confirm 0 errors.
2. **Vitest Verification**: Run `npx vitest run`. Confirm all 149 tests pass.
3. **Manual Code Inspection**:
   - Inspect `src/routes/profiles.$profileId.parcours.tsx` lines 122–138 for unhandled `Promise.all`.
   - Inspect `src/routes/profiles.$profileId.passport-print.tsx` lines 161–168 and 193–213 for the print trigger bug on locked passports.
   - Inspect `src/routes/admin.tsx` lines 28–30 for unhandled `checkAdmin()` promise rejection.

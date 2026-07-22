# Génizio End-to-End Functional Audit & Automated Baseline Report (Milestone 1)

**Agent**: Explorer 3 (Silent Errors & Automated Baseline Audit)  
**Date**: 2026-07-21  
**Project**: Génizio End-to-End Functional Audit & Systemic Reliability Fix  
**Scope Path**: `C:\Users\USER\Documents\GENIZIO\src`

---

## Executive Summary

As part of Milestone 1, Explorer 3 conducted an extensive, code-wide audit across all 152 files in `src/` for silent errors, error swallowing, missing async button double-click/double-submit protections, hook dependency suppressions, and dead links, alongside executing the project's automated diagnostic baseline (`npx vitest run` & `npx tsc --noEmit`).

### Key Diagnostics Summary:
1. **Vitest Test Suite (`npx vitest run`)**: **100% PASS** (11 test files, 149 tests passed, 0 failures).
2. **TypeScript Compilation (`npx tsc --noEmit`)**: **0 ERRORS** (Clean static type check).
3. **Code Quality Audit (Silent Errors & Edge Cases)**: **16 Identified Defects (D-01 to D-16)** catalogued across API integration handlers, UI components, and state management hooks.

---

## 1. Automated Diagnostics Baseline Results

### 1.1 Vitest Execution Baseline
- **Command Executed**: `npx vitest run`
- **Result**: PASSED
- **Test Files Passed**: 11 / 11
- **Individual Tests Passed**: 149 / 149 (0 failed, 0 skipped)
- **Duration**: 4.12s
- **Passing Suites**:
  - `src/lib/active-challenge.test.ts` (6 tests)
  - `src/lib/talent-buckets.test.ts` (16 tests)
  - `src/lib/naya-telemetry.test.ts` (12 tests)
  - `src/lib/naya-telemetry.stress.test.ts` (22 tests)
  - `src/lib/guilds.test.ts` (8 tests)
  - `src/components/profiles/ProfileDialog.test.ts` (3 tests)
  - `src/lib/admin-route.test.ts` (3 tests)
  - `src/lib/admin-os.stress.test.ts` (23 tests)
  - `src/lib/admin-os.m2-stress.test.ts` (21 tests)
  - `src/lib/admin-os.test.ts` (24 tests)
  - `src/lib/commerce-passports.test.ts` (11 tests)

### 1.2 TypeScript Compiler Baseline
- **Command Executed**: `npx tsc --noEmit`
- **Result**: PASSED (0 errors, clean output)

---

## 2. Prioritized Defect Catalog (D-01 to D-16)

| Defect ID | File Path | Line(s) | Category | Severity | Description |
|---|---|---|---|---|---|
| **D-01** | `src/routes/admin.tsx` | 28–31 | Unhandled Promise Rejection | Major | `checkAdmin()` uses `.then()` and `.finally()` without a `.catch()` block. If the server function throws/rejects, the rejection is unhandled, leaving `isAdmin=false` without displaying an error toast. `checkAdmin` is also missing from the `useEffect` dependency array. |
| **D-02** | `src/routes/admin.index.tsx` | 81–107 | Unhandled Promise Rejection | Major | Server calls in `handleGrantSlot`, `handleTogglePassport`, and `handleUpdateOrderStatus` (`grantSlotFn`, `toggleUnlockFn`, `updateOrderStatusFn`) lack `try/catch` wrappers. Failures reject unhandled without showing an error toast. |
| **D-03** | `src/routes/admin.products.tsx` | 141–143 | Error Swallowing | Major | `refetch()` uses `catch { setForbidden(true); }` which swallows network/API/RPC failures silently without logging or displaying a toast to inform the admin. |
| **D-04** | `src/routes/admin.products.tsx` | 213–231 | Missing Double-Submit Prevention | Major | `toggleActive` (L213) and `remove` (L222) invoke async server calls (`updateFn`, `deleteFn`) without disabling action buttons or setting loading states during execution, allowing rapid multi-clicks. |
| **D-05** | `src/routes/admin.supervisors.tsx` | 58–60 | Swallowed Promise Rejection | Minor | `listChildrenFn().then(...).catch(() => setChildProfiles([]))` silently swallows errors when fetching child profiles for the admin supervisor selector. |
| **D-06** | `src/routes/admin.supervisors.tsx` | 196–204 | Missing Double-Submit Prevention | Major | The "Retirer" supervisor button triggers `handleRemove(s.id)` without a disabled state or spinner during `removeFn` execution, enabling rapid multi-click issues. |
| **D-07** | `src/routes/profiles.$profileId.challenges.tsx` | 334–347 | Swallowed Promise Rejection | Major | `loadAISynthesis` (`catch (e) { console.error(e); }`) and `loadRecommendation` (`catch (e) { console.error(e); }`) swallow server function errors without displaying error toasts or inline error states. |
| **D-08** | `src/routes/profiles.$profileId.challenges.tsx` | 356 | Suppressed `useEffect` Dependency | Minor | Line 356 uses `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressing `refetch`, `loadAISynthesis`, and `loadRecommendation` from effect dependencies. |
| **D-09** | `src/routes/profiles.$profileId.challenges.tsx` | 1150–1160 | Missing Double-Submit Prevention | Major | The "Enregistrer les notes" button executes `await onNotes(notesDraft)` without setting `disabled` or showing a loading spinner, permitting rapid duplicate clicks. |
| **D-10** | `src/routes/profiles.$profileId.guild.tsx` | 53–54 | Empty Catch & Suppressed Dependency | Major | `fetchCommunity({ data: { childId: child.id } }).then(setCommunity).catch(() => {});` silently swallows errors with an empty catch block. Line 54 also suppresses `react-hooks/exhaustive-deps`. |
| **D-11** | `src/routes/profiles.$profileId.passport-print.tsx` | 143, 155, 157 | Swallowed Promise Rejection & Suppressed Dep | Major | `fetchSynthesis` uses `.catch(() => setSynthesis(""))` and `fetchLetter` uses `.catch(() => setLetter(""))` swallowing promise failures silently without toasts. Line 157 suppresses `react-hooks/exhaustive-deps`. |
| **D-12** | `src/routes/profiles.$profileId.portfolio.tsx` | 221, 231, 262, 276 | Empty Catch & Swallowed Rejections | Major | Empty `catch` blocks and `.catch(() => {})` in `portfolio.tsx`: L221 swallows localStorage JSON parse error; L231 swallows localStorage write error; L262 swallows `fetchSynthesis` failure; L276 swallows `ensureHypotheses` failure silently. |
| **D-13** | `src/routes/profiles.$profileId.quest.tsx` | 104, 117 | Empty Catch Block | Minor | `try { ... } catch (e) {}` blocks swallow JSON parse errors for `steps` and `materials` without fallback logging. |
| **D-14** | `src/routes/boutique.tsx` | 511–516 | Missing Double-Click Prevention | Major | In `BoutiquePage`, button `onClick={handleGenerate}` in the generation configuration modal does not set `disabled={isGenerating}`, allowing multiple clicks before modal state updates. |
| **D-15** | `src/server.ts` | 42–44 | Empty Catch Block | Minor | `try { ... } catch { return false; }` in `server.ts` swallows SSR page error parsing without logging. |
| **D-16** | `src/routes/profiles.index.tsx` | 176 | Suppressed `useEffect` Dependency | Minor | Line 176 suppresses `react-hooks/exhaustive-deps` for `refetch`. |

---

## 3. Scope & Flow Impact Analysis

### Flow 1: Auth & Access (`/auth`, admin layout, session persistence)
- **Defects**: D-01 (Admin Layout unhandled promise rejection & missing useEffect dep).

### Flow 2: Profile Management & Engines (`/profiles`, `ProfileDialog.tsx`, `/portfolio`)
- **Defects**: D-07, D-12 (Portfolio & Challenges AI synthesis error swallowing, localStorage empty catches, missing toast handlers).

### Flow 3: Challenge Engine & Completion (`/profiles/$profileId/challenges`, `/quest`)
- **Defects**: D-09, D-13 (Missing double-submit prevention on parent notes, empty catch on JSON steps parsing in quest mode).

### Flow 4: "Ton Parcours" & Portfolio (`/profiles/$profileId/parcours`, `/portfolio`, `/guild`)
- **Defects**: D-10 (Guild community fetch empty catch swallow), D-12 (Portfolio hypothesis & synthesis swallowed rejections).

### Flow 5: PDF Passport Generation & Print (`/profiles/$profileId/passport-print`)
- **Defects**: D-11 (Passport print synthesis & orientation letter promise swallows, suppressed hook deps).

### Flow 6: Génizio Admin OS & Boutique (`/admin`, `/admin/products`, `/admin/supervisors`, `/boutique`)
- **Defects**: D-02, D-03, D-04, D-05, D-06, D-14 (Admin OS unhandled promise rejections on grant/toggle/status, missing loading/disabled states on product toggle/delete and supervisor remove, empty catch in supervisor child list fetch, boutique generation double-click).

---

## 4. Remediation Recommendations for Milestones 2 & 3

1. **Strict Error Handling Policy**:
   - Replace all `catch {}` and `.catch(() => {})` / `.catch(() => null)` with explicit error handling: `console.error(err)` + `toast.error(...)` (using Sonner toast).
2. **Async UX Button Safety**:
   - Wrap all async click handlers (`handleGrantSlot`, `handleTogglePassport`, `handleUpdateOrderStatus`, `toggleActive`, `remove`, `handleRemove`, `saveNotes`, `handleGenerate`) with `isPending` or `loading` local state and bind `disabled={isPending}` with a loading spinner icon on all submit buttons.
3. **Hook Cleanliness & ESLint Compliance**:
   - Remove `// eslint-disable-next-line react-hooks/exhaustive-deps` comments where safe, or memoize callbacks with `useCallback` / wrap server functions properly.

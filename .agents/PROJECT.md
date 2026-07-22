# Project: Génizio End-to-End Functional Audit & Systemic Reliability Fix

## Architecture
- **Framework**: React / TanStack Router / Supabase / TypeScript / Tailwind CSS / Vitest.
- **Key Modules & Routes**:
  1. Auth & Access: `/auth`, session persistence, admin middleware guard.
  2. Profile Management & Engines: `/profiles`, `ProfileDialog.tsx`, universe/levers selection, behavioral engine computations in `src/lib/hypotheses.functions.ts` & `src/lib/recommendations.functions.ts`.
  3. Challenge Engine & Completion: `/profiles/$profileId/challenges`, photo/declarative proof submission, Naya feedback loop in `src/lib/challenges.functions.ts`.
  4. "Ton Parcours" & Portfolio: `/profiles/$profileId/parcours`, `/portfolio`, Gardner 9 intelligences radar chart, timeline rendering.
  5. PDF Passport Generation & Print: `/profiles/$profileId/passport-print`, child data mapping, engines, guild, XP calculations, CSS `@media print` rendering.
  6. Génizio Admin OS: `/admin` (4 tabs: Executive overview, Talents/Guilds per city, Naya telemetry & costs, Commerce/Orders/Passport unlocks).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Diagnostic Audit | Deep audit of 6 user flows, search silent catches/unhandled promises/edge cases, baseline vitest & tsc, output `audit_report.md` | none | DONE |
| 2 | Core Flows Remediation (Flows 1-3) | Fix Auth, Profile Management & Challenge Engine defects (D-01..D-16), eliminate error swallowing, sanitize LLM JSON parsing, enforce double-submit guards & toast notifications | M1 | DONE |
| 3 | Journey, Passport & Admin OS Remediation (Flows 4-6) | Fix Parcours/Portfolio, Passport PDF Print, Admin OS defects (D-17..D-24), fix auto-print locked screen bug, row-level pending states | M1, M2 | IN_PROGRESS |
| 4 | Suite Hardening & 100% Pass Verification | 100% `npx vitest run` pass rate, 0 `npx tsc --noEmit` errors, adversarial stress testing & Forensic Integrity Audit | M2, M3 | PLANNED |

## Interface Contracts & Quality Standards
- Strict Zero Error Swallowing: `catch {}` and `.catch(() => null)` must log errors and display Sonner/UI toast where applicable.
- Async UX Safety: Double-click prevention (disabled during pending status), explicit loading spinners, empty states, and error fallbacks on all action handlers.
- Automated Checks: `npx tsc --noEmit` must pass with 0 errors. `npx vitest run` must pass with 100% green tests.
- Integrity: CLEAN verdict required from Forensic Auditor.

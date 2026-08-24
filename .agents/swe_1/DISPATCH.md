# Original User Request

## Initial Request — 2026-08-24T14:29:39Z

Audit the Genizio PWA application code for responsive anomalies across different screen sizes (especially mobile) and fix any layout overflows or display issues.

Requirements:
R1. Audit custom modals and popovers: Identify all custom UI overlays (e.g., fixed inset-0, absolute dropdowns) and ensure they are constrained by viewport boundaries (e.g., using max-w-full, max-w-[calc(100vw-2rem)], or Radix UI Popover) to prevent horizontal scrolling on mobile devices.
R2. Audit large content containers: Ensure that data-heavy components like tables, flex containers, and long text blocks are wrapped in overflow-preventing containers (e.g., overflow-x-auto, min-w-0, truncate, or break-words).

Acceptance Criteria:
- An independent reviewer agent confirms that no identified custom modal exceeds 100vw in width.
- An independent reviewer agent confirms that text containers inside flex items have properties preventing them from pushing parent boundaries (e.g., min-w-0).
- All updated components build successfully without TypeScript or Tailwind syntax errors.

Please execute the SWE Light workflow: dispatch to implementer, run reviewer rounds with verification tests/builds, maintain progress.md and BRIEFING.md, and report completion back to the Sentinel when verified.

## 2026-08-24T18:58:50Z

Victory auditor rejected round 1 with finding:
`src/routes/guides.reussite-scolaire-aider-enfant.tsx(74,11): error TS2304: Cannot find name 'articleJsonLd'`.
Please resume execution, dispatch a reviewer to fix the import in `src/routes/guides.reussite-scolaire-aider-enfant.tsx`, verify `npx tsc --noEmit`, `bun test`, and `bun run build`, and proceed to Victory Auditor verification.

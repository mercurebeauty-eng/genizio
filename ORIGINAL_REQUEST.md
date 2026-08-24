# Original User Request

## Initial Request — 2026-08-24T14:29:10Z

# Teamwork Project Prompt

> Requested team: Petite équipe ciblée

This is a single self-contained fix; keep it small and focused. Audit the Genizio PWA application code for responsive anomalies across different screen sizes (especially mobile) and fix any layout overflows or display issues.

Working directory: c:/Users/USER/Documents/GENIZIO
Integrity mode: demo

## Requirements

### R1. Audit custom modals and popovers
Identify all custom UI overlays (e.g., ixed inset-0, absolute dropdowns) and ensure they are constrained by viewport boundaries (e.g., using max-w-full, max-w-[calc(100vw-2rem)], or Radix UI Popover) to prevent horizontal scrolling on mobile devices.

### R2. Audit large content containers
Ensure that data-heavy components like tables, flex containers, and long text blocks are wrapped in overflow-preventing containers (e.g., overflow-x-auto, min-w-0, 	runcate, or reak-words).

## Acceptance Criteria

### Agent-as-Judge Evaluation (Mobile UX Rubric)
- [ ] An independent reviewer agent confirms that no identified custom modal exceeds 100vw in width.
- [ ] An independent reviewer agent confirms that text containers inside flex items have properties preventing them from pushing parent boundaries (e.g., min-w-0).
- [ ] All updated components build successfully without TypeScript or Tailwind syntax errors.

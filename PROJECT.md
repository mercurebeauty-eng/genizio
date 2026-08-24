# Project: Génizio — Refonte de Cohérence Produit

## Overview

Refonte structurelle de l'application Génizio pour transformer 12 flux incohérents en 3 corridors clairs (Famille, Organisation, Opérations) tout en préservant l'intégralité du moteur IA Naya, du système de Guildes et de la Boutique.

## Architecture & Code Layout

- Frontend: React / TanStack Router / Tailwind CSS
- Backend: Supabase / Server Functions (TanStack Start / TS)
- Routes: `src/routes/`
- Lib / Functions: `src/lib/`
- Components: `src/components/`

## Milestones

| #   | Name                                    | Scope                                                                              | Requirements | Status | Dependencies |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------- | ------------ | ------ | ------------ |
| M1  | Cleanup & Feed Removal                  | Remove `/feed`, `/p/$postId`, clean up references                                  | R1           | DONE   | None         |
| M2  | Challenge Separation & Portfolio Fusion | Separate Parent/Child on `/challenges`, merge `/parcours` into `/portfolio`        | R2, R3       | DONE   | M1           |
| M3  | Admin OS Improvements                   | B2B Token Export, Supervisor campaign_id, Unified 8-tab Admin Hub                  | R4, R5, R6   | DONE   | M1           |
| M4  | Unified Taxonomies & Final Verification | 9 short Gardner labels user-facing, Guild connections, `npx tsc --noEmit` & Vitest | R7, Final QA | DONE   | M1, M2, M3   |

## Interface Contracts & Guidelines

- Taxonomies: 9 short labels for Gardner intelligences across all UI components.
- Admin Hub: Single route `/admin` with 8 tabs.
- Payment Tunnel: WhatsApp message pre-filled.
- WhatsApp & Store remain active. Feed social removed.

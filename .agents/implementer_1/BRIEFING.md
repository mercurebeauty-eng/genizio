# Briefing: Responsive Layout & Mobile Overflow Resolution

## Overview
Comprehensive responsive layout audit and fix across the Genizio PWA application, covering Radix UI overlay primitives, data tables in pedagogical guides, flexbox text truncations, and viewport boundary constraints on custom modals and mobile navigation elements.

## Key Changes
1. **Viewport-Bound Overlays**: Added `max-w-[calc(100vw-2rem)]` to Radix overlay primitives (`DropdownMenu`, `ContextMenu`, `Menubar`, `Select`, `Tooltip`, `HoverCard`).
2. **Scroll-Protected Guide Tables**: Switched table wrappers in all 5 guide routes from `overflow-hidden` to `overflow-x-auto` to allow natural horizontal touch scrolling without viewport clipping or squishing on mobile screens.
3. **Flex Shrink / Truncation Safeguards**: Added `min-w-0` and `shrink-0` to text and input elements inside flex containers across admin tabs, mentor views, campaign links, and auth/modal flows to prevent intrinsic width blowout.
4. **Mobile Modals & Controls**: Refined modal paddings (`p-5 sm:p-8`), responsive grids (`parrainage.tsx`, `boutique.tsx`), and bottom tab bar item spacing (`AppTabBar.tsx`) for narrow mobile viewports (<360px).

## Verification
- Unit & Integration Test Suite: 60/60 test files passed, 795/795 tests passed.
- Production Build: `bun run build` completed with 0 errors across Vite client, Nitro SSR bundle, and PWA service worker.

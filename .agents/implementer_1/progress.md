# Progress - Responsive Anomalies & Mobile Overflow Audit

## Status: COMPLETE & VERIFIED

### 1. Primitives & Overlays Audited & Constrained
- `src/components/ui/dropdown-menu.tsx`: Added `max-w-[calc(100vw-2rem)]` to `DropdownMenuContent` and `DropdownMenuSubContent`.
- `src/components/ui/context-menu.tsx`: Added `max-w-[calc(100vw-2rem)]` to `ContextMenuContent` and `ContextMenuSubContent`.
- `src/components/ui/menubar.tsx`: Added `max-w-[calc(100vw-2rem)]` to `MenubarContent` and `MenubarSubContent`.
- `src/components/ui/tooltip.tsx`: Added `max-w-[calc(100vw-2rem)]` to `TooltipContent`.
- `src/components/ui/hover-card.tsx`: Added `max-w-[calc(100vw-2rem)]` to `HoverCardContent`.
- `src/components/ui/select.tsx`: Added `max-w-[calc(100vw-2rem)]` to `SelectContent`.
- `src/components/ui/dialog.tsx` & `alert-dialog.tsx`: Verified built-in `w-[calc(100%-2rem)] sm:w-full max-w-lg overflow-x-hidden`.
- `src/components/ui/popover.tsx`: Verified `max-w-[calc(100vw-2rem)]`.

### 2. Large Content & Tables Audited
- Replaced `overflow-hidden` with `overflow-x-auto rounded-2xl border border-ink/10` across 5 pedagogical guide table wrappers:
  - `src/routes/guides.autonomie-responsabilite-maison.tsx`
  - `src/routes/guides.decrochage-scolaire-confiance-enfant.tsx`
  - `src/routes/guides.ecrans-addiction-alternatives-enfant.tsx`
  - `src/routes/guides.gestion-colere-emotions-enfant.tsx`
  - `src/routes/guides.timidite-confiance-prise-de-parole.tsx`

### 3. Flex Items, Truncation, and Modal Paddings
- `src/components/admin/AdminNayaTab.tsx`: Added `min-w-0 flex-1` to truncated rule code element.
- `src/components/admin/AdminMentorsTab.tsx`: Added `min-w-0 flex-1` and `min-w-0` to email/child text truncation and search inputs.
- `src/components/campaigns/CampaignLinkCard.tsx`: Added `min-w-0` to URL code badge.
- `src/components/admin/AdminProfilesTab.tsx`: Added `min-w-0` to search input wrapper.
- `src/components/settings/ConsentLedger.tsx`: Added `min-w-0` to event content wrapper.
- `src/routes/mentor.tsx`: Added `min-w-0` to child card title and `max-w-full overflow-x-auto no-scrollbar` to sub-view tabs.
- `src/routes/organisation.index.tsx`: Added `min-w-0 flex-1` to observation card title.
- `src/routes/profiles.index.tsx`: Added `min-w-0` to phone number modal input.
- `src/routes/rejoindre.$campaignId.tsx`: Added `shrink-0` to radio input and `truncate min-w-0` to child selection label.
- `src/routes/paiement-retour.tsx`: Added `break-all` to payment references.
- `src/routes/parrainage.tsx`: Responsive grid `grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2` for 1-12 month buttons.
- `src/components/AppTabBar.tsx`: Responsive padding `px-1.5 sm:px-3` on nav items for narrow mobile viewports.
- `src/components/profiles/ProfileDialog.tsx`: Responsive padding `p-5 sm:p-8`, scroll-safe wizard step tabs with `min-w-0 truncate`, and `flex-wrap` on action buttons.
- `src/components/settings/AccessUpgradeModal.tsx`: Responsive padding `p-6 sm:p-8`.
- `src/routes/boutique.tsx`: Responsive modal padding `p-5 sm:p-8`, `grid-cols-1 sm:grid-cols-2` with `min-w-0 truncate` child labels, and `max-h-[90vh] overflow-y-auto` on challenge preview dialog.
- `src/components/PwaInstallPrompt.tsx`: Responsive left/right positioning `left-3 right-3 sm:left-6 sm:right-6` and `min-w-0 flex-1` on header.
- `src/components/guides/GuideLayout.tsx`: Added `flex-wrap gap-3` to footer social share bar.

### 4. Verification Record
- `bun run test`: All 60 test files and 795 unit/integration tests passed.
- `bun run build`: Built Vite bundle, SSR worker, and PWA service worker with 0 errors.

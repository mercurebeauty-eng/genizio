# Project: Génizio Admin OS

## Architecture
- **Navigation & Routing**: `src/routes/admin.tsx` (Layout & Security Guard), `src/routes/admin.index.tsx` (Admin OS Shell with 4 core tabs: Exécutif, Talents & Villes, IA Naya, Commerce & Passeports).
- **Backend & Functions**:
  - `src/lib/admin.functions.ts` / `src/lib/admin-os.functions.ts`: Server functions for Executive KPIs, City & Talent mapping, High-Potential alerts, Naya AI Telemetry, Commerce orders & Passport unlocks.
  - `src/lib/naya-telemetry.ts`: AI consumption logging, token counting, Haiku/Claude cost estimations in USD & XOF, challenge conversion tracking.
- **UI Components (`src/components/admin/`)**:
  - `AdminNavTabBar.tsx`: Tactile top tab bar for Admin OS navigation.
  - `AdminExecutiveTab.tsx`: Executive KPIs (Active children 7d/30d, completed challenges, retention rate %, age bracket distribution).
  - `AdminTalentsCitiesTab.tsx`: Geographic breakdown by city (Abidjan, Dakar, Yaoundé), Gardner 9 Intelligences & 6 Guilds radar/cards, High-Potential alert panel.
  - `AdminNayaTab.tsx`: Naya AI API volume, Haiku/Claude cost estimations, challenge completion/conversion rates.
  - `AdminCommerceTab.tsx`: Kit order fulfillment queue (Pending, Shipped, Delivered) & 1-Click Passport d'Excellence validation panel (50,000 FCFA for 14+ y/o).
- **Design Language**: Tactile Neo-Brutalist design system (`bg-surface`, soft shadows `shadow-sm`/`shadow-md`, HSL badges, Fredoka typography).

## Code Layout
- `src/routes/admin.tsx`: Auth guard & Admin OS layout shell.
- `src/routes/admin.index.tsx`: Tabbed Admin OS interface.
- `src/lib/admin-os.functions.ts`: Admin OS aggregated backend queries & business logic.
- `src/lib/naya-telemetry.ts`: Naya AI token & cost calculation utility functions.
- `src/components/admin/AdminExecutiveTab.tsx`: Executive Overview tab component.
- `src/components/admin/AdminTalentsCitiesTab.tsx`: Talents & Cities tab component.
- `src/components/admin/AdminNayaTab.tsx`: Naya AI Consumption & Costs tab component.
- `src/components/admin/AdminCommerceTab.tsx`: Commerce & Passports tab component.
- `src/lib/admin-os.test.ts`: Unit tests for Admin OS calculations, telemetry, and business rules.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation Framework & Vue Exécutive (R1, R5) | Tabbed navigation shell for `/admin`, `getExecutiveKPIsAdmin` server function, `AdminExecutiveTab` component with active children (7d/30d), completion rate %, age breakdown, design system tokens, and unit tests. | none | DONE |
| 2 | Cartographie des Talents & Guildes par Ville (R2, R5) | `getTalentCityStatsAdmin` server function, city breakdown table (Abidjan, Dakar, Yaoundé), Gardner 9 Intelligences & 6 Guilds radar/cards, High-Potential auto-alert panel, and unit tests. | M1 | DONE |
| 3 | Module IA Naya — Suivi de Consommation & Coûts (R3, R5) | `logAiConsumption` / `getNayaTelemetryAdmin` functions, API volume metrics, Haiku/Claude cost estimations (USD/XOF), completion/conversion rates, `AdminNayaTab` component, and unit tests. | M1 | DONE |
| 4 | Module Commerce & Passeports d'Excellence (R4, R5) | `AdminCommerceTab` component, Kit order fulfillment queue with status transitions, 1-Click Passport of Excellence validation panel for teens 14+, and unit tests. | M1 | IN_PROGRESS |
| 5 | Full E2E Verification & Forensic Integrity Audit | `npx tsc --noEmit` (0 errors), `npx vitest run` (100% pass), Challenger execution verification, and Forensic Audit (`teamwork_preview_auditor`) CLEAN verdict. | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Admin OS Navigation State (`activeTab`)
- `activeTab`: `'executive' | 'talents' | 'naya' | 'commerce'`

### `ExecutiveKPIs` Payload
```ts
{
  activeChildren7d: number;
  activeChildren30d: number;
  totalChildren: number;
  totalParents: number;
  totalChallenges: number;
  completedChallenges: number;
  retentionRatePct: number;
  ageDistribution: { ageBracket: string; count: number; percentage: number }[];
}
```

### `TalentCityStats` Payload
```ts
{
  cityStats: { city: string; childCount: number; orderCount: number }[];
  gardnerTotals: Record<string, number>;
  guildDistribution: { guildId: string; guildName: string; childCount: number }[];
  highPotentialAlerts: { childId: string; childName: string; age: number; city: string; dominantTalent: string; score: number; rationale: string }[];
}
```

### `NayaTelemetry` Payload
```ts
{
  totalApiCalls: number;
  callsByFeature: { feature: string; callCount: number }[];
  tokenUsage: { haikuInputTokens: number; haikuOutputTokens: number; sonnetInputTokens: number; sonnetOutputTokens: number };
  estimatedCostUsd: number;
  estimatedCostXof: number;
  challengeConversionRatePct: number;
}
```

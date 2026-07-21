# Project: ProfileDialog UX Refactor & Progressive Disclosure

## Architecture
- **Component**: `src/components/profiles/ProfileDialog.tsx` (child profile creation and editing modal dialog).
- **Data Source**: `src/components/profiles/shared.ts` (`INTERESTS_BY_TALENT` - 9 Gardner categories, 33 total tags; `ProfileDraft`, `ChildProfile`).
- **Data Flow**:
  - Input: `initial?: ChildProfile | null`
  - Internal State: `draft: ProfileDraft`, `selectedUniverses: string[]` (Step 1 state inferrable/hydratable from `initial.interests` or default `[]`).
  - Step 1 (Universes Selection): Parent selects 2 to 3 main talent categories/universes (`spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`).
  - Step 2 (Sub-tags Selection): UI renders ONLY sub-tags belonging to the 2–3 selected universes from `INTERESTS_BY_TALENT`.
  - Output: `save()` constructs payload sending `interests: draft.interests` as a flat `string[]` to Supabase `child_profiles` (`insert` or `update`), maintaining exact schema compatibility and data integrity.

## Code Layout
- `src/components/profiles/ProfileDialog.tsx`: Dialog component refactored with progressive disclosure (Step 1: Universes, Step 2: Sub-tags).
- `src/components/profiles/ProfileDialog.test.ts`: Unit tests verifying progressive disclosure UI, universe capping, hydration, and tag purging.
- `src/components/profiles/ProfileDialog.schema.test.ts`: Data schema verification tests validating flat string array output.
- `src/components/profiles/shared.ts`: Immutable data types & constants (`INTERESTS_BY_TALENT`). 100% UNTOUCHED.
- `src/lib/talent-buckets.ts`: Gardner talent definitions & labels (`TALENT_KEY_LABELS`).
- `src/styles.css`: Design tokens (`--brand`, `--surface`, `--ink`, `.press-brand`, etc.).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | ProfileDialog Progressive Disclosure UI Refactor | Refactor `ProfileDialog.tsx` to introduce 2-step progressive disclosure (Step 1: 2-3 Universes, Step 2: Filtered Sub-tags for selected universes). Maintain state hydration for existing profiles and flat `draft.interests` output on save. Respect design system. | none | DONE |
| 2 | Code Verification, Unit/Type Testing & Audit | Verify refactored code with `npx tsc --noEmit`, `npm run test`, and `npm run build`. Run Challenger & Forensic Auditor checks to guarantee zero integrity violations, zero schema changes, and zero breaking changes. | M1 | DONE |

## Interface Contracts
### `ProfileDialog.tsx` ↔ Supabase / Backend
- **`draft.interests`**: Flat array of strings (`string[]`), e.g., `["Dessin & Peinture", "Sciences & Expériences"]`.
- **`save()` payload**:
  ```ts
  {
    user_id: userId,
    name: draft.name.trim().slice(0, 40),
    age: draft.age,
    interests: draft.interests, // string[]
    city: draft.city?.trim() || null,
    country: draft.country?.trim() || null,
    avatar_color: draft.avatar_color,
  }
  ```
- **`shared.ts`**: Remains 100% unchanged. Read-only consumption of `INTERESTS_BY_TALENT`.

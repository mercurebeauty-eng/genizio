# Review Handoff Report — ProfileDialog & Progressive Disclosure

## 1. Observation

### Code & Files Inspected
- `src/components/profiles/ProfileDialog.tsx`
  - **Lines 5-14**: `getInitialUniverses(interests: string[])` maps existing interests array to universe keys defined in `INTERESTS_BY_TALENT`.
  - **Lines 16-19**: `purgeUniverseInterests(interests: string[], universeKey: string)` removes all sub-tags of `universeKey` from `interests`.
  - **Lines 47-49**: `selectedUniverses` initialized dynamically with `getInitialUniverses(initial.interests)`.
  - **Lines 53-65**: `toggleUniverse(universeKey)` caps maximum selected universes at 3 (`if (selectedUniverses.length < 3)`) and purges sub-tags when a universe is deselected.
  - **Lines 67-71**: `toggleInterest(i)` maintains a flat `string[]` for `draft.interests`.
  - **Lines 73-113**: `save()` builds `payload` with `interests: draft.interests` (flat `string[]`) and persists via Supabase `child_profiles`.
  - **Lines 207-237 (Step 1)**: Renders 9 universe choices with header `1. Univers (${selectedUniverses.length}/3)`.
  - **Lines 239-287 (Step 2)**: Renders filtered sub-tags ONLY for `selectedUniverses`. Displays empty state placeholder when `selectedUniverses.length === 0`.
  - **Styling Tokens**: Uses design system tokens (`bg-brand`, `bg-surface`, `bg-surface/50`, `border-ink`, `border-ink/10`, `border-ink/20`, `text-ink/60`, `text-brand`, `press-brand`, `press-white`). Zero external UI library imports.
- `src/components/profiles/ProfileDialog.test.ts`
  - **Lines 1-59**: 7 unit test cases covering `getInitialUniverses` (empty, single universe, multiple universes, legacy/unknown tags) and `purgeUniverseInterests` (purging tags, non-matching universe, invalid universe key).
- `src/components/profiles/shared.ts`
  - **Git Status Check**: File is untouched (`shared.ts` not modified in `git status`).
  - Contains `INTERESTS_BY_TALENT` with 9 talent categories totaling 33 sub-tags.

### Verification Command Results
- `cmd /c "npx tsc --noEmit"`: Passed with 0 errors.
- `npm run test`: Passed all 37 tests across 4 test files, including `src/components/profiles/ProfileDialog.test.ts` (7/7 passed).

---

## 2. Logic Chain

1. **R1 Progressive Disclosure Compliance**:
   - Step 1 displays high-level universe categories (`INTERESTS_BY_TALENT`).
   - Step 2 displays sub-tags only for universes in `selectedUniverses`.
   - When no universe is selected (0/3), 0 sub-tags are rendered.
   - When 3 universes are selected (max cap), only sub-tags for those 3 categories are rendered (maximum 13 tags visible out of 33 total).
   - Therefore, rendering all 33 tags simultaneously is structurally impossible.
2. **R2 Design System Compliance**:
   - Standard HTML elements styled with project Tailwind color tokens (`bg-brand`, `bg-surface`, `border-ink`, etc.).
   - No external UI dependencies (e.g. Radix, Shadcn, MUI) imported.
3. **R3 Data Contract Compliance**:
   - `shared.ts` is untouched (verified by `git status`).
   - `save()` emits `draft.interests` as a flat `string[]`.
4. **Edge Cases**:
   - **Hydration**: Profiles with existing interests automatically select corresponding universe categories.
   - **Unselecting Universe**: Automatically purges sub-tags of that universe from `draft.interests` via `purgeUniverseInterests`.
   - **3 Universes Limit**: Enforced in state handler `toggleUniverse` and displayed in Step 1 counter.
   - **Legacy / Unknown Tags**: Preserved in `draft.interests` without breaking universe lookup.

---

## 3. Caveats

- Supabase API calls (`update`, `insert`, `consent_events`) are structured correctly with exact field names and types; live backend integration requires network credentials outside of local unit tests.

---

## 4. Conclusion

**Verdict**: **APPROVE**

The implementation in `src/components/profiles/ProfileDialog.tsx` and `src/components/profiles/ProfileDialog.test.ts` fully satisfies requirements R1, R2, and R3. No integrity violations or anti-patterns were detected.

---

## 5. Verification Method

To independently verify:
1. `npx tsc --noEmit` (Must complete with exit code 0).
2. `npm run test` (Must pass all 37 unit tests, including `ProfileDialog.test.ts`).
3. Inspect `git status` to verify `src/components/profiles/shared.ts` is untouched.

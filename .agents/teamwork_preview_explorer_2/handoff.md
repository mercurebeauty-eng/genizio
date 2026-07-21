# Handoff Report — ProfileDialog Progressive Disclosure UI Exploration

## 1. Observation

### File & Code Findings

- **`src/components/profiles/shared.ts`**:
  - `INTERESTS_BY_TALENT` (lines 28–65) maps 9 Gardner intelligence keys to `{ label: string; tags: readonly string[] }`.
  - The 9 talent categories and their tag counts are:
    1. `spatial`: 4 tags ("Construction & Lego", "Puzzles & Cartes", "Orientation & Exploration", "Robotique & Programmation")
    2. `corporelle`: 3 tags ("Sport & Mouvement", "Danse", "Théâtre & Mime")
    3. `sociale`: 4 tags ("Aime jouer en groupe", "Leadership naturel", "Aide les autres", "Sens de la négociation")
    4. `entrepreneuriale`: 4 tags ("A des idées de projets", "Aime vendre / échanger", "Aime organiser des choses", "Curieux du commerce")
    5. `creative`: 3 tags ("Dessin & Peinture", "Musique", "Invente des histoires")
    6. `artisanale`: 3 tags ("Cuisine", "Couture & Tissage", "Répare des objets")
    7. `emotionnelle`: 3 tags ("Empathique", "Comprend ses émotions", "Calme sous pression")
    8. `logico_mathematique`: 5 tags ("Aime les chiffres", "Résout des énigmes", "Sciences & Expériences", "Jeux de stratégie", "Nature & Animaux")
    9. `linguistique`: 4 tags ("Aime parler & raconter", "Prise de parole en public", "Aime lire", "Écriture & Poésie")
  - **Total tag count**: 33 tags across 9 categories.
  - Also exports `AVATAR_COLORS` (4 colors: `brand`, `leaf`, `sky`, `ink`), `ChildProfile` type, `ProfileDraft` type, and `emptyProfileDraft()` default factory function.

- **Design System Tokens & CSS Variables (`src/styles.css`)**:
  - Brand Palette Variables (`:root`):
    - `--brand`: `oklch(0.55 0.16 40)` (primary coral/orange)
    - `--brand-dark`: `oklch(0.45 0.14 40)` (dark shadow depth for keycaps)
    - `--brand-glow`: `oklch(0.78 0.13 55)`
    - `--surface`: `oklch(0.98 0.01 80)` (warm background)
    - `--ink`: `oklch(0.18 0.03 250)` (dark text/borders)
    - `--leaf`: `oklch(0.54 0.14 150)` (green accent)
    - `--sky`: `oklch(0.85 0.06 240)` (blue accent)
  - Typography: `--font-display` ("Fredoka", sans-serif) for headings, `--font-body` ("Inter", sans-serif) for body text.
  - Tactile Keycap Buttons: `.press-brand`, `.press-leaf`, `.press-sky`, `.press-white`, `.press-destructive` providing 3D tactile press effects (`translateY(3px)` on active state).
  - Animation utilities: `animate-gz-pop` (`gz-pop-in`), `animate-gz-bounce-in`, `animate-gz-float`, `animate-gz-wiggle`.

- **Current `ProfileDialog.tsx` Structure**:
  - Centered backdrop overlay (`fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4`) containing a scrollable card (`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8`).
  - Displays all 5 form sections (Prénom, Âge slider, Ville/Pays grid, Avatar color picker, and ALL 9 talent categories with 33 tags) in a single long scroll view.

---

## 2. Logic Chain

1. **Current UI Bottleneck**:
   - Renders 33 tags in 9 categories simultaneously in a single modal view.
   - Causes high cognitive load for parents during onboarding/profile editing and requires excessive vertical scrolling on mobile viewports.

2. **Progressive Disclosure Strategy**:
   - The form breaks naturally into 2 or 3 distinct steps or collapsible views:
     - **Step 1: Identity & Avatar** (Prénom, Âge, Ville, Pays, Avatar Color).
     - **Step 2: Talent Universes & Interests** (Categorized interest tags from `INTERESTS_BY_TALENT`).
     - **Optional Step 3: Review / Confirmation & Summary**.
   - Category filtering/tabs or accordion expansion can allow parents to explore 1–2 talent universes at a time rather than seeing all 33 chips at once.

3. **Design System Integration**:
   - The refactored UI should leverage existing keycap press styles (`press-brand`, `press-white`), OKLCH variables (`bg-brand`, `bg-surface`, `text-ink`), and Radix/Tailwind dialog/sheet transitions (`animate-gz-pop`, `transition-all duration-200`).

4. **Preservation of `shared.ts`**:
   - `shared.ts` is the single source of truth connecting child profiles to Gardner talent buckets (`TALENT_KEY_LABELS` in `talent-buckets.ts`), AI prompt generation, and decision record #24.
   - The UI refactor MUST consume `INTERESTS_BY_TALENT` as-is, without altering types, key names, or tag values.

---

## 3. Caveats

- **Existing Saved Data**: Profiles in Supabase store `interests` as a flat array of strings (`string[]`). The UI progressive disclosure must read and write to `draft.interests` as `string[]` without changing the DB schema.
- **Mobile Viewport Height**: Modals on mobile screens with virtual keyboards open can overflow `90vh`. Stepped or drawer-based progressive disclosure significantly improves mobile ergonomics.
- **Unexplored Component Variants**: Native `@radix-ui/react-dialog` (`src/components/ui/dialog.tsx`) or `vaul` (`src/components/ui/drawer.tsx`) can be evaluated by implementers depending on whether a modal or bottom sheet is preferred.

---

## 4. Conclusion

- `shared.ts` contains 9 Gardner talent categories (`spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`) totaling **33 tags**.
- `shared.ts` MUST remain untouched as the immutable data source.
- Design tokens (`--brand`, `--surface`, `--ink`, `.press-brand`, `Fredoka` font) are fully established in `src/styles.css` and readily available for step indicators, progress bars, tab buttons, and smooth transitions in `ProfileDialog.tsx`.

---

## 5. Verification Method

- Inspect `src/components/profiles/shared.ts` to confirm `INTERESTS_BY_TALENT` has 9 keys and 33 total tags.
- Inspect `src/styles.css` lines 75–170 to verify CSS variables (`--brand`, `--surface`, `--ink`, `.press-brand`).
- Inspect `src/components/profiles/ProfileDialog.tsx` to confirm present state and target areas for progressive disclosure.

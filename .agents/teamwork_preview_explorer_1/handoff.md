# Handoff Report: Investigation & Refactoring Strategy for `ProfileDialog.tsx`

## 1. Observation

### File & Code Locations Investigated
- **`src/components/profiles/ProfileDialog.tsx`**: Primary component for creating and editing child profiles (`ChildProfile`).
- **`src/components/profiles/shared.ts`**: Contains data structures `INTERESTS_BY_TALENT`, `AVATAR_COLORS`, type definitions `ChildProfile`, `ProfileDraft`, and helper `emptyProfileDraft()`.
- **`src/components/profiles/ProfileCard.tsx`**: Renders profile summary cards displaying up to 6 selected interest tags (`profile.interests.slice(0, 6)`).
- **`src/routes/profiles.index.tsx` & `src/routes/profiles.manage.tsx`**: Route handlers that instantiate `ProfileDialog` for profile creation and modification.
- **`src/lib/talent-buckets.ts`**: Defines `TALENT_KEY_LABELS` (the 9 Gardner intelligence keys: `spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`).

### Current Data Structure (`shared.ts`)
- `INTERESTS_BY_TALENT` is a `Record<string, { label: string; tags: readonly string[] }>` covering 9 Gardner talent domains:
  ```ts
  export const INTERESTS_BY_TALENT: Record<string, { label: string; tags: readonly string[] }> = {
    spatial: { label: TALENT_KEY_LABELS.spatial, tags: ["Construction & Lego", "Puzzles & Cartes", "Orientation & Exploration", "Robotique & Programmation"] },
    corporelle: { label: TALENT_KEY_LABELS.corporelle, tags: ["Sport & Mouvement", "Danse", "Théâtre & Mime"] },
    sociale: { label: TALENT_KEY_LABELS.sociale, tags: ["Aime jouer en groupe", "Leadership naturel", "Aide les autres", "Sens de la négociation"] },
    entrepreneuriale: { label: TALENT_KEY_LABELS.entrepreneuriale, tags: ["A des idées de projets", "Aime vendre / échanger", "Aime organiser des choses", "Curieux du commerce"] },
    creative: { label: TALENT_KEY_LABELS.creative, tags: ["Dessin & Peinture", "Musique", "Invente des histoires"] },
    artisanale: { label: TALENT_KEY_LABELS.artisanale, tags: ["Cuisine", "Couture & Tissage", "Répare des objets"] },
    emotionnelle: { label: TALENT_KEY_LABELS.emotionnelle, tags: ["Empathique", "Comprend ses émotions", "Calme sous pression"] },
    logico_mathematique: { label: TALENT_KEY_LABELS.logico_mathematique, tags: ["Aime les chiffres", "Résout des énigmes", "Sciences & Expériences", "Jeux de stratégie", "Nature & Animaux"] },
    linguistique: { label: TALENT_KEY_LABELS.linguistique, tags: ["Aime parler & raconter", "Prise de parole en public", "Aime lire", "Écriture & Poésie"] },
  };
  ```
- Total count: 33 tags distributed across 9 talent categories.

### Current State Management & UI Rendering (`ProfileDialog.tsx`)
- Component state:
  ```ts
  const [draft, setDraft] = useState<ProfileDraft>(initial ? { ... } : emptyProfileDraft());
  ```
- Tag toggle logic (lines 34–38):
  ```ts
  const toggle = (i: string) =>
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(i) ? d.interests.filter((x) => x !== i) : [...d.interests, i],
    }));
  ```
- Tag rendering UI (lines 181–207):
  - Renders all 9 groups simultaneously using `Object.entries(INTERESTS_BY_TALENT).map(...)`.
  - For each group, displays the category label in `text-brand` uppercase text, followed by all of its tags as interactive pill buttons.
  - All 33 tags across all 9 talent domains are displayed at once without filtering or staging.

### Backend Saving Flow (`save()` in `ProfileDialog.tsx`)
- Save payload (lines 47–55):
  ```ts
  const payload = {
    user_id: userId,
    name: draft.name.trim().slice(0, 40),
    age: draft.age,
    interests: draft.interests, // Flat string array: e.g. ["Cuisine", "Dessin & Peinture"]
    city: draft.city?.trim() || null,
    country: draft.country?.trim() || null,
    avatar_color: draft.avatar_color,
  };
  ```
- Database operation (lines 56–78):
  - Performs `supabase.from("child_profiles").update(payload).eq("id", initial.id)` for edits.
  - Performs `supabase.from("child_profiles").insert(payload)` for creation, followed by a audit record insertion into `consent_events`.
- Key Database Fact: `child_profiles.interests` is stored in Supabase as a flat array of strings (`text[]`). It does NOT store category/universe keys, only the flat tag names.

---

## 2. Logic Chain

1. **Problem Context**:
   Currently, `ProfileDialog.tsx` displays all 9 talent domains and all 33 interest tags simultaneously in a single list. For parents onboarding or editing a profile, this creates cognitive fatigue due to information density.

2. **Goal of Progressive Disclosure**:
   Structure interest selection into two progressive stages:
   - **Step 1 (Universes Selection)**: Parent picks 2 to 3 main "Universes" (talent categories, e.g. *Créative*, *Spatiale*, *Logique*).
   - **Step 2 (Sub-tags Selection)**: Parent is shown ONLY the specific sub-tags belonging to the 2–3 selected universes, allowing targeted selection without clutter.

3. **Zero Impact on Backend & Data Persistence**:
   - `child_profiles.interests` in Supabase is a flat string array (`string[]`).
   - The refactored UI will manage an internal step state and universe selection state in React, but will output the exact same flat `draft.interests: string[]` array upon `save()`.
   - Therefore, no database migration, no backend API change, and no modifications to `shared.ts` are required.

4. **Reconstructing Active Universes when Editing Existing Profiles**:
   - When opening an existing profile (`initial !== null`), `initial.interests` contains previously selected tag strings.
   - We dynamically infer which universes are active by mapping each saved tag string back to its parent key in `INTERESTS_BY_TALENT`:
     ```ts
     function inferUniversesFromInterests(interests: string[]): string[] {
       const active = new Set<string>();
       for (const [key, group] of Object.entries(INTERESTS_BY_TALENT)) {
         if (group.tags.some((tag) => interests.includes(tag))) {
           active.add(key);
         }
       }
       return Array.from(active);
     }
     ```
   - If an existing profile has tags across more than 3 universes (from legacy input), all of those universes will initially be active in Step 1 to avoid hiding pre-existing tags.

5. **Deselection Behavior**:
   - When a parent unchecks a universe in Step 1, any sub-tags belonging to that universe are automatically removed from `draft.interests` to maintain consistency between selected universes and active sub-tags.

---

## 3. Caveats

1. **Strict Non-Modification Constraint**:
   - `src/components/profiles/shared.ts` MUST NOT be modified. All constants (`INTERESTS_BY_TALENT`, `AVATAR_COLORS`) and type definitions must remain untouched.
2. **Legacy / Free Text Tags**:
   - If a child profile in the database contains legacy free-text tags not present in `INTERESTS_BY_TALENT`, these tags must be preserved in `draft.interests` during saves so user data is not lost.
3. **Soft vs. Hard Limits on Universes**:
   - UX recommendation is 2 to 3 universes. If a parent attempts to select a 4th universe, show a helpful inline message ("2 à 3 univers recommandés") or disable selecting a 4th until one is unchecked.
4. **Mobile Accessibility**:
   - On smaller viewports, the modal scroll container should comfortably host Step 1 universe cards and Step 2 tag pills with clean visual separation.

---

## 4. Conclusion & Proposed Refactoring Strategy

### Architectural Overview

We propose refactoring the interest selection section of `ProfileDialog.tsx` into a 2-step progressive disclosure component (or inline staged UI).

```
[ Step 1: Sélection des Univers (2-3 univers) ]
  ├── [Spatiale]  [Corporelle]  [✓ Créative]  [✓ Logique]  [Artisanale] ...
  └── Info banner: "Choisissez 2 à 3 univers principaux pour votre enfant"

                      ▼ (Dynamique / Progressive reveal)

[ Step 2: Centres d'intérêt des Univers sélectionnés ]
  ├── 🎨 CRÉATIVE
  │   ├── [✓ Dessin & Peinture]  [Musique]  [✓ Invente des histoires]
  └── 🧩 LOGIQUE
      ├── [✓ Sciences & Expériences]  [Jeux de stratégie]  [Nature & Animaux]
```

### Proposed Code Changes in `ProfileDialog.tsx`

#### 1. Add State for Selected Universes
```tsx
// Infer initial universes from initial.interests or default to []
const [selectedUniverses, setSelectedUniverses] = useState<string[]>(() => {
  if (!initial?.interests || initial.interests.length === 0) return [];
  const activeKeys = new Set<string>();
  for (const [key, group] of Object.entries(INTERESTS_BY_TALENT)) {
    if (group.tags.some((tag) => initial.interests.includes(tag))) {
      activeKeys.add(key);
    }
  }
  return Array.from(activeKeys);
});
```

#### 2. Universe Toggle Handler
```tsx
const toggleUniverse = (key: string) => {
  if (selectedUniverses.includes(key)) {
    // Remove universe & purge its tags from draft.interests
    const universeTags = INTERESTS_BY_TALENT[key]?.tags ?? [];
    setSelectedUniverses(selectedUniverses.filter((k) => k !== key));
    setDraft((d) => ({
      ...d,
      interests: d.interests.filter((tag) => !universeTags.includes(tag)),
    }));
  } else {
    // Enforce max 3 universes selection limit (with user feedback)
    if (selectedUniverses.length >= 3) return;
    setSelectedUniverses([...selectedUniverses, key]);
  }
};
```

#### 3. Render Step 1 (Universes Selection)
```tsx
<div>
  <div className="mb-2 flex items-center justify-between">
    <label className="text-xs font-semibold uppercase tracking-wider text-ink/60">
      1. Univers de prédilection ({selectedUniverses.length}/3)
    </label>
    <span className="text-[11px] text-brand font-medium">2 à 3 univers recommandés</span>
  </div>
  <div className="flex flex-wrap gap-2 mb-4">
    {Object.entries(INTERESTS_BY_TALENT).map(([key, group]) => {
      const isSelected = selectedUniverses.includes(key);
      const disabled = !isSelected && selectedUniverses.length >= 3;
      return (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => toggleUniverse(key)}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold border-2 transition-all ${
            isSelected
              ? "bg-brand border-ink text-white shadow-sm"
              : disabled
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
              : "bg-surface border-ink/15 text-ink/80 hover:border-ink"
          }`}
        >
          {isSelected ? "✓ " : "+ "}
          {group.label}
        </button>
      );
    })}
  </div>
</div>
```

#### 4. Render Step 2 (Filtered Sub-tags)
```tsx
<div>
  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/60">
    2. Centres d'intérêt spécifiques
  </label>
  {selectedUniverses.length === 0 ? (
    <div className="rounded-xl border border-dashed border-ink/20 p-4 text-center text-xs text-ink/60">
      Sélectionnez au moins 1 univers ci-dessus pour afficher les centres d'intérêt correspondants.
    </div>
  ) : (
    <div className="space-y-4">
      {selectedUniverses.map((universeKey) => {
        const group = INTERESTS_BY_TALENT[universeKey];
        if (!group) return null;
        return (
          <div key={universeKey} className="rounded-2xl border border-ink/10 bg-surface/50 p-3.5">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-brand">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag) => {
                const on = draft.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border-2 transition-all ${
                      on
                        ? "bg-brand border-ink text-white"
                        : "bg-white border-ink/20 text-ink/70 hover:border-ink"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

---

## 5. Verification Method

### Testing Instructions
1. **Build Verification**:
   Execute `npm run build` to verify there are no TypeScript compilation or JSX syntax errors.
2. **Interactive UI Verification**:
   - Launch `npm run dev` and open the web app.
   - Navigate to `/profiles` or `/profiles/manage` and click **+ Nouveau profil**.
   - Verify that Step 1 displays the 9 universe choices and enforces the selection limit of 2–3 universes.
   - Verify that Step 2 displays ONLY the tag chips corresponding to the universes selected in Step 1.
   - Select tags, complete mandatory fields, and click **Enregistrer**.
3. **Data Payload & Storage Verification**:
   - Inspect the network payload sent to Supabase `child_profiles` table upon save.
   - Confirm `payload.interests` is passed as a flat array of selected tag strings (e.g. `["Dessin & Peinture", "Sciences & Expériences"]`).
   - Re-open the profile for editing: verify that `selectedUniverses` and `draft.interests` are accurately hydrated from existing data.

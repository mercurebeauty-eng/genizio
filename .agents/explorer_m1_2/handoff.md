# Handoff Report — Explorer 2 (Milestone 1)

## 1. Observation

Direct observations from examining the GENIZIO codebase:

### Child Profile Interfaces & Database Schemas
- **TypeScript Interface (`src/components/profiles/shared.ts:74-90`)**:
  ```ts
  export type ChildProfile = {
    id: string;
    user_id: string;
    name: string;
    age: number;
    interests: string[];
    city: string | null;
    country: string | null;
    avatar_color: string;
    favorite_challenges: string[];
    completed_challenges: string[];
    talents: Record<string, number>;
    pdf_unlocked: boolean;
    xp: number;
    streak: number;
    last_activity_date: string | null;
  };
  ```
- **Database Table (`supabase/full_migration_for_new_db.sql:5`)**:
  ```sql
  CREATE TABLE public.child_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    age int NOT NULL CHECK (age BETWEEN 3 AND 20),
    interests text[] NOT NULL DEFAULT '{}',
    ...
  );
  ```
- **Database Types (`src/integrations/supabase/types.ts:241-262`)**:
  `child_profiles.Row.interests: string[]`, `Insert.interests?: string[]`, `Update.interests?: string[]`.

### Flow of `interests` into AI Prompt & Challenge Generation Functions
`interests` is retrieved from `child_profiles` and injected as context into the following AI functions:

1. **Batch Challenge Generator (`src/lib/challenges.functions.ts:831`)**:
   `Centres d'intérêt déclarés par le parent : ${(child.interests ?? []).join(", ") || "variés"}`
   - Prompt instruction (`line 847`): "Ignore le biais parental et utilise les données réelles... au moins un des N défis DOIT cibler l'une de ces intelligences plutôt que de renforcer uniquement les intérêts déjà connus"
2. **On-Demand Custom Challenge Generator (`src/lib/challenges.functions.ts:1439, 1462`)**:
   `Centres d'intérêt initiaux (déclarés par le parent) : ${(child.interests ?? []).join(", ") || "aucun"}`
   - Prompt instruction (`line 1462-1463`): "1. Analyse la carte des talents, les intérêts déclarés... 2. Détecte les biais: Si le parent a déclaré certains intérêts..."
3. **Weekly Pedagogical Synthesis (`src/lib/challenges.functions.ts:1572`)**:
   `Analyse les accomplissements suivants de l'enfant ${child.name} (${child.age} ans, centres d'intérêt: ${(child.interests ?? []).join(", ")})`
4. **Discriminant Challenge Generator (`src/lib/hypotheses.functions.ts:363, 370, 375`)**:
   `const interestsStr = (child.interests || []).join(", ") || "expérimentation, création";`
   `Centres d'intérêt de l'enfant : ${interestsStr}`
   - Prompt instruction (`line 375`): "Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur un des centres d'intérêt de l'enfant (${interestsStr}) pour raviver la curiosité."
5. **Recommended Challenge Generator (`src/lib/recommendations.functions.ts:96-98, 188-191`)**:
   - `ESSAIMAGE` (`line 98`): "Principe : Utiliser sa FORCE (${strengthEntry[0]}) et ses centres d'intérêt (${interestsStr}) pour développer doucement sa compétence..."
   - `STABILISATION` (`line 191`): "Principe : ...appuyé sur sa force reconnee... et ses centres d'intérêt (${interestsStr})."

### System Prompts, Auxiliary Prompt Files & Infrastructure
- **Architecture**: No Supabase Edge Functions exist (`supabase/functions` directory does not exist). All server-side AI calls are managed via TanStack Start Server Functions (`createServerFn`) executing `callClaude` in `src/lib/challenges.functions.ts`.
- **Central LLM Caller (`src/lib/challenges.functions.ts:591-725`)**:
  - `callClaude` posts directly to `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY`.
- **Shared System Prompt Constants (`src/lib/challenges.functions.ts:518-580`)**:
  - `GENIZIO_PRINCIPLES` (`lines 518-530`): Principles including "CENTRES D'INTÉRÊT COMME TREMPLIN, PAS COMME CONTRAT" and "VARIE LA MÉCANIQUE D'UN DÉFI À L'AUTRE".
  - `SAFETY_INSTRUCTION` (`lines 537`): Supervision assessment rules.
  - `PROOF_MODE_INSTRUCTION` (`lines 544-548`): Rules for `photo` vs `declarative` proof modes.
  - `ACADEMIC_REFERENTIAL_INSTRUCTION` (`lines 559-580`): Internal academic referential by domain and age.

### Impact Analysis & Boundaries
- **UI Components (`src/components/profiles/ProfileDialog.tsx`, `shared.ts`, `ProfileCard.tsx`)**:
  - `ProfileDialog.tsx` allows parents to select interests mapped to 9 Gardner talents via `INTERESTS_BY_TALENT` (max 3 talent universes selected).
  - The UI passes `interests` as `string[]` to `supabase.from("child_profiles").insert()/update()`.
  - **No UI components require modification.**
- **Database Schema (`child_profiles`, `challenges`)**:
  - Schema already has `interests text[] NOT NULL DEFAULT '{}'` on `child_profiles`.
  - Schema already has all payload columns (`domain`, `title`, `description`, `steps`, `materials`, `material_tags`, `pedagogical_context`, `proof_mode`, `proof_target`, `declarative_award`, `academic_domain`, `academic_level_age`, `academic_reference_note`, `difficulty`, `requires_supervision`, `supervision_warning`).
  - **No database schema modifications or migrations are needed.**

---

## 2. Logic Chain

1. **Inspection of `ChildProfile` TypeScript types & Supabase Schema**:
   - `src/components/profiles/shared.ts:79` explicitly defines `interests: string[]`.
   - `supabase/full_migration_for_new_db.sql:5` explicitly defines `interests text[] NOT NULL DEFAULT '{}'`.
   - `src/integrations/supabase/types.ts:253` maps `interests: string[]`.
   - Therefore, `interests` is fully supported end-to-end in the data layer.

2. **Tracing `interests` Flow into Challenge Generation**:
   - In `generateChallenges` (`src/lib/challenges.functions.ts`), `child.interests` is fetched directly from `child_profiles` and passed into the LLM system prompt string.
   - In `generateCustomChallenge`, `getChildAISynthesis`, `generateDiscriminantChallenge`, and `recommendChallengesForChild`, `child.interests` is similarly formatted as a comma-separated string `(child.interests || []).join(", ")` and injected into the prompt.
   - Therefore, `interests` flows continuously into all 6 Naya AI prompt generation paths.

3. **Auditing Naya System Instructions & Prompt Templates**:
   - System instructions and prompt templates are centralized in `src/lib/challenges.functions.ts`, `src/lib/hypotheses.functions.ts`, and `src/lib/recommendations.functions.ts`.
   - Core guidelines are embedded in constants (`GENIZIO_PRINCIPLES`, `SAFETY_INSTRUCTION`, `PROOF_MODE_INSTRUCTION`, `ACADEMIC_REFERENTIAL_INSTRUCTION`).

4. **Evaluating Change Scope & Boundaries**:
   - Because the database schema and UI components already fully handle `interests` and challenge data structures, updating Naya's prompt generation behavior for Milestone 1 requires **only modifying prompt strings and context injection parameters within server functions**.
   - No DB migrations, UI component changes, or schema alterations are necessary.

---

## 3. Caveats

- **Legacy Interests Format**: Older profiles in the database might store free-text interest strings or older tag variants from prior iterations. The prompt handlers use `.join(", ") || "variés"`, which safely handles any string elements without throwing runtime errors.
- **Client-Side Profile Validation**: `ProfileDialog.tsx` limits selection to 3 talent universes (up to ~12 interest tags total), but server functions handle empty arrays or large arrays gracefully via array fallback formatting (`(child.interests ?? []).join(", ")`).

---

## 4. Conclusion

- **Presence of `interests`**: `interests` is fully present in `ChildProfile` types and the PostgreSQL database schema.
- **Data Flow**: `interests` flows smoothly into all challenge generation functions (`generateChallenges`, `generateCustomChallenge`, `generateDiscriminantChallenge`, `recommendChallengesForChild`) and pedagogical synthesis (`getChildAISynthesis`).
- **Prompt Architecture**: Prompt templates and shared instructions are centralized in `src/lib/challenges.functions.ts`, `src/lib/hypotheses.functions.ts`, and `src/lib/recommendations.functions.ts`.
- **Strict Change Boundaries**: Milestone 1 updates must be **100% restricted to prompt strings, system instruction constants, and context injection logic** in the aforementioned server function files. UI components and DB schemas require ZERO changes.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Child Profile Type & DB Schema**:
   - Inspect `src/components/profiles/shared.ts` lines 74-90 to confirm `interests: string[]`.
   - Inspect `supabase/full_migration_for_new_db.sql` line 5 to confirm `interests text[] NOT NULL DEFAULT '{}'`.
   - Inspect `src/integrations/supabase/types.ts` line 253 to confirm `interests: string[]`.

2. **Verify `interests` Prompt Injections**:
   - Search for `child.interests` in `src/lib/challenges.functions.ts` (lines 831, 1439, 1572).
   - Search for `child.interests` in `src/lib/hypotheses.functions.ts` (line 363).
   - Search for `child.interests` in `src/lib/recommendations.functions.ts` (lines 96, 188).

3. **Run Existing Profile & Schema Tests**:
   - Run tests: `npx vitest run src/components/profiles/ProfileDialog.schema.test.ts`

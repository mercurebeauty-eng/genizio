# Explorer 2 Handoff Report: Milestone 1 — Data Models, Academic Curriculum (CP to 3ème) and ZPA Telemetry

**Milestone**: Milestone 1 — Fusion Académique-Ludique (`feat/naya-academic-homework-fusion`)  
**Agent**: Explorer 2 (`explorer_m1_2`)  
**Date**: 2026-07-23  
**Working Directory**: `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\`  
**Status**: Hard Handoff (Investigation & Architecture Design Completed)

---

## 1. Observation

### 1.1 Existing Data Models & Schemas

- **Child Profile Interface**: In `src/components/profiles/shared.ts`, lines 74–90:
  ```typescript
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
- **Database Tables**:
  - `public.child_profiles` (`supabase/full_migration_for_new_db.sql`): stores `age` (integer), `interests` (`text[]`), `talents` (`jsonb`), `xp`, `streak`. Currently lacks a typed `school_grade` column (`'CP'` to `'3ème'`).
  - `public.challenges` (`supabase/migrations/20260720210616_add_academic_level_to_challenges.sql` & `20260720220322_extend_academic_domains_and_reference_note.sql`):
    - `academic_domain`: `text` (check constraint: `'mathematiques'`, `'langage'`, `'sciences'`, `'corporelle'`, `'sociale'`, `'emotionnelle'`, `'entrepreneuriale'`, `'artisanale'`, `'spatiale'`).
    - `academic_level_age`: `integer` (check constraint: `BETWEEN 3 AND 18`).
    - `academic_reference_note`: `text` (citation string from referential).

### 1.2 Telemetry & Hypothesis Progression Tracking

- **Telemetry Module**: In `src/lib/naya-telemetry.ts`:
  - `NAYA_PRICING`: DeepSeek Chat ($0.14 input / $0.28 output per M), DeepSeek Reasoner ($0.435 input / $0.87 output per M), Sonnet Vision ($3.00 input / $15.00 output per M).
  - `calculateNayaTelemetry(raw)`: Computes token usage, total costs in USD/XOF, conversion funnel, feature breakdown, model breakdown, and monthly projections.
- **Hypothesis Engine & Bayesian Updates**: In `src/lib/hypotheses.functions.ts`:
  - `ensureHypothesesForChild`: Triggers on `GAP_WINDOW = 4` consecutive completed challenges with an age gap $\ge 1$ year (`GAP_THRESHOLD_YEARS = 1`). Invokes `deepseek-reasoner` to produce 1–3 causal hypotheses (`METHOD_MISMATCH`, `PERFORMANCE_ANXIETY`, `LACK_OF_ENGAGEMENT`, `CONCEPTUAL_GAP`, `READY_FOR_MORE`, `OTHER`).
  - `processDiscriminantResult`: Performs Bayesian probability update using outcome multipliers ($m = 1.8$ on success, $m = 0.4$ deconfirming gap, $m = 1.5$ on anxiety/abandonment). Resolves when $\max P(H_i) \ge 0.65$.
- **Zone Proximale d'Apprentissage (ZPA) Baseline**: In `src/lib/challenges.functions.ts` lines 588–670 (`computeProgressionTargets`):
  - Calculates `targetLevelAge = lastLevelAge + delta` where $\delta = +2$ for `READY_FOR_MORE`, $\delta = 0$ for difficulty causes (consolidation), and $\delta = +1$ by default.

---

## 2. Logic Chain

1. **Premise 1**: Fusing academic homework with Naya's gamified challenges requires mapping official school grades (CP to 3ème) and main subjects (Maths, Français, Sciences, Histoire-Géo) to Naya's internal challenge generation pipeline.
2. **Premise 2**: Current schemas track `academic_level_age` (age 3–18), but do not have an explicit `school_grade` column or a formal registry of academic curriculum topics and gap triggers.
3. **Premise 3**: Telemetry (`naya-telemetry.ts`) and Bayesian hypothesis cycles (`hypotheses.functions.ts`) provide the foundation for tracking child progress and detecting learning anomalies, but lack a fine-grained **Levels 1 to 5 difficulty adjustment algorithm** with explicit performance anxiety damping.
4. **Deduction**:
   - Creating a structured **Curriculum Registry Data Model (`CurriculumNode`)** for grades CP to 3ème bridging subjects, core competencies, gamified hooks, and gap triggers provides the necessary academic grounding.
   - Designing a **Bayesian ZPA Telemetry Adjustment Algorithm** modulating challenge difficulty from Level 1 (_Ancrage & Reconditionnement_) to Level 5 (_Maîtrise & Dépassement_) with an explicit anxiety damping rule ($P(\text{Anxiety}) > 0.40 \implies \text{Level } 1-2$ with `HIGH_SUPPORT`) solves the challenge calibration problem without inducing stress.

---

## 3. Caveats

- **No Code Modifications Made**: Exploration was strictly read-only as required by explorer rules.
- **Database Migration Required**: Adding `school_grade` to `child_profiles` and `child_zpa_telemetry` table requires executing a Supabase migration script during implementation.
- **Model Cost Assumptions**: Cost calculations in `naya-telemetry.ts` reflect DeepSeek and Anthropic pricing as of July 2026.

---

## 4. Conclusion

1. **Curriculum Registry Architecture**: Designed a comprehensive registry covering Cycles 2, 3, and 4 (CP to 3ème) across Mathématiques, Français, Sciences, and Histoire-Géo. Each topic specifies core skills, gamified hooks, and gap detection triggers.
2. **Bayesian ZPA Telemetry Adjustment Algorithm**: Designed a 5-level difficulty modulation algorithm that dynamically adjusts challenge levels ($L \in \{1, 2, 3, 4, 5\}$) based on continuous student mastery $\theta$ while enforcing anti-spike constraints ($|\Delta L| \le 1$) and performance anxiety damping ($P(A) > 0.40 \implies L \le 2$).
3. **Comprehensive Artifacts Created**:
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\analysis.md` (Full detailed technical report & designs)
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\handoff.md` (This handoff report)

---

## 5. Verification Method

To independently verify the exploration findings and designs:

1. **Inspect Schema & Code References**:
   - `src/components/profiles/shared.ts` (lines 74–90: `ChildProfile` type)
   - `src/lib/challenges.functions.ts` (lines 11–15: `ACADEMIC_DOMAINS`, lines 588–670: `computeProgressionTargets`)
   - `src/lib/hypotheses.functions.ts` (lines 15–26: `ALLOWED_CAUSES`, lines 188–353: `ensureHypothesesForChild`, lines 519–620: `processDiscriminantResult`)
   - `src/lib/naya-telemetry.ts` (lines 14–22: `NAYA_PRICING`, lines 159–309: `calculateNayaTelemetry`)
2. **Inspect Generated Analysis File**:
   - Open `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\analysis.md` to review the full Academic Curriculum Registry tables, sample topics, and Bayesian ZPA Telemetry Adjustment Algorithm specification.
3. **Invalidation Conditions**:
   - If `ACADEMIC_DOMAINS` or `academic_level_age` in `challenges.functions.ts` is changed or removed, the curriculum registry mapping would need to be updated accordingly.

---

_End of Handoff Report._

# Handoff Report — Explorer 1 (Milestone 1: Fusion Académique-Ludique)

**Working Directory**: `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_1`  
**Target Feature**: `feat/naya-academic-homework-fusion`  
**Handoff Type**: Hard Handoff (Task Completed)  
**Date**: 2026-07-23  

---

## 1. Observation

Direct observations made during the read-only investigation of `src/lib/challenges.functions.ts` and related codebase files:

1. **AI Challenge Engine Structure (`src/lib/challenges.functions.ts`)**:
   - `generateChallenges` (lines 1207–1356): Generates batches of 1–6 challenges based on child profile, Gardner talent radar, completed challenge observations, progression targets, and age development guidance.
   - `generateSingleChallenge` (lines 1834–1979): Generates single targeted challenge draft for the Laboratory interface.
   - `assignTemplateChallenge` (lines 1765–1824): Server function inserting template/draft challenge into `challenges` table.
   - `finalizeChallenge` (lines 524–561): Centralized choke point enforcing safety rules (`applySafetyNet`), proof mode normalization (`resolveProofMode`), internal academic referential levels (`resolveAcademicLevel`), valid talent keys (`resolveTargetIntelligences`), and valid subforms (`resolveTraitSubform`).

2. **LLM Provider Routing & Call Chain**:
   - `callClaude` (lines 1170–1200): Central entry point for LLM interactions.
   - Text generation calls `callDeepSeekText` (lines 1060–1168) targeting `deepseek-v4-flash` for regular text and `deepseek-v4-pro` (with thinking enabled) for reasoning tasks.
   - Vision analysis calls `callAnthropicVision` (lines 920–1055) using `claude-sonnet-5`.
   - Markdown JSON cleaning is centralized in `extractJsonFromLLMResponse` (lines 866–906).

3. **Current Child Interest & Behavioral Injection**:
   - `formatChildInterestsPayload` (lines 567–586): Converts raw `child.interests` tags into strings labeled by talent area from `INTERESTS_BY_TALENT`.
   - `GENIZIO_PRINCIPLES` (lines 676–688): Instructs the LLM to treat interests as cognitive postures and action mechanics (*démonter*, *schématiser*, *simuler*, *optimiser*, *enquêter*).
   - Limitation: Currently, there are no fields or helper modules to handle explicit school homework inputs (e.g. "Tables de 7"), school grade levels (CP to 3ème), curriculum topics, or explicit behavioral driver selections.

4. **Existing Code Base Stability**:
   - Running `npx vitest` confirms 149 passing unit test suites.
   - Running `npx tsc --noEmit` confirms 0 TypeScript type errors.

---

## 2. Logic Chain

1. **Observation**: The current Naya engine in `src/lib/challenges.functions.ts` builds prompts using child age, Gardner talents, and raw `interests` tags.
2. **Deduction**: While `GENIZIO_PRINCIPLES` mentions behavioral postures (*démonter*, *schématiser*, *simuler*, *enquêter*, *optimiser*), the engine lacks structured inputs for parent-specified school homework ("consignes de devoirs") and formal school grade levels (CP to 3ème).
3. **Observation**: `finalizeChallenge` acts as a mandatory choke point for all inserted challenges, ensuring title truncation, safety warnings, talent key sanitization, and academic level validation.
4. **Deduction**: We can extend the existing engine without breaking any current features by:
   - Creating a dedicated helper module `src/lib/academic-homework.functions.ts` containing grade level mappings (CP -> 3ème), subject constants, official curriculum topics (`CURRICULUM_TOPICS`), and behavioral driver guidance (`DRIVER_FUSION_GUIDANCE`).
   - Exporting a new server function `generateAcademicHomeworkChallenge` in `src/lib/challenges.functions.ts` that accepts `subject`, `gradeLevel`, `homeworkInstruction`, `behavioralDriver`, and uses `callClaude`, `extractJsonFromLLMResponse`, and `finalizeChallenge`.
   - Adding optional academic fusion fields (`academic_subject`, `academic_grade_level`, `homework_instruction`, `behavioral_driver`) to `ChallengeSchema`.
5. **Conclusion**: The proposed architecture achieves 100% backward compatibility with existing challenge generation features while providing full support for the Academic-Homework Fusion milestone.

---

## 3. Caveats

1. **Database Schema Migrations**: The database table `challenges` currently has `academic_domain` and `academic_level_age`. Adding explicit columns for `academic_subject`, `academic_grade_level`, `homework_instruction`, and `behavioral_driver` will require a Supabase migration script (or storing them inside a JSONB metadata column/field) if persistence of these specific input fields is required across page reloads.
2. **API Quota Management**: Generated academic challenges should use an output token cap of ~1500 tokens (well within DeepSeek's limits) to avoid rate limit spikes.

---

## 4. Conclusion

The analysis of `src/lib/challenges.functions.ts` and associated AI modules is complete. The exact technical specifications, interface definitions, curriculum topic catalog, prompt structures, and LLM guardrails have been documented in `analysis.md`. 

Key components specified:
- New helper module: `src/lib/academic-homework.functions.ts`
- New server function: `generateAcademicHomeworkChallenge` in `src/lib/challenges.functions.ts`
- Updated Zod validation schema: `ChallengeSchema`
- 5 core behavioral drivers (*déconstruire*, *schématiser*, *simuler*, *enquêter*, *optimiser*) explicitly integrated into academic prompt synthesis.

---

## 5. Verification Method

To verify the investigation findings and technical proposals independently:

1. **Inspect Report Files**:
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_1\analysis.md`
   - `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_1\handoff.md`

2. **Verify Codebase Base State**:
   - Execute TypeScript check: `npx tsc --noEmit` (0 errors expected).
   - Execute test suite: `npx vitest` (149 passing tests expected).

3. **Invalidation Conditions**:
   - If any existing exported function in `src/lib/challenges.functions.ts` (e.g. `generateChallenges`, `finalizeChallenge`) changes signature or behavior, existing unit tests would fail.
   - If `academic_grade_level` does not map to `nominalAge` in `finalizeChallenge`, age calibration in Naya's progression targets would be skewed.

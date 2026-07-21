# BRIEFING — 2026-07-21T09:27:14Z

## Mission
Investigate child profile interfaces, DB schemas, challenge generation data structures, interests usage, and prompt templates for Naya in GENIZIO. Confirm boundaries for changes.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Teamwork Explorer
- Working directory: C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2
- Original parent: 0f001c52-970f-4598-b57f-b26c9672d428
- Milestone: Milestone 1 - Naya Prompt System Update

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code or DB schemas
- Focus on child profile interfaces, interests flow, challenge generation prompt structures, auxiliary prompt files
- Verify strict boundaries (only prompt strings and context injection in challenge generation)

## Current Parent
- Conversation ID: 0f001c52-970f-4598-b57f-b26c9672d428
- Updated: 2026-07-21T09:27:14Z

## Investigation State
- **Explored paths**:
  - `src/components/profiles/shared.ts` (ChildProfile interface, INTERESTS_BY_TALENT)
  - `src/components/profiles/ProfileDialog.tsx` (Profile dialog, getInitialUniverses, purgeUniverseInterests)
  - `src/integrations/supabase/types.ts` & `supabase/full_migration_for_new_db.sql` (Database schemas for `child_profiles` and `challenges`)
  - `src/lib/challenges.functions.ts` (callClaude, GENIZIO_PRINCIPLES, SAFETY_INSTRUCTION, PROOF_MODE_INSTRUCTION, ACADEMIC_REFERENTIAL_INSTRUCTION, generateChallenges, generateCustomChallenge, getChildAISynthesis, validateChallengeProof)
  - `src/lib/hypotheses.functions.ts` (narrateForParent, ensureHypothesesForChild, generateDiscriminantChallenge)
  - `src/lib/recommendations.functions.ts` (recommendChallengesForChild, ESSAIMAGE, STABILISATION)
  - `src/routes/profiles.$profileId.challenges.tsx` (UI route calling challenge generation)
  - `src/components/profiles/ProfileDialog.schema.test.ts` & `ProfileDialog.test.ts` (Tests for profile interests logic)
- **Key findings**:
  1. `interests` is present in `ChildProfile` (`interests: string[]`) and in DB (`interests text[] NOT NULL DEFAULT '{}'`).
  2. `interests` is fetched from `child_profiles` and injected into 6 key AI functions (`generateChallenges`, `generateCustomChallenge`, `getChildAISynthesis`, `generateDiscriminantChallenge`, `recommendChallengesForChild` (ESSAIMAGE & STABILISATION)).
  3. No Edge Functions in Supabase; all AI calls use `callClaude` in `src/lib/challenges.functions.ts` via TanStack Start server functions.
  4. Shared prompt constants (`GENIZIO_PRINCIPLES`, `SAFETY_INSTRUCTION`, `PROOF_MODE_INSTRUCTION`, `ACADEMIC_REFERENTIAL_INSTRUCTION`) are defined in `src/lib/challenges.functions.ts`.
  5. Boundaries are strictly confirmed: UI components and DB schemas are already fully compatible with `interests` and require ZERO changes.
- **Unexplored areas**: None (Full analysis completed).

## Key Decisions Made
- Confirmed strict boundaries for Milestone 1: changes must strictly target prompt templates and context injection in server functions (`challenges.functions.ts`, `hypotheses.functions.ts`, `recommendations.functions.ts`).

## Artifact Index
- ORIGINAL_REQUEST.md — Initial user task specification
- BRIEFING.md — Persistent context index
- progress.md — Heartbeat & step tracker
- handoff.md — Detailed 5-component handoff report

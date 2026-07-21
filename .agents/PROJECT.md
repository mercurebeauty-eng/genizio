# Project: Naya Prompt System Update

## Architecture
- Naya AI challenge generation prompt system located in `src/lib/challenges.functions.ts`, `src/lib/hypotheses.functions.ts`, and `src/lib/recommendations.functions.ts`.
- Payload injection helper maps `childProfile.interests` tags (from `INTERESTS_BY_TALENT` in `src/components/profiles/shared.ts`) into enriched behavioral drivers and cognitive postures.
- System prompt constants (`GENIZIO_PRINCIPLES`, `generateChallenges`, `generateSingleChallenge`, `generateDiscriminantChallenge`, `recommendChallengesForChild`, `getChildAISynthesis`) updated to treat `interests` as deep behavioral drivers rather than surface hobbies or parental bias.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Audit Injection | Audit AI call / Edge function for `childProfile.interests` payload | none | DONE |
| 2 | Prompt Rewrite & Injection | Update prompt strings and inject `interests` in payload | M1 | DONE |
| 3 | Verification & Audit | `npx tsc --noEmit`, check DB/UI untouched, Forensic Audit | M2 | DONE |

## Interface Contracts
- AI payload parameters: `formatChildInterestsPayload(interests: string[])` maps tags to `[Talent/Cognitive Dimension] "tag description"`.
- `GENIZIO_PRINCIPLES`: Updated Rule 4 to instruct LLM on behavioral drivers and action mechanics ("Démonte pour comprendre" -> reverse engineering/deconstruction).
- UI Components & DB: UNTOUCHED (0 changes to `src/components/` or `supabase/migrations/`).

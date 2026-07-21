# BRIEFING — 2026-07-21T09:24:50Z

## Mission
Explore codebase for AI call construction, audit `src/lib/challenges.functions.ts` & edge functions / prompt helpers, and formulate concrete prompt rewriting suggestions to treat interests as deep behavioral drivers.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Codebase explorer, prompt engineering auditor
- Working directory: C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3
- Original parent: 0f001c52-970f-4598-b57f-b26c9672d428
- Milestone: Milestone 1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code changes outside working directory
- Focus on prompt construction, system prompts, user prompts, edge functions, and `src/lib/challenges.functions.ts`
- Write detailed handoff report to `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\handoff.md`

## Current Parent
- Conversation ID: 0f001c52-970f-4598-b57f-b26c9672d428
- Updated: 2026-07-21T09:24:50Z

## Investigation State
- **Explored paths**: `src/lib/challenges.functions.ts`, `src/lib/hypotheses.functions.ts`, `src/lib/recommendations.functions.ts`, `docs/memoire/genizio_naya_systeme_comprehension.md`, `docs/memoire/genizio_decisions.md`
- **Key findings**:
  1. All AI calls route through `callClaude` in `src/lib/challenges.functions.ts` (Anthropic API direct, Haiku 4.5 for text by default, Sonnet 5 for vision or when `modelOverride` is set).
  2. Main challenge prompts are governed by `GENIZIO_PRINCIPLES`, `SAFETY_INSTRUCTION`, `PROOF_MODE_INSTRUCTION`, `ACADEMIC_REFERENTIAL_INSTRUCTION`.
  3. Current interest handling treats `interests` as surface topics/hobbies ("football", "dessin").
  4. Concrete prompt rewrite defined to elevate `interests` to **deep behavioral drivers** (e.g. "démonte pour comprendre" -> deconstruction, reverse engineering, functional autopsy).
- **Unexplored areas**: None, full audit of AI call construction completed.

## Key Decisions Made
- Audited `challenges.functions.ts`, `hypotheses.functions.ts`, `recommendations.functions.ts`.
- Formulated concrete prompt rewriting specifications for Naya system prompt.

## Artifact Index
- C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\ORIGINAL_REQUEST.md — Original request log
- C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\BRIEFING.md — Briefing memory
- C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\progress.md — Progress tracking
- C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_3\handoff.md — Final handoff report

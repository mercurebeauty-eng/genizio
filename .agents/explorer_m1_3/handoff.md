# Handoff Report — Explorer 3 (Milestone 1)

## 1. Observation

### Codebase AI Call Architecture Overview
AI calls across the Génizio application are centralized in `src/lib/challenges.functions.ts` via the helper function `callClaude`. There are **no external Supabase Edge Functions** for AI generation; all calls execute synchronously inside TanStack Start Server Functions (`createServerFn`).

- **Unified LLM Dispatcher (`callClaude`)**: `src/lib/challenges.functions.ts` (lines 591–750)
  - **Endpoint**: `https://api.anthropic.com/v1/messages` using `process.env.ANTHROPIC_API_KEY`.
  - **Model Selection Logic**:
    - Default (Text-only): `claude-haiku-4-5-20251001` (cost-effective lightweight model).
    - Vision (Image provided via `imageData` base64 or `imageUrl` download): `claude-sonnet-5`.
    - Explicit Override (`modelOverride`): Allows text-only calls to request `claude-sonnet-5` (used for NAYA 2.0 reasoning in `ensureHypothesesForChild`).
  - **System Prompt & Formatting**: When `jsonMode` is `true`, passes system prompt: `"Tu es un assistant IA précis. Tu dois impérativement répondre au format JSON demandé, sous forme de JSON brut, sans bloc de code Markdown, sans préambule ni explications."`
  - **Resilience**: Timeout controller (45s), exponential backoff with random jitter (max 3 retries), error handling for Anthropic rate limits (429) vs transient (500/503) vs fatal errors.
  - **Thinking Block Handling**: Array search for `type === "text"` block to safely handle `claude-sonnet-5` thinking output.

### Audit of Modules and AI Prompt Call Sites

1. **`src/lib/challenges.functions.ts`**:
   - `GENIZIO_PRINCIPLES` (lines 518–530): Shared constitution injected into `generateChallenges` and `generateSingleChallenge`.
     - *Current Interest Rule (Line 522)*: `"CENTRES D'INTÉRÊT COMME TREMPLIN, PAS COMME CONTRAT : les centres d'intérêt déclarés par le parent sont un point de départ pour ancrer le défi dans ce que l'enfant aime, jamais un sujet littéral obligatoire à chaque fois. Si l'intérêt est 'Football', un défi sur la stratégie d'équipe, le calcul de score, la géométrie du terrain ou la condition physique est tout aussi légitime qu'un défi littéralement 'sur le foot' — varie l'angle plutôt que répéter le sujet brut d'un défi à l'autre."`
   - `SAFETY_INSTRUCTION` (lines 537): Supervision & safety evaluation rules (<12 vs 12+).
   - `PROOF_MODE_INSTRUCTION` (lines 544–549): "photo" vs "declarative" proof modes.
   - `ACADEMIC_REFERENTIAL_INSTRUCTION` (lines 559–586): Internal academic reference labeling (domain, level age, citation note).
   - `generateChallenges` (lines 757–912): Batch challenge generator (count: 1–6). Injects child profile, `GENIZIO_PRINCIPLES`, least-explored talents constraint, local African context, domain shuffling, ignored domains, safety, proof mode, academic referential.
   - `generateSingleChallenge` (lines 1377–1528): Targeted single challenge generator. Injects child profile, location, time available, home materials, `GENIZIO_PRINCIPLES`, domain constraint, safety, proof mode, academic referential.
   - `validateChallengeProof` (lines 986–1195): Multimodal/text proof validation. Evaluates proof relevance, generates encouragement for parent, attributes Gardner talent points (1–3 per intelligence).
   - `getChildAISynthesis` (lines 1530–1600): Weekly cached synthesis for parents analyzing child's completed challenges.
   - `analyzePostProof` (lines 1601–1622): Single sentence pedagogical badge for feed posts ("Tampon pédagogique Naya").

2. **`src/lib/hypotheses.functions.ts`**:
   - `narrateForParent` (lines 49–108): Translates diagnostic hypothesis trees into parent prose using Haiku. Enforces zero numbers/labels, non-judgmental tone. Backstop regex `/ \d /` rejects digit leaks.
   - `ensureHypothesesForChild` (lines 112–314): Causal diagnostic engine using Sonnet (`claude-sonnet-5`). Triggered by 4 consecutive academic level gap challenges. Evaluates snapshot against taxonomy (`METHOD_MISMATCH`, `PERFORMANCE_ANXIETY`, `LACK_OF_ENGAGEMENT`, `CONCEPTUAL_GAP`, `READY_FOR_MORE`, `OTHER`).
   - `generateDiscriminantChallenge` (lines 318–464): Generates targeted discriminant challenge testing the top hypothesis in an open cycle.

3. **`src/lib/recommendations.functions.ts`**:
   - `recommendChallengesForChild` (lines 20–276): Hybrid recommendation engine.
     - Priority 1: `INVESTIGATION` (discriminant challenge for open hypothesis cycle).
     - Priority 2: `ESSAIMAGE` (uses a `FORCE` talent + `interests` to develop a `FAIBLESSE`/`RISQUE`).
     - Priority 3: `STABILISATION` ("défi doudou" / reassuring micro-challenge leveraging `FORCE` & `interests`).

---

## 2. Logic Chain

1. **Current State Analysis**:
   - In all prompt templates (`generateChallenges`, `generateSingleChallenge`, `generateDiscriminantChallenge`, `recommendChallengesForChild`), `interests` are retrieved from `child_profiles.interests` (e.g. `(child.interests ?? []).join(", ")`) and passed as raw text.
   - `GENIZIO_PRINCIPLES` instructs Naya to treat interests as "tremplins" (springboards) to avoid literal topic repetition (e.g., Football -> team strategy or pitch geometry).
   - **Gap Identified**: The prompt still treats interests as **thematic topics/hobbies** rather than **deep behavioral drivers and cognitive operating modes**.

2. **Target Concept (Milestone 1 Objective)**:
   - Interests must be treated as **cognitive operating modes & behavioral drivers**.
   - If a child's interest is "Démontage / Bricolage", Naya must recognize the underlying behavioral driver: **Deconstruction, Reverse Engineering, and Mechanistic Curiosity**. The challenge must involve taking things apart, analyzing component logic, or reverse engineering structure (whether it's a physical object, a story's plot, a sentence's grammar, or a biological process).
   - If a child's interest is "Dessin / Peinture", the underlying driver is **Visual-Spatial Modeling & Graphic Abstraction**.
   - If a child's interest is "Prise de parole / Théâtre", the driver is **Persuasive Communication & Narrative Simulation**.
   - If a child's interest is "Jeux de logique / Puzzles", the driver is **Pattern Recognition & Systematic Problem Solving**.

3. **Prompt Architecture Strategy**:
   - Since text calls run on `claude-haiku-4-5-20251001`, instructions must be explicit, structured, and contain clear contrastive examples.
   - We must update:
     1. `GENIZIO_PRINCIPLES` in `src/lib/challenges.functions.ts` (shared constitution across all challenge generators).
     2. The interest interpretation directive in `generateChallenges`, `generateSingleChallenge`, `generateDiscriminantChallenge`, and `recommendChallengesForChild`.

---

## 3. Caveats

- **Read-Only Scope**: This report contains detailed prompt rewriting specifications. Code edits to `src/lib/*.ts` are reserved for subsequent implementation tasks.
- **Data Model Compatibility**: `child_profiles.interests` is stored as `string[]` in Postgres JSONB/array. The prompt rewriting operates directly on these string descriptors without requiring a database schema migration.
- **Model Behavior on Haiku**: Haiku 4.5 requires numbered, explicit rules and concrete `Before vs After` / `Topic vs Driver` examples in the system prompt to maintain formatting and rule adherence.

---

## 4. Conclusion & Concrete Prompt Rewriting Proposals

### Proposal 1: Rewrite `GENIZIO_PRINCIPLES` in `src/lib/challenges.functions.ts`

Replace the current bullet point in `GENIZIO_PRINCIPLES` (line 522):

```typescript
// CURRENT:
- CENTRES D'INTÉRÊT COMME TREMPLIN, PAS COMME CONTRAT : les centres d'intérêt déclarés par le parent sont un point de départ pour ancrer le défi dans ce que l'enfant aime, jamais un sujet littéral obligatoire à chaque fois. Si l'intérêt me est "Football", un défi sur la stratégie d'équipe, le calcul de score, la géométrie du terrain ou la condition physique est tout aussi légitime qu'un défi littéralement "sur le foot" — varie l'angle plutôt que répéter le sujet brut d'un défi à l'autre.
```

With the expanded **Behavioral Driver Directive**:

```typescript
// PROPOSED REWRITE:
- CENTRES D'INTÉRÊT = MOTEURS COMPORTEMENTAUX ET MODES COGNITIFS PROFONDS : Ne traite jamais un centre d'intérêt (déclaré par le parent ou observé) comme un simple thème, un sujet de surface ou un hobby decoratif. Décode et exploite le MOTEUR COMPORTEMENTAL ET LE MODE OPÉRATOIRE MENTAL sous-jacent de l'enfant :
  * Si l'intérêt est "Démontage / Bricolage / Robots" -> Moteur = INGÉNIERIE INVERSE ET DÉCONSTRUCTION. Le défi DOIT comporter une phase de démontage, d'autopsie fonctionnelle, de décomposition d'un tout en éléments simples ou de recherche du mécanisme caché (que ce soit sur un objet physique, un texte, une recette, une règle de jeu ou un phénomène naturel).
  * Si l'intérêt est "Dessin / Peinture / Arts" -> Moteur = MODÉLISATION VISUELLE ET ABSTRACTION GRAPHIQUE. Le défi DOIT mobiliser la cartographie visuelle, le schéma explicatif, le design de concept ou la représentation spatiale.
  * Si l'intérêt est "Prise de parole / Théâtre / Jeux de rôle" -> Moteur = SIMULATION ET INFLUENCE NARRATIVE. Le défi DOIT mobiliser l'incarnation d'un rôle, la vulgarisation scénarisée, le débat ou la persuasion.
  * Si l'intérêt est "Football / Jeux collectifs / Sport" -> Moteur = STRATÉGIE SYSTÉMIQUE ET OPTIMISATION DE FLUX. Le défi DOIT poser un problème de placement, d'analyse tactique, de coordination ou de mesure de performance.
  Chaque défi doit employer la MÉCANIQUE D'ACTION préférée de l'enfant (démonter, schématiser, simuler, optimiser, enquêter) pour lui faire explorer et maîtriser n'importe quel domaine d'apprentissage.
```

### Proposal 2: Update Prompts in `generateChallenges` & `generateSingleChallenge`

In `generateChallenges` (line 831) and `generateSingleChallenge` (line 1439), add a two-step cognitive decoding instruction:

```typescript
// PROPOSED PROMPT ADDITION:
ANALYSE DES CENTRES D'INTÉRÊT (DECODAGE EN 2 ÉTAPES) :
1. Étape 1 - Identification du moteur comportemental : Analyse les centres d'intérêt déclarés (${(child.interests ?? []).join(", ")}) et identifie le mode d'action privilégié de l'enfant (ex: démonter/analyser, construire/assembler, raconter/incarner, classer/ordonner, concourir/dépasser).
2. Étape 2 - Conception de la mécanique : Reçois le domaine cible du défi et applique-y le mode d'action privilégié. Exemple : si le domaine est "Sciences" et le moteur est "Démontage", ne propose pas de lire une leçon sur les plantes, mais d'effectuer la déconstruction guidée d'une fleur ou d'une graine pour en extraire et analyser chaque organe fonctionnel.
```

### Proposal 3: Update Prompts in `generateDiscriminantChallenge` & `recommendChallengesForChild`

In `generateDiscriminantChallenge` (lines 363–379), update the prompt so that `LACK_OF_ENGAGEMENT` and other hypothesis tests leverage behavioral drivers:

```typescript
// PROPOSED PROMPT UPDATE IN generateDiscriminantChallenge:
- Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur le MOTEUR COMPORTEMENTAL profond de l'enfant déduit de ses intérêts (${interestsStr}) — par exemple en utilisant la déconstruction/démontage si l'enfant aime comprendre comment les choses fonctionnent, ou la simulation narrative s'il aime raconter des histoires.
```

---

## 5. Verification Method

### How to Verify
1. **Inspect Code Files**:
   - View `src/lib/challenges.functions.ts` lines 518–586 to confirm prompt constants structure.
   - View `src/lib/hypotheses.functions.ts` lines 318–400 and `src/lib/recommendations.functions.ts` lines 96–120.
2. **Execute Type Check**:
   - Run `npx tsc --noEmit` from project root `C:\Users\USER\Documents\GENIZIO\` to verify type safety.
3. **Invalidation Conditions**:
   - If prompt edits break JSON parsing schema (`ChallengeSchema`), or if Claude Haiku outputs Markdown syntax when `jsonMode` is set.

# Milestone 1 Audit & Recommendation Report: Naya Prompt System Update & `childProfile.interests` Overhaul

## 1. Observation

A comprehensive audit of the Naya AI prompt system and `childProfile.interests` handling across the `GENIZIO` codebase was conducted. The relevant files, line numbers, function signatures, prompt texts, and payload constructions were identified and examined.

### Summary of Identified Files

| File Path | Primary Function(s) / Object | Purpose in Naya AI System |
| --- | --- | --- |
| `src/lib/challenges.functions.ts` | `generateChallenges`, `generateSingleChallenge`, `validateChallengeProof`, `getChildAISynthesis` | Core server functions for AI challenge batch generation, single challenge generation, proof validation, and pedagogical synthesis. Contains shared system prompt constants (`GENIZIO_PRINCIPLES`, `SAFETY_INSTRUCTION`, `PROOF_MODE_INSTRUCTION`, `ACADEMIC_REFERENTIAL_INSTRUCTION`). |
| `src/lib/hypotheses.functions.ts` | `generateDiscriminantChallenge`, `generateHypotheses`, `generateParentNarrative` | NAYA 2.0 diagnostic hypothesis engine & discriminant challenge generator. |
| `src/lib/recommendations.functions.ts` | `recommendChallengesForChild` | Pedagogical twin recommendation engine (ESSAIMAGE, STABILISATION, INVESTIGATION pathways). |
| `src/components/profiles/shared.ts` | `INTERESTS_BY_TALENT`, `ChildProfile`, `ProfileDraft` | Taxonomy mapping Gardner talent keys (`spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`) to concrete behavioral tags. |
| `src/integrations/supabase/types.ts` | Database type definitions | Defines `child_profiles.interests` column as `Json` / `string[]`. |

---

### Key Findings & Code Snippets

#### 1. Taxonomy of `childProfile.interests` (`src/components/profiles/shared.ts`)
Lines 28–65 define `INTERESTS_BY_TALENT`:
```typescript
export const INTERESTS_BY_TALENT: Record<string, { label: string; tags: readonly string[] }> = {
  spatial: {
    label: TALENT_KEY_LABELS.spatial,
    tags: ["Démonte pour comprendre", "Remarque les petits détails visuels", "Aime assembler et construire", "S'oriente facilement dans l'espace"],
  },
  corporelle: {
    label: TALENT_KEY_LABELS.corporelle,
    tags: ["A besoin de bouger pour réfléchir", "Touche tout ce qu'il voit", "Apprend en imitant les gestes"],
  },
  sociale: {
    label: TALENT_KEY_LABELS.sociale,
    tags: ["Joue souvent le médiateur", "Comprend vite les règles du groupe", "Aime organiser les autres"],
  },
  entrepreneuriale: {
    label: TALENT_KEY_LABELS.entrepreneuriale,
    tags: ["Invente ses propres règles de jeu", "Négocie toujours (même le coucher)", "Cherche à optimiser ou marchander"],
  },
  creative: {
    label: TALENT_KEY_LABELS.creative,
    tags: ["Détourne les objets de leur usage", "A un imaginaire débordant", "Préfère inventer que suivre la notice"],
  },
  artisanale: {
    label: TALENT_KEY_LABELS.artisanale,
    tags: ["Préfère faire de ses propres mains", "Aime les résultats concrets et finis", "S'applique sur les tâches minutieuses"],
  },
  emotionnelle: {
    label: TALENT_KEY_LABELS.emotionnelle,
    tags: ["Ressent intensément l'humeur ambiante", "A besoin de solitude pour se recharger", "Très sensible à l'injustice"],
  },
  logico_mathematique: {
    label: TALENT_KEY_LABELS.logico_mathematique,
    tags: ["Pose sans arrêt la question 'Pourquoi ?'", "Aime classer, trier et mesurer", "Cherche la logique cachée des choses", "Fasciné par le lien cause/effet"],
  },
  linguistique: {
    label: TALENT_KEY_LABELS.linguistique,
    tags: ["Retient très facilement les histoires", "Joue avec les mots et les sons", "Argumente pour défendre ses idées"],
  },
};
```
*Observation*: `interests` in Genizio are **not** surface topics or traditional hobbies (e.g., "Football", "Dinosaures"), but rather **deep behavioral postures, cognitive mechanisms, and action modalities** declared by parents.

---

#### 2. Batch Generator Prompt & Payload (`src/lib/challenges.functions.ts`)

##### Function Signature & Payload Injection (Lines 757, 831):
```typescript
export const generateChallenges = createServerFn({ method: "POST" })
// ...
// Line 831:
- Centres d'intérêt déclarés par le parent : ${(child.interests ?? []).join(", ") || "variés"}
```

##### System Prompt Context (`GENIZIO_PRINCIPLES`, Lines 518–530):
```typescript
const GENIZIO_PRINCIPLES = `PRINCIPES DE GÉNÉRATION GÉNIZIO (règles strictes, à respecter impérativement) :
...
- CENTRES D'INTÉRÊT COMME TREMPLIN, PAS COMME CONTRAT : les centres d'intérêt déclarés par le parent sont un point de départ pour ancrer le défi dans ce que l'enfant aime, jamais un sujet littéral obligatoire à chaque fois. Si l'intérêt est "Football", un défi sur la stratégie d'équipe, le calcul de score, la géométrie du terrain ou la condition physique est tout aussi légitime qu'un défi littéralement "sur le foot" — varie l'angle plutôt que répéter le sujet brut d'un défi à l'autre.
...`;
```

##### Constraint Instructions (Lines 846–847):
```typescript
- Ignore le biais parental et utilise les données réelles : les intelligences actuellement les moins explorées chez cet enfant sont ${leastExplored.join(" et ")}. Sauf si le contexte les rend peu réalistes, au moins un des ${data.count} défis DOIT cibler l'une de ces intelligences plutôt que de renforcer uniquement les intérêts déjà connus — c'est ainsi que Naya révèle des talents cachés au lieu de se contenter de confirmer ce que le parent pense déjà savoir.
```

---

#### 3. Single Challenge Generator Prompt & Payload (`src/lib/challenges.functions.ts`)

##### Function Signature & Payload Injection (Lines 1385, 1439):
```typescript
export const generateSingleChallenge = createServerFn({ method: "POST" })
// ...
// Line 1439:
- Centres d'intérêt initiaux (déclarés par le parent) : ${(child.interests ?? []).join(", ") || "aucun"}
```

##### Prompt Instructions (Lines 1461–1463):
```typescript
Ta mission (Ignorer le biais parental et utiliser les données réelles) :
1. Analyse la carte des talents (Radar Chart), les intérêts déclarés par le parent, ET les observations des défis passés.
2. Détecte les biais : Si le parent a déclaré certains intérêts, mais que les observations passées montrent que l'enfant bloque dessus ou excelle ailleurs, Naya doit prendre l'initiative de pivoter.
```

---

#### 4. Diagnostic & Discriminant Generator (`src/lib/hypotheses.functions.ts`)

##### Discriminant Challenge Generator (Lines 322, 370, 375):
```typescript
export const generateDiscriminantChallenge = createServerFn({ method: "POST" })
// ...
// Line 370:
Centres d'intérêt de l'enfant : ${interestsStr}
// Line 375:
- Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur un des centres d'intérêt de l'enfant (${interestsStr}) pour raviver la curiosité.
```

##### Hypothesis Engine (`generateHypotheses`, Lines 207–211):
```typescript
jumeau_pedagogique: {
  moteurs: twin?.drivers ?? {},
  competences_gardner: twin?.competencies ?? {},
  interets: twin?.interests ?? {},
}
```

---

#### 5. Recommendations Engine (`src/lib/recommendations.functions.ts`)

##### Recommendation Pathways (Lines 96–98, 188–191):
```typescript
// ESSAIMAGE (Line 98):
Principe : Utiliser sa FORCE (${strengthEntry[0]}) et ses centres d'intérêt (${interestsStr}) pour développer doucement sa compétence en progression (${weaknessEntry[0]}).

// STABILISATION (Line 191):
Principe : ... appuyé sur ${strengthEntry ? `sa force reconnue (${comfortSkill})` : "quelque chose de familier et confortable"} et ses centres d'intérêt (${interestsStr}).
```

---

#### 6. AI Pedagogical Synthesis (`src/lib/challenges.functions.ts`)

##### Function Signature & Prompt (Lines 1529, 1572):
```typescript
export const getChildAISynthesis = createServerFn({ method: "POST" })
// ...
// Line 1572:
Analyse les accomplissements suivants de l'enfant ${child.name} (${child.age} ans, centres d'intérêt: ${(child.interests ?? []).join(", ")}) :
```

---

## 2. Logic Chain

1. **Mismatch Between Data Taxonomy and System Prompt Conceptualization**:
   - *Observation*: `INTERESTS_BY_TALENT` defines tags as behavioral traits ("Démonte pour comprendre", "A besoin de bouger pour réfléchir", "Détourne les objets de leur usage").
   - *Observation*: `GENIZIO_PRINCIPLES` Rule 4 uses an example about "Football" ("Si l'intérêt est 'Football'...").
   - *Deduction*: The system prompt was written under the assumption that `interests` are topical hobbies (sports, animals, gaming), whereas the UI tags selected by parents are behavioral indicators and cognitive styles.

2. **Sub-optimal Payload Flattening**:
   - *Observation*: In all 5 AI call sites (`generateChallenges`, `generateSingleChallenge`, `generateDiscriminantChallenge`, `recommendChallengesForChild`, `getChildAISynthesis`), `child.interests` is passed as a flat, comma-separated string (`(child.interests ?? []).join(", ")`).
   - *Deduction*: By stripping out the underlying Gardner intelligence dimension (`spatial`, `logico_mathematique`, `entrepreneuriale`, etc.) that categorizes each tag in `INTERESTS_BY_TALENT`, the AI loses the cognitive context of *why* this interest matters.

3. **Framing Interests as "Parental Bias" to Override**:
   - *Observation*: Prompt instructions in `generateChallenges` (line 847) and `generateSingleChallenge` (lines 1461–1463) explicitly instruct Naya to "Ignore le biais parental et utilise les données réelles... Naya doit prendre l'initiative de pivoter."
   - *Deduction*: Framing parent-observed interests as "bias" leads the LLM to ignore or dismiss these key behavioral traits. In reality, parent-observed behavioral patterns are valuable signals of how the child naturally engages with challenges.

4. **Missed Opportunity for Deep Behavioral Drivers**:
   - *Observation*: When generating challenges across different domains (e.g. Mathematics, Sciences, Art), the AI currently attempts to force thematic subjects rather than adopting the child's preferred *mechanic* or *posture*.
   - *Deduction*: If a child has the interest tag "Démonte pour comprendre" (Spatial), Naya shouldn't just create a challenge about "machines" — she should design a *deconstruction / reverse-engineering mechanic* for whatever domain is being targeted (e.g., deconstructing a story structure in Language, or dissecting a recipe in Cooking).

---

## 3. Caveats

- **Legacy DB Data**: Existing database rows in `child_profiles.interests` may contain string values selected from prior versions of the UI. The payload building logic must gracefully handle tags that might not map directly to current `INTERESTS_BY_TALENT` keys.
- **Token Usage / Prompt Length**: Enriching the prompt with behavioral descriptions must remain concise to stay within Anthropic token limits and prevent "lost-in-the-middle" attention degradation.
- **Read-Only Scope**: Per the explorer role assignment, no source code outside `.agents/explorer_m1_1/` was modified during this investigation.

---

## 4. Conclusion & Recommendations

### Summary Conclusion
`childProfile.interests` is currently underutilized and mischaracterized in the Naya AI system. It is passed as a flat list of strings, labeled as "parental bias," and illustrated with outdated "topic-based" examples ("Football"). To elevate Naya into a deep developmental mentor, `interests` must be treated as **Deep Behavioral Drivers & Cognitive Entry Points**.

---

### Concrete Recommendations for Implementation

#### Recommendation A: Enrich AI Payload with Behavioral Driver Context
Create a standard helper function (e.g., `formatChildInterestsPayload(interests: string[])`) in `src/lib/challenges.functions.ts` or a shared utility.
- Map each tag in `child.interests` back to its intelligence key from `INTERESTS_BY_TALENT`.
- Format the payload explicitly:
  ```text
  Modes d'engagement et leviers comportementaux observés par le parent :
  - [Logique & Cause à Effet] "Démonte pour comprendre"
  - [Créativité & Imaginaire] "Détourne les objets de leur usage"
  ```
- Fallback gracefully for unrecognized/custom tags: `- [Général] "<tag>"`.

#### Recommendation B: Overhaul `GENIZIO_PRINCIPLES` Rule 4
Update `GENIZIO_PRINCIPLES` in `src/lib/challenges.functions.ts`:
- **Current Prompt**:
  > `- CENTRES D'INTÉRÊT COMME TREMPLIN, PAS COMME CONTRAT : les centres d'intérêt déclarés par le parent sont un point de départ pour ancrer le défi dans ce que l'enfant aime, jamais un sujet littéral obligatoire à chaque fois. Si l'intérêt me est "Football"...`
- **Recommended Updated Prompt**:
  > `- CENTRES D'INTÉRÊT COMME LEVIERS COMPORTEMENTAUX (POSTURE COGNITIVE) : les centres d'intérêt ne sont pas de simples sujets (comme "le foot" ou "les animaux"), mais les modes d'action et leviers d'engagement préférentiels de l'enfant (ex: "Démonte pour comprendre", "Négocie toujours", "A besoin de bouger pour réfléchir"). Utilise ces traits comme MÉCANIQUE ET POSTURE D'APPRENTISSAGE pour introduire n'importe quel domaine. Si l'enfant "démonte pour comprendre", propose un défi de déconstruction/analyse inverse, qu'il s'agisse de sciences, d'écriture, d'artisanat ou de logique.`

#### Recommendation C: Reframe "Parental Bias" to "Pedagogical Synthesis"
Modify the constraint text in `generateChallenges` (line 847) and `generateSingleChallenge` (lines 1461-1463):
- Replace *"Ignore le biais parental"* with:
  > *"SYNTHÈSE PÉDAGOGIQUE : Associe les leviers comportementaux observés par le parent (posture cognitive) avec les données d'observation de Naya. Utilise la posture préférentielle de l'enfant pour aborder les intelligences les moins explorées (${leastExplored.join(" et ")}), créant ainsi une passerelle naturelle vers de nouveaux talents."*

#### Recommendation D: Standardize Across All Generator Pathways
Ensure that:
1. `generateChallenges` (`src/lib/challenges.functions.ts`)
2. `generateSingleChallenge` (`src/lib/challenges.functions.ts`)
3. `generateDiscriminantChallenge` (`src/lib/hypotheses.functions.ts`)
4. `recommendChallengesForChild` (`src/lib/recommendations.functions.ts`)
5. `getChildAISynthesis` (`src/lib/challenges.functions.ts`)
all use the enriched payload formatter and share the updated behavioral driver instructions.

---

## 5. Verification Method

### How to Independently Verify Findings

1. **Source Inspection**:
   - Inspect `src/components/profiles/shared.ts` (lines 28–65) to verify `INTERESTS_BY_TALENT` structure.
   - Inspect `src/lib/challenges.functions.ts` lines 518–530 (`GENIZIO_PRINCIPLES`), 831 (`generateChallenges`), 1439 (`generateSingleChallenge`), 1572 (`getChildAISynthesis`).
   - Inspect `src/lib/hypotheses.functions.ts` lines 210, 370 (`generateDiscriminantChallenge`).
   - Inspect `src/lib/recommendations.functions.ts` lines 98, 191 (`recommendChallengesForChild`).

2. **Build & Type Checking**:
   - Run `npx tsc --noEmit` or `bun run build` in `C:\Users\USER\Documents\GENIZIO\` to verify type compliance across all server functions.

3. **Invalidation Conditions**:
   - If `childProfile.interests` was changed to store structured objects `{ tag: string, intelligence: string }` instead of `string[]`, the payload mapping logic would need to adjust.
   - If `INTERESTS_BY_TALENT` is moved or restructured, the lookup logic in the helper must reference the new export.

# Explorer Report: Data Models, Academic Curriculum (CP to 3ème) and ZPA Telemetry Analysis

**Milestone**: Milestone 1 — Fusion Académique-Ludique (`feat/naya-academic-homework-fusion`)  
**Agent**: Explorer 2 (`explorer_m1_2`)  
**Date**: 2026-07-23  
**Working Directory**: `C:\Users\USER\Documents\GENIZIO\.agents\explorer_m1_2\`

---

## 1. Executive Summary & Scope Definition

This report presents a thorough, evidence-based investigation of the data models, telemetry systems, and academic progression tracking mechanisms within **GENIZIO**, along with full architectural designs for:

1. **A Structured Academic Curriculum Registry (CP to 3ème)** covering Mathématiques, Français, Sciences, and Histoire-Géographie, complete with gamified hooks and Bayesian gap detection triggers.
2. **A Bayesian Zone Proximale d'Apprentissage (ZPA) Telemetry Adjustment Algorithm** modulating challenge difficulty (Levels 1 to 5) while actively preventing performance anxiety.

### Summary of Key Findings

- **Data Model Readiness**: `ChildProfile` and `child_profiles` DB table track `age: number`, `interests: string[]`, and `talents: Record<string, number>`. However, an explicit `school_grade` (CP to 3ème) column is currently absent from `child_profiles`. The `challenges` table currently supports `academic_domain` (8 Gardner domains + maths/langage/sciences) and `academic_level_age` (3–18 years).
- **Telemetry System (`naya-telemetry.ts`)**: Built around a multi-model architecture using DeepSeek Chat (`deepseek-v4-flash`), DeepSeek Reasoner (`deepseek-v4-pro`), and Claude Sonnet 5 (Vision). Token estimation, conversion rates, and USD/XOF cost calculations are fully implemented.
- **Progression & Hypothesis Tracking (`hypothesis_cycles`, `hypotheses.functions.ts`)**: Hypothesis generation triggers automatically when a child completes 4 consecutive challenges with an academic age gap $\ge 1$ year (`GAP_WINDOW = 4`, `GAP_THRESHOLD_YEARS = 1`). A Bayesian engine (`processDiscriminantResult`) updates probability distribution over 6 causes (`METHOD_MISMATCH`, `PERFORMANCE_ANXIETY`, `LACK_OF_ENGAGEMENT`, `CONCEPTUAL_GAP`, `READY_FOR_MORE`, `OTHER`).
- **ZPA Gap**: Currently, progression targets (`computeProgressionTargets`) adjust age goals by +2, 0, or +1 year based on hypothesis outcomes. There is no direct 5-level fine-grained difficulty modulation or real-time anxiety damping algorithm tied to telemetry feedback.

---

## 2. Current Codebase Audit: Data Models, Schemas & Telemetry

### 2.1 Child Profile & Data Structures Inspection

#### `ChildProfile` TypeScript Interface (`src/components/profiles/shared.ts`)

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

_Observation_:

- `interests`: Array of string tags chosen from `INTERESTS_BY_TALENT` (e.g., `"Démonte pour comprendre"`, `"A besoin de bouger pour réfléchir"`).
- `talents`: Record mapping 9 valid Gardner intelligence keys (`spatial`, `corporelle`, `sociale`, `entrepreneuriale`, `creative`, `artisanale`, `emotionnelle`, `logico_mathematique`, `linguistique`) to numerical scores (0–100).
- `age`: Chronological age in years (integer).
- _Gap identified_: No explicit `school_grade` property (e.g. `'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6ème' | '5ème' | '4ème' | '3ème'`).

#### Database Schema: `public.child_profiles` & `public.challenges`

From `supabase/full_migration_for_new_db.sql` and migrations `20260720210616_add_academic_level_to_challenges.sql` & `20260720220322_extend_academic_domains_and_reference_note.sql`:

```sql
-- public.child_profiles
CREATE TABLE public.child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  age integer NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  talents jsonb NOT NULL DEFAULT '{}',
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_activity_date timestamptz
);

-- public.challenges
ALTER TABLE public.challenges
  ADD COLUMN academic_domain text,
  ADD COLUMN academic_level_age integer,
  ADD COLUMN academic_reference_note text;

-- Constraints
CHECK (academic_domain IS NULL OR academic_domain IN (
  'mathematiques', 'langage', 'sciences',
  'corporelle', 'sociale', 'emotionnelle', 'entrepreneuriale', 'artisanale', 'spatiale'
));
CHECK (academic_level_age IS NULL OR (academic_level_age BETWEEN 3 AND 18));
```

#### Behavioral Driver Structure (`INTERESTS_BY_TALENT` & `formatChildInterestsPayload`)

In `src/components/profiles/shared.ts` and `src/lib/challenges.functions.ts`:

- Interest tags are mapped to talent categories and translated into behavioral posture drivers in AI prompts:
  `"CENTRES D'INTÉRÊT = LEVIERS COMPORTEMENTAUX ET MODES COGNITIFS PROFONDS"`.
- This ensures Naya uses child preferences as **learning mechanics** (e.g., dismantling, building, negotiating) rather than superficial themes.

---

### 2.2 Telemetry System (`src/lib/naya-telemetry.ts`)

#### Token Pricing Constants

```typescript
export const NAYA_PRICING = {
  DEEPSEEK_CHAT_INPUT_PER_M: 0.14, // $0.14 per 1M input tokens
  DEEPSEEK_CHAT_OUTPUT_PER_M: 0.28, // $0.28 per 1M output tokens
  DEEPSEEK_REASONER_INPUT_PER_M: 0.435, // $0.435 per 1M input tokens (R1)
  DEEPSEEK_REASONER_OUTPUT_PER_M: 0.87, // $0.87 per 1M output tokens (R1)
  SONNET_INPUT_PER_M: 3.0, // $3.00 per 1M input tokens (Vision)
  SONNET_OUTPUT_PER_M: 15.0, // $15.00 per 1M output tokens (Vision)
  USD_TO_XOF_RATE: 600, // 1 USD = 600 XOF
} as const;
```

#### Multi-Model Breakdown

1. **Défis & Recommandations**: Driven by `DeepSeek Chat` (`deepseek-v4-flash`). Token estimation: 1,200 input / 800 output per challenge generated.
2. **Photo Proof Validation**: Driven by `Claude Sonnet 5` (Vision model). Token estimation: 1,500 input / 300 output per photo proof.
3. **Hypothesis Cycles (Raisonnement NAYA)**: Driven by `DeepSeek Reasoner` (`deepseek-v4-pro` / R1). Token estimation: 2,500 input / 600 output per hypothesis cycle.

#### Telemetry Metrics Computation (`calculateNayaTelemetry`)

Aggregates:

- Total API calls and total tokens.
- USD and XOF cost estimates.
- Conversion funnel metrics: `generated`, `started`, `completed`, `conversionRatePct` = $\min(100, \max(0, \frac{\text{completed}}{\text{generated}} \times 100))$.
- Monthly projections (x4 multiplier on current baseline).

---

### 2.3 Hypothesis Cycles & Bayesian Progression Mechanism

#### `hypothesis_cycles` Table Schema (`20260720150000_add_hypothesis_cycles.sql`)

```sql
CREATE TABLE public.hypothesis_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  trigger_domain text,
  hypotheses jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  final_diagnosis text,
  model text,
  parent_narrative text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz
);
```

#### Triggering Mechanism (`ensureHypothesesForChild` in `hypotheses.functions.ts`)

- Evaluates the last 30 completed academic challenges.
- Groups by `academic_domain`.
- If `GAP_WINDOW = 4` consecutive completed challenges in a domain show an academic level age difference $\ge 1$ year (`GAP_THRESHOLD_YEARS = 1`):
  - If all 4 are behind child's age $\rightarrow$ Trigger `BEHIND`.
  - If all 4 are ahead of child's age $\rightarrow$ Trigger `AHEAD`.
- Invokes `DeepSeek Reasoner` (`deepseek-reasoner`) to generate 1–3 weighted causal hypotheses:
  - `METHOD_MISMATCH`: Format doesn't suit child.
  - `PERFORMANCE_ANXIETY`: Stress/pressure during evaluation.
  - `LACK_OF_ENGAGEMENT`: Disinterest/boredom.
  - `CONCEPTUAL_GAP`: Real prerequisite gap.
  - `READY_FOR_MORE`: Child is ahead and ready for advanced topics.
  - `OTHER`: Uncategorized cause.

#### Bayesian Probability Update (`processDiscriminantResult`)

Upon completing or abandoning a discriminant challenge:
$$\text{Updated } P'(H_i) = P(H_i) \times m_i$$
Where multiplier $m_i$ is determined by action & AI validation:

- `COMPLETED` + `aiValidated` $\implies m = 1.8$ for target cause.
- `COMPLETED` on `METHOD_MISMATCH` $\implies m = 0.4$ for `CONCEPTUAL_GAP` (deconfirms gap).
- `ABANDONED` $\implies m = 1.5$ for `PERFORMANCE_ANXIETY` or `LACK_OF_ENGAGEMENT`, $m = 0.6$ for others.

Normalized posterior:
$$P_{posterior}(H_i) = \frac{P'(H_i)}{\sum_j P'(H_j)}$$

- Convergence: When $\max P_{posterior}(H_i) \ge 0.65$, cycle transitions to `status = 'resolved'` with `final_diagnosis = H_{top}`.

---

## 3. Structured Academic Curriculum Registry (CP to 3ème)

To fuse academic homework with gamified Naya challenges, we design a structured Curriculum Registry covering grades **CP to 3ème** (Cycles 2, 3, and 4) across **4 main subjects**:

1. **Mathématiques**
2. **Français**
3. **Sciences** (Sciences & Technologie in primary / SVT & Physique-Chimie in middle school)
4. **Histoire-Géographie & EMC**

### 3.1 Registry Node Data Model (`CurriculumNode`)

```typescript
export type SchoolGrade = "CP" | "CE1" | "CE2" | "CM1" | "CM2" | "6ème" | "5ème" | "4ème" | "3ème";
export type AcademicSubject = "mathematiques" | "francais" | "sciences" | "histoire_geo";

export interface CurriculumNode {
  code: string; // Unique ID, e.g. "MATH_CM1_NUM_02"
  grade: SchoolGrade;
  subject: AcademicSubject;
  target_age: number; // Nominal age (CP=6, CE1=7, CE2=8, CM1=9, CM2=10, 6e=11, 5e=12, 4e=13, 3e=14)
  domain_title: string; // e.g. "Nombres et Calculs", "Grammaire et Orthographe"
  topic_name: string; // e.g. "Fractions simples et décimales"
  prerequisite_codes: string[]; // Topic prerequisites for DAG tracking
  core_skills: string[]; // Official French National Curriculum skills
  playful_homework_hooks: {
    hook_title: string;
    description: string;
    preferred_interests: string[]; // Talent interest keys that align best
  }[];
  gap_detection_hooks: {
    observable_error_pattern: string;
    suspected_cause:
      | "METHOD_MISMATCH"
      | "PERFORMANCE_ANXIETY"
      | "LACK_OF_ENGAGEMENT"
      | "CONCEPTUAL_GAP";
    diagnostic_hint: string;
  }[];
}
```

---

### 3.2 Full Curriculum Registry Content (CP to 3ème Sample Topics)

#### Cycle 2 (Apprentissages Fondamentaux: CP, CE1, CE2)

| Grade   | Subject       | Code               | Topic Name                                         | Sample Gamified Hook                                                                                   | Gap Detection Trigger                                                           |
| :------ | :------------ | :----------------- | :------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **CP**  | Mathématiques | `MATH_CP_NUM_01`   | Dénombrement et écriture des nombres jusqu'à 100   | _Le Trésor des Pirates des Nombres_ : Compter des pièces de monnaie ou objets réels par paquets de 10. | Confusions 12/21 ou trous de dizaines $\rightarrow$ `CONCEPTUAL_GAP`            |
| **CP**  | Français      | `FR_CP_LEC_01`     | Décodage phonologique et combinatoire              | _L'Enquêteur des Mots Secrets_ : Assembler des cartes de syllabes pour ouvrir le coffre fort.          | Hesitation prolongée sur syllabes complexes $\rightarrow$ `PERFORMANCE_ANXIETY` |
| **CE1** | Mathématiques | `MATH_CE1_CALC_01` | Addition posée avec retenue et tables de 2, 5, 10  | _L'Architecte de la Tour de 100_ : Empiler des blocs avec retenue visuelle en dizaines.                | Oubli systématique de la retenue $\rightarrow$ `METHOD_MISMATCH`                |
| **CE1** | Français      | `FR_CE1_GRAM_01`   | Identification du verbe et du sujet                | _Le Théâtre des Mots_ : Mimer l'action (verbe) et désigner l'acteur (sujet).                           | Incapacité à séparer nom et verbe dans la phrase $\rightarrow$ `CONCEPTUAL_GAP` |
| **CE2** | Sciences      | `SCI_CE2_VIV_01`   | Les états de la matière (eau liquide, solide, gaz) | _Le Laboratoire du Glaçon Disparu_ : Chronométrer et faire fondre/surchauffer de l'eau avec manique.   | Incompréhension de la conservation de la masse $\rightarrow$ `CONCEPTUAL_GAP`   |
| **CE2** | Histoire-Géo  | `HG_CE2_HIST_01`   | Se repérer dans le temps et frise chronologique    | _La Machine à Voyager dans le Temps_ : Classer les objets du grand-père au Moyen-Âge.                  | Inversion des époques historiques majeures $\rightarrow$ `LACK_OF_ENGAGEMENT`   |

#### Cycle 3 (Consolidation: CM1, CM2, 6ème)

| Grade    | Subject       | Code               | Topic Name                                   | Sample Gamified Hook                                                                            | Gap Detection Trigger                                                                                               |
| :------- | :------------ | :----------------- | :------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **CM1**  | Mathématiques | `MATH_CM1_FRAC_01` | Fractions simples (partage et mesure)        | _Le Maître Pâtissier_ : Découper une pizza ou un gâteau réel en 1/4, 1/8 et comparer.           | Additionner les numérateurs et dénominateurs ($\frac{1}{2}+\frac{1}{3}=\frac{2}{5}$) $\rightarrow$ `CONCEPTUAL_GAP` |
| **CM1**  | Français      | `FR_CM1_ORTH_01`   | Accord sujet-verbe avec sujet éloigné        | _L'Enquêteur de la Grammaire_ : Trouver le verbe et remonter le fil du sujet malgré les pièges. | Accord avec le complément le plus proche $\rightarrow$ `METHOD_MISMATCH`                                            |
| **CM2**  | Mathématiques | `MATH_CM2_DEC_01`  | Nombres décimaux et division posée           | _Le Changeur de Monnaie Internationale_ : Calculer les prix au centime près.                    | Placer la virgule au mauvais endroit $\rightarrow$ `METHOD_MISMATCH`                                                |
| **CM2**  | Sciences      | `SCI_CM2_TECHO_01` | Circuits électriques simples et conductivité | _L'Ingénieur de la Lampe de Poche_ : Fabriquer un interrupteur avec trombonne et pile.          | Confusion entre circuit ouvert et court-circuit $\rightarrow$ `CONCEPTUAL_GAP`                                      |
| **6ème** | Mathématiques | `MATH_6E_GEO_01`   | Périmètre, aire du rectangle et angles       | _Le Designer de Terrain de Jeu_ : Mesurer la chambre et calculer l'aire avec mètre ruban.       | Confusion entre Périmètre ($m$) et Aire ($m^2$) $\rightarrow$ `CONCEPTUAL_GAP`                                      |
| **6ème** | Histoire-Géo  | `HG_6E_GEO_01`     | Habiter les métropoles et cartes spatiales   | _L'Urbaniste du Futur_ : Dessiner la carte des transports de sa ville ou quartier.              | Difficulté d'échelle et orientation $\rightarrow$ `METHOD_MISMATCH`                                                 |

#### Cycle 4 (Approfondissements: 5ème, 4ème, 3ème)

| Grade    | Subject        | Code              | Topic Name                                   | Sample Gamified Hook                                                                           | Gap Detection Trigger                                                                           |
| :------- | :------------- | :---------------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **5ème** | Mathématiques  | `MATH_5E_ALG_01`  | Priorités opératoires et nombres relatifs    | _Le Thermomètre de l'Explorateur Polaire_ : Additionner/soustraire des températures négatives. | Erreur de signe (ex: $-5 - (-3) = -8$) $\rightarrow$ `CONCEPTUAL_GAP`                           |
| **5ème** | Sciences (SVT) | `SCI_5E_SVT_01`   | Repas, digestion et nutriments dans le corps | _Le Biologiste de la Nutrition_ : Analyser l'étiquette d'un repas et tracer le trajet.         | Blockage sur transformation chimique vs mécanique $\rightarrow$ `CONCEPTUAL_GAP`                |
| **4ème** | Mathématiques  | `MATH_4E_PYTH_01` | Théorème de Pythagore et trigonométrie       | _L'Infiltrateur des Toits (Parkour Math)_ : Vérifier l'équerre d'un mur avec la règle 3-4-5.   | Oubli d'extraire la racine carrée $\sqrt{c^2}$ $\rightarrow$ `PERFORMANCE_ANXIETY`              |
| **4ème** | Sciences (PC)  | `SCI_4E_PC_01`    | Molécules, atomes et réactions chimiques     | _Le Chimiste de la Réaction Mystère_ : Équilibrer l'équation de combustion d'une bougie.       | Oubli de la conservation des atomes $\rightarrow$ `CONCEPTUAL_GAP`                              |
| **3ème** | Mathématiques  | `MATH_3E_FUNC_01` | Fonctions affines/linéaires & probabilités   | _Le Data Analyst de l'Équipe_ : Modéliser le prix d'une course de vélo selon la distance.      | Confondre coefficient directeur $a$ et ordonnée à l'origine $b$ $\rightarrow$ `METHOD_MISMATCH` |
| **3ème** | Français       | `FR_3E_ARG_01`    | Rédiger un texte argumentatif structuré      | _Le Procès du Héros_ : Rédiger un plaidoyer de 3 arguments avec connecteurs logiques.          | Absence de transition et arguments contradictoires $\rightarrow$ `LACK_OF_ENGAGEMENT`           |

---

## 4. Bayesian Zone Proximale d'Apprentissage (ZPA) Telemetry Adjustment Algorithm

### 4.1 Concept & 5-Level Challenge Difficulty Scale

The Zone Proximale d'Apprentissage (ZPA / Vygotsky ZPD) represents the optimal challenge boundary: tasks that are too easy induce boredom; tasks that are too hard induce performance anxiety.

We define a formal **5-Level Difficulty Scale** for homework challenges:

```
[Level 1] Ancrage & Reconditionnement  (Very easy / High scaffolding / Zero anxiety)
[Level 2] Consolidation & Application   (Standard homework / Guided steps)
[Level 3] Zone Proximale Idéale (ZPA)   (Optimal challenge / High learning engagement)
[Level 4] Extension & Autonomie        (Advanced problem solving / Minimal hints)
[Level 5] Maîtrise & Dépassement       (Challenge / Olympiad level extension)
```

---

### 4.2 Mathematical Formulation & Bayesian Updating

Let $\theta \in [1.0, 5.0]$ be the child's estimated latent mastery level in subject domain $S$.  
Let $\sigma^2 \in [0.05, 1.0]$ represent estimation uncertainty.  
Let $P(A) \in [0.0, 1.0]$ be the current Bayesian probability of Performance Anxiety ($H_{\text{ANXIETY}}$).

#### Observation Signals ($Y_k$) from Telemetry & Homework Outcomes

When a child submits or attempts a challenge of difficulty level $L \in \{1, 2, 3, 4, 5\}$, the system captures:

1. `outcome`: $\text{SUCCESS}$ (verified completion) or $\text{ABANDONED}$ or $\text{FAILED\_PROOF}$.
2. `duration_ratio`: $\frac{\text{actual\_time}}{\text{estimated\_duration}}$.
3. `hesitation_score`: Frequency of hints requested or pause time before submitting.
4. `proof_confidence`: AI photo proof confidence score (0.0 to 1.0).

#### Likelihood Function for Student Mastery Update

Upon receiving submission outcome $Y_k$:

- If $\text{SUCCESS}$ on level $L$:
  $$\Delta \theta = + \eta \cdot \frac{L - \theta + 1}{1 + \text{hesitation\_score}}$$
  where learning rate $\eta = 0.35$.
- If $\text{ABANDONED}$ or $\text{FAILED}$ on level $L$:
  $$\Delta \theta = - \eta \cdot \frac{\theta - L + 1}{1 + P(A)}$$

#### Anxiety Damping Function ($P(A)$ Update)

- If `ABANDONED` after spending $\ge 50\%$ of duration $\implies P(A) \leftarrow \min(0.95, P(A) \times 1.4 + 0.15)$.
- If `SUCCESS` with low hesitation $\implies P(A) \leftarrow \max(0.01, P(A) \times 0.7 - 0.05)$.

---

### 4.3 ZPA Level Selection Algorithm

```typescript
export interface ZpaTelemetryState {
  domain: string;
  mastery_theta: number; // Continuous [1.0, 5.0]
  mastery_variance: number; // Uncertainty [0.05, 1.0]
  anxiety_probability: number; // Bayesian P(PERFORMANCE_ANXIETY)
  recent_success_streak: number;
}

export function computeNextChallengeDifficultyLevel(
  state: ZpaTelemetryState,
  currentLevel: number,
): {
  recommendedLevel: 1 | 2 | 3 | 4 | 5;
  scaffoldingMode: "HIGH_SUPPORT" | "STANDARD" | "CHALLENGE_PLUS";
  isAnxietyDamped: boolean;
  rationale: string;
} {
  const { mastery_theta, anxiety_probability, recent_success_streak } = state;

  // Rule 1: Anxiety Safety Damping Protocol
  // If anxiety probability > 0.40, IMMEDIATELY lower difficulty to Level 1 or 2
  // and inject "HIGH_SUPPORT" (doudou / stabilisation format).
  if (anxiety_probability > 0.4) {
    const safeLevel = Math.max(1, Math.floor(mastery_theta) - 1) as 1 | 2;
    return {
      recommendedLevel: safeLevel,
      scaffoldingMode: "HIGH_SUPPORT",
      isAnxietyDamped: true,
      rationale: `Détection d'anxiété (P=${Math.round(anxiety_probability * 100)}%) : repli sur niveau ${safeLevel} rassurant avec étayage maximal.`,
    };
  }

  // Rule 2: Anti-Spike Step Constraint
  // Maximum step change is +/- 1 level per iteration to prevent frustration spikes.
  let targetRaw = Math.round(mastery_theta);
  if (recent_success_streak >= 3) {
    targetRaw += 1; // Boost when on a strong streak
  }

  const clampedTarget = Math.max(1, Math.min(5, targetRaw));
  const stepDiff = clampedTarget - currentLevel;
  const boundedStep = Math.sign(stepDiff) * Math.min(1, Math.abs(stepDiff));
  const finalLevel = (currentLevel + boundedStep) as 1 | 2 | 3 | 4 | 5;

  const scaffoldingMode =
    finalLevel >= 4 ? "CHALLENGE_PLUS" : finalLevel <= 2 ? "HIGH_SUPPORT" : "STANDARD";

  return {
    recommendedLevel: finalLevel,
    scaffoldingMode,
    isAnxietyDamped: false,
    rationale: `ZPA nominale : niveau ${finalLevel} sélectionné (Maîtrise $\\theta=${mastery_theta.toFixed(2)}$, niveau actuel ${currentLevel}).`,
  };
}
```

---

### 4.4 Telemetry Integration Hooks (`naya-telemetry.ts`)

To ensure ZPA adjustments feed into system observability without performance overhead:

1. **Telemetry Event Metric**: Track `zpa_adjustments_total`, `anxiety_dampings_count`, and `level_distribution` across Levels 1–5.
2. **Cost & Token Impact**: ZPA adjustments use deterministic rule evaluation ($0$ AI calls). DeepSeek Reasoner ($R1$) is only invoked when `hypothesis_cycles` opens due to persistent gaps ($\ge 4$ failures/gaps). This maintains cost control ($<\$0.005$ per active user session).

---

## 5. Integration Blueprint & System Impact

### 5.1 Proposed Schema Extension (`supabase/migrations/`)

To support school grades and ZPA telemetry tracking natively:

```sql
-- Migration: add_school_grade_and_zpa_telemetry.sql

-- 1. Add school_grade to child_profiles
ALTER TABLE public.child_profiles
  ADD COLUMN school_grade text CHECK (
    school_grade IS NULL OR school_grade IN ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème')
  );

-- 2. Add numeric challenge level (1-5) and scaffolding mode to challenges
ALTER TABLE public.challenges
  ADD COLUMN challenge_level integer CHECK (challenge_level IS NULL OR (challenge_level BETWEEN 1 AND 5)),
  ADD COLUMN scaffolding_mode text CHECK (scaffolding_mode IS NULL OR scaffolding_mode IN ('HIGH_SUPPORT', 'STANDARD', 'CHALLENGE_PLUS'));

-- 3. ZPA Telemetry State Table per child & subject
CREATE TABLE public.child_zpa_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  mastery_theta numeric(3,2) NOT NULL DEFAULT 2.00,
  mastery_variance numeric(3,2) NOT NULL DEFAULT 0.50,
  anxiety_probability numeric(3,2) NOT NULL DEFAULT 0.10,
  current_level integer NOT NULL DEFAULT 2 CHECK (current_level BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, subject)
);

ALTER TABLE public.child_zpa_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read their children ZPA telemetry"
  ON public.child_zpa_telemetry FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.child_profiles WHERE id = child_id));
```

---

## 6. Verification Strategy & Handoff Readiness

### 6.1 Independent Verification Methods

1. **Schema Integrity**: Run Supabase schema checks against migration scripts.
2. **Curriculum Coverage Test**: Verify that all 4 subjects (Maths, Français, Sciences, Histoire-Géo) have nodes defined for CP, CE1, CE2, CM1, CM2, 6ème, 5ème, 4ème, 3ème.
3. **Bayesian ZPA Algorithm Unit Tests**:
   - Verify anxiety damping: Mock $P(\text{Anxiety}) = 0.50 \implies \text{Level drops to } 1 \text{ or } 2$ with `HIGH_SUPPORT`.
   - Verify anti-spike: Mock success at Level 2 with $\theta = 5.0 \implies \text{Next level is strictly } 3$ (max step $+1$).

---

_End of Exploration Report._

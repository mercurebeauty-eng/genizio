# Project: Fusion Académique-Ludique (feat/naya-academic-homework-fusion)

## Architecture

- **Challenge Generation Engine**: `src/lib/challenges.functions.ts` enriched with academic homework fusion modules (`src/lib/academic-homework.functions.ts` / academic curriculum definitions & drivers mapper).
- **Academic Subjects & Grade Curriculum (CP à 3ème)**: Standard subjects (Maths, Français, Sciences, Histoire-Géo, Anglais) mapped to grade levels (CP, CE1, CE2, CM1, CM2, 6ème, 5ème, 4ème, 3ème) and behavioral drivers (_déconstruire_, _schématiser_, _simuler_, _enquêter_).
- **ZPA & Telemetry Engine**: Integration with `src/lib/naya-telemetry.ts` and `hypothesis_cycles` for Bayesian progression metrics and performance anxiety prevention.
- **Hybrid UI Components**:
  - `src/components/challenges/HomeworkModeToggle.tsx`: Toggle between Free Challenges ("Défis Libres") and Homework ("Devoirs Scolaires").
  - `src/components/challenges/HybridHomeworkInput.tsx`: Dual-mode input allowing parents to enter explicit homework tasks or pick grade-adapted suggestions/gaps.
- **Verification & Testing**: Dedicated Vitest suite `src/lib/academic-homework.test.ts` verifying homework generation, behavioral driver fusion, and ZPA difficulty telemetry.

## Code Layout

- `src/lib/challenges.functions.ts`: Main entry point for Naya AI challenge generation.
- `src/lib/academic-homework.functions.ts`: Helper definitions for subjects, curriculum topics (CP to 3ème), behavioral drivers mapping, and ZPA adjustment.
- `src/lib/naya-telemetry.ts`: Telemetry tracking for AI calls, ZPA difficulty progression, and hypothesis cycles.
- `src/routes/profiles.$profileId.challenges.tsx` (or related challenge routes/components): Parent & child challenge interface with hybrid input & mode toggle.
- `src/components/challenges/`: Dedicated UI components for homework selection, custom topic input, and mode toggle.
- `src/lib/academic-homework.test.ts`: Automated Vitest unit test suite.

## Milestones

| #   | Name                                             | Scope                                                                                                                                                                                                                          | Dependencies | Status      |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------- |
| 1   | Exploratory Analysis & Blueprint (R1, R2, R3)    | Deep investigation of `challenges.functions.ts`, existing profile data model, grade levels, behavioral drivers, ZPA telemetry, and UI routes. Blueprint for academic fusion.                                                   | none         | DONE        |
| 2   | Engine Fusion & Academic Domain Logic (R1, R3)   | Enrich Naya engine with academic subjects (Maths, Français, Sciences, Histoire, etc.), behavioral driver fusion (déconstruire, schématiser, simuler, enquêter), ZPA Bayesian difficulty adjustment, telemetry, and unit tests. | M1           | DONE        |
| 3   | Hybrid Parent UI & Homework Mode Toggle (R2, R3) | Hybrid input UI (explicit prompt vs CP-3ème suggestions/gaps), mode toggle (Défis Libres vs Devoirs Scolaires), profile integration, and UI component tests.                                                                   | M1, M2       | IN_PROGRESS |
| 4   | E2E Verification, Vitest Suite & Forensic Audit  | `npx tsc --noEmit` (0 errors), dedicated Vitest test suite validation (100% pass), Challenger execution verification, and Forensic Audit (`teamwork_preview_auditor`) CLEAN verdict.                                           | M1, M2, M3   | PLANNED     |

## Interface Contracts & Quality Standards

- Strict Zero Error Swallowing: `catch {}` and `.catch(() => null)` must log errors and display UI notification toast.
- Async UX Safety: Double-click prevention, loading indicators, empty states, and error fallbacks.
- Automated Checks: `npx tsc --noEmit` must pass with 0 errors. `npx vitest run` must pass with 100% green tests.
- Integrity: CLEAN verdict required from Forensic Auditor.

## Optimisation SEO & Contenu — Guides Landing Page

### Historique des interventions

| Date       | Guide                                                                                                                                                       | Action                                   | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | `ecrans-addiction-alternatives-enfant`                                                                                                                      | Réécriture SEO complète                  | Titre H1, meta title, meta description, tous les H2, intro, corps enrichi (blocs "Pourquoi ça marche"), FAQ élargie à 4 questions. Injection mots-clés : "accro aux écrans", "temps d'écran", "activité sans écran", "limiter les écrans", "sevrage numérique". Mise à jour cohérente dans `guides.index.tsx` et `llms.txt`.                                                                                                                                                                                                                                    |
| 2026-08-14 | `ecrans-addiction-alternatives-enfant` (PR #75)                                                                                                             | Ajout discussion + changement progressif | 2 aspects disruptifs manquants : (1) section « Parler avec son enfant avant de toucher aux écrans » — questions à poser, écoute sans jugement, contrat négocié ; (2) section « Le changement progressif : le sevrage en douceur » — métaphore du sevrage en élevage (10 % par semaine), tableau de réduction sur 4-6 semaines, chaque palier remplacé par une activité. FAQ 4 → 6, `dateModified` ajouté.                                                                                                                                                       |
| 2026-08-14 | Vague CRITICAL ×3 (PR #76) : `autonomie-responsabilite-maison`, `discipline-positive-sans-punition`, `education-enfants-afrique-francophone`                | Réécritures complètes                    | Autonomie : H1 actionnable, jargon supprimé (« posture de gestionnaire », « Pay-to-win », « portfolio »), tableau tâches par âge. Discipline : H1 « se faire obéir sans crier ni frapper », ancrage africain (autorité partagée, honte publique vs humiliation), scripts parentaux (marché, maison, école), position claire sur la fessée. Éducation-Afrique : manifeste → guide pratique (carnet des petites réussites, enquête du quartier, heure du conte inversée), « intelligence entrepreneuriale » supprimé, école coranique/pression scolaire injectés. |
| 2026-08-14 | Vague HIGH ×7 (PR #77) : `fratrie`, `ia-apprentissage`, `intelligences-multiples`, `timidite`, `decrochage-scolaire`, `defis-ados`, `orientation`           | Réécritures complètes                    | IA : **ChatGPT nommé**, 5 prompts concrets pour les devoirs. Fratrie : « disputes frères et sœurs » dans H1, scripts d'arbitrage. Intelligences : recentrage enfant, section surdoué/HPI, débat épistémologique réduit. Timidité : anglicismes supprimés, tableau préparation exposé. Décrochage : H1 actionnable, tableau signaux d'alerte (harcèlement, redoublement). Défis-ados : section « introduire un défi sans conflit », téléphone/réseaux sociaux injectés. Orientation : « passion d'ancrage » supprimé, filières réelles (CAP, BTS, artisanat).    |
| 2026-08-14 | Vague MEDIUM ×6 (PR #78) : `activites-educatives`, `activites-manuelles`, `gestion-colere`, `enfant-agite`, `potentiel-haut-potentiel`, `reussite-scolaire` | Réécritures complètes                    | « sans écran » dans H1 activités. Manuelles : 3 activités phares en pas-à-pas. Colère : « crise de colère » dans H1, tableau « que dire / ne jamais dire ». Agité : H1 « agité ou hyperactif », section devoirs avec enfant qui bouge, sommeil/sucre/sport. Potentiel : H1 « surdoué, HPI ou précoce », FAQ zèbre et saut de classe. Réussite : section classes surchargées, « leviers » supprimé.                                                                                                                                                              |

### Principes éditoriaux appliqués

- **Langage parental direct** : pas de jargon pseudo-scientifique ("choc dopaminergique"), formulations que les parents tapent réellement dans Google.
- **Mots-clés à fort volume** injectés dans titre, H2 et corps — sans sur-optimisation.
- **Enrichissement du corps** par des blocs explicatifs "Pourquoi ça marche" sur chaque activité proposée.
- **FAQ élargie** avec des questions correspondant aux requêtes longue traîne réelles.
- **Cohérence cross-fichiers** : tout changement de titre dans un guide doit être propagé dans `guides.index.tsx`, `llms.txt`, et les `related` des autres guides.
- **Ancrage culturel africain** : autorité partagée (tonton, grand-mère, école), réalité des classes surchargées, école coranique, filières professionnelles locales — jamais de transposition occidentale brute.
- **Actions concrètes > théorie** : chaque guide propose des scripts parentaux mot à mot, des tableaux (tâches par âge, paliers, signaux d'alerte) ou des défis réalisables le soir même.
- **Méthodes inventées interdites** : toute expression pseudo-scientifique non sourcée ("intelligence entrepreneuriale", "passion d'ancrage", "méthode du projet responsabilisant") est bannie ; on reformule en langage parental ou on supprime.
- **JSON-LD complet** : `Article` avec `dateModified` à jour, `FAQPage`, `BreadcrumbList` sur chaque guide.

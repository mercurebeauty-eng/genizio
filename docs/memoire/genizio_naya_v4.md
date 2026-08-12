---
name: genizio-naya-v4
description: Spec NAYA V4 — feuille de route de la phase 4 restante : chantiers 3 à 7 (boucle de modalités d'apprentissage, calibration du temps, boucle complète §36, double contextualisation, monde réel)
metadata:
  type: project
  status: feuille de route COMPLÈTE — chantiers 1-2 livrés (mergés), chantiers 3-7 livrés (PR #45, 2026-08-12)
  last_updated: 2026-08-12
---

# NAYA V4 — Feuille de route des chantiers 3 à 7

> Source de référence : analyse utilisateur « Évolution de Génizio » §6 à §41.
> **Cette spec est LE référentiel unique de la phase 4 restante** : chaque chantier a un
> début et une fin nets (périmètre, migrations, fichiers, tests, critères de complétion).
> Un chantier est marqué ✅ LIVRÉ quand il est mergé dans `main` et vérifié.

## Principe directeur (non-négociable)

> **Un défi n'a de valeur que s'il est pertinent pour l'enfant auquel il est destiné.**
> Le moteur fonctionne en boucle : PROFIL INITIAL → OBSERVATION → HYPOTHÈSES →
> DÉFI ADAPTÉ → COMPORTEMENT OBSERVÉ → RÉSULTAT → ANALYSE → MISE À JOUR DU PROFIL →
> NOUVEAU DÉFI (analyse §20). Naya enquête, elle ne juge jamais : pas de verdict, pas
> de probabilité affichée (règle mémoire, décision #27).

---

## ✅ Chantiers livrés (mergés dans main le 2026-08-12)

### Chantier 1 — Porte d'entrée (décisions #59-63, PR #43)
Âge 5-16 serveur (CHECK), saison-étiquette + campagnes indépendantes, temps adaptatif
(`time_pressure` standard/gentle/none + `time_limit_minutes` + événement `TIME_OVER`),
profil multidimensionnel (`school_level`, `languages`, `ability_profile`,
`school_relation`, `life_context`, `aspirations`, `is_active`), pouvoir admin
(onglet Profils, quota enfant, déblocage d'accès, surmodulation du temps).

### Chantier 2 — Naya V4 : « qui est cet enfant ? » (décisions #64-65, PR #44)
Aspirations en tout début d'onboarding, **conditionnelles au profil vulnérable** ;
déclaration de l'enfant à l'onboarding (source « enfant », ses mots) ; moteur
d'aspirations (`aspiration-map.ts` ponts, `aspiration-confidence.ts` statuts dérivés,
branche de recommandation `ASPIRATION`, parcours narratif « Boussole de Naya » /
« Univers explorés », 0 chiffre 0 verdict) ; défis micro vs projet (`kind`) + autonomie
progressive (`guidance_level` 1-5, filets `resolveKind`/`resolveGuidanceLevel`) ;
biais doux des difficultés déclarées (§8) ; escalier de confiance en l'adulte pour les
profils vulnérables (décision utilisateur).

---

## 🚧 Chantiers 3 à 7 (feuille de route — ordre d'exécution)

### Chantier 3 — Modes d'apprentissage : boucle de réévaluation des modalités (§22-26, §35, §38, Loup) — ✅ IMPLÉMENTÉ (décision #66, branche `feat/naya-v4-modalites-apprentissage`, PR en cours)

**Objectif** : un échec n'est jamais un verdict — jusqu'à 3 modalités différentes testées
avant conclusion, et la plateforme apprend « comment enseigner à cet enfant ».
Livré : migration `20260812170000` (presentation_mode + CHALLENGE_NOT_COMPLETED +
presentation_signals), `modalities.functions.ts` (resolveNextModality, reformulation,
filiation, résumé), `buildReformulationPrompt`, Loup kind `reformulation`, intégration
submitChallengeNotCompleted, intention parent qualitative. 529 tests verts, tsc, build.
Reste pour la boucle complète (orchestration §36, comparaison, garde-fou §35) :
chantier 5 ci-dessous.

1. **Migration** :
   - `challenges.presentation_mode text NULL CHECK` (texte/image/demonstration/manipulation/histoire/analogie/conversation/projet/situation_concrete) ;
   - événement `CHALLENGE_NOT_COMPLETED` au CHECK de `observation_events` **et** branche dans
     `log_challenge_observation` (UPDATE → not_completed), payload {challenge_id, domain, presentation_mode} ;
   - branche `apply_observation_to_twin` : CHALLENGE_NOT_COMPLETED → driver `perseverance` faible
     + comptage par modalité (signal « qu'est-ce qui échoue »).
2. **Logique** `src/lib/modalities.functions.ts` : `resolveNextModality({cause, age, tried})`
   (filet déterministe, priorité par cause, borne 3, jamais de répétition) ;
   `reformulateChallenge` (server fn POST, même objectif pédagogique, nouvelle modalité,
   `pedagogical_context = {is_reformulation, original_challenge_id, modality_attempt}`) ;
   `getModalityAttempts` / `compareModalityResults` ; intégration dans
   `submitChallengeNotCompleted` (pré-génération de la reformulation en arrière-plan,
   proposée en mission suivante si cause accommodable et < 3 essais).
3. **IA** : `REFORMULATION_INSTRUCTION` (naya-prompts.ts) — même compétence cible, modalité
   imposée, `presentation_mode` stricte dans le JSON ; **Loup** : kind `reformulation` +
   rubrique sémantique « même objectif que l'original, modalité respectée ».
4. **UI** : invisible pour l'enfant ; ligne qualitative parent dans « Ce que Naya a remarqué »
   (pedagogical-intention.ts, 0 chiffre, jamais de verdict).
5. **Tests** : resolveNextModality (ordre, borne, non-répétition), reformulation (même
   domaine/objectif, modalité valide), compteur d'essais, événement émis, narration.
6. **Critères de complétion** : échec → ≥1 reformulation générée automatiquement ; 3 essais max ;
   le Jumeau reçoit l'échec ; Loup audite la reformulation ; 0 chiffre/0 verdict.

### Chantier 4 — Calibration du temps par les observations (§5 suite) — ✅ IMPLÉMENTÉ (décision #67, branche `feat/naya-v4-modalites-apprentissage`, PR #45)

**Objectif** : `time_pressure` devient appris, jamais imposé — 3 répétitions de `TIME_OVER`
dans un même domaine (fenêtre 30 jours) → **proposition** de passage en `gentle`, le
parent valide (l'admin surmodule déjà via l'onglet Profils).
Livré : migration `20260812180000` (branche TIME_OVER dans `apply_observation_to_twin`),
`time-calibration.functions.ts` (`suggestTimePressureChange` pure, `getGentleTimeSuggestion`,
`applyGentleTimeProposal` idempotent), carte « Plus de temps pour {enfant} ? » dans le
portfolio (pattern « Une découverte de Naya », rejet en localStorage). 535 tests verts.

### Chantier 5 — Boucle de réévaluation complète (§36) — ✅ IMPLÉMENTÉ (décision #68, branche `feat/naya-v4-modalites-apprentissage`, PR #45)

**Objectif** : l'orchestration de bout en bout — question directrice : *« L'enfant ne
sait-il pas faire, ou n'avons-nous pas trouvé la bonne manière de lui faire démontrer
qu'il sait faire ? »* — et la règle d'or « personne n'est nul » (§35).
Livré : `failure-sequence.functions.ts` (`evaluateFailureSequence` pure avec comparaison
des tentatives et garde-fou §35 — aucune conclusion sous 2 modalités testées,
`buildFailureNarrative` 0 chiffre / 0 verdict, `getLatestFailureSequence` GET dérivée à
la lecture), carte « Ce que Naya a compris » au Portfolio, Loup kind `failure_sequence`
(rubrique zero-verdict / garde-fou-35 / zero-chiffre). 544 tests verts.

### Chantier 6 — Double contextualisation local → global (§30-31) + interdisciplinarité (§32) — ✅ IMPLÉMENTÉ (décision #69, branche `feat/naya-v4-modalites-apprentissage`, PR #45)

**Objectif** : le défi part des matériaux et réalités locaux, puis escalier vers outils
technologiques et standards internationaux — **jamais d'enfermement dans l'environnement
immédiat** ; un projet mobilise plusieurs compétences sans que l'enfant en ait conscience.
Livré : `contextualization.ts` (mapping déterministe 14 pays → matériaux locaux,
`buildContextualizationInstruction` escalier), injection dans bulk/single/pont aspiration,
`INTELLIGENCES_FIELD_INSTRUCTION` étendue (projet → 2 clés complémentaires). Aucune
migration. 554 tests verts. Reste éventuel (v2) : localisation dans les recommandations.

### Chantier 7 — Monde réel hors-app : fondations (§19, §29) — ✅ IMPLÉMENTÉ (décision #70, branche `feat/naya-v4-modalites-apprentissage`, PR #45)

**Périmètre honnête** : les rencontres réelles (mécanicien, atelier de menuiserie, camps,
labs) restent **hors de l'application** — l'app est une interface entre l'enfant, son
potentiel et le monde réel, jamais un univers fermé. Ce chantier pose les fondations :
1. **Documentation vision** : les données d'usage servent au développement des enfants,
   jamais à une exploitation commerciale (vision fondatrice) — inscrite dans la spec
   et la décision #70.
2. **Vue d'agrégation SQL interne** `talent_environment_signals` (migration
   `20260812190000`) : complétions validées par l'IA par environnement (pays, ville,
   domaine) × talent observé — prépare la réponse « quels environnements favorisent
   quels talents ? ». `REVOKE` pour anon/authenticated (service role seul).
3. **Probe vérifié** : service role lit la vue, anon bloqué.

---

## Ordre d'exécution et règles transverses

- **Ordre** : 0 (assainissement — fait) → 3 → 4 → 5 → 6 → 7 (4 et 6 indépendants ; 5 dépend de 3).
- Chaque chantier : migration push + probes SQL + `supabase gen types --linked`
  (CLI local, **jamais** MCP Supabase) → tests + `tsc --noEmit` + build → commits par
  partie → PR empilée → décisions + statut MEMORY + cette spec marquée ✅
  (`git add -f` pour docs, docs/ est dans .gitignore).
- Vérifier `pg_policies` avant toute confiance RLS ; jamais de réécriture d'historique
  poussé (contrainte Lovable) ; vocabulaire fermé côté client ; narration 0 chiffre /
  0 verdict ; UI/UX premium.

## Hors périmètre application (monde réel, analyse §19, §29-33)

Rencontres réelles, camps, labs — l'application est une interface entre l'enfant, son
potentiel et le monde réel, jamais un univers fermé. Les données d'usage doivent à terme
permettre de répondre « quels environnements favorisent quels talents ? » — au service du
développement des enfants, pas d'une exploitation commerciale (vision fondatrice).

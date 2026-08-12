---
name: genizio-naya-v4
description: Spec NAYA V4 — feuille de route de la phase 4 restante : chantiers 3 à 7 (boucle de modalités d'apprentissage, calibration du temps, boucle complète §36, double contextualisation, monde réel)
metadata:
  type: project
  status: feuille de route (chantiers 1-2 livrés, 3-7 planifiés — approuvée le 2026-08-12)
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

### Chantier 3 — Modes d'apprentissage : boucle de réévaluation des modalités (§22-26, §35, §38, Loup)

**Objectif** : un échec n'est jamais un verdict — jusqu'à 3 modalités différentes testées
avant conclusion, et la plateforme apprend « comment enseigner à cet enfant ».
État actuel : pas de notion de modalité, `not_completed` terminal, pas de reformulation,
canal échec → Jumeau troué (le trigger `log_challenge_observation` ignore `not_completed`).

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

### Chantier 4 — Calibration du temps par les observations (§5 suite)

**Objectif** : `time_pressure` devient appris, jamais imposé — N répétitions de `TIME_OVER`
dans un domaine → **proposition** de passage en `gentle`, le parent valide.

1. **Logique** : `getGentleTimeSuggestion` (server fn GET) — compte les `TIME_OVER` des 30
   derniers jours groupés par domaine (`payload->>'domain'`), seuil 3 → suggestion si
   `time_pressure = "standard"` ; `applyGentleTimeProposal` (POST, calqué sur
   `setChildTimePressureAdmin` sans `requireAdmin`) ; dismissal localStorage
   `genizio_dismissed_gentle_proposal_${profileId}` (pattern `dismissDiscovery`).
2. **Migration (mineure)** : branche TIME_OVER dans `apply_observation_to_twin`
   (signal time_awareness faible) pour que la calibration nourrisse le Jumeau.
3. **UI** : carte « Naya propose le mode doux » dans le portfolio, insérée après
   « Ce que Naya a remarqué » (pattern « Une découverte de Naya » : 2 boutons) ;
   ajout de `time_pressure` au select du portfolio.
4. **Tests** : seuil (2 vs 3), pas de suggestion si gentle/none, idempotence, validation parent.
5. **Critères de complétion** : 3 TIME_OVER → carte visible ; validation → gentle ;
   dismissal → carte masquée ; admin déjà opérationnel (onglet Profils).

### Chantier 5 — Boucle de réévaluation complète (§36)

**Objectif** : l'orchestration de bout en bout — question directrice : *« L'enfant ne
sait-il pas faire, ou n'avons-nous pas trouvé la bonne manière de lui faire démontrer
qu'il sait faire ? »* — et la règle d'or « personne n'est nul » (§35) : avant de
conclure qu'une capacité est absente, au moins 2 modalités doivent avoir été testées.

1. **Orchestration** `evaluateFailureSequence(childId, challengeId)` : échec → analyse de
   la réponse (existant) → analyse de la compréhension de la consigne (modification de la
   formulation = reformulation du chantier 3) → nouvelle tentative dans un nouveau support
   → **comparaison des résultats entre tentatives** → **identification du facteur explicatif**
   → mise à jour du profil (final_diagnosis enrichi + drivers + narration parent).
2. **Garde-fou §35** : un cycle ne peut conclure « capacité absente » qu'après ≥ 2 modalités
   testées ; sinon il reste ouvert (« encore à explorer ») — jamais de verdict.
3. **Loup** : kind `failure_sequence` — audit de la cohérence tentatives → facteur.
4. **UI** : carte parent « Ce que Naya a compris » (Portfolio), qualitative, 0 chiffre.
5. **Tests** : séquence complète simulée (échec → reformulation → succès → facteur =
   modalité), garde-fou §35, narration sans verdict.
6. **Critères de complétion** : la séquence complète §36 est exécutée et observée côté
   parent ; aucune conclusion « capacité absente » sous 2 modalités.

### Chantier 6 — Double contextualisation local → global (§30-31) + interdisciplinarité (§32)

**Objectif** : le défi part des matériaux et réalités locaux, puis escalier vers outils
technologiques et standards internationaux — **jamais d'enfermement dans l'environnement
immédiat** ; un projet mobilise plusieurs compétences sans que l'enfant en ait conscience.

1. **`src/lib/contextualization.ts`** : mapping déterministe pays → matériaux locaux
   (bambou, bois, textile, recyclé, argile…) — 0 IA ; enrichissement de
   `MATERIAL_TAGS_INSTRUCTION` + nouvelle `CONTEXTUALIZATION_INSTRUCTION` (escalier
   local → outil technologique simple → numérique/standard international, interdiction
   d'enfermement) ; pont explicite avec `ACADEMIC_REFERENTIAL_INSTRUCTION` (standards
   internationaux déjà utilisés).
2. **Interdisciplinarité** : `INTELLIGENCES_FIELD_INSTRUCTION` étendue (projet → 2 clés
   complémentaires explicites ; micro → 1-2) — le pipeline résout déjà les
   multi-intelligences et la validation distribue déjà les points multi.
3. **BDD** : rien (material_tags existe). **UI** : rien de lourd.
4. **Tests** : mapping pays → matériaux, prompt contient l'escalier et l'interdiction,
   specs projet avec 2 intelligences résolues par finalizeChallenge.
5. **Critères de complétion** : tout défi généré part d'un ancrage local du pays et
   contient une marche vers le global ; les projets ciblent 2 intelligences au plus.

### Chantier 7 — Monde réel hors-app : fondations (§19, §29)

**Périmètre honnête** : les rencontres réelles (mécanicien, atelier de menuiserie, camps,
labs) restent **hors de l'application** — l'app est une interface entre l'enfant, son
potentiel et le monde réel, jamais un univers fermé. Ce chantier pose les fondations :

1. **Documentation vision** (spec + décision mémoire) : les données d'usage servent au
   développement des enfants, jamais à une exploitation commerciale (vision fondatrice).
2. **Vue d'agrégation SQL (interne)** : environnement de défi (domaine + localisation) ×
   talents observés — prépare la réponse « quels environnements favorisent quels talents ? ».
3. **Probe SQL + documentation**. Aucune dépendance — peut être déplacé en fin de phase.

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

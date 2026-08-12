---
name: genizio-naya-v4
description: Spec NAYA V4 — chantier 2 de l'évolution « Porte d'entrée » : moteur d'aspirations, défis-projets, autonomie progressive, double contextualisation, calibration du temps, modes d'apprentissage
metadata:
  type: project
  status: plan (non implémenté)
  last_updated: 2026-08-12
---

# NAYA V4 — Spec du chantier 2

> Source de référence : analyse utilisateur « Évolution de Génizio » §6 à §41.
> **STATUT (2026-08-12) : sections 1 (moteur d'aspirations) et 2 (défis-projets)
> LIVRÉES** (décisions #64-65, branche `feat/naya-v4-aspirations-projets`) ;
> **sections 3 à 5 planifiées** (non implémentées).
> Le **chantier 1 « Porte d'entrée »** (décisions #59-63, 2026-08-12) est livré :
> âge 5-16 serveur, saison-étiquette, temps adaptatif (time_pressure/time_limit_minutes),
> profil multidimensionnel (school_level, languages, ability_profile, school_relation,
> life_context, aspirations), pouvoir admin (is_active, onglet Profils).

## Principe directeur (non-négociable)

> **Un défi n'a de valeur que s'il est pertinent pour l'enfant auquel il est destiné.**
> Le moteur fonctionne en boucle : PROFIL INITIAL → OBSERVATION → HYPOTHÈSES →
> DÉFI ADAPTÉ → COMPORTEMENT OBSERVÉ → RÉSULTAT → ANALYSE → MISE À JOUR DU PROFIL →
> NOUVEAU DÉFI (analyse §20). Naya enquête, elle ne juge jamais : pas de verdict, pas
> de probabilité affichée (règle mémoire, décision #27).

## 1. Moteur d'aspirations (hypothèses, pas verdicts) — analyse §10-16 — ✅ LIVRÉ (décision #65)

**État chantier 1** : `child_profiles.aspirations` collecte `[{label, type: metier|exploration}]`
et les prompts reçoivent « HYPOTHÈSE À EXPLORER » (contexte doux).

**À construire (chantier 2)** :
1. **Cycle d'hypothèses d'aspiration** : réutiliser la mécanique `hypothesis_cycles`
   (déjà en place pour les causes d'échec) avec un nouveau motif `ASPIRATION_TEST` —
   l'aspiration déclarée ouvre des défis « ponts » vers l'univers visé (ex. menuiserie :
   mesurer, compter, proportions, géométrie, séquence, précision — analyse §11).
2. **Divergence déclaré vs constaté** : quand N observés dans l'univers de l'aspiration
   contredisent la déclaration (engagement faible, aptitudes ailleurs), ne jamais dire
   « tu t'es trompé » mais chercher « qu'est-ce que tu sais réellement bien faire ? »
   (analyse §15) → suggestion de réorientation via la branche de recommandation.
3. **Déclaration de l'enfant lui-même** : pour les profils « enfant de rue » ou en
   conflit avec l'école, l'enfant doit pouvoir donner SA vision (ce qu'il veut faire,
   ce dont il a envie) — pas seulement le parent (analyse §10). UI mode enfant + consent.
4. Les intérêts déclarés restent des hypothèses à confiance dérivée
   (`interest-confidence.ts`, chantier déjà livré) — l'aspiration suit le même modèle.

## 2. Défi-projet + échelle d'autonomie progressive — analyse §27-29, §40 — ✅ LIVRÉ v1 (décision #65)

**Livré (v1)** : typologie `kind` (micro/projet) + `guidance_level` 1-5 (filets déterministes `resolveKind`/`resolveGuidanceLevel`, retrait progressif −1 cran/4 défis complétés dans le domaine), consigne dans les specs JSON, badge 🏗️ Projet. **Reste (chantier suivant)** :
1. **Typologie défi** : distinguer micro-activité d'entraînement (quelques minutes) et
   **projet réel** (construire, concevoir, rechercher, planifier, expérimenter, fabriquer,
   corriger → résultat observable). Nouveau champ `challenges.kind` (`micro` | `projet`)
   proposé par l'IA, résolu par filet déterministe (pattern `finalizeChallenge`).
2. **Niveau de guidage** : `challenges.guidance_level` (1-5) — consignes très détaillées
   au départ → « voici l'objectif, trouve une manière » → « voici le problème, conçois
   la solution » (analyse §28). La réduction du guidage devient une mesure de l'autonomie
   (nouveau driver N2, pattern `time_awareness`).
3. **Double contextualisation local → global** (analyse §29-31) : le projet part des
   matériaux et réalités locales (bambou, bois local, textile, recyclé — `material_tags`
   existants) puis introduit progressivement outils technologiques (Arduino, capteurs,
   numérique) et standards internationaux. Ne JAMAIS enfermer l'enfant dans son
   environnement immédiat.
4. **Interdisciplinarité assumée** (analyse §32) : un projet mobilise plusieurs
   compétences sans que l'enfant ait besoin d'en avoir conscience — le pont
   intérêt → compétence → concept → contexte → projet (analyse §34).

## 3. Modes d'apprentissage — analyse §22-26, §35-38

**État existant (chantiers Naya 2.0/3.0)** : causes `METHOD_MISMATCH`,
`PERFORMANCE_ANXIETY`, `CONCEPTUAL_GAP`…, défis discriminants, reformulation,
retests de soutien, `trait_subform` (5 valeurs), `behavioral_driver`.

**À construire** :
1. **Boucle de réévaluation systématisée** : après un échec, tester jusqu'à 3 modalités
   (texte / image / démonstration / situation concrète / manipulation / histoire /
   analogie / conversation / projet) avant toute conclusion — analyse §23-24.
2. **Modèle double de Naya** : le modèle de l'enfant (ce qu'il sait) ET le modèle de
   la manière d'enseigner à cet enfant (ce qui marche) — analyse §37. Persistance :
   extension de `pedagogical_twins` (drivers) + nouvelle table ou payload
   `presentation_preferences`.
3. **Personne n'est « nul »** : avant de conclure qu'une capacité est absente, chercher
   comment elle peut être révélée (analyse §35). Le « Loup » (Naya 3.0) apprend déjà des
   erreurs de l'IA — extension aux erreurs de modalité.

## 4. Calibration du temps par les observations — analyse §5 (suite)

**État chantier 1** : `time_pressure` (standard/gentle/none), `time_limit_minutes`,
événement `TIME_OVER` → driver `time_awareness`.

**À construire** : boucle de calibration — N répétitions de `TIME_OVER` dans un même
domaine/niveau déclenchent une proposition de passage en `gentle` (jamais automatique :
le parent valide, ou l'admin surmodule via l'onglet Profils). `time_pressure` devient
un paramètre évolutif du profil, pas seulement déclaré.

## 5. Boucle de réévaluation complète (analyse §36)

```text
ÉCHEC → analyse de la réponse → analyse de la compréhension de la consigne →
modification de la formulation → nouveau contexte/support → deuxième tentative →
comparaison des résultats → identification du facteur explicatif → mise à jour du profil
```

Question directrice : **« L'enfant ne sait-il pas faire, ou n'avons-nous pas encore
trouvé la bonne manière de lui faire démontrer qu'il sait faire ? »** (analyse §36).

## Ordre d'implémentation suggéré

1. Moteur d'aspirations (1) — réutilise le plus d'existant (cycles, recommandations).
2. Typologie défi-projet + guidance_level (2.1-2.2) — filet déterministe d'abord.
3. Boucle de réévaluation des modalités (3.1) — extension des hypothèses existantes.
4. Calibration du temps (4) — volume de `TIME_OVER` requis, petit volume.
5. Double contextualisation (2.3) + modèle d'enseignement (3.2) — après observation.

## Hors périmètre (monde réel, analyse §19, §29-33)

Rencontres réelles (mécanicien, atelier de menuiserie, professionnels), camps, labs —
l'application est une interface entre l'enfant, son potentiel et le monde réel, jamais
un univers fermé. Les données d'usage doivent à terme permettre de répondre « quels
environnements favorisent quels talents ? » — au service du développement des enfants,
pas d'une exploitation commerciale (vision fondatrice).

# Rapport d'Analyse Approfondie : Moteur de Génération de Défis Naya & Fusion Académique-Ludique

**Projet** : Génizio — Moteur d'Apprentissage & Pédagogie Active  
**Milestone** : Milestone 1 — Fusion Académique-Ludique (`feat/naya-academic-homework-fusion`)  
**Auteur** : Explorer 1 (Read-Only Investigation & AI Prompt Architecture)  
**Fichier Cible Principal** : `src/lib/challenges.functions.ts`  
**Nouveau Fichier Proposé** : `src/lib/academic-homework.functions.ts`  
**Date** : 23 Juillet 2026

---

## Executive Summary & Vision

Le projet Génizio fait évoluer son moteur de génération de défis Naya (`src/lib/challenges.functions.ts`) d'un système de défis d'éveil et de découverte générale vers une **moteur hybride académique-ludique**.

L'objectif principal de cette fonctionnalité (**Fusion Académique-Ludique**) est de permettre aux parents d'injecter une consigne de devoir scolaire concrète (ex: _"Tables de 7"_, _"Accord du participe passé"_, _"Le cycle de l'eau"_, _"La Révolution Française"_), associée à un niveau scolaire (du **CP à la 3ème**), et de la transformer instantanément en un défi physique, concret et captivant.

Pour maintenir l'ADN de Génizio, cette transformation académique ne doit pas être un banal questionnaire ou un exercice sur fiche papier, mais une **fusion comportementale** utilisant l'un des 5 leviers d'action préférentiels de l'enfant :

1. **Déconstruire / Démonter** (Analyse inverse, démontage de règles/structures).
2. **Schématiser / Cartographier** (Représentation visuelle, modèles, schémas physiques).
3. **Simuler / Modéliser** (Jeux de rôle, modélisation de systèmes, scénarios "et si").
4. **Enquêter / Investiguer** (Chasse aux indices, déduction, rôle de détective).
5. **Optimiser / Améliorer** (Chronométrage, recherche du meilleur rendement, défi de performance).

Le présent rapport fournit l'analyse complète du moteur existant, identifie les points d'ancrage et propose la conception technique exacte (interfaces, signatures de fonctions, prompts système, et garde-fous JSON) pour l'implémentation du Milestone 1.

---

## Section 1 : Analyse de l'Architecture Actuelle du Moteur Naya (`src/lib/challenges.functions.ts`)

### 1.1 Flux d'Exécution et Points d'Entrée

Le moteur `src/lib/challenges.functions.ts` contient actuellement 4 points d'entrée principaux de génération / manipulation de défis :

1. `generateChallenges` (`createServerFn`) : Génère un lot de $N$ défis (par défaut 4, max 6). Utilisé pour le renouvellement périodique du tableau de bord.
2. `generateSingleChallenge` (`createServerFn`) : Génère un défi unique à la demande ("Composer un défi ciblé" dans le Laboratoire d'Expériences). Retourne un brouillon prévisualisable.
3. `assignTemplateChallenge` (`createServerFn`) : Assigne formellement un défi (brouillon ou gabarit de l'Atelier) dans la table `challenges` de la base de données Supabase.
4. `recommendChallengesForChild` (dans `src/lib/recommendations.functions.ts`) : Génère un défi recommandé prioritaire (Mission d'investigation bayésienne, Essaimage ou Stabilisation du Jumeau Pédagogique).

### 1.2 Pipeline de Construction des Prompts Naya

Chaque appel de génération de défis suit une séquence de construction de prompt rigoureusement structurée :

```
[Profil Enfant & Ville/Pays]
       ↓
[Formatage des Intérêts/Leviers (formatChildInterestsPayload)]
       ↓
[Résumé des Défis Complétés Réçents & Observations Naya]
       ↓
[Guidance de Développement par Âge (AGE_DEVELOPMENT_GUIDANCE)]
       ↓
[Cible de Progression Académique (computeProgressionTargets & formatProgressionInstruction)]
       ↓
[Principes Directeurs Génizio (GENIZIO_PRINCIPLES)]
       ↓
[Contraintes & Recommandations d'Intelligences Moins Explorées (getLeastExploredTalentLabels)]
       ↓
[Rotation des Domaines & Anti-Répétition (shuffle(DOMAINS), buildAvoidRepeatsInstruction)]
       ↓
[Fragments d'Instructions Spécifiques : STEPS, MATERIAL_TAGS, INTELLIGENCES, TRAIT_SUBFORM, SAFETY, PROOF_MODE, ACADEMIC_REFERENTIAL]
       ↓
[Contrainte de Format JSON Brut]
```

### 1.3 Routage et Execution LLM

Le moteur de requêtage LLM est centralisé dans la fonction `callClaude` (qui sert de façade unifiée) :

- **Requêtes d'analyse d'image (Vision)** : Routées vers `callAnthropicVision` utilisant `claude-sonnet-5` via l'API Anthropic (`https://api.anthropic.com/v1/messages`).
- **Requêtes de texte brut et génération de JSON** : Routées vers `callDeepSeekText` via l'API OpenAI-compatible de DeepSeek (`https://api.deepseek.com/chat/completions`).
  - **Modèle standard (Volume élevé)** : `deepseek-v4-flash` (rapide et économique).
  - **Modèle de raisonnement / diagnostic bayésien** : `deepseek-v4-pro` avec option `{ type: "enabled", reasoning_effort: "high" }`.

L'extraction du JSON produit par les LLM s'appuie sur `extractJsonFromLLMResponse(raw)`, une fonction d'extraction robuste capable de nettoyer les blocs de code Markdown (`json ... `), d'isoler les objets JSON tronqués ou entourés de texte conversationnel.

### 1.4 Choke Point de Validation et Sécurité (`finalizeChallenge`)

Tous les défis générés ou assignés (qu'ils proviennent d'une génération en lot, d'un défi ciblé ou d'un gabarit) passent obligatoirement par un filtre de nettoyage et de sécurité unique : `finalizeChallenge`.

```typescript
export function finalizeChallenge<T>(c: T, age: number) {
  const safety = applySafetyNet(c, age);
  const proof = resolveProofMode(c.proof_mode, c.proof_target, c.declarative_award, c.title);
  const academic = resolveAcademicLevel(
    c.academic_domain,
    c.academic_level_age,
    c.academic_reference_note,
    c.title,
  );
  const resolvedIntelligences = resolveTargetIntelligences(c.intelligences);
  return {
    title: c.title.slice(0, 120),
    material_tags: c.material_tags ?? [],
    target_intelligences: resolvedIntelligences,
    trait_subform: resolveTraitSubform(resolvedIntelligences, c.trait_subform),
    difficulty: resolveDifficulty(c.difficulty, c.title),
    requires_supervision: safety.requires_supervision,
    supervision_warning: safety.supervision_warning,
    proof_mode: proof.proof_mode,
    proof_target: proof.proof_target,
    declarative_award: proof.declarative_award,
    academic_domain: academic.academic_domain,
    academic_level_age: academic.academic_level_age,
    academic_reference_note: academic.academic_reference_note,
  };
}
```

Ce goulot d'étranglement garantit :

1. **Sécurité active (`applySafetyNet`)** : Analyse par expressions régulières (Unicode lookarounds) pour détecter la présence de mots-clés à risque (feu, lame, produits chimiques, électricité, cuisson/chaleur, hauteur/eau) et forcer la supervision d'un adulte adaptée à l'âge (<12 ans ou >=12 ans).
2. **Normalisation du mode de preuve (`resolveProofMode`)** : Vérifie la validité des métriques déclaratives et replie sur le mode `photo` en cas d'incohérence.
3. **Validation du Référentiel Académique Interne (`resolveAcademicLevel`)** : Contrôle la présence des 9 domaines académiques internes (`mathematiques`, `langage`, `sciences`, `corporelle`, `sociale`, `emotionnelle`, `entrepreneuriale`, `artisanale`, `spatiale`) et le niveau d'âge (3 à 18 ans).
4. **Validation des Intelligences et Sous-Formes (`resolveTargetIntelligences` & `resolveTraitSubform`)** : Filtre les clés d'intelligences générées contre `VALID_TALENT_KEYS` et vérifie la cohérence du sous-trait dans `TALENT_SUBFORMS`.

---

## Section 2 : Injection des Intérêts et Leviers Comportementaux dans le Moteur Actuel

### 2.1 Traitement Actuel des Centres d'Intérêt (`formatChildInterestsPayload`)

Dans le système actuel, les centres d'intérêt de l'enfant (`child.interests`) sont stockés sous forme de tableau de chaînes (ex: `["demonte_pour_comprendre", "besoin_de_bouger", "negocie_toujours"]`).

La fonction `formatChildInterestsPayload` associe chaque tag à son groupe de talent d'origine via `INTERESTS_BY_TALENT` (défini dans `src/components/profiles/shared.ts`) :

```typescript
export function formatChildInterestsPayload(interests?: string[] | null): string {
  const normalized = normalizeChildInterests(interests);
  if (normalized.length === 0) {
    return "Aucun levier spécifique renseigné — explorer et expérimenter avec différentes postures d'apprentissage.";
  }

  const tagMap = new Map<string, string>();
  for (const [, talentGroup] of Object.entries(INTERESTS_BY_TALENT)) {
    for (const tag of talentGroup.tags) {
      tagMap.set(tag, talentGroup.label);
    }
  }

  return normalized
    .map((tag) => {
      const label = tagMap.get(tag);
      return label ? `- [${label}] "${tag}"` : `- [Levier d'action] "${tag}"`;
    })
    .join("\n");
}
```

### 2.2 Re-Cadrage dans `GENIZIO_PRINCIPLES`

Dans le prompt système `GENIZIO_PRINCIPLES`, la directive suivante est appliquée au LLM :

> _"CENTRES D'INTÉRÊT = LEVIERS COMPORTEMENTAUX ET MODES COGNITIFS PROFONDS : Ne traite jamais un centre d'intérêt comme un simple thème, un sujet de surface ou un hobby décoratif (ex: 'football', 'dinosaures'). Décode et exploite le LEVIER COMPORTEMENTAL ET LE MODE OPÉRATOIRE MENTAL sous-jacent de l'enfant (ex: 'Démonte pour comprendre', 'Négocie toujours', 'A besoin de bouger pour réfléchir'). Utilise ces traits comme MÉCANIQUE ET POSTURE D'APPRENTISSAGE pour introduire n'importe quel domaine."_

### 2.3 Constat et Limite de l'Approche Actuelle

Bien que `GENIZIO_PRINCIPLES` pose la bonne philosophie, le moteur actuel comporte des limites pour la fusion académique :

1. **Absence d'entrée explicite pour les devoirs scolaires** : Le parent ne peut pas saisir une consigne spécifique reçue de l'école (ex: _"Réviser la règle des participes passés avec l'auxiliaire avoir"_).
2. **Absence de niveau scolaire officiel (CP à 3ème)** : Le système ne manipule que `child.age` (un entier chronologique) et `academic_level_age`, mais pas les notions de cycles scolaires français/francophones (Cycle 2 : CP, CE1, CE2 ; Cycle 3 : CM1, CM2, 6ème ; Cycle 4 : 5ème, 4ème, 3ème).
3. **Absence de sélection explicite du driver comportemental** : Le driver est actuellement déduit de manière floue par le LLM à partir du tableau des intérêts globaux de l'enfant, sans garantie qu'un défi de révision précis utilisera explicitement la mécanique _"Déconstruire"_, _"Schématiser"_, _"Simuler"_, _"Enquêter"_ ou _"Optimiser"_.

---

## Section 3 : Spécification Technique de la Fusion Académique-Ludique

Pour combler ces lacunes, nous spécifions l'architecture technique exacte du nouveau module `src/lib/academic-homework.functions.ts` et les modifications requises dans `src/lib/challenges.functions.ts`.

### 3.1 Nouveau Module : `src/lib/academic-homework.functions.ts`

Ce nouveau module contiendra les types, le référentiel des programmes scolaires (CP à 3ème), le dictionnaire des drivers de fusion, et les fonctions d'assistance.

#### 3.1.1 Types et Interfaces

```typescript
export const ACADEMIC_SUBJECTS = [
  "mathematiques",
  "francais",
  "sciences",
  "histoire",
  "geographie",
  "anglais",
] as const;

export type AcademicSubject = (typeof ACADEMIC_SUBJECTS)[number];

export const ACADEMIC_SUBJECT_LABELS: Record<AcademicSubject, string> = {
  mathematiques: "Mathématiques & Logique",
  francais: "Français & Expression",
  sciences: "Sciences & Technologie",
  histoire: "Histoire & Chronologie",
  geographie: "Géographie & Espaces",
  anglais: "Anglais & Langues Vivantes",
};

export const GRADE_LEVELS = [
  "CP",
  "CE1",
  "CE2",
  "CM1",
  "CM2",
  "6EME",
  "5EME",
  "4EME",
  "3EME",
] as const;

export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADE_LEVEL_LABELS: Record<
  GradeLevel,
  { label: string; cycle: string; nominalAge: number }
> = {
  CP: { label: "CP", cycle: "Cycle 2 (Apprentissages fondamentaux)", nominalAge: 6 },
  CE1: { label: "CE1", cycle: "Cycle 2 (Apprentissages fondamentaux)", nominalAge: 7 },
  CE2: { label: "CE2", cycle: "Cycle 2 (Apprentissages fondamentaux)", nominalAge: 8 },
  CM1: { label: "CM1", cycle: "Cycle 3 (Consolidation)", nominalAge: 9 },
  CM2: { label: "CM2", cycle: "Cycle 3 (Consolidation)", nominalAge: 10 },
  "6EME": { label: "6ème", cycle: "Cycle 3 (Consolidation)", nominalAge: 11 },
  "5EME": { label: "5ème", cycle: "Cycle 4 (Approfondissements)", nominalAge: 12 },
  "4EME": { label: "4ème", cycle: "Cycle 4 (Approfondissements)", nominalAge: 13 },
  "3EME": { label: "3ème", cycle: "Cycle 4 (Approfondissements)", nominalAge: 14 },
};

export const BEHAVIORAL_DRIVERS = [
  "deconstruire",
  "schematiser",
  "simuler",
  "enqueter",
  "optimiser",
] as const;

export type BehavioralDriver = (typeof BEHAVIORAL_DRIVERS)[number];

export const BEHAVIORAL_DRIVER_LABELS: Record<
  BehavioralDriver,
  { title: string; description: string }
> = {
  deconstruire: {
    title: "Déconstruire / Démonter",
    description:
      "Analyse inverse, démontage de règles, recherche d'erreurs cachées ou décorticage d'un mécanisme.",
  },
  schematiser: {
    title: "Schématiser / Cartographier",
    description:
      "Représentation visuelle, dessin technique, cartes mentales ou schémas physiques concrets.",
  },
  simuler: {
    title: "Simuler / Modéliser",
    description: "Jeu de rôle, expérimentation système, mise en situation et scénarios d'action.",
  },
  enqueter: {
    title: "Enquêter / Investiguer",
    description:
      "Chasse aux indices, résolution de mystères, déduction logique et rôle de détective.",
  },
  optimiser: {
    title: "Optimiser / Améliorer",
    description: "Chronométrage, recherche du meilleur rendement, défi de précision ou de vitesse.",
  },
};
```

#### 3.1.2 Référentiel des Sujets de Programme Suggérés (`CURRICULUM_TOPICS`)

Pour accompagner le parent qui n'a pas la consigne exacte sous les yeux, le module fournira un catalogue de thèmes officiels par classe et par matière :

```typescript
export const CURRICULUM_TOPICS: Record<GradeLevel, Record<AcademicSubject, string[]>> = {
  CP: {
    mathematiques: [
      "Dénombrement jusqu'à 100",
      "Addition simple (< 20)",
      "Formes géométriques de base",
      "Comparaison de grandeurs",
    ],
    francais: [
      "Sons et lettres (Phonologie)",
      "Écriture des lettres cursives",
      "Lecture de mots simples",
      "Vocabulaire de la maison",
    ],
    sciences: [
      "Les 5 sens",
      "Le corps humain de base",
      "Les animaux et leur milieu",
      "Objets vivants vs non-vivants",
    ],
    histoire: [
      "Se repérer dans la journée",
      "Les jours de la semaine",
      "Les saisons",
      "Arbre généalogique simple",
    ],
    geographie: [
      "Se repérer dans la classe",
      "Ma maison et mon école",
      "Plan simple de la chambre",
    ],
    anglais: [
      "Salutations et prénom",
      "Les nombres de 1 à 10",
      "Les couleurs de base",
      "Les animaux de compagnie",
    ],
  },
  CE1: {
    mathematiques: [
      "Tables de multiplication de 2 et 5",
      "Addition posée avec retenue",
      "Mesure de longueurs (cm, m)",
      "Soustraction simple",
    ],
    francais: [
      "Reconnaître le verbe et le sujet",
      "Nom propre vs nom commun",
      "L'accord dans le groupe nominal",
      "Lecture fluide de courts textes",
    ],
    sciences: [
      "Les états de l'eau (solide, liquide)",
      "Alimentation et santé",
      "Les plantes et leur croissance",
      "Electricité simple (pile et ampoule)",
    ],
    histoire: [
      "La frise chronologique de la journée à l'année",
      "Les objets d'autrefois vs aujourd'hui",
    ],
    geographie: [
      "Le quartier et la ville",
      "Lire un plan de quartier",
      "Les paysages urbains et ruraux",
    ],
    anglais: ["Exprimer ses goûts (I like...)", "Les parties du corps", "Les consignes de classe"],
  },
  CE2: {
    mathematiques: [
      "Tables de multiplication de 3, 4, 10",
      "Soustraction posée avec retenue",
      "Notion de périmètre",
      "Lire l'heure",
    ],
    francais: [
      "Le présent de l'indicatif (1er et 2ème groupe)",
      "Les types de phrases",
      "Orthographe grammaticale (a/à, et/est)",
      "Synonymes et antonymes",
    ],
    sciences: [
      "Le cycle de vie des animaux",
      "Les engrenages et mouvements",
      "Les déchet et le recyclage",
    ],
    histoire: [
      "Les grandes périodes de l'Histoire",
      "La Préhistoire et l'art rupestre",
      "L'Antiquité",
    ],
    geographie: ["La carte du pays (villes, fleuves)", "Les grands types de paysages"],
    anglais: ["Les jours et la météo", "Les consignes et questions simples", "La famille"],
  },
  CM1: {
    mathematiques: [
      "Toutes les tables de multiplication (1 à 10)",
      "Division à 1 chiffre",
      "Fractions simples (1/2, 1/4, 1/3)",
      "Aires et périmètres",
    ],
    francais: [
      "Accord du participe passé avec être/avoir",
      "Imparfait et futur de l'indicatif",
      "Complément d'objet (COD/COI)",
      "Champ lexical",
    ],
    sciences: [
      "Le cycle de l'eau complet",
      "Le système solaire et les planètes",
      "La digestion et la circulation sanguine",
    ],
    histoire: [
      "Moyen Âge (châteaux, chevaliers)",
      "Les Grandes Découvertes",
      "La monarchie en France et Afrique",
    ],
    geographie: ["Consommer en France/Afrique (eau, énergie)", "Reliefs et climats"],
    anglais: [
      "Présentation personnelle complète",
      "La routine quotidienne",
      "La nourriture et les repas",
    ],
  },
  CM2: {
    mathematiques: [
      "Nombres décimaux et opérations",
      "Division à 2 chiffres",
      "Proportionnalité et pourcentages",
      "Les angles",
    ],
    francais: [
      "Passé simple de l'indicatif",
      "Propositions indépendantes et coordonnées",
      "Attribut du sujet",
      "Vocabulaire abstrait",
    ],
    sciences: [
      "Énergie et ses transformations",
      "Écosystèmes et biodiversité",
      "Les volcans et séismes",
    ],
    histoire: [
      "La Révolution Française",
      "Le XIXe siècle et l'industrie",
      "Les deux Guerres Mondiales",
    ],
    geographie: [
      "Se déplacer dans le monde",
      "Internet et le réseau mondial",
      "La diversité des paysages mondiaux",
    ],
    anglais: [
      "Raconter un événement passé simple",
      "Les pays anglophones",
      "Les heures et horaires",
    ],
  },
  "6EME": {
    mathematiques: [
      "Fractions et quotients",
      "Écritures décimales et fractions",
      "Symétrie axiale",
      "Volumes et contenances",
    ],
    francais: [
      "Récits de création et création du monde",
      "Le monstre et la métamorphose",
      "Récits d'aventures",
      "Grammaire de la phrase complexe",
    ],
    sciences: [
      "Matière, mouvement, énergie et information",
      "Le vivant et sa diversité",
      "La Terre dans le système solaire",
    ],
    histoire: [
      "La longue histoire de l'humanité et les premières écritures",
      "Premiers états, premières écritures",
      "Le monde des cités grecques",
      "Rome et l'Empire",
    ],
    geographie: [
      "Habiter une métropole",
      "Habiter un espace à fortes contraintes",
      "Habiter les littoraux",
    ],
    anglais: ["Niveau A1 : Description de lieux, personnes, routines, projets simples"],
  },
  "5EME": {
    mathematiques: [
      "Priorités opératoires",
      "Nombres relatifs (introduction)",
      "Proportionnalité et échelles",
      "Triangles et angles",
    ],
    francais: [
      "Le voyage et l'aventure",
      "Avec autrui : familles, amis, réseaux",
      "Héros/Héroïnes et personnages",
      "L'imaginaire et la poésie",
    ],
    sciences: [
      "Organismes et santé",
      "Organisation et transformations de la matière",
      "Mouvement et interactions",
    ],
    histoire: [
      "Chrétientés et Islam au Moyen Âge",
      "Société, Église et pouvoir politique dans le féodalisme",
      "La Renaissance et les réformes",
    ],
    geographie: [
      "Démographie et développement durable",
      "Gestion des ressources (eau, énergie)",
      "Prévenir les risques",
    ],
    anglais: ["Niveau A1+ : Raconter une histoire, exprimer des choix, comparer des éléments"],
  },
  "4EME": {
    mathematiques: [
      "Nombres relatifs et opérations",
      "Théorème de Pythagore",
      "Équations du premier degré",
      "Théorème de Thalès (intro)",
    ],
    francais: [
      "Dire l'amour",
      "Individu et société : confrontations",
      "La fiction pour interroger le réel",
      "Informer, s'informer, déformer",
    ],
    sciences: [
      "Reproduction et génétique de base",
      "Chimie : atomes et molécules",
      "Vitesse et forces",
    ],
    histoire: [
      "Bourgeoisies mercantiles et traite négrière",
      "L'Europe des Lumières",
      "La Révolution et l'Empire",
      "L'Europe et le monde au XIXe siècle",
    ],
    geographie: [
      "L'urbanisation du monde",
      "Les espaces de la mondialisation",
      "Mobilités humaines internationales",
    ],
    anglais: ["Niveau A2 : Argumenter simplement, exprimer une opinion, récits au passé"],
  },
  "3EME": {
    mathematiques: [
      "Théorème de Thalès et réciproque",
      "Fonctions affines et linéaires",
      "Statistiques et probabilités",
      "Calcul littéral et factorisation",
    ],
    francais: [
      "Se raconter, se représenter",
      "Dénoncer les travers de la société",
      "Agir dans la cité : individu et pouvoir",
      "Progrès et rêves scientifiques",
    ],
    sciences: [
      "Génétique, ADN et hérédité",
      "Reactions chimiques acides-bases",
      "Énergie mécanique, cinétique, potentielle",
    ],
    histoire: [
      "L'Europe, théâtre majeur des deux guerres mondiales",
      "Démocraties et régimes totalitaires",
      "La Seconde Guerre Mondiale",
      "La Guerre Froide",
    ],
    geographie: [
      "Aire urbaine et dynamiques territoriales",
      "Les espaces productifs",
      "La France et l'UE dans le monde",
    ],
    anglais: [
      "Niveau A2/B1 : Débats, synthèses de documents, expression écrite et orale structurée",
    ],
  },
};
```

#### 3.1.3 Directives de Fusion Comportementale (`DRIVER_FUSION_GUIDANCE`)

```typescript
export const DRIVER_FUSION_GUIDANCE: Record<BehavioralDriver, string> = {
  deconstruire: `MÉCANIQUE DE FUSION "DÉCONSTRUIRE / DÉMONTER" :
- Le défi doit amener l'enfant à démonter une règle, isoler des composants ou analyser un système à l'envers.
- Exemples : Trouver l'erreur cachée dans 3 exemples faux, démonter la structure d'une phrase pour isoler les briques, fabriquer un dispositif puis le démonter pour expliquer chaque pièce, trouver les contre-exemples d'une règle mathématique.`,

  schematiser: `MÉCANIQUE DE FUSION "SCHÉMATISER / CARTOGRAPHIER" :
- Le défi doit amener l'enfant à transformer une notion abstraite en un schéma visuel physique, une carte géante ou une maquette.
- Exemples : Dessiner un arbre de décision géant à la craie ou sur carton, réaliser une carte avec des objets réels, modéliser le cycle d'un phénomène avec des flèches et objets du quotidien, schématiser une frise historique au sol.`,

  simuler: `MÉCANIQUE DE FUSION "SIMULER / MODÉLISER" :
- Le défi doit placer l'enfant dans un jeu de rôle ou une expérience de simulation physique en direct.
- Exemples : Incarnation d'un personnage historique ou scientifique, simulation d'un marché avec fausse monnaie, modélisation d'une expérience scientifique avec des récipients de la maison, jeu de rôle où l'enfant enseigne ou teste une règle sur un adulte.`,

  enqueter: `MÉCANIQUE DE FUSION "ENQUÊTER / INVESTIGUER" :
- Le défi doit être structuré comme une enquête de détective ou une chasse au trésor avec indices et déductions.
- Exemples : Retrouver les 5 phrases coupables cachées dans la maison, enquêter sur les objets du quotidien pour identifier leur matière/origine, résoudre une énigme chronométrée grâce à des calculs exacts, mener une interview d'un parent sur un sujet d'histoire.`,

  optimiser: `MÉCANIQUE DE FUSION "OPTIMISER / AMÉLIORER" :
- Le défi doit amener l'enfant à viser la précision, le meilleur rendement ou une performance mesurable et améliorable.
- Exemples : Record de vitesse sur le calcul mental de la table visée, optimisation d'une méthode de mémorisation de mots en 3 tours, construction d'un système le plus résistant ou le plus rapide avec test de charge.`,
};
```

---

### 3.2 Integration dans `src/lib/challenges.functions.ts`

Dans `src/lib/challenges.functions.ts`, nous allons ajouter la nouvelle Server Function `generateAcademicHomeworkChallenge` et étendre `ChallengeSchema` pour inclure les métadonnées scolaires.

#### 3.2.1 Schéma Zod Mis à Jour (`ChallengeSchema`)

```typescript
const ChallengeSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
  material_tags: z.array(z.string()).optional(),
  pedagogical_context: z.string().nullable().optional(),
  intelligences: z.array(z.string()).optional(),
  trait_subform: z.string().nullable().optional(),
  requires_supervision: z.boolean().default(false),
  supervision_warning: z.string().nullable().optional(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).optional(),
  proof_mode: z.enum(["photo", "declarative"]).optional(),
  proof_target: z.object({ metric: z.string(), value: z.number() }).nullable().optional(),
  declarative_award: z.record(z.string(), z.number()).nullable().optional(),
  academic_domain: z.enum(ACADEMIC_DOMAINS).nullable().optional(),
  academic_level_age: z.number().nullable().optional(),
  academic_reference_note: z.string().nullable().optional(),
  // NOUVEAUX CHAMPS DE FUSION ACADÉMIQUE
  academic_subject: z
    .enum(["mathematiques", "francais", "sciences", "histoire", "geographie", "anglais"])
    .nullable()
    .optional(),
  academic_grade_level: z
    .enum(["CP", "CE1", "CE2", "CM1", "CM2", "6EME", "5EME", "4EME", "3EME"])
    .nullable()
    .optional(),
  homework_instruction: z.string().nullable().optional(),
  behavioral_driver: z
    .enum(["deconstruire", "schematiser", "simuler", "enqueter", "optimiser"])
    .nullable()
    .optional(),
});
```

#### 3.2.2 Signature & Implémentation de `generateAcademicHomeworkChallenge`

```typescript
const GenerateAcademicHomeworkInput = z.object({
  childId: z.string().uuid(),
  subject: z.enum(["mathematiques", "francais", "sciences", "histoire", "geographie", "anglais"]),
  gradeLevel: z.enum(["CP", "CE1", "CE2", "CM1", "CM2", "6EME", "5EME", "4EME", "3EME"]),
  homeworkInstruction: z.string().min(2).max(500),
  behavioralDriver: z
    .enum(["deconstruire", "schematiser", "simuler", "enqueter", "optimiser"])
    .optional(),
  timeAvailable: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
});

export const generateAcademicHomeworkChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateAcademicHomeworkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Récupération du profil enfant
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable");

    // 2. Récupération des historiques récents pour éviter les doublons
    const [{ data: existing }] = await Promise.all([
      supabase
        .from("challenges")
        .select("title")
        .eq("child_id", data.childId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const existingTitles = (existing ?? []).map((c) => c.title);
    const gradeInfo = GRADE_LEVEL_LABELS[data.gradeLevel];
    const targetAge = gradeInfo.nominalAge;
    const timeAvailable = data.timeAvailable || "30 min";

    // Détermination du driver comportemental (sélectionné par le parent ou déduit des intérêts de l'enfant)
    const selectedDriver: BehavioralDriver = data.behavioralDriver || "deconstruire";
    const driverGuidance = DRIVER_FUSION_GUIDANCE[selectedDriver];
    const subjectLabel = ACADEMIC_SUBJECT_LABELS[data.subject];

    // 3. Prompt de Fusion Académique-Ludique
    const prompt = `Tu es Naya, un mentor pédagogique d'élite spécialisé dans l'apprentissage ludique et l'ancrage concret des devoirs scolaires en Afrique francophone.
Ta mission est de transformer une CONSEIGNE DE DEVOIR SCOLAIRE sous forme d'un DÉFI PHYSIQUE, CAPTIVANT ET CONCRET.

Profil de l'enfant :
- Prénom : ${child.name}
- Âge chronologique : ${child.age} ans
- Classe actuelle : ${gradeInfo.label} (${gradeInfo.cycle})
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Modes d'engagement et leviers comportementaux observés :
${formatChildInterestsPayload(child.interests)}

CONSIGNE DE SOUTIEN SCOLAIRE / DEVOIR À FUSIONNER :
- Matière : ${subjectLabel} (${data.subject})
- Niveau scolaire visé : ${gradeInfo.label} (âge académique cible : ${targetAge} ans)
- Consigne / Devoir explicite du parent : "${data.homeworkInstruction}"
- Temps disponible : ${timeAvailable}
${data.homeMaterials ? `- Matériaux disponibles à la maison : ${data.homeMaterials}` : ""}

LEVIER COMPORTEMENTAL DE FUSION OBLIGATOIRE :
${driverGuidance}

RÈGLES DE FUSION ACADÉMIQUE-LUDIQUE STRICTES :
1. LE DEVOIR DOIT ÊTRE RÉELLEMENT RÉVISÉ/APPRIS : La réussite du défi doit garantir que l'enfant a pratiqué ou assimilé la consigne scolaire ("${data.homeworkInstruction}"). Le défi ne doit PAS détourner l'enfant du devoir, mais en faire la mécanique centrale du jeu.
2. PAS DE FICHE PAPIER NI DE QUIZ PASSIONS : Interdiction de proposer de simples QCM, fiches d'exercices ou rédictions passives. L'apprentissage doit passer par une action physique avec les objets de la maison ou du quartier.
3. RESPECT STRICT DU NIVEAU ${gradeInfo.label} : Le contenu académique doit correspondre exactement aux exigences de la classe de ${gradeInfo.label} (environ ${targetAge} ans).
4. ${GENIZIO_PRINCIPLES}
5. ${buildAvoidRepeatsInstruction(existingTitles)}
6. ${STEPS_INSTRUCTION}
7. ${SAFETY_INSTRUCTION}
8. ${PROOF_MODE_INSTRUCTION}
9. ${INTELLIGENCES_FIELD_INSTRUCTION}
10. ${TRAIT_SUBFORM_INSTRUCTION}

Réponds STRICTEMENT en JSON valide avec ce format exact :
{
  "domain": "${data.subject === "mathematiques" ? "Sciences" : data.subject === "francais" || data.subject === "anglais" ? "Langues" : "Sciences"}",
  "title": "Titre accrocheur du défi ludique",
  "description": "Pitch du défi pour l'enfant intégrant la révision de ${data.homeworkInstruction}",
  "duration": "${timeAvailable}",
  "steps": ["Étape 1", "Étape 2..."],
  "materials": ["Matériau 1", "Matériau 2..."],
  "material_tags": ["materiau-1"],
  "pedagogical_context": "Ce que Naya observe via cette activité de révision ludique",
  "intelligences": ["${data.subject === "mathematiques" ? "logico_mathematique" : data.subject === "francais" || data.subject === "anglais" ? "linguistique" : "creative"}"],
  "trait_subform": "...",
  "requires_supervision": false,
  "supervision_warning": null,
  "difficulty": "moyen",
  "proof_mode": "photo",
  "proof_target": null,
  "declarative_award": null,
  "academic_domain": "${data.subject === "mathematiques" ? "mathematiques" : data.subject === "francais" || data.subject === "anglais" ? "langage" : "sciences"}",
  "academic_level_age": ${targetAge},
  "academic_reference_note": "Consigne scolaire ${gradeInfo.label} : ${data.homeworkInstruction.slice(0, 100)}",
  "academic_subject": "${data.subject}",
  "academic_grade_level": "${data.gradeLevel}",
  "homework_instruction": "${data.homeworkInstruction.replace(/"/g, '\\"')}",
  "behavioral_driver": "${selectedDriver}"
}`;

    const content = await callClaude(prompt, true, undefined, 1500);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(content));
    } catch (err) {
      console.error(
        "Error parsing generateAcademicHomeworkChallenge LLM response:",
        err,
        "Raw:",
        content,
      );
      throw new Error("Réponse IA invalide");
    }

    let c: z.infer<typeof ChallengeSchema>;
    try {
      c = ChallengeSchema.parse(parsed);
    } catch (err) {
      console.error("Schema validation failed for academic challenge:", err);
      throw new Error("Réponse IA invalide — structure non conforme.");
    }

    // Passage dans le goulot de nettoyage
    const finalized = finalizeChallenge(c, child.age);

    return {
      ...c,
      ...finalized,
      academic_subject: data.subject,
      academic_grade_level: data.gradeLevel,
      homework_instruction: data.homeworkInstruction,
      behavioral_driver: selectedDriver,
    };
  });
```

---

## Section 4 : Garde-Fous LLM et Stratégie de Test

### 4.1 Garde-Fous de Parsing JSON et de Robustesse

1. **Assainissement du Markdown LLM (`extractJsonFromLLMResponse`)** : Le nouveau point d'entrée réutilise l'extracteur éprouvé du système pour neutraliser les balises ```json ou le texte d'introduction que le modèle peut insérer.
2. **Double Validation de Niveau Scolaire (`resolveAcademicLevel`)** : Si le LLM renvoie un `academic_level_age` hors de l'intervalle [3, 18], le moteur le remplace automatiquement par le `nominalAge` officiel de la classe renseignée (`GRADE_LEVEL_LABELS[gradeLevel].nominalAge`).
3. **Plafond de Jetons de Sortie (`maxOutputTokens = 1500`)** : Ajusté spécifiquement pour un défi unique complet sans risquer de tronquer la réponse ni de saturer le quota d'API.
4. **Fallback Sécurité Automatique (`applySafetyNet`)** : Garantie qu'une activité de physique/chimie ou de bricolage générée dans le cadre d'un devoir de sciences sera immédiatement marquée comme nécessitant la supervision d'un adulte en cas d'utilisation de flamme, cutter ou ustensile chaud.

### 4.2 Stratégie de Test et Vérification

1. **Vérification de Non-Régression** :
   - Exécution de la suite de tests existante avec Vitest (`npx vitest`) pour s'assurer qu'aucun changement sur `finalizeChallenge` ou `challenges.functions.ts` ne casse les 149 tests unitaires du projet.
   - Vérification du typage statique TypeScript (`npx tsc --noEmit`).
2. **Tests d'Intégration Proposés pour le Nouveau Module** :
   - Tester l'exactitude des correspondances `GRADE_LEVEL_LABELS` (ex: CM1 -> nominalAge 9).
   - Tester la récupération des thèmes officiels dans `CURRICULUM_TOPICS`.
   - Tester l'injection correcte des 5 drivers de fusion dans les prompts générés.

/**
/**
 * Academic Homework Generation Engine & ZPA Bayesian Telemetry Hooks
 * Module for Fusion Académique-Ludique (feat/naya-academic-homework-fusion)
 */

export type GradeLevel =
  | 'CP'
  | 'CE1'
  | 'CE2'
  | 'CM1'
  | 'CM2'
  | '6eme'
  | '5eme'
  | '4eme'
  | '3eme';

export type AcademicSubject =
  | 'maths'
  | 'francais'
  | 'sciences'
  | 'histoire_geo'
  | 'anglais';

export type BehavioralDriver =
  | 'deconstruire'
  | 'schematiser'
  | 'simuler'
  | 'enqueter'
  | 'optimiser';

export const ACADEMIC_SUBJECTS: readonly AcademicSubject[] = [
  'maths',
  'francais',
  'sciences',
  'histoire_geo',
  'anglais',
] as const;

export const GRADE_LEVELS: readonly GradeLevel[] = [
  'CP',
  'CE1',
  'CE2',
  'CM1',
  'CM2',
  '6eme',
  '5eme',
  '4eme',
  '3eme',
] as const;

export const BEHAVIORAL_DRIVERS: readonly BehavioralDriver[] = [
  'deconstruire',
  'schematiser',
  'simuler',
  'enqueter',
  'optimiser',
] as const;

export const ACADEMIC_SUBJECT_LABELS: Record<AcademicSubject, string> = {
  maths: 'Mathématiques & Logique',
  francais: 'Français & Expression',
  sciences: 'Sciences & Technologie',
  histoire_geo: 'Histoire & Géographie',
  anglais: 'Anglais & Langues Vivantes',
};

export const GRADE_LEVEL_METADATA: Record<
  GradeLevel,
  { label: string; cycle: string; nominalAge: number }
> = {
  CP: { label: 'CP', cycle: 'Cycle 2 (Apprentissages fondamentaux)', nominalAge: 6 },
  CE1: { label: 'CE1', cycle: 'Cycle 2 (Apprentissages fondamentaux)', nominalAge: 7 },
  CE2: { label: 'CE2', cycle: 'Cycle 2 (Apprentissages fondamentaux)', nominalAge: 8 },
  CM1: { label: 'CM1', cycle: 'Cycle 3 (Consolidation)', nominalAge: 9 },
  CM2: { label: 'CM2', cycle: 'Cycle 3 (Consolidation)', nominalAge: 10 },
  '6eme': { label: '6ème', cycle: 'Cycle 3 (Consolidation)', nominalAge: 11 },
  '5eme': { label: '5ème', cycle: 'Cycle 4 (Approfondissements)', nominalAge: 12 },
  '4eme': { label: '4ème', cycle: 'Cycle 4 (Approfondissements)', nominalAge: 13 },
  '3eme': { label: '3ème', cycle: 'Cycle 4 (Approfondissements)', nominalAge: 14 },
};

export interface CurriculumTopic {
  id: string;
  name: string;
  hook: string;
}

export const CURRICULUM_TOPICS: Record<
  GradeLevel,
  Record<AcademicSubject, CurriculumTopic[]>
> = {
  CP: {
    maths: [
      { id: 'maths_cp_1', name: "Dénombrement jusqu'à 100", hook: 'Le Trésor des Pirates : Compter des objets réels par paquets de 10.' },
      { id: 'maths_cp_2', name: 'Addition simple (< 20)', hook: 'La Pyramide des Bonbons : Assembler des paires pour former un total.' },
      { id: 'maths_cp_3', name: 'Formes géométriques de base', hook: 'La Chasse aux Formes : Identifier ronds, carrés et triangles dans la maison.' },
    ],
    francais: [
      { id: 'fr_cp_1', name: 'Sons et lettres (Phonologie)', hook: 'L’Enquêteur des Syllabes : Isoler le son initial des objets du salon.' },
      { id: 'fr_cp_2', name: 'Écriture des lettres cursives', hook: 'Le Calligraphe de Sable : Tracer les lettres dans de la farine ou du sable.' },
      { id: 'fr_cp_3', name: 'Lecture de mots simples', hook: 'Le Décodeur Secret : Associer des cartes de mots aux objets correspondants.' },
    ],
    sciences: [
      { id: 'sci_cp_1', name: 'Les 5 sens', hook: 'Le Détective des Sens : Deviner les yeux bandés des odeurs et objets.' },
      { id: 'sci_cp_2', name: 'Le corps humain de base', hook: 'Le Docteur Robot : Cartographier les parties du corps avec des gommettes.' },
    ],
    histoire_geo: [
      { id: 'hg_cp_1', name: 'Se repérer dans la journée', hook: 'L’Horloge de la Journée : Placer les activités sur une frise rotative.' },
      { id: 'hg_cp_2', name: 'Plan simple de la chambre', hook: 'L’Architecte en Herbe : Dessiner la carte vue du ciel de son lit et bureau.' },
    ],
    anglais: [
      { id: 'eng_cp_1', name: 'Salutations et prénom', hook: 'Le Journaliste Anglais : Saluer et présenter des peluches en anglais.' },
      { id: 'eng_cp_2', name: 'Les couleurs de base', hook: 'La Chasse au Trésor des Couleurs : Répéter "Red, Blue, Green" sur objets.' },
    ],
  },
  CE1: {
    maths: [
      { id: 'maths_ce1_1', name: 'Tables de multiplication de 2 et 5', hook: 'L’Usine de Doublement : Construire des paquets de 2 et 5 avec des lego.' },
      { id: 'maths_ce1_2', name: 'Addition posée avec retenue', hook: 'La Tour des Dizaines : Empiler avec passage de dizaines en objets.' },
    ],
    francais: [
      { id: 'fr_ce1_1', name: 'Identification du verbe et du sujet', hook: 'Le Théâtre des Mots : Mimer l’action (verbe) et désigner l’acteur (sujet).' },
      { id: 'fr_ce1_2', name: 'Nom propre vs nom commun', hook: 'Le Tri du Détective : Classer les étiquettes de noms dans deux boîtes.' },
    ],
    sciences: [
      { id: 'sci_ce1_1', name: 'Les états de l’eau (solide, liquide)', hook: 'Le Glaçon Magique : Chronométrer et faire fondre de l’eau avec sel.' },
    ],
    histoire_geo: [
      { id: 'hg_ce1_1', name: 'Le quartier et la ville', hook: 'L’Explorateur du Quartier : Dessiner les commerces et rues sur une carte.' },
    ],
    anglais: [
      { id: 'eng_ce1_1', name: 'Exprimer ses goûts (I like...)', hook: 'Le Menu du Chef : Composer une carte de restaurant en disant "I like".' },
    ],
  },
  CE2: {
    maths: [
      { id: 'maths_ce2_1', name: 'Tables de 3, 4 et 10', hook: 'Le Chrono du Calcul : Battre son record de vitesse sur la table de 4.' },
      { id: 'maths_ce2_2', name: 'Notion de périmètre', hook: 'Le Géomètre du Salon : Mesurer le contour de la table avec une ficelle.' },
    ],
    francais: [
      { id: 'fr_ce2_1', name: 'Le présent de l’indicatif', hook: 'Le Journal Télévisé : Conjuguer au présent en direct devant la caméra.' },
      { id: 'fr_ce2_2', name: 'Orthographe grammaticale (a/à, et/est)', hook: 'La Chasse aux Pièges : Corriger les fautes camouflées dans une lettre.' },
    ],
    sciences: [
      { id: 'sci_ce2_1', name: 'Les engrenages et mouvements', hook: 'Le Mécanicien de Carton : Assembler deux roues dentées et observer le sens.' },
    ],
    histoire_geo: [
      { id: 'hg_ce2_1', name: 'La Préhistoire et l’art rupestre', hook: 'L’Artiste de la Grotte : Reproduire une peinture rupestre au charbon.' },
    ],
    anglais: [
      { id: 'eng_ce2_1', name: 'Les jours et la météo', hook: 'Le Présentateur Météo : Donner le bulletin météo de la semaine en anglais.' },
    ],
  },
  CM1: {
    maths: [
      { id: 'maths_cm1_1', name: 'Fractions simples (1/2, 1/4, 1/3)', hook: 'Le Maître Pâtissier : Découper une pizza ou gâteau en parts égales.' },
      { id: 'maths_cm1_2', name: 'Toutes les tables de multiplication (1 à 10)', hook: 'Le Duel des Tables : Tirer des cartes de nombres et multiplier instantanément.' },
    ],
    francais: [
      { id: 'fr_cm1_1', name: 'Accord du participe passé avec être/avoir', hook: 'L’Inspecteur de la Grammaire : Traquer l’auxiliaire pour accorder la fin.' },
      { id: 'fr_cm1_2', name: 'Imparfait et futur de l’indicatif', hook: 'La Machine Temporelle : Transformer une histoire du passé vers le futur.' },
    ],
    sciences: [
      { id: 'sci_cm1_1', name: 'Le cycle de l’eau complet', hook: 'La Mini-Serre en Bouteille : Fabriquer un modèle d’évaporation/condensation.' },
    ],
    histoire_geo: [
      { id: 'hg_cm1_1', name: 'Le Moyen Âge et les châteaux forts', hook: 'Le Bâtisseur de Donjon : Construire la maquette d’un système défensif.' },
    ],
    anglais: [
      { id: 'eng_cm1_1', name: 'La routine quotidienne', hook: 'L’Agent Secret Anglais : Décrire sa journée heure par heure en anglais.' },
    ],
  },
  CM2: {
    maths: [
      { id: 'maths_cm2_1', name: 'Nombres décimaux et division posée', hook: 'Le Changeur de Monnaie : Calculer les centimes et répartir un budget.' },
      { id: 'maths_cm2_2', name: 'Proportionnalité et pourcentages', hook: 'Le Chimiste des Solutés : Ajuster les doses d’un sirop selon le volume.' },
    ],
    francais: [
      { id: 'fr_cm2_1', name: 'Passé simple de l’indicatif', hook: 'L’Écrivain de Contes : Rédiger le chapitre héroïque d’un roman d’aventure.' },
      { id: 'fr_cm2_2', name: 'Propositions coordonnées et subordonnées', hook: 'L’Architecte de Phrases : Assembler des briques de phrases complexes.' },
    ],
    sciences: [
      { id: 'sci_cm2_1', name: 'Le système solaire et les planètes', hook: 'L’Astronome en Herbe : Placer les planètes à l’échelle avec des fruits.' },
    ],
    histoire_geo: [
      { id: 'hg_cm2_1', name: 'La Révolution Française', hook: 'Le Rédacteur de Cahiers de Doléances : Écrire et débattre des réformes.' },
    ],
    anglais: [
      { id: 'eng_cm2_1', name: 'Raconter un événement passé', hook: 'Le Reporter International : Raconter ses vacances au passé en anglais.' },
    ],
  },
  '6eme': {
    maths: [
      { id: 'maths_6e_1', name: 'Fractions et écritures décimales', hook: 'Le Trader des Nombres : Convertir des quotients en décimaux sur tableau.' },
      { id: 'maths_6e_2', name: 'Symétrie axiale et géométrie', hook: 'Le Miroir Géométrique : Réaliser la figure symétrique exacte pliure par pliure.' },
    ],
    francais: [
      { id: 'fr_6e_1', name: 'Récits de création et mythes', hook: 'Le Mythologue du Chaos : Inventer le récit de création d’une planète.' },
    ],
    sciences: [
      { id: 'sci_6e_1', name: 'Matière, mouvement et énergie', hook: 'L’Ingénieur de Piste : Mesurer la vitesse d’une bille sur rampe inclinée.' },
    ],
    histoire_geo: [
      { id: 'hg_6e_1', name: 'Habiter une métropole', hook: 'L’Urbaniste de la Cité : Cartographier les flux de transports de la ville.' },
    ],
    anglais: [
      { id: 'eng_6e_1', name: 'Niveau A1 : Description de lieux et routines', hook: 'Le Guide Touristique : Présenter son quartier et sa maison en anglais.' },
    ],
  },
  '5eme': {
    maths: [
      { id: 'maths_5e_1', name: 'Priorités opératoires et relatifs', hook: 'Le Thermomètre Polaire : Calculer les écarts de températures négatives.' },
      { id: 'maths_5e_2', name: 'Triangles, angles et hauteurs', hook: 'Le Charpentier Géomètre : Vérifier la somme des angles d’un triangle réel.' },
    ],
    francais: [
      { id: 'fr_5e_1', name: 'Le voyage et l’aventure', hook: 'Le Carnet de Bord de l’Explorateur : Rédiger le journal de voyage fictif.' },
    ],
    sciences: [
      { id: 'sci_5e_1', name: 'Organismes, digestion et santé', hook: 'Le Biologiste de la Nutrition : Analyser le trajet des nutriments d’un repas.' },
    ],
    histoire_geo: [
      { id: 'hg_5e_1', name: 'Chrétientés et Islam au Moyen Âge', hook: 'L’Historien des Échanges : Comparer les cartes commerciales médiévales.' },
    ],
    anglais: [
      { id: 'eng_5e_1', name: 'Niveau A1+ : Raconter une histoire et comparer', hook: 'Le Critique de Film : Comparer deux personnages et leurs choix en anglais.' },
    ],
  },
  '4eme': {
    maths: [
      { id: 'maths_4e_1', name: 'Théorème de Pythagore', hook: 'Le Parkour Mathématique : Vérifier l’équerre d’un mur avec la règle 3-4-5.' },
      { id: 'maths_4e_2', name: 'Équations du premier degré', hook: 'La Balance Algébrique : Isoler l’inconnue x avec des poids réels.' },
    ],
    francais: [
      { id: 'fr_4e_1', name: 'La fiction pour interroger le réel', hook: 'Le Journaliste d’Investigation : Déceler le vrai du faux dans un récit.' },
    ],
    sciences: [
      { id: 'sci_4e_1', name: 'Chimie : Atomes et réactions', hook: 'Le Chimiste des Équations : Équilibrer la combustion d’une bougie.' },
    ],
    histoire_geo: [
      { id: 'hg_4e_1', name: 'L’Europe des Lumières et la Révolution', hook: 'Le Philosophe Engagé : Rédiger un pamphlet contre les privilèges.' },
    ],
    anglais: [
      { id: 'eng_4e_1', name: 'Niveau A2 : Argumenter et donner une opinion', hook: 'Le Débatteur Anglais : Défendre une position en 3 arguments en anglais.' },
    ],
  },
  '3eme': {
    maths: [
      { id: 'maths_3e_1', name: 'Théorème de Thalès et réciproque', hook: 'L’Arpenteur d’Ombres : Mesurer la hauteur d’un arbre grâce à son ombre.' },
      { id: 'maths_3e_2', name: 'Fonctions affines et linéaires', hook: 'Le Data Analyst : Modéliser le coût d’un trajet selon la distance.' },
    ],
    francais: [
      { id: 'fr_3e_1', name: 'Agir dans la cité : Individu et pouvoir', hook: 'Le Procureur de la République : Rédiger un plaidoyer structuré.' },
    ],
    sciences: [
      { id: 'sci_3e_1', name: 'Génétique, ADN et hérédité', hook: 'Le Généticien Moleculaire : Modéliser une hélice d’ADN avec du matériel.' },
    ],
    histoire_geo: [
      { id: 'hg_3e_1', name: 'L’Europe dans les deux Guerres Mondiales', hook: 'L’Archiviste de la Mémoire : Rédiger l’analyse d’un document d’époque.' },
    ],
    anglais: [
      { id: 'eng_3e_1', name: 'Niveau A2/B1 : Débats et synthèses', hook: 'Le Podcaster International : Enregistrer une chronique d’actualité en anglais.' },
    ],
  },
};

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

export interface ZPADifficultyResult {
  level: 1 | 2 | 3 | 4 | 5;
  supportMode: 'HIGH_SUPPORT' | 'STANDARD' | 'CHALLENGE_PLUS';
  isAnxietyDamped: boolean;
  rationale: string;
}

/**
 * Calculates ZPA Difficulty Level (1 to 5) and Support Mode.
 * Implements anxiety damping (if P(Anxiety) > 0.40 or hypothesis includes PERFORMANCE_ANXIETY, caps level <= 2)
 * and anti-spike step bounds (+/- 1 step change maximum when currentLevel is provided).
 */
export function calculateZPADifficulty(
  masteryScore: number,
  hypothesisCauses: string[] = [],
  anxietyProb: number = 0,
  currentLevel?: number
): ZPADifficultyResult {
  // 1. Calculate raw target level based on mastery score (1..5 or 0..100 scale)
  let rawLevel = Math.max(
    1,
    Math.min(5, Math.round(masteryScore > 5 ? masteryScore / 20 : masteryScore))
  );

  // Adjust for causal hypothesis
  if (hypothesisCauses.includes('READY_FOR_MORE')) {
    rawLevel = Math.min(5, rawLevel + 1);
  } else if (
    hypothesisCauses.includes('CONCEPTUAL_GAP') ||
    hypothesisCauses.includes('METHOD_MISMATCH')
  ) {
    rawLevel = Math.max(1, rawLevel - 1);
  }

  // 2. Anxiety Damping Protocol
  const hasAnxietyHypothesis = hypothesisCauses.includes('PERFORMANCE_ANXIETY');
  const isAnxietyDamped = anxietyProb > 0.40 || hasAnxietyHypothesis;

  if (isAnxietyDamped) {
    const safeLevel = Math.max(1, Math.min(2, rawLevel)) as 1 | 2;
    return {
      level: safeLevel,
      supportMode: 'HIGH_SUPPORT',
      isAnxietyDamped: true,
      rationale: `Détection d'anxiété (P=${Math.round(
        anxietyProb * 100
      )}%) : repli sur niveau ${safeLevel} rassurant avec étayage maximal.`,
    };
  }

  // 3. Anti-spike step constraint if currentLevel is provided
  let targetLevel = rawLevel;
  if (typeof currentLevel === 'number' && currentLevel >= 1 && currentLevel <= 5) {
    const stepDiff = rawLevel - currentLevel;
    const boundedStep = Math.sign(stepDiff) * Math.min(1, Math.abs(stepDiff));
    targetLevel = currentLevel + boundedStep;
  }

  const finalLevel = Math.max(1, Math.min(5, targetLevel)) as 1 | 2 | 3 | 4 | 5;
  const supportMode =
    finalLevel >= 4
      ? 'CHALLENGE_PLUS'
      : finalLevel <= 2
      ? 'HIGH_SUPPORT'
      : 'STANDARD';

  return {
    level: finalLevel,
    supportMode,
    isAnxietyDamped: false,
    rationale: `ZPA nominale : niveau ${finalLevel} sélectionné (Score maîtrise=${masteryScore}, niveau cible=${finalLevel}).`,
  };
}

/**
 * Returns curriculum topics for a given grade level and subject.
 */
export function getCurriculumTopics(
  grade: GradeLevel,
  subject: AcademicSubject
): CurriculumTopic[] {
  return CURRICULUM_TOPICS[grade]?.[subject] ?? [];
}

/**
 * Finds a specific topic by topic ID within a grade level and subject.
 */
export function findCurriculumTopic(
  grade: GradeLevel,
  subject: AcademicSubject,
  topicId: string
): CurriculumTopic | undefined {
  const topics = getCurriculumTopics(grade, subject);
  return topics.find((t) => t.id === topicId);
}

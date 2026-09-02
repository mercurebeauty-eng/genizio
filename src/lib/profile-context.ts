// Profil multidimensionnel — vocabulaire fermé et contexte prompt (analyse
// « Évolution de Génizio » §6-7, chantier « porte d'entrée », 2026-08-12).
//
// Règles du chantier : données déclarées par le parent = POINT DE DÉPART, le
// comportement réel prime (vision fondatrice) ; collecte structurée uniquement
// (pas de texte libre sensible sur des mineurs) ; l'aspiration est une HYPOTHÈSE
// à explorer, jamais un verdict (analyse §10-16).

export const SCHOOL_LEVELS: Record<string, string> = {
  prescolaire: "Préscolaire",
  cp1: "CP1",
  cp2: "CP2",
  ce1: "CE1",
  ce2: "CE2",
  cm1: "CM1",
  cm2: "CM2",
  sixieme: "6e",
  cinquieme: "5e",
  quatrieme: "4e",
  troisieme: "3e",
  seconde: "2nde",
  premiere: "1ère",
  terminale: "Terminale",
  non_scolarise: "Non scolarisé",
};

export const ABILITY_AXES: Record<string, string> = {
  langage: "Langage & expression",
  motricite: "Motricité",
  memoire: "Mémoire",
  concentration: "Concentration",
  raisonnement: "Raisonnement",
  logique: "Logique",
  perception_spatiale: "Perception spatiale",
  coordination: "Coordination",
  communication: "Communication",
  autonomie: "Autonomie",
};

export const SCHOOL_RELATIONS: Record<string, string> = {
  apprecie: "Aime l'école",
  neutre: "Ni pour ni contre",
  conflit: "En conflit avec l'école",
  non_scolarise: "Non scolarisé",
};

// Préréglages uniquement — jamais de narration libre (données sensibles de mineurs,
// minimisées : on garde le besoin pédagogique, pas le récit).
export const LIFE_CONTEXT_OPTIONS: Record<string, string> = {
  parcours_rue: "A vécu dans la rue",
  environnement_precaire: "Environnement très précaire",
  besoins_specifiques: "Besoins spécifiques (handicap, soins)",
  famille_eloignee: "Famille éloignée / vit chez un tuteur",
};

// Catégories et suggestions d'aspirations pour l'interface (enfants vulnérables).
export const ASPIRATION_CATEGORIES = [
  {
    name: "Métiers manuels & artisanat",
    icon: "🔨",
    suggestions: [
      "Menuiserie",
      "Mécanique",
      "Agriculture",
      "Couture",
      "Cuisine & Restauration",
    ],
  },
  {
    name: "Numérique & Services",
    icon: "📱",
    suggestions: [
      "Informatique",
      "Réparateur de téléphones",
      "Monteur vidéo",
      "Coiffure & Beauté",
      "Logistique & Livraison",
    ],
  },
  {
    name: "Impact & Avenir",
    icon: "🌍",
    suggestions: [
      "Médecine",
      "Énergie solaire",
      "Éducateur / Animateur",
      "Commerce",
      "Agro-transformation",
      "Guide touristique",
    ],
  },
  {
    name: "Expression & Sport",
    icon: "🎨",
    suggestions: [
      "Art & dessin",
      "Sport",
      "Musique & danse",
      "Soins aux personnes",
    ],
  },
] as const;

// Suggestions plates pour la rétro-compatibilité
export const ASPIRATION_SUGGESTIONS: string[] = ASPIRATION_CATEGORIES.flatMap(
  (c) => [...c.suggestions],
);

// Rapport au défi (observé par le parent, pas projeté par l'enfant)
export const CHALLENGE_RAPPORT: Record<string, string> = {
  rapide_facile: "Préfère les défis courts et accessibles",
  casse_tete: "Aime les casse-tête longs et complexes",
  abandonne_vite: "Abandonne vite face à la difficulté",
  perseverant: "Persévère jusqu'à réussir",
};

// Mode d'apprentissage dominant (1 ou 2 choix max)
export const LEARNING_MODES: Record<string, string> = {
  pratique: "En faisant (action, manipulation)",
  visuel: "En observant (schémas, images, démonstrations)",
  ecoute: "En écoutant (histoires, explications orales)",
  discussion: "En échangeant (poser des questions, débattre)",
  lecture: "En lisant (textes, consignes écrites)",
};

// Rapport à l'erreur
export const ERROR_RAPPORT: Record<string, string> = {
  decourage: "L'erreur le décourage ou le frustre",
  amuse: "L'erreur l'amuse ou le détend",
  motive: "L'erreur le stimule à retenter",
  indifferent: "L'erreur ne l'affecte pas particulièrement",
};

// Préférence collaborative
export const COLLAB_PREFERENCE: Record<string, string> = {
  solo: "Préfère avancer en solo",
  duo: "Préfère en duo (avec un pair de confiance)",
  groupe: "S'épanouit en petite escouade / collectif",
  mixte: "Alterne selon le sujet",
};

export type LearningProfile = {
  challenge_rapport?: string | null;
  learning_mode?: string | string[] | null;
  error_rapport?: string | null;
  collab_preference?: string | null;
};

export type AbilityValue = "facile" | "neutre" | "difficulte";

export type Aspiration = {
  label: string;
  type: "metier" | "exploration";
  source?: "parent" | "enfant";
};

// Contextes de parcours qui signalent un profil vulnérable — pour ces enfants, la
// déclaration d'aspiration est une boussole (analyse §10, §14 : rapport à l'argent,
// méfiance des adultes → la déclaration est une HYPOTHÈSE que Naya explore par
// l'expérience). Pour les autres, pas besoin de choix d'aspiration (décision
// utilisateur 2026-08-12).
export const VULNERABLE_LIFE_CONTEXTS = [
  "parcours_rue",
  "environnement_precaire",
  "famille_eloignee",
];

/**
 * Faut-il demander les aspirations à l'onboarding ?
 * - Oui si le contexte indique un profil vulnérable (parcours rue, environnement
 *   précaire, famille éloignée/délaissé) ou un rapport à l'école conflictuel/non
 *   scolarisé ;
 * - Oui si des aspirations existent déjà (on ne cache jamais des données) ;
 * - Non sinon (l'exploration passe par les intérêts/talents).
 */
export function shouldAskAspirations(context: {
  life_context?: string[] | null;
  school_relation?: string | null;
  existingAspirations?: Aspiration[] | null;
}): boolean {
  const lifeContext = context.life_context ?? [];
  if (lifeContext.some((c) => VULNERABLE_LIFE_CONTEXTS.includes(c))) return true;
  if (context.school_relation === "conflit" || context.school_relation === "non_scolarise")
    return true;
  if (context.existingAspirations && context.existingAspirations.length > 0) return true;
  return false;
}

// Contexte doux injecté dans les prompts de génération — jamais une règle dure :
// l'IA adapte la FORME et l'entrée pédagogique, pas le jugement. L'aspiration est
// présentée comme un terrain d'exploration (« je veux devenir menuisier » n'est ni
// une vérité ni un mensonge — c'est une hypothèse à tester par l'expérience,
// analyse §10-11).
export function formatChildProfileContext(profile: {
  school_level?: string | null;
  languages?: string[] | null;
  ability_profile?: Record<string, AbilityValue> | null;
  school_relation?: string | null;
  life_context?: string[] | null;
  aspirations?: Aspiration[] | null;
  learning_profile?: LearningProfile | null;
}): string {
  const lines: string[] = [];

  if (profile.school_level && SCHOOL_LEVELS[profile.school_level]) {
    lines.push(`- Niveau scolaire déclaré : ${SCHOOL_LEVELS[profile.school_level]}.`);
  }
  if (profile.languages && profile.languages.length > 0) {
    lines.push(`- Langues parlées à la maison : ${profile.languages.join(", ")}.`);
  }

  const abilities = profile.ability_profile ?? {};
  const facilites = Object.entries(abilities)
    .filter(([, v]) => v === "facile")
    .map(([k]) => ABILITY_AXES[k] ?? k);
  const difficultes = Object.entries(abilities)
    .filter(([, v]) => v === "difficulte")
    .map(([k]) => ABILITY_AXES[k] ?? k);
  if (facilites.length > 0) {
    lines.push(`- Facilités déclarées par le parent : ${facilites.join(", ")}.`);
  }
  if (difficultes.length > 0) {
    lines.push(
      `- Difficultés déclarées par le parent : ${difficultes.join(", ")} — ce sont des axes d'entraînement à stimuler progressivement, JAMAIS des étiquettes ni des échecs forcés : choisis des expériences qui les sollicitent doucement.`,
    );
  }

  if (profile.school_relation && SCHOOL_RELATIONS[profile.school_relation]) {
    lines.push(`- Rapport à l'école déclaré : ${SCHOOL_RELATIONS[profile.school_relation]}.`);
  }

  if (profile.life_context && profile.life_context.length > 0) {
    const labels = profile.life_context.map((c) => LIFE_CONTEXT_OPTIONS[c] ?? c).join(", ");
    lines.push(
      `- Contexte de parcours (déclaré par le parent) : ${labels} — entre dans son monde avant de lui demander d'entrer dans le nôtre : des expériences concrètes, utiles, respectueuses de sa réalité. Objectif de fond (décision utilisateur) : qu'il apprenne progressivement à faire confiance à un adulte — propose des interactions PRÉVISIBLES et GÉNÉREUSES (l'adulte donne d'abord : temps, matériel, attention), sans jamais forcer la proximité.`,
    );
  }

  if (profile.aspirations && profile.aspirations.length > 0) {
    const list = profile.aspirations.map((a) => a.label).join(", ");
    const sourceNote = profile.aspirations.some((a) => a.source === "enfant")
      ? " (déclarée(s) par l'enfant lui-même, rapportées par le parent)"
      : "";
    lines.push(
      `- Aspiration(s) déclarée(s)${sourceNote} : ${list} — HYPOTHÈSE À EXPLORER, jamais un verdict : propose des expériences liées à cet univers, observe les aptitudes réelles, et si une divergence apparaît, cherche « qu'est-ce que cet enfant sait réellement bien faire » pour orienter (analyse §10-16).`,
    );
  }

  if (profile.learning_profile) {
    const lp = profile.learning_profile;
    if (lp.learning_mode) {
      const modes = Array.isArray(lp.learning_mode) ? lp.learning_mode : [lp.learning_mode];
      const modeLabels = modes.map((m) => LEARNING_MODES[m] ?? m).filter(Boolean);
      if (modeLabels.length > 0) {
        lines.push(
          `- Modalité d'apprentissage observée : ${modeLabels.join(", ")} — adapte le format du défi pour privilégier cette entrée concrète.`,
        );
      }
    }
    if (lp.challenge_rapport && CHALLENGE_RAPPORT[lp.challenge_rapport]) {
      const rapport = CHALLENGE_RAPPORT[lp.challenge_rapport];
      let guidance = "";
      if (lp.challenge_rapport === "abandonne_vite") {
        guidance = " — sécurise les premières étapes avec des victoires rapides pour bâtir sa confiance.";
      } else if (lp.challenge_rapport === "perseverant" || lp.challenge_rapport === "casse_tete") {
        guidance = " — propose un vrai niveau d'exigence et de profondeur sans trop simplifier.";
      } else if (lp.challenge_rapport === "rapide_facile") {
        guidance = " — fractionne en petites étapes immédiates et valorisantes.";
      }
      lines.push(`- Rapport au défi observé : ${rapport}${guidance}`);
    }
    if (lp.error_rapport && ERROR_RAPPORT[lp.error_rapport]) {
      const errRapport = ERROR_RAPPORT[lp.error_rapport];
      let guidance = "";
      if (lp.error_rapport === "decourage") {
        guidance = " — dédramatise l'erreur, propose un cadre sans jugement où l'essai est valorisé.";
      } else if (lp.error_rapport === "motive") {
        guidance = " — l'erreur est un moteur : utilise le feedback d'itération comme levier d'apprentissage.";
      }
      lines.push(`- Rapport à l'erreur : ${errRapport}${guidance}`);
    }
    if (lp.collab_preference && COLLAB_PREFERENCE[lp.collab_preference]) {
      const collab = COLLAB_PREFERENCE[lp.collab_preference];
      lines.push(`- Préférence relationnelle / groupe : ${collab}.`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

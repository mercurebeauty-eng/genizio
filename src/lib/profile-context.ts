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

// Suggestions d'aspirations pour l'interface (ajout libre possible côté parent —
// une aspiration n'est pas une donnée sensible, c'est une déclaration).
export const ASPIRATION_SUGGESTIONS = [
  "Menuiserie",
  "Mécanique",
  "Médecine",
  "Agriculture",
  "Commerce",
  "Art & dessin",
  "Sport",
  "Informatique",
  "Musique & danse",
  "Couture",
];

export type AbilityValue = "facile" | "neutre" | "difficulte";

export type Aspiration = { label: string; type: "metier" | "exploration"; source?: "parent" | "enfant" };

// Contextes de parcours qui signalent un profil vulnérable — pour ces enfants, la
// déclaration d'aspiration est une boussole (analyse §10, §14 : rapport à l'argent,
// méfiance des adultes → la déclaration est une HYPOTHÈSE que Naya explore par
// l'expérience). Pour les autres, pas besoin de choix d'aspiration (décision
// utilisateur 2026-08-12).
export const VULNERABLE_LIFE_CONTEXTS = ["parcours_rue", "environnement_precaire", "famille_eloignee"];

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
  if (context.school_relation === "conflit" || context.school_relation === "non_scolarise") return true;
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
      `- Difficultés déclarées par le parent : ${difficultes.join(", ")} — ce sont des axes d'entraînement à stimuler progressivement, JAMAIS des étiquettes ni des échecs forcés : choisis des expériences qui les sollicitent doucement.`
    );
  }

  if (profile.school_relation && SCHOOL_RELATIONS[profile.school_relation]) {
    lines.push(`- Rapport à l'école déclaré : ${SCHOOL_RELATIONS[profile.school_relation]}.`);
  }

  if (profile.life_context && profile.life_context.length > 0) {
    const labels = profile.life_context.map((c) => LIFE_CONTEXT_OPTIONS[c] ?? c).join(", ");
    lines.push(
      `- Contexte de parcours (déclaré par le parent) : ${labels} — entre dans son monde avant de lui demander d'entrer dans le nôtre : des expériences concrètes, utiles, respectueuses de sa réalité. Objectif de fond (décision utilisateur) : qu'il apprenne progressivement à faire confiance à un adulte — propose des interactions PRÉVISIBLES et GÉNÉREUSES (l'adulte donne d'abord : temps, matériel, attention), sans jamais forcer la proximité.`
    );
  }

  if (profile.aspirations && profile.aspirations.length > 0) {
    const list = profile.aspirations.map((a) => a.label).join(", ");
    const sourceNote = profile.aspirations.some((a) => a.source === "enfant")
      ? " (déclarée(s) par l'enfant lui-même, rapportées par le parent)"
      : "";
    lines.push(
      `- Aspiration(s) déclarée(s)${sourceNote} : ${list} — HYPOTHÈSE À EXPLORER, jamais un verdict : propose des expériences liées à cet univers, observe les aptitudes réelles, et si une divergence apparaît, cherche « qu'est-ce que cet enfant sait réellement bien faire » pour orienter (analyse §10-16).`
    );
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

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

export type Aspiration = { label: string; type: "metier" | "exploration" };

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
      `- Contexte de parcours (déclaré par le parent) : ${labels} — entre dans son monde avant de lui demander d'entrer dans le nôtre : des expériences concrètes, utiles, respectueuses de sa réalité.`
    );
  }

  if (profile.aspirations && profile.aspirations.length > 0) {
    const list = profile.aspirations.map((a) => a.label).join(", ");
    lines.push(
      `- Aspiration(s) déclarée(s) : ${list} — HYPOTHÈSE À EXPLORER, jamais un verdict : propose des expériences liées à cet univers, observe les aptitudes réelles, et si une divergence apparaît, cherche « qu'est-ce que cet enfant sait réellement bien faire » pour orienter (analyse §10-16).`
    );
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

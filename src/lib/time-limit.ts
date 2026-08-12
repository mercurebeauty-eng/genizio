// Temps adaptatif — le temps comme composante pédagogique du défi (analyse
// « Évolution de Génizio » §5, chantier « porte d'entrée », 2026-08-12).
//
// La contrainte temporelle n'est jamais un verdict : la limite est calculée à
// l'assignation (ou en repli au démarrage), l'expiration est douce (bannière,
// jamais d'auto-échec — non-négociable du produit) et journalisée (TIME_OVER)
// pour alimenter le driver time_awareness du Jumeau Pédagogique.

export type TimePressure = "standard" | "gentle" | "none";

export const TIME_PRESSURE_LABELS: Record<TimePressure, string> = {
  standard: "Temps standard",
  gentle: "Temps généreux (×1,5)",
  none: "Sans chronomètre",
};

// Estimation de repli par difficulté quand aucune estimation n'existe (défi généré
// en lot, assigné sans passer par l'Atelier du Temps).
export function defaultEstimateForDifficulty(difficulty?: string | null): number {
  switch (difficulty) {
    case "facile":
      return 15;
    case "difficile":
      return 40;
    default:
      return 25;
  }
}

// Résolution pure de la limite : estimation (si connue, sinon repli par difficulté)
// × facteur d'âge (les plus jeunes reçoivent plus de temps, jamais moins) × facteur
// de pression temporelle. Borné entre 3 et 120 minutes. `none` → pas de chrono.
export function resolveTimeLimitMinutes(params: {
  estimatedMinutes?: number | null;
  age: number;
  timePressure: TimePressure;
  difficulty?: string | null;
}): number | null {
  if (params.timePressure === "none") return null;
  const base =
    params.estimatedMinutes && params.estimatedMinutes > 0
      ? params.estimatedMinutes
      : defaultEstimateForDifficulty(params.difficulty);
  const ageFactor = params.age <= 7 ? 1.5 : params.age <= 12 ? 1.25 : 1;
  const pressureFactor = params.timePressure === "gentle" ? 1.5 : 1;
  const minutes = Math.round(base * ageFactor * pressureFactor);
  return Math.min(Math.max(minutes, 3), 120);
}

// Note injectée dans les prompts de génération (contexte doux, jamais une règle
// dure) : l'IA voit la préférence temporelle du profil et adapte la durée
// indicative en conséquence — le temps reste un paramètre pédagogique configurable.
export function formatTimePressureNote(timePressure: TimePressure | null | undefined): string {
  if (!timePressure || timePressure === "standard") {
    return "- Durée : donne une durée estimée honnête (le chrono du défi se base dessus).";
  }
  if (timePressure === "gentle") {
    return "- Durée : ce profil fonctionne avec un temps généreux — estime la durée au temps réel (le chrono sera rallongé de lui-même).";
  }
  return "- Durée : ce profil est en mode SANS chronomètre — aucune contrainte temporelle, adapte simplement la durée indicative au contenu.";
}

import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";

/**
 * Mapping table from legacy interest tags (from earlier versions of the app)
 * to modern observable behavioral drivers and cognitive postures.
 */
export const LEGACY_TO_BEHAVIORAL_INTEREST_MAP: Record<string, string> = {
  // Spatial & Visual
  "Dessin & Design": "Remarque les petits détails visuels",
  "Dessin & Peinture": "Remarque les petits détails visuels",
  "Puzzles & Cartes": "S'oriente facilement dans l'espace",
  "Orientation & Exploration": "S'oriente facilement dans l'espace",
  "Robotique & Programmation": "Démonte pour comprendre",
  "Construction & Lego": "Aime assembler et construire",

  // Corporel & Mouvement
  "Sport & Mouvement": "A besoin de bouger pour réfléchir",
  Danse: "Apprend en imitant les gestes",
  "Gymnastique & Mouvement": "A besoin de bouger pour réfléchir",

  // Social & Relations
  "Aime jouer en groupe": "Comprend vite les règles du groupe",
  "Leadership naturel": "Aime organiser les autres",
  "Aide les autres": "Joue souvent le médiateur",
  "Aime organiser des choses": "Aime organiser les autres",

  // Entrepreneurial & Projets
  "Négociation & Commerce": "Négocie toujours (même le coucher)",
  "Création de projets": "Invente ses propres règles de jeu",
  "Sens de la négociation": "Négocie toujours (même le coucher)",

  // Créatif & Imaginatif
  "Bricolage créatif": "Préfère inventer que suivre la notice",
  "Musique & Chant": "Détourne les objets de leur usage",
  "Théâtre & Déguisements": "A un imaginaire débordant",

  // Artisanal & Manuel
  "Cuisine & Pâtisserie": "Aime les résultats concrets et finis",
  "Couture & Modélisme": "S'applique sur les tâches minutieuses",
  "Répare des objets": "Préfère faire de ses propres mains",
  "Travaux manuels": "Préfère faire de ses propres mains",

  // Émotionnel & Intrapersonnel
  Empathique: "Ressent intensément l'humeur ambiante",
  "Comprend ses émotions": "A besoin de solitude pour se recharger",
  "Calme & Concentration": "A besoin de solitude pour se recharger",

  // Logique & Mathematique
  "Jeux de stratégie": "Cherche la logique cachée des choses",
  "Aime les chiffres": "Aime classer, trier et mesurer",
  "Sciences & Expériences": "Pose sans arrêt la question 'Pourquoi ?'",
  "Nature & Animaux": "Fasciné par le lien cause/effet",

  // Linguistique & Mots
  "Aime parler & raconter": "Retient très facilement les histoires",
  "Prise de parole en public": "Argumente pour défendre ses idées",
  "Lecture & Écriture": "Joue avec les mots et les sons",
};

/**
 * All valid current behavioral driver tags across all talent categories.
 */
export const ALL_BEHAVIORAL_DRIVERS: string[] = Object.values(INTERESTS_BY_TALENT).flatMap(
  (group) => group.tags as readonly string[]
);

/**
 * Converts any mix of legacy tags and new behavioral tags into clean,
 * deduplicated observable behavioral drivers.
 */
export function normalizeChildInterests(interests?: string[] | null): string[] {
  if (!interests || !Array.isArray(interests)) return [];

  const normalized = new Set<string>();

  for (const rawTag of interests) {
    if (!rawTag || typeof rawTag !== "string") continue;
    const trimmed = rawTag.trim();
    if (!trimmed) continue;

    // Check if it's already a valid behavioral driver
    if (ALL_BEHAVIORAL_DRIVERS.includes(trimmed)) {
      normalized.add(trimmed);
      continue;
    }

    // Check if it maps to a known legacy tag
    const mapped = LEGACY_TO_BEHAVIORAL_INTEREST_MAP[trimmed];
    if (mapped) {
      normalized.add(mapped);
      continue;
    }

    // If it's unknown/custom text, keep it clean
    normalized.add(trimmed);
  }

  return Array.from(normalized);
}

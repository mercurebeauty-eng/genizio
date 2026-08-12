// Difficultés déclarées → axes d'entraînement (analyse « Évolution de Génizio » §8,
// chantier Naya V4, 2026-08-12).
//
// Principe : une difficulté n'est pas uniquement compensée — elle doit pouvoir être
// ENTRAÎNÉE (analogie de la musculation : on identifie un muscle faible, puis on
// construit progressivement un entraînement adapté pour le renforcer). Les axes
// déclarés par le parent (ability_profile, valeur "difficulte") sont mappés sur les
// clés Gardner et biaisent DOUCEMENT le ciblage des recommandations : priorité
// douce, jamais dure — le niveau reste calibré pour ne jamais placer l'enfant en
// échec permanent (zone entre trop facile et trop difficile).

import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";

// Axe de difficulté (ability_profile) → clés Gardner à entraîner en priorité.
export const DIFFICULTY_TALENT_KEYS: Record<string, string[]> = {
  langage: ["linguistique"],
  motricite: ["corporelle"],
  memoire: ["logico_mathematique"],
  concentration: ["logico_mathematique"],
  raisonnement: ["logico_mathematique"],
  logique: ["logico_mathematique"],
  perception_spatiale: ["spatiale"],
  coordination: ["corporelle"],
  communication: ["linguistique", "sociale"],
  autonomie: ["entrepreneuriale"],
};

/** Clés Gardner à entraîner en priorité selon les difficultés déclarées (ordre stable, dédupliqué). */
export function difficultyTalentTargets(abilityProfile?: Record<string, string> | null): string[] {
  const targets: string[] = [];
  for (const [axis, value] of Object.entries(abilityProfile ?? {})) {
    if (value !== "difficulte") continue;
    for (const key of DIFFICULTY_TALENT_KEYS[axis] ?? []) {
      if (!targets.includes(key)) targets.push(key);
    }
  }
  return targets;
}

/**
 * Biais doux sur des candidats à clé Gardner ({ key }): les candidats correspondant
 * aux difficultés déclarées passent en tête, les autres gardent leur ordre relatif
 * (stable). Aucun effet si aucune difficulté n'est déclarée.
 */
export function rankByDeclaredDifficulties<T extends { key: string }>(
  candidates: T[],
  abilityProfile?: Record<string, string> | null
): T[] {
  const targets = difficultyTalentTargets(abilityProfile);
  if (targets.length === 0 || candidates.length === 0) return candidates;
  const targeted = candidates.filter((c) => targets.includes(c.key));
  const rest = candidates.filter((c) => !targets.includes(c.key));
  return [...targeted, ...rest];
}

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(TALENT_KEY_LABELS).map(([key, label]) => [label, key])
);

/** Variante pour les libellés (sortie de getLeastExploredTalentLabels). */
export function biasLabelsByDeclaredDifficulties(
  labels: string[],
  abilityProfile?: Record<string, string> | null
): string[] {
  const targets = difficultyTalentTargets(abilityProfile);
  if (targets.length === 0 || labels.length === 0) return labels;
  const targeted = labels.filter((l) => targets.includes(LABEL_TO_KEY[l] ?? ""));
  const rest = labels.filter((l) => !targets.includes(LABEL_TO_KEY[l] ?? ""));
  return [...targeted, ...rest];
}

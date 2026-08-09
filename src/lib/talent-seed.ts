// Seed de talents provisoires (refonte guilde, 2026-08-09) : à la création d'un
// profil enfant, les centres d'intérêt déclarés par le parent (tags comportementaux
// déjà capturés par ProfileDialog, étapes "univers" + "comportements") dérivent une
// baseline de talents — +1 par tag sur la clé Gardner correspondante (le mapping
// INTERESTS_BY_TALENT a 3-4 tags par talent, donc 0-4 pts au maximum). L'enfant a
// ainsi une guilde dès le premier jour au lieu de "Guilde à découvrir" pendant des
// semaines.
//
// Volontairement faible (1-4 pts → bucket "signal_precoce", sous les seuils 40/70) :
// c'est une HYPOTHÈSE de départ, jamais un verdict — les vraies validations de défis
// (increment_child_talents, 1-3 pts) écrasent progressivement cette baseline.
// Retourne TOUJOURS l'objet complet des 9 clés (0 pour les non-sélectionnées) —
// préserve l'invariant "child_profiles.talents contient exactement les 9 clés".

import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { VALID_TALENT_KEYS } from "@/lib/talent-buckets";

export type InterestsByTalent = Record<string, { label: string; tags: readonly string[] }>;

export function seedTalentsFromInterests(
  interests: string[] | null | undefined,
  interestsByTalent: InterestsByTalent = INTERESTS_BY_TALENT,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of VALID_TALENT_KEYS) counts[key] = 0;

  if (!interests) return counts;

  // Reverse map tag → talent key (chaque tag n'appartient qu'à un talent).
  const tagToKey = new Map<string, string>();
  for (const [key, group] of Object.entries(interestsByTalent)) {
    for (const tag of group.tags) tagToKey.set(tag, key);
  }

  for (const tag of interests) {
    const key = tagToKey.get(tag);
    if (key && key in counts) counts[key] += 1;
  }

  return counts;
}

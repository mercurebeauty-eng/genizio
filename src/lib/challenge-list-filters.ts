// Logique de filtres de la liste de défis (page challenges) — extraite du composant
// pour être testée sans navigateur (clôture décision #51, 2026-08-13).

export type ChallengeStatusFilter =
  | "all"
  | "todo"
  | "in_progress"
  | "completed"
  | "not_completed";

/**
 * Correctif du 2026-08-05 (clôture décision #51) : au démarrage d'un défi depuis le
 * filtre « À faire », la mise à jour optimiste retire la carte du filtre AVANT la
 * réponse serveur — sans suivi, le clic semblait « sans effet » (la carte disparaissait
 * sans qu'on voie où elle allait, seul un toast passait). Le filtre suit la carte vers
 * « En cours ». Tout autre filtre est inchangé : « all » garde la carte visible, et
 * « En cours » l'affiche déjà dans son nouvel état.
 */
export function followFilterAfterStart(
  currentFilter: ChallengeStatusFilter,
  fromStatus: ChallengeStatusFilter,
  toStatus: ChallengeStatusFilter
): ChallengeStatusFilter {
  return currentFilter === "todo" && fromStatus === "todo" && toStatus === "in_progress"
    ? "in_progress"
    : currentFilter;
}

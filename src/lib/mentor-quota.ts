import { isGrandfatheredAccount, MAX_CHILDREN_PER_ACCOUNT } from "./child-profile-quota";

// Nombre d'enfants qu'un mentor peut suivre — même bascule que le quota de profils
// enfants (cf. child-profile-quota.ts), appliquée côté organisations : plancher gratuit 5 → 1,
// les campagnes créées avant le cutover gardant leur 5.
//
// Référence de grand-père : la date de création de la CAMPAGNE quand l'assignation est liée à
// une campagne B2B (le contrat a été signé sur ces conditions-là), sinon la date du compte
// mentor lui-même pour le chemin d'assignation admin direct (hors campagne).
//
// Plafond absolu 5 (décision utilisateur 2026-08-08, « 5 par 5 ») : le suivi reste rigoureux,
// une organisation avec plus d'enfants assigne plusieurs mentors.
export const GRANDFATHERED_MENTOR_FLOOR = 5;
export const NEW_MENTOR_FLOOR = 1;

// Doit rester identique à check_mentor_quota() (migration 20260809120000) — c'est ce
// trigger qui fait foi, ce calcul n'est qu'un pré-check et un affichage.
export function computeMentorQuota(params: {
  referenceCreatedAt: string | null | undefined;
  extraQuota: number | null | undefined;
}): number {
  const base = isGrandfatheredAccount(params.referenceCreatedAt)
    ? GRANDFATHERED_MENTOR_FLOOR
    : NEW_MENTOR_FLOOR;
  return Math.min(base + (params.extraQuota ?? 0), MAX_CHILDREN_PER_ACCOUNT);
}

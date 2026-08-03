import { isGrandfatheredAccount } from "./child-profile-quota";

// Nombre d'enfants qu'un superviseur peut suivre — même bascule que le quota de profils
// enfants (cf. child-profile-quota.ts), appliquée côté organisations : plancher gratuit 5 → 1,
// les campagnes créées avant le cutover gardant leur 5.
//
// Référence de grand-père : la date de création de la CAMPAGNE quand l'assignation est liée à
// une campagne B2B (le contrat a été signé sur ces conditions-là), sinon la date du compte
// superviseur lui-même pour le chemin d'assignation admin direct (hors campagne).
export const GRANDFATHERED_SUPERVISOR_FLOOR = 5;
export const NEW_SUPERVISOR_FLOOR = 1;

// Doit rester identique à check_supervisor_quota() (migration 20260803100000) — c'est ce
// trigger qui fait foi, ce calcul n'est qu'un pré-check et un affichage.
export function computeSupervisorQuota(params: {
  referenceCreatedAt: string | null | undefined;
  extraQuota: number | null | undefined;
}): number {
  const base = isGrandfatheredAccount(params.referenceCreatedAt)
    ? GRANDFATHERED_SUPERVISOR_FLOOR
    : NEW_SUPERVISOR_FLOOR;
  return base + (params.extraQuota ?? 0);
}

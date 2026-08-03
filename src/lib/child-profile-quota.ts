// Quota de profils enfants par compte — source unique partagée par les 3 écrans qui
// l'affichaient chacun avec leur propre copie de la formule (profiles.index.tsx,
// profiles.manage.tsx, ProfileDialog.tsx).
//
// Le pivot du 2026-07-22 (5 gratuits pour tous, monétisation via les Saisons) est inversé :
// retour à 1 gratuit + slots payants, la Saison devenant incluse automatiquement. Les comptes
// créés AVANT le cutover gardent leur plancher de 5 — ils se sont inscrits sur cette promesse.
// Rien n'est rétroactif de toute façon : check_child_profile_quota est un BEFORE INSERT, il ne
// gate que la création d'un NOUVEAU profil, jamais ceux déjà existants.
export const FREE_FLOOR_CUTOVER = "2026-08-04T00:00:00.000Z";

export const GRANDFATHERED_FREE_FLOOR = 5;
export const NEW_FREE_FLOOR = 1;

export function isGrandfatheredAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created < new Date(FREE_FLOOR_CUTOVER).getTime();
}

// Strictement additif (plancher + slots achetés), là où l'ancienne formule était
// GREATEST(5, 2 + extra_slots). Ce GREATEST protégeait les tout premiers acheteurs du
// 17→22 juillet, et n'était sans danger que parce que extra_profile_slots était gelé
// (grantProfileSlot supprimé). L'outil d'octroi admin étant reconstruit, il redeviendrait un
// piège : un compte grand-pèré déjà à 5 pourrait acheter 1, 2 ou 3 slots sans que son plafond
// bouge (2+3 = 5, toujours ≤ 5). La forme additive ne rend jamais MOINS que l'ancienne à
// personne (5 + extra ≥ GREATEST(5, 2 + extra) pour tout extra ≥ 0).
// Doit rester identique à check_child_profile_quota() (migration 20260803100000).
export function computeChildProfileQuota(params: {
  accountCreatedAt: string | null | undefined;
  extraSlots: number | null | undefined;
}): number {
  const base = isGrandfatheredAccount(params.accountCreatedAt) ? GRANDFATHERED_FREE_FLOOR : NEW_FREE_FLOOR;
  return base + (params.extraSlots ?? 0);
}

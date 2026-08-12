// Quota de profils enfants par compte — constantes et planchers partagés par
// child-access.ts (computeChildCreationLimit, source unique de la formule) et
// supervisor-quota.ts.
//
// Le pivot du 2026-07-22 (5 gratuits pour tous, monétisation via les Saisons) est inversé :
// retour à 1 gratuit + slots payants, la Saison devenant incluse automatiquement. Les comptes
// créés AVANT le cutover gardent leur plancher de 5 — ils se sont inscrits sur cette promesse.
// Rien n'est rétroactif de toute façon : check_child_profile_quota est un BEFORE INSERT, il ne
// gate que la création d'un NOUVEAU profil, jamais ceux déjà existants.
export const FREE_FLOOR_CUTOVER = "2026-08-04T00:00:00.000Z";

export const GRANDFATHERED_FREE_FLOOR = 5;
export const NEW_FREE_FLOOR = 1;

// Plafond ABSOLU d'enfants par compte (décision utilisateur 2026-08-08) : au-delà →
// nouveau compte. Doit rester identique au LEAST(quota, 5) de check_child_profile_quota()
// (migration 20260809120000). Même limite côté superviseurs (supervisor-quota.ts).
export const MAX_CHILDREN_PER_ACCOUNT = 5;

export function isGrandfatheredAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created < new Date(FREE_FLOOR_CUTOVER).getTime();
}

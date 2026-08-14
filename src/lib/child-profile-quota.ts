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
// C'est la règle STANDARD : elle s'applique aux comptes sans quota +.
export const MAX_CHILDREN_PER_ACCOUNT = 5;

// Quota + par compte (2026-08-14, unification) : UNE seule clé
// raw_app_meta_data.quota_override = quota TOTAL de profils accordé au compte
// (0/absente = règle standard automatique ci-dessus). Borne 50 : miroir du validateur
// admin updateProfileQuotaAdmin et du LEAST(quota_override, 50) du trigger
// check_child_profile_quota (migration 20260814140000). L'ancienne clé
// extra_profile_slots a été remplacée par cette clé (migration de données idem).
export const MAX_QUOTA_OVERRIDE = 50;

export function isGrandfatheredAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return created < new Date(FREE_FLOOR_CUTOVER).getTime();
}

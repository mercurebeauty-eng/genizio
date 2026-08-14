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

// DÉCISION 5 (2026-08-14) : « 5 par palier, cap 50 ». Une couverture de base (abonnement,
// campagne, parrainage) couvre 5 enfants ; au-delà on ACHÈTE un palier (+5 enfants, même
// tarif que le forfait) ; cap absolu 50 (l'ex-quota_override admin). Le plafond absolu par
// compte passe donc de 5 (décision 2026-08-08) à 50 — le parent avec 6+ enfants n'a plus à
// créer un nouveau compte, il achète un palier.
export const PALIER_CHILDREN = 5;

// Plafond de supervision par superviseur (5, cf. supervisor-quota.ts) — le plafond d'enfants
// PAR COMPTE est désormais porté par computeAppQuota (cap 50, décision 5). La constante reste
// nommée MAX_CHILDREN_PER_ACCOUNT pour ne pas casser supervisor-quota.ts, mais sa sémantique
// « plafond absolu de création » est remplacée par MAX_QUOTA_OVERRIDE côté app.
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

// Quota de CRÉATION de profils d'un compte — Miroir TS pur du trigger consolidé
// check_child_profile_quota (migration 20260814200000, V10). L'UI promet exactement ce que
// la base acceptera :
//   • quota_override > 0 (outil ADMIN, app_metadata) → quota TOTAL accordé, borné 50 ;
//   • sinon : plancher (grand-péré 5 | neuf 1) → palier éducateur vouché (10) → couverture de
//     base family_coverages (5) → + Σ(max_children des paliers 'purchase' actifs) → cap 50.
export function computeAppQuota(opts: {
  accountCreatedAt: string | null | undefined;
  quotaOverride?: number;
  hasBaseCoverage?: boolean;
  sumPurchases?: number;
  isVouchedEducator?: boolean;
}): number {
  const {
    quotaOverride = 0,
    hasBaseCoverage = false,
    sumPurchases = 0,
    isVouchedEducator = false,
  } = opts;

  if (quotaOverride > 0) return Math.min(quotaOverride, MAX_QUOTA_OVERRIDE);

  let quota = isGrandfatheredAccount(opts.accountCreatedAt)
    ? GRANDFATHERED_FREE_FLOOR
    : NEW_FREE_FLOOR;

  // Palier éducateur vouché (20260730100000) — plus ramené à 5 par le cap (décision 5).
  if (isVouchedEducator) quota = Math.max(quota, 10);

  // Couverture de base (abonnement/campagne/parrainage) → 5 profils.
  if (hasBaseCoverage) quota = Math.max(quota, PALIER_CHILDREN);

  // Paliers achetés : +5 par palier (décision 5).
  quota += Math.max(0, sumPurchases);

  return Math.min(quota, MAX_QUOTA_OVERRIDE);
}

// V4 « Pass Enfant » (Vague A, 2026-08-14) — la table unique de couverture.
//
// family_coverages est LA source de vérité de la couverture d'une famille (miroir du
// trigger check_child_profile_quota, migration 20260814200000). Chaque manière d'être
// « couvert » est une ligne :
//   • subscription  → abonnement Paystack (child_id NULL, ends_at = current_period_end) ;
//   • accompaniment_pack → Pack Accompagnement PAR ENFANT (child_id NON-NULL, sessions) ;
//   • campaign      → enfant du compte inscrit à une campagne (child_id NULL, une ligne par
//                     (compte, campagne), ends_at = fin de fenêtre) ;
//   • sponsorship   → crédit de parrainage famille (child_id NULL, ends_at = fin du crédit) ;
//   • purchase      → PALIER acheté (child_id NULL, +max_children par palier — décision 5 :
//                     5 par palier, cap 50). Plusieurs lignes s'empilent.
//
// Les écrivains (abonnement, parrainage, campagne, palier) passent tous par
// syncFamilyCoverage / revokeFamilyCoverage — jamais d'écriture directe hors de ce module.

export const FAMILY_BASE_SOURCES = ["subscription", "campaign", "sponsorship"] as const;
export const FAMILY_APP_SOURCES = ["subscription", "campaign", "sponsorship", "purchase"] as const;

export function isBaseSource(source: string): boolean {
  return (FAMILY_BASE_SOURCES as readonly string[]).includes(source);
}

// Une ligne est « active » si son statut l'est ET sa fenêtre [starts_at, ends_at) contient
// maintenant — même filtre que le trigger (migration 20260814200000).
export function isCoverageRowActive(
  row: { status?: string; starts_at?: string | null; ends_at?: string | null },
  now: number,
): boolean {
  if (row.status !== "active") return false;
  const start = row.starts_at ? new Date(row.starts_at).getTime() : -Infinity;
  const end = row.ends_at ? new Date(row.ends_at).getTime() : Infinity;
  return start <= now && end > now;
}

export type CoverageState = {
  /** Au moins une couverture app de base (abonnement/campagne/parrainage) active. */
  hasBaseCoverage: boolean;
  /** Somme des max_children des paliers achetés actifs (décision 5). */
  sumPurchases: number;
  /** Date de couverture effective maximale (max ends_at des lignes app actives), sinon null. */
  coveredUntil: string | null;
};

// Résout l'état de couverture APP d'une famille (une seule lecture, les lignes child_id NULL
// uniquement — les packs accompaniment_pack sont des budgets de séances, pas de la couverture
// app). Utilisé par le résolveur d'accès (child-access), le statut abonnement (UI) et le
// trigger miroir TS.
export async function resolveCoverageState(
  db: { from: (table: string) => any },
  userId: string,
): Promise<CoverageState> {
  const { data: rows, error } = await db
    .from("family_coverages")
    .select("source, max_children, starts_at, ends_at, status")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const now = Date.now();
  // Les lignes « famille » sont celles child_id NULL (les packs accompaniment_pack sont des
  // budgets de séances par enfant, pas de la couverture app — on les ignore ici).
  const familyRows = ((rows ?? []) as any[])
    .filter((r) => r.child_id == null)
    .filter((r) => isCoverageRowActive(r, now));

  const baseRows = familyRows.filter((r) => isBaseSource(r.source));
  const purchaseRows = familyRows.filter((r) => r.source === "purchase");

  let coveredUntil: string | null = null;
  for (const r of familyRows) {
    if (
      r.ends_at &&
      (!coveredUntil || new Date(r.ends_at).getTime() > new Date(coveredUntil).getTime())
    ) {
      coveredUntil = r.ends_at;
    }
  }

  return {
    hasBaseCoverage: baseRows.length > 0,
    sumPurchases: purchaseRows.reduce((sum, r) => sum + (Number(r.max_children) || 0), 0),
    coveredUntil,
  };
}

// Upsert applicatif d'une ligne de couverture famille (child_id NULL) : les index partiels
// garantissent une ligne par (compte, source) pour subscription/sponsorship et par
// (compte, CAMPAGNE) pour campaign (une famille peut être inscrite à plusieurs programmes) —
// on retrouve l'existante et on la met à jour, sinon on insère. Les paliers (purchase)
// s'empilent : l'appelant passe purchaseAppend=true pour INSÉRER une nouvelle ligne à chaque
// achat.
export async function syncFamilyCoverage(
  db: { from: (table: string) => any },
  params: {
    userId: string;
    source: string;
    sourceRef?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxChildren?: number;
    sessions?: number;
    sessionsUsed?: number;
    priceXof?: number | null;
    status?: string;
    purchaseAppend?: boolean;
  },
): Promise<void> {
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: params.userId,
    source: params.source,
    child_id: null,
    source_ref: params.sourceRef ?? null,
    starts_at: params.startsAt ?? nowIso,
    ends_at: params.endsAt ?? null,
    max_children: params.maxChildren ?? 5,
    sessions: params.sessions ?? 0,
    sessions_used: params.sessionsUsed ?? 0,
    price_xof: params.priceXof ?? null,
    status: params.status ?? "active",
  };

  if (params.purchaseAppend) {
    const { error } = await db.from("family_coverages").insert(payload);
    if (error) throw new Error(error.message);
    return;
  }

  let query = db
    .from("family_coverages")
    .select("id")
    .eq("user_id", params.userId)
    .eq("source", params.source);
  // Campagne : une ligne par (compte, campagne) — matcher aussi sur source_ref.
  if (params.source === "campaign" && params.sourceRef) {
    query = query.eq("source_ref", params.sourceRef);
  }

  const { data: existing, error: getErr } = await query;
  if (getErr) throw new Error(getErr.message);

  const row = (existing ?? [])[0];
  if (row?.id) {
    const { error: updErr } = await db.from("family_coverages").update(payload).eq("id", row.id);
    if (updErr) throw new Error(updErr.message);
  } else {
    const { error: insErr } = await db.from("family_coverages").insert(payload);
    if (insErr) throw new Error(insErr.message);
  }
}

// Révoque une couverture famille (child_id NULL) — ex. résiliation d'abonnement : la ligne
// reste pour l'audit, seule son statut change, le résolveur cesse aussitôt de la compter.
export async function revokeFamilyCoverage(
  db: { from: (table: string) => any },
  params: { userId: string; source: string },
): Promise<void> {
  const { error } = await db
    .from("family_coverages")
    .update({ status: "revoked", ends_at: new Date().toISOString() })
    .eq("user_id", params.userId)
    .eq("source", params.source);
  if (error) throw new Error(error.message);
}

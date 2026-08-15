// Superviseur Copilote (décision #74, 2026-08-15) — résolution de l'accompagnement d'un enfant.
//
// Un enfant est « accompagné » s'il a un budget de séances financé :
//   1. Pack Accompagnement actif (family_coverages source='accompaniment_pack', child_id
//      NON-NULL, statut active, fenêtre [starts_at, ends_at) contient maintenant) avec des
//      séances restantes (sessions_used < sessions) ;
//   2. Sinon campagne active de l'enfant (season_enrollments → campaigns) en fenêtre avec
//      compteur SÉANCES restant (sessions_used < sessions_target) ;
//   3. Sinon « none ».
//
// Miroir LECTURE SEULE de la chaîne de financement inline de declareSessionSupervisor
// (supervisors.functions.ts, lignes 561-618) — la différence est assumée : le déclarateur
// fait un débit ATOMIQUE (update avec garde .lt(), le retour = le claim), le résolveur
// d'autorisation ne fait que lire l'état courant. La consolidation des deux est possible
// plus tard ; aujourd'hui on ne touche pas au chemin argent.
//
// Fonction db-paramétrée (testable avec fake DB, convention family-coverages.ts).

export type ChildAccompaniment = {
  funding: "pack" | "campaign" | "none";
  /** Budget de séances de la période (pack.sessions ou campaigns.sessions_target), sinon 0. */
  budget: number;
  campaignId: string | null;
};

export async function resolveChildAccompaniment(
  db: { from: (table: string) => any },
  childId: string,
  now = Date.now(),
): Promise<ChildAccompaniment> {
  const nowIso = new Date(now).toISOString();

  // 1. Pack Accompagnement par enfant — même filtre que declareSessionSupervisor.
  const { data: pack } = await db
    .from("family_coverages")
    .select("id, sessions_used, sessions")
    .eq("child_id", childId)
    .eq("source", "accompaniment_pack")
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .maybeSingle();
  if (pack && (pack.sessions_used ?? 0) < (pack.sessions ?? 0)) {
    return { funding: "pack", budget: pack.sessions ?? 0, campaignId: null };
  }

  // 2. Campagne en fenêtre avec compartiment SÉANCES restant (décision 3 — 2 compteurs).
  const { data: enrollment } = await db
    .from("season_enrollments")
    .select("campaign_id, campaigns(id, sessions_target, sessions_used, start_date, end_date)")
    .eq("child_id", childId)
    .not("campaign_id", "is", null)
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const c = enrollment?.campaigns as
    | {
        id: string;
        sessions_target: number;
        sessions_used: number;
        start_date: string | null;
        end_date: string | null;
      }
    | null;
  const inWindow =
    !!c?.start_date &&
    !!c.end_date &&
    new Date(c.start_date).getTime() <= now &&
    now <= new Date(c.end_date).getTime();
  if (c && inWindow && (c.sessions_used ?? 0) < (c.sessions_target ?? 0)) {
    return { funding: "campaign", budget: c.sessions_target ?? 0, campaignId: c.id };
  }

  return { funding: "none", budget: 0, campaignId: null };
}

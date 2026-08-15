// Confiance Mentor (2026-08-15) — exécution serveur des règles de confiance.
//
// Deux familles de responsabilités, toutes NON-BLOQUANTES pour l'appelant :
//   1. Points (mentor_points) : crédit idempotent (index unique (kind, source) en
//      base — le double crédit est impossible) et lecture du solde.
//   2. Statut automatique : le score de CONFIANCE est calculé sur une fenêtre
//      GLISSANTE de 30 jours (pas le mois civil) — sinon un mentor parfait sur le
//      mois passé retomberait à ~0 début de mois suivant et serait sanctionné à
//      tort. `syncMentorTrustStatus` compare le statut cible au statut actuel et
//      ne bascule que si nécessaire (jamais sur « banned », décision humaine).
//
// Même convention que mentor-score.ts : helpers purs pour les calculs, ici les
// lectures/écritures via le db passé (toujours supabaseAdmin — tables service-role).

import { computeExpectedSessions, computeMentorScore, computeMentorStatusFromScore } from "./mentor-score";
import { notifyUser } from "./app-notifications";
import { punctualityFromSessions } from "./mentor-scheduling";

/** Statuts de séance qui comptent comme « confirmées par le parent » (le cycle
 *  declared → confirmed → approved → paid : une fois confirmée, elle reste comptée). */
export const CONFIRMED_SESSION_STATUSES = ["confirmed", "approved", "paid"];

/** Fenêtre glissante du score de confiance (30 jours pleins — pas de proratisation). */
export const TRUST_WINDOW_DAYS = 30;

// ── Points ──────────────────────────────────────────────────────────────────

export async function getMentorPointsBalance(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<number> {
  const { data, error } = await db
    .from("mentor_points")
    .select("points")
    .eq("mentor_user_id", mentorUserId);
  if (error) {
    console.error("getMentorPointsBalance failed (non-fatal):", error.message);
    return 0;
  }
  return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.points), 0);
}

/**
 * Crédite des points. Idempotent : la contrainte unique (kind, session_id) /
 * (kind, challenge_id) en base fait foi — une violation est simplement ignorée
 * (déjà crédité), jamais une erreur pour l'appelant.
 */
export async function creditMentorPoints(
  db: { from: (table: string) => any },
  params: {
    mentorUserId: string;
    childId?: string | null;
    sessionId?: string | null;
    challengeId?: string | null;
    kind: "session_confirmed" | "challenge_completed" | "feedback_5";
    points: number;
    reason?: string;
  },
): Promise<void> {
  try {
    const { error } = await db.from("mentor_points").insert({
      mentor_user_id: params.mentorUserId,
      child_profile_id: params.childId ?? null,
      session_id: params.sessionId ?? null,
      challenge_id: params.challengeId ?? null,
      kind: params.kind,
      points: params.points,
      reason: params.reason ?? null,
    });
    if (error) {
      // 23505 = unique violation → déjà crédité (non-fatal). Autre erreur : on trace.
      if (error.code !== "23505") {
        console.error("creditMentorPoints failed (non-fatal):", error.message);
      }
    }
  } catch (err) {
    console.error("creditMentorPoints failed (non-fatal):", err);
  }
}

// ── Statut automatique (fenêtre glissante 30 j) ──────────────────────────────

/**
 * Score de confiance sur les 30 derniers jours pour un mentor : séances CONFIRMÉES
 * (la déclaration seule ne suffit plus) ÷ attendues (12/mois/enfant), progression
 * des défis (cumul), feedback famille sur les séances de la fenêtre, ponctualité
 * (séances liées à un créneau planifié réalisées à l'heure) et contestations
 * (compteur négatif).
 */
export async function computeRollingScore(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<number> {
  const { data: assignments } = await db
    .from("mentors")
    .select("child_profile_id")
    .eq("mentor_user_id", mentorUserId)
    .is("removed_at", null);
  const childrenCount = assignments?.length ?? 0;
  if (childrenCount === 0) return 0;

  const childIds = (assignments ?? []).map((a: any) => a.child_profile_id as string);
  const windowStart = new Date(Date.now() - TRUST_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await db
    .from("mentor_sessions")
    .select("id, occurred_at, scheduled_at")
    .eq("mentor_user_id", mentorUserId)
    .in("status", CONFIRMED_SESSION_STATUSES)
    .gte("occurred_at", windowStart);
  const sessionIds = (sessions ?? []).map((s: any) => s.id as string);

  // Contestations (compteur négatif) : séances contestées par le parent dans la fenêtre.
  const { data: contested } = await db
    .from("mentor_sessions")
    .select("id")
    .eq("mentor_user_id", mentorUserId)
    .eq("status", "contested")
    .gte("contested_at", windowStart);

  let avgFeedback = 0;
  if (sessionIds.length > 0) {
    const { data: feedback } = await db
      .from("mentor_feedback")
      .select("rating")
      .in("mentor_session_id", sessionIds);
    const ratings = (feedback ?? []).map((f: any) => Number(f.rating));
    if (ratings.length > 0) {
      avgFeedback = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    }
  }

  const { data: challenges } = await db
    .from("challenges")
    .select("child_id, status")
    .in("child_id", childIds)
    .is("deleted_at", null);
  const childSet = new Set(childIds);
  let completed = 0;
  let total = 0;
  for (const c of challenges ?? []) {
    if (!childSet.has(c.child_id)) continue;
    total += 1;
    if (c.status === "completed") completed += 1;
  }

  return computeMentorScore({
    expectedSessions: computeExpectedSessions(childrenCount, TRUST_WINDOW_DAYS, TRUST_WINDOW_DAYS),
    declaredSessions: sessionIds.length,
    contestedSessions: (contested ?? []).length,
    completedChallenges: completed,
    totalChallenges: total,
    avgFeedback,
    punctualityScore: punctualityFromSessions(sessions ?? []),
  });
}

/**
 * Bascule automatique du statut si le score de confiance a franchi un seuil.
 * Jamais sur « banned ». À chaque bascule : notification in-app mentor + admins
 * (type `mentor_status_changed`). Non-fatal — une erreur ici ne doit jamais faire
 * échouer l'action qui l'a déclenchée (même pattern que logMentorAction).
 */
export async function syncMentorTrustStatus(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<{ changed: boolean; from?: string; to?: string; score?: number }> {
  try {
    const score = await computeRollingScore(db, mentorUserId);
    const target = computeMentorStatusFromScore(score);

    const { data: profile } = await db
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", mentorUserId)
      .maybeSingle();
    const current = (profile?.status as string | undefined) ?? "active";
    if (current === "banned" || current === target) return { changed: false };

    if (profile) {
      await db
        .from("mentor_profiles")
        .update({ status: target })
        .eq("mentor_user_id", mentorUserId);
    } else {
      await db.from("mentor_profiles").insert({ mentor_user_id: mentorUserId, status: target });
    }

    void notifyUser({
      userId: mentorUserId,
      type: "mentor_status_changed",
      payload: { from: current, to: target, score },
      channels: { push: true, email: true },
    });
    for (const adminId of await listAdminUserIds(db)) {
      void notifyUser({
        userId: adminId,
        type: "mentor_status_changed",
        payload: { mentor_user_id: mentorUserId, from: current, to: target, score },
        channels: { push: true, email: true },
      });
    }
    return { changed: true, from: current, to: target, score };
  } catch (err) {
    console.error("syncMentorTrustStatus failed (non-fatal):", err);
    return { changed: false };
  }
}

/** Ids des comptes admin (ADMIN_EMAILS, même source de vérité que requireAdmin). */
export async function listAdminUserIds(
  db: { from: (table: string) => any },
): Promise<string[]> {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return [];
  try {
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    // listAllUsers attend le client complet (auth.admin.listUsers) ; les appelants
    // passent toujours supabaseAdmin — le cast est documenté par le paramètre.
    const users = await listAllUsers(db as any);
    return users
      .filter((u) => u.email && emails.includes(u.email.toLowerCase()))
      .map((u) => u.id);
  } catch (err) {
    console.error("listAdminUserIds failed (non-fatal):", err);
    return [];
  }
}

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
//      Deux garde-fous (2026-08-16) : la fenêtre est PRORATISÉE sur l'âge du
//      compte (premier mois partiel réellement appliqué au score glissant) et un
//      compte jeune sans AUCUNE trace mesurable n'est jamais dégradé (cold-start)
//      — le score 0 d'un mentor tout neuf vient de l'absence de données, pas
//      d'une mauvaise conduite.
//
// Même convention que mentor-score.ts : helpers purs pour les calculs, ici les
// lectures/écritures via le db passé (toujours supabaseAdmin — tables service-role).

import {
  coldStartRestoreTarget,
  computeExpectedSessions,
  computeMentorAccountAgeDays,
  computeMentorScore,
  computeMentorStatusFromScore,
  isMentorColdStart,
} from "./mentor-score";
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
 * Compteurs du score de confiance sur la fenêtre glissante (30 j) d'un mentor :
 * séances CONFIRMÉES (la déclaration seule ne suffit plus) ÷ attendues
 * (12/mois/enfant, PRORATISÉES sur l'âge du compte — un mentor d'une semaine n'a
 * pas 12 séances/enfant d'attendu), progression des défis (cumul), feedback
 * famille, ponctualité et contestations (compteur négatif). Expose aussi l'âge du
 * compte (borne la plus ancienne : activation du profil / première assignation)
 * pour la proratisation ET la garde cold-start — pas de dégradation automatique
 * tant qu'il n'y a aucune trace mesurable.
 */
export interface RollingScoreCounters {
  childrenCount: number;
  /** Âge du compte mentor en jours (0 = tout neuf, aucune borne). */
  accountAgeDays: number;
  /** Séances confirmées par le parent dans la fenêtre. */
  confirmedSessions: number;
  /** Séances contestées dans la fenêtre (compteur négatif). */
  contestedSessions: number;
  /** Notes famille posées dans la fenêtre. */
  feedbackCount: number;
  avgFeedback: number;
  completedChallenges: number;
  totalChallenges: number;
  /** Score de ponctualité /100, null si aucune séance planifiée (composante absente). */
  punctualityScore: number | null;
}

export async function loadRollingCounters(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<RollingScoreCounters> {
  const { data: assignments } = await db
    .from("mentors")
    .select("child_profile_id, created_at")
    .eq("mentor_user_id", mentorUserId)
    .is("removed_at", null);
  const childrenCount = assignments?.length ?? 0;
  const childIds = (assignments ?? []).map((a: any) => a.child_profile_id as string);

  const { data: profile } = await db
    .from("mentor_profiles")
    .select("created_at")
    .eq("mentor_user_id", mentorUserId)
    .maybeSingle();
  const accountAgeDays = computeMentorAccountAgeDays([
    profile?.created_at as string | undefined,
    ...(assignments ?? []).map((a: any) => a.created_at as string | undefined),
  ]);

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
  let feedbackCount = 0;
  if (sessionIds.length > 0) {
    const { data: feedback } = await db
      .from("mentor_feedback")
      .select("rating")
      .in("mentor_session_id", sessionIds);
    const ratings = (feedback ?? []).map((f: any) => Number(f.rating));
    feedbackCount = ratings.length;
    if (ratings.length > 0) {
      avgFeedback = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    }
  }

  let completed = 0;
  let total = 0;
  if (childIds.length > 0) {
    const childSet = new Set(childIds);
    const { data: challenges } = await db
      .from("challenges")
      .select("child_id, status")
      .in("child_id", childIds)
      .is("deleted_at", null);
    for (const c of challenges ?? []) {
      if (!childSet.has(c.child_id)) continue;
      total += 1;
      if (c.status === "completed") completed += 1;
    }
  }

  return {
    childrenCount,
    accountAgeDays,
    confirmedSessions: sessionIds.length,
    contestedSessions: (contested ?? []).length,
    feedbackCount,
    avgFeedback,
    completedChallenges: completed,
    totalChallenges: total,
    punctualityScore: punctualityFromSessions(sessions ?? []),
  };
}

/** Séances attendues proratisées sur l'âge du compte (plancher 1 jour, cap fenêtre). */
function expectedRollingSessions(c: { childrenCount: number; accountAgeDays: number }): number {
  const elapsedDays = Math.min(TRUST_WINDOW_DAYS, Math.max(1, c.accountAgeDays));
  return computeExpectedSessions(c.childrenCount, TRUST_WINDOW_DAYS, elapsedDays);
}

/**
 * Score de confiance sur les 30 derniers jours pour un mentor (2026-08-16 : la
 * fenêtre est PRORATISÉE sur l'âge du compte — « le premier mois partiel ne
 * pénalise pas d'office » est maintenant réellement appliqué au score glissant,
 * pas seulement à la vue mensuelle du dashboard).
 */
export async function computeRollingScore(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<number> {
  const counters = await loadRollingCounters(db, mentorUserId);
  return computeMentorScore({
    expectedSessions: expectedRollingSessions(counters),
    declaredSessions: counters.confirmedSessions,
    contestedSessions: counters.contestedSessions,
    completedChallenges: counters.completedChallenges,
    totalChallenges: counters.totalChallenges,
    avgFeedback: counters.avgFeedback,
    punctualityScore: counters.punctualityScore,
  });
}

/**
 * Bascule automatique du statut si le score de confiance a franchi un seuil.
 * Jamais sur « banned ». À chaque bascule : notification in-app mentor + admins
 * (type `mentor_status_changed`). Non-fatal — une erreur ici ne doit jamais faire
 * échouer l'action qui l'a déclenchée (même pattern que logMentorAction).
 * Garde cold-start : tant que le compte n'a aucune trace mesurable et que la
 * période de grâce n'est pas écoulée, le statut n'est JAMAIS dégradé — un mentor
 * tout neuf (score 0 par absence de données) reste « active ». Rétro-compat : un
 * compte déjà dégradé par une logique antérieure (warning/suspended) est alors
 * restauré à « active ».
 */
export async function syncMentorTrustStatus(
  db: { from: (table: string) => any },
  mentorUserId: string,
): Promise<{ changed: boolean; from?: string; to?: string; score?: number; coldStart?: boolean }> {
  try {
    const counters = await loadRollingCounters(db, mentorUserId);
    const score = computeMentorScore({
      expectedSessions: expectedRollingSessions(counters),
      declaredSessions: counters.confirmedSessions,
      contestedSessions: counters.contestedSessions,
      completedChallenges: counters.completedChallenges,
      totalChallenges: counters.totalChallenges,
      avgFeedback: counters.avgFeedback,
      punctualityScore: counters.punctualityScore,
    });

    const { data: profile } = await db
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", mentorUserId)
      .maybeSingle();
    const current = (profile?.status as string | undefined) ?? "active";
    if (current === "banned") return { changed: false, score };

    // Cold-start (2026-08-16) : pas de dégradation automatique tant qu'il n'y a
    // aucune donnée de SÉANCE (ni séance confirmée, ni contestation, ni feedback —
    // l'activité défis ne compte pas : elle ne prouve rien sur la tenue des
    // séances) et que la période de grâce (une fenêtre de confiance pleine) n'est
    // pas écoulée. Rétro-compat : un compte que l'ancienne logique avait
    // suspendu/averti sans donnée est restauré à « active » — le ban, décision
    // humaine, n'est jamais touché (géré plus haut).
    if (
      isMentorColdStart({
        accountAgeDays: counters.accountAgeDays,
        confirmedSessions: counters.confirmedSessions,
        contestedSessions: counters.contestedSessions,
        feedbackCount: counters.feedbackCount,
      })
    ) {
      const restore = coldStartRestoreTarget(current);
      if (!restore) return { changed: false, coldStart: true, score };
      await db
        .from("mentor_profiles")
        .update({ status: restore })
        .eq("mentor_user_id", mentorUserId);
      await notifyMentorStatusChange(db, mentorUserId, current, restore, score);
      return { changed: true, from: current, to: restore, score, coldStart: true };
    }

    const target = computeMentorStatusFromScore(score);
    if (current === target) return { changed: false, score };

    if (profile) {
      await db
        .from("mentor_profiles")
        .update({ status: target })
        .eq("mentor_user_id", mentorUserId);
    } else {
      await db.from("mentor_profiles").insert({ mentor_user_id: mentorUserId, status: target });
    }

    await notifyMentorStatusChange(db, mentorUserId, current, target, score);
    return { changed: true, from: current, to: target, score };
  } catch (err) {
    console.error("syncMentorTrustStatus failed (non-fatal):", err);
    return { changed: false };
  }
}

/** Notification in-app mentor + admins d'une bascule de statut (auto ou rétro-restauration). */
async function notifyMentorStatusChange(
  db: { from: (table: string) => any },
  mentorUserId: string,
  from: string,
  to: string,
  score?: number,
): Promise<void> {
  void notifyUser({
    userId: mentorUserId,
    type: "mentor_status_changed",
    payload: { from, to, score },
    channels: { push: true, email: true },
  });
  for (const adminId of await listAdminUserIds(db)) {
    void notifyUser({
      userId: adminId,
      type: "mentor_status_changed",
      payload: { mentor_user_id: mentorUserId, from, to, score },
      channels: { push: true, email: true },
    });
  }
}

/** Ids des comptes admin (ADMIN_EMAILS, même source de vérité que requireAdmin). */
export async function listAdminUserIds(db: { from: (table: string) => any }): Promise<string[]> {
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
    return users.filter((u) => u.email && emails.includes(u.email.toLowerCase())).map((u) => u.id);
  } catch (err) {
    console.error("listAdminUserIds failed (non-fatal):", err);
    return [];
  }
}

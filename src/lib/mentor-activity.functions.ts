// Vue globale d'activité du mentor (décision #83, 2026-08-16) — server fn.
//
// Le mentor n'avait aucune vue d'ensemble : ce qu'il gagne, ce qu'il a reçu, ce qui
// est en attente, ses séances, l'évolution des enfants suivis. Cette fn agrège ses
// données (séances, bilans, défis, feedback famille) en un payload unique — les
// calculs purs vivent dans mentor-activity.ts, les lectures ici via supabaseAdmin
// (tables mentor = service-role, comme le reste de la famille mentor).
//
// Volume borné : les séances d'un mentor sont celles de ses enfants assignés (≤ 5
// enfants × 12/mois) — une borne de 2 000 lignes (ordre desc) couvre des années.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildMonthlyActivitySeries,
  computeEarningsBreakdown,
  sessionsInMonth,
  type MentorActivitySession,
} from "@/lib/mentor-activity";
import { CONFIRMED_SESSION_STATUSES } from "@/lib/mentor-trust";
import { punctualityFromSessions } from "@/lib/mentor-scheduling";
import type { MentorReportStatus } from "@/lib/mentor-reports";

export interface MentorActivityChild {
  child_id: string;
  name: string;
  age: number | null;
  avatar_color: string | null;
  /** Talents (miroir child_profiles.talents) — la guilde est dérivée côté UI. */
  talents: Record<string, number> | null;
  /** Date de l'assignation active — durée de suivi affichée. */
  assigned_at: string;
  /** Séances déclarées (tous statuts) sur cet enfant. */
  sessionsTotal: number;
  /** Séances confirmées par le parent (confirmed + approved + paid), toutes périodes. */
  confirmedSessions: number;
  /** Séances confirmées le mois courant. */
  confirmedThisMonth: number;
  challengesCompleted: number;
  challengesTotal: number;
  /** Dernier bilan (draft/submitted/validated/rejected) ou null si aucun. */
  reportStatus: MentorReportStatus | null;
  /** Note famille moyenne (1-5) sur les séances de cet enfant ; null si aucune note. */
  avgFeedback: number | null;
  /** Nombre de séances notées par la famille pour cet enfant. */
  feedbackCount: number;
}

export interface MentorActivityOverview {
  /** Ventilation financière toutes périodes. */
  earnings: ReturnType<typeof computeEarningsBreakdown>;
  /** Ventilation financière du mois courant (occurred_at). */
  monthEarnings: ReturnType<typeof computeEarningsBreakdown>;
  /** Évolution mensuelle (6 derniers mois) pour le graphique. */
  monthlySeries: ReturnType<typeof buildMonthlyActivitySeries>;
  /** Évolution par enfant suivi. */
  children: MentorActivityChild[];
  quality: {
    /** Ponctualité /100 du mois courant ; null si aucun créneau planifié. */
    punctuality: number | null;
    /** Note famille moyenne (1-5) sur toutes les séances notées. */
    avgFeedback: number | null;
    /** Séances contestées (toutes périodes) — exclues des gains. */
    contestedTotal: number;
    reportsDraft: number;
    reportsSubmitted: number;
    reportsValidated: number;
    reportsRejected: number;
  };
}

export const getMentorActivityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MentorActivityOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    if ((profile?.status as string | undefined) === "banned")
      throw new Error("Votre compte mentor est banni.");

    // Assignations actives + profils enfants (nom, âge, talents pour la guilde).
    const { data: assignments, error: assignErr } = await (supabaseAdmin as any)
      .from("mentors")
      .select("child_profile_id, created_at, child_profiles(name, age, avatar_color, talents)")
      .eq("mentor_user_id", userId)
      .is("removed_at", null);
    if (assignErr) throw new Error(assignErr.message);
    const childIds = (assignments ?? []).map((a: any) => a.child_profile_id as string);

    // Séances du mentor (toutes périodes, bornées) — source des revenus.
    const { data: sessionRows, error: sessionsErr } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, child_profile_id, occurred_at, status, payout_xof, scheduled_at")
      .eq("mentor_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(2000);
    if (sessionsErr) throw new Error(sessionsErr.message);
    const sessions: MentorActivitySession[] = (sessionRows ?? []).map(
      (s: any): MentorActivitySession => ({
        id: s.id as string,
        child_profile_id: s.child_profile_id as string,
        occurred_at: s.occurred_at as string,
        status: s.status as MentorActivitySession["status"],
        payout_xof: s.payout_xof != null ? Number(s.payout_xof) : null,
        scheduled_at: (s.scheduled_at as string | null) ?? null,
      }),
    );
    const sessionIds = sessions.map((s) => s.id);

    // Feedback famille (note 1-5) sur les séances du mentor — moyenne globale et par enfant.
    const ratingBySession = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("mentor_feedback")
        .select("mentor_session_id, rating")
        .in("mentor_session_id", sessionIds);
      for (const f of feedback ?? []) ratingBySession.set(f.mentor_session_id, Number(f.rating));
    }

    // Bilans de fin — le dernier par enfant (statut) + compteurs par statut.
    const { data: reportRows } = await (supabaseAdmin as any)
      .from("mentor_reports")
      .select("child_profile_id, status")
      .in("child_profile_id", childIds)
      .eq("mentor_user_id", userId)
      .order("created_at", { ascending: false });
    const latestReportByChild = new Map<string, MentorReportStatus>();
    const reportCounts: Record<MentorReportStatus, number> = {
      draft: 0,
      submitted: 0,
      validated: 0,
      rejected: 0,
    };
    for (const r of reportRows ?? []) {
      reportCounts[r.status as MentorReportStatus] += 1;
      if (!latestReportByChild.has(r.child_profile_id as string)) {
        latestReportByChild.set(r.child_profile_id as string, r.status as MentorReportStatus);
      }
    }

    // Progression des défis des enfants suivis.
    const challengesByChild = new Map<string, { completed: number; total: number }>();
    if (childIds.length > 0) {
      const { data: challenges } = await (supabaseAdmin as any)
        .from("challenges")
        .select("child_id, status")
        .in("child_id", childIds)
        .is("deleted_at", null);
      for (const c of challenges ?? []) {
        const cur = challengesByChild.get(c.child_id as string) ?? { completed: 0, total: 0 };
        cur.total += 1;
        if (c.status === "completed") cur.completed += 1;
        challengesByChild.set(c.child_id as string, cur);
      }
    }

    // Agrégats purs (mentor-activity.ts) — une passe chacun.
    const earnings = computeEarningsBreakdown(sessions);
    const monthSessions = sessionsInMonth(sessions);
    const monthEarnings = computeEarningsBreakdown(monthSessions);
    const monthlySeries = buildMonthlyActivitySeries(sessions);
    const monthSessionIds = new Set(monthSessions.map((s) => s.id));

    const confirmedStatuses = new Set<string>(CONFIRMED_SESSION_STATUSES);
    const confirmedSessions = sessions.filter((s) => confirmedStatuses.has(s.status));
    const confirmedThisMonth = monthSessions.filter((s) => confirmedStatuses.has(s.status));

    // Par enfant : séances, confirmation, défis, bilan, note moyenne.
    const children: MentorActivityChild[] = (assignments ?? []).map((a: any) => {
      const child = a.child_profiles as any;
      const childId = a.child_profile_id as string;
      const childSessions = sessions.filter((s) => s.child_profile_id === childId);
      const childConfirmed = childSessions.filter((s) => confirmedStatuses.has(s.status));
      const childMonth = monthSessions.filter((s) => s.child_profile_id === childId);
      const ratings = childSessions
        .map((s) => ratingBySession.get(s.id))
        .filter((r): r is number => r != null);
      const progress = challengesByChild.get(childId);
      return {
        child_id: childId,
        name: child?.name ?? "Enfant",
        age: child?.age ?? null,
        avatar_color: child?.avatar_color ?? null,
        talents: child?.talents ?? null,
        assigned_at: a.created_at as string,
        sessionsTotal: childSessions.length,
        confirmedSessions: childConfirmed.length,
        confirmedThisMonth: childMonth.filter((s) => confirmedStatuses.has(s.status)).length,
        challengesCompleted: progress?.completed ?? 0,
        challengesTotal: progress?.total ?? 0,
        reportStatus: latestReportByChild.get(childId) ?? null,
        avgFeedback:
          ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null,
        feedbackCount: ratings.length,
      };
    });

    const allRatings = [...ratingBySession.values()];
    const punctuality = punctualityFromSessions(monthSessions);

    return {
      earnings,
      monthEarnings,
      monthlySeries,
      children,
      quality: {
        punctuality,
        avgFeedback:
          allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
            : null,
        contestedTotal: sessions.filter((s) => s.status === "contested").length,
        reportsDraft: reportCounts.draft,
        reportsSubmitted: reportCounts.submitted,
        reportsValidated: reportCounts.validated,
        reportsRejected: reportCounts.rejected,
      },
    };
  });

// Vue globale d'activité du mentor (décision #83, 2026-08-16) — helpers PURS.
//
// Le mentor n'avait aucune vue d'ensemble : pas de total gagné, pas de distinction
// payé / en attente, pas d'historique. Ce module calcule les agrégats depuis les
// lignes `mentor_sessions` (le payout_xof est un SNAPSHOT immuable posé à la
// déclaration — les sommes sont donc exactes, jamais recalculées).
//
// Sémantique financière (affichage) :
//   • Gagné     = séances CONFIRMÉES par le parent (confirmed + approved + paid) —
//                 l'argent acquis (la déclaration seule ne suffit plus, V3) ;
//   • Reçu      = statut paid (payé par l'admin) ;
//   • En attente = approved (approuvé, à payer) + confirmed (à approuver), séparés ;
//   • Déclaré non confirmé = statut declared (en attente du parent, non acquis) ;
//   • Contesté  = exclu des gains, compteur affiché.
//
// Fonctions pures testables sans base (même convention que mentor-score.ts /
// mentor-scheduling.ts) — la server function charge les lignes puis appelle ces
// calculs.

export type MentorSessionStatus = "declared" | "confirmed" | "approved" | "paid" | "contested";

export interface MentorActivitySession {
  id: string;
  child_profile_id: string;
  occurred_at: string;
  status: MentorSessionStatus;
  payout_xof: number | null;
  scheduled_at: string | null;
}

export interface EarningsBreakdown {
  /** Gagné (séances confirmées par le parent : confirmed + approved + paid). */
  earned: number;
  /** Reçu (payé par l'admin). */
  received: number;
  /** Approuvé par l'admin, pas encore payé. */
  approvedPending: number;
  /** Confirmé par le parent, pas encore approuvé par l'admin. */
  confirmedPending: number;
  /** Déclaré, pas encore confirmé par le parent — non acquis. */
  declaredPending: number;
  /** Contesté — exclu des gains. */
  contested: number;
  /** Compteur de séances par statut. */
  counts: Record<MentorSessionStatus, number>;
}

/** Ventilation financière depuis les lignes de séance — une seule passe. */
export function computeEarningsBreakdown(sessions: MentorActivitySession[]): EarningsBreakdown {
  const breakdown: EarningsBreakdown = {
    earned: 0,
    received: 0,
    approvedPending: 0,
    confirmedPending: 0,
    declaredPending: 0,
    contested: 0,
    counts: { declared: 0, confirmed: 0, approved: 0, paid: 0, contested: 0 },
  };
  for (const s of sessions) {
    const xof = Number(s.payout_xof ?? 0);
    breakdown.counts[s.status] += 1;
    switch (s.status) {
      case "paid":
        breakdown.received += xof;
        breakdown.earned += xof;
        break;
      case "approved":
        breakdown.approvedPending += xof;
        breakdown.earned += xof;
        break;
      case "confirmed":
        breakdown.confirmedPending += xof;
        breakdown.earned += xof;
        break;
      case "declared":
        breakdown.declaredPending += xof;
        break;
      case "contested":
        breakdown.contested += xof;
        break;
    }
  }
  return breakdown;
}

/** Séances de la fenêtre « mois courant » (occurred_at) — même convention que le score. */
export function sessionsInMonth(
  sessions: MentorActivitySession[],
  reference: Date = new Date(),
): MentorActivitySession[] {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1).getTime();
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1).getTime();
  return sessions.filter((s) => {
    const t = new Date(s.occurred_at).getTime();
    return t >= start && t < end;
  });
}

export interface MonthlyActivityPoint {
  /** Clé triable "YYYY-MM" — l'ordre du tableau est chronologique. */
  key: string;
  /** Libellé court pour l'axe du graphique (ex. "mars 26"). */
  label: string;
  /** Séances confirmées par le parent ce mois (confirmed + approved + paid). */
  confirmed: number;
  /** Gains acquis ce mois (somme des payout_xof des séances confirmées). */
  earnedXof: number;
}

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/**
 * Série mensuelle des N derniers mois (le mois courant inclus), du plus ancien au
 * plus récent — prête pour le graphique d'évolution. Les mois sans séance sont
 * présents (zéro) : la courbe ne « saute » pas de mois vide.
 */
export function buildMonthlyActivitySeries(
  sessions: MentorActivitySession[],
  months = 6,
  reference: Date = new Date(),
): MonthlyActivityPoint[] {
  const points: MonthlyActivityPoint[] = [];
  const now = reference;
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = monthDate.getTime();
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
    const inMonth = sessions.filter((s) => {
      const t = new Date(s.occurred_at).getTime();
      return t >= start && t < end;
    });
    points.push({
      key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[monthDate.getMonth()]} ${String(monthDate.getFullYear()).slice(2)}`,
      confirmed: inMonth.filter((s) => s.status !== "declared" && s.status !== "contested").length,
      earnedXof: inMonth
        .filter((s) => s.status !== "declared" && s.status !== "contested")
        .reduce((sum, s) => sum + Number(s.payout_xof ?? 0), 0),
    });
  }
  return points;
}

import { describe, it, expect } from "vitest";
import {
  buildMonthlyActivitySeries,
  computeEarningsBreakdown,
  sessionsInMonth,
  type MentorActivitySession,
} from "./mentor-activity";

// Vue globale d'activité du mentor (décision #83, 2026-08-16) — helpers purs.
// Sémantique : gagné = séances CONFIRMÉES par le parent (confirmed/approved/paid),
// reçu = paid, en attente = approved (à payer) + confirmed (à approuver), declared
// = en attente du parent (non acquis), contested = exclu des gains.

const S = (
  overrides: Partial<MentorActivitySession> & Pick<MentorActivitySession, "status">,
): MentorActivitySession => ({
  id: "s-" + Math.random().toString(36).slice(2),
  child_profile_id: "c1",
  occurred_at: "2026-08-10T10:00:00.000Z",
  payout_xof: 3500,
  scheduled_at: null,
  ...overrides,
});

describe("computeEarningsBreakdown", () => {
  it("séance vide : tout à zéro", () => {
    const b = computeEarningsBreakdown([]);
    expect(b.earned).toBe(0);
    expect(b.received).toBe(0);
    expect(b.counts).toEqual({
      declared: 0,
      confirmed: 0,
      approved: 0,
      paid: 0,
      contested: 0,
    });
  });

  it("chaque statut alimente la bonne case du total gagné", () => {
    const b = computeEarningsBreakdown([
      S({ status: "declared", payout_xof: 3500 }),
      S({ status: "confirmed", payout_xof: 3500 }),
      S({ status: "approved", payout_xof: 3500 }),
      S({ status: "paid", payout_xof: 3750 }),
      S({ status: "contested", payout_xof: 3500 }),
    ]);
    expect(b.counts).toEqual({
      declared: 1,
      confirmed: 1,
      approved: 1,
      paid: 1,
      contested: 1,
    });
    // Gagné = confirmed + approved + paid ; declared et contested exclus.
    expect(b.earned).toBe(3500 + 3500 + 3750);
    expect(b.received).toBe(3750);
    expect(b.approvedPending).toBe(3500);
    expect(b.confirmedPending).toBe(3500);
    expect(b.declaredPending).toBe(3500);
    expect(b.contested).toBe(3500);
  });

  it("payout_xof null ou absent = 0 F (séance jamais facturée)", () => {
    const b = computeEarningsBreakdown([
      S({ status: "paid", payout_xof: null }),
      S({ status: "confirmed", payout_xof: undefined as unknown as null }),
    ]);
    expect(b.earned).toBe(0);
    expect(b.received).toBe(0);
    expect(b.counts.paid).toBe(1);
    expect(b.counts.confirmed).toBe(1);
  });
});

describe("sessionsInMonth", () => {
  const reference = new Date("2026-08-16T12:00:00.000Z");

  it("ne garde que les séances du mois courant (occurred_at)", () => {
    const kept = sessionsInMonth(
      [
        S({ status: "paid", occurred_at: "2026-08-01T08:00:00.000Z" }),
        S({ status: "paid", occurred_at: "2026-08-31T23:00:00.000Z" }),
        S({ status: "paid", occurred_at: "2026-07-31T23:59:00.000Z" }),
        S({ status: "paid", occurred_at: "2026-09-01T00:00:00.000Z" }),
      ],
      reference,
    );
    expect(kept).toHaveLength(2);
  });

  it("bornes incluses/exclues : 1er du mois inclus, 1er du mois suivant exclu", () => {
    const kept = sessionsInMonth(
      [
        S({ status: "paid", occurred_at: "2026-08-01T00:00:00.000Z" }),
        S({ status: "paid", occurred_at: "2026-09-01T00:00:00.000Z" }),
      ],
      reference,
    );
    expect(kept).toHaveLength(1);
  });
});

describe("buildMonthlyActivitySeries", () => {
  const reference = new Date("2026-08-16T12:00:00.000Z");

  it("6 mois par défaut, du plus ancien au plus récent, mois courant en dernier", () => {
    const series = buildMonthlyActivitySeries([], 6, reference);
    expect(series).toHaveLength(6);
    expect(series[0].key).toBe("2026-03");
    expect(series[5].key).toBe("2026-08");
    // Mois sans séance présents (zéro) — la courbe ne saute pas.
    expect(series.every((p) => p.confirmed === 0 && p.earnedXof === 0)).toBe(true);
  });

  it("seules les séances confirmées alimentent la série, attribuées à leur mois", () => {
    const series = buildMonthlyActivitySeries(
      [
        S({ status: "paid", occurred_at: "2026-07-05T10:00:00.000Z", payout_xof: 3750 }),
        S({ status: "confirmed", occurred_at: "2026-08-02T10:00:00.000Z", payout_xof: 3500 }),
        S({ status: "declared", occurred_at: "2026-08-03T10:00:00.000Z", payout_xof: 3500 }),
        S({ status: "contested", occurred_at: "2026-08-04T10:00:00.000Z", payout_xof: 3500 }),
      ],
      6,
      reference,
    );
    const july = series.find((p) => p.key === "2026-07");
    const august = series.find((p) => p.key === "2026-08");
    expect(july?.confirmed).toBe(1);
    expect(july?.earnedXof).toBe(3750);
    // declared et contested n'entrent pas dans la série.
    expect(august?.confirmed).toBe(1);
    expect(august?.earnedXof).toBe(3500);
  });

  it("libellés courts lisibles", () => {
    const series = buildMonthlyActivitySeries([], 6, reference);
    expect(series[5].label).toBe("août 26");
  });
});

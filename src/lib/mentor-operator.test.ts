import { describe, it, expect, vi } from "vitest";
import {
  canOperateMentor,
  assertMentorOperator,
  MENTOR_OPERATOR_DENIED_MESSAGE,
  isLastPayableSession,
} from "@/lib/mentor-operator";

// Mentor Copilote (décision #74) — prédicat d'autorisation opérateur : assignation
// active + statut non suspendu/banni + enfant accompagné (pack ou campagne).

describe("canOperateMentor (pur)", () => {
  it("toutes conditions → vrai", () => {
    expect(
      canOperateMentor({ hasActiveAssignment: true, status: "active", accompaniment: "pack" }),
    ).toBe(true);
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "warning",
        accompaniment: "campaign",
      }),
    ).toBe(true);
  });

  it("pas d'assignation active → faux (même accompagné)", () => {
    expect(
      canOperateMentor({ hasActiveAssignment: false, status: "active", accompaniment: "pack" }),
    ).toBe(false);
  });

  it("compte suspendu ou banni → faux (même assigné et accompagné)", () => {
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "suspended",
        accompaniment: "pack",
      }),
    ).toBe(false);
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "banned",
        accompaniment: "campaign",
      }),
    ).toBe(false);
  });

  it("enfant non accompagné → faux (l'observateur reste lecteur)", () => {
    expect(
      canOperateMentor({ hasActiveAssignment: true, status: "active", accompaniment: "none" }),
    ).toBe(false);
  });

  it("statut absent (profil jamais créé) = active", () => {
    expect(
      canOperateMentor({ hasActiveAssignment: true, status: null, accompaniment: "pack" }),
    ).toBe(true);
  });

  it("supervision éphémère (Fab Lab) : actif pendant la période, expiré après", () => {
    const validFrom = "2026-09-12T08:00:00Z";
    const validUntil = "2026-09-14T18:00:00Z";

    // 1. Avant l'événement -> faux
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "active",
        accompaniment: "campaign",
        validFrom,
        validUntil,
        now: new Date("2026-09-11T12:00:00Z"),
      }),
    ).toBe(false);

    // 2. Pendant l'événement -> vrai
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "active",
        accompaniment: "campaign",
        validFrom,
        validUntil,
        now: new Date("2026-09-13T14:00:00Z"),
      }),
    ).toBe(true);

    // 3. Après l'événement -> faux (accès fermé)
    expect(
      canOperateMentor({
        hasActiveAssignment: true,
        status: "active",
        accompaniment: "campaign",
        validFrom,
        validUntil,
        now: new Date("2026-09-15T09:00:00Z"),
      }),
    ).toBe(false);
  });
});

// Fake DB minimal pour assertMentorOperator : mentor_profiles + mentors +
// family_coverages/season_enrollments (via resolveChildAccompaniment).
function makeFakeDb(initial: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, [...v]]),
  );
  const db: any = {};
  db.from = vi.fn((table: string) => {
    const filters: Array<(r: any) => boolean> = [];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return chain;
      }),
      is: vi.fn((col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val));
        return chain;
      }),
      not: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(() => {
        const data = (tables[table] ?? []).find((r) => filters.every((f) => f(r))) ?? null;
        return Promise.resolve({ data, error: null });
      }),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        const data = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  });
  return { db };
}

const now = Date.now();
const past = new Date(now - 10 * 86_400_000).toISOString();
const future = new Date(now + 30 * 86_400_000).toISOString();

const context = (over: Partial<any> = {}) => ({
  mentor_user_id: "sup-1",
  child_profile_id: "c1",
  removed_at: null,
  ...over,
});

const pack = (over: Partial<any> = {}) => ({
  id: "pack-1",
  child_id: "c1",
  source: "accompaniment_pack",
  sessions_used: 0,
  sessions: 12,
  ends_at: future,
  status: "active",
  ...over,
});

describe("assertMentorOperator", () => {
  it("accepte un mentor actif, assigné, enfant accompagné par pack", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "active" }],
      mentors: [context()],
      family_coverages: [pack()],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).resolves.toBeUndefined();
  });

  it("rejette un compte suspendu", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "suspended" }],
      mentors: [context()],
      family_coverages: [pack()],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).rejects.toThrow("suspendu");
  });

  it("rejette un compte banni", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "banned" }],
      mentors: [context()],
      family_coverages: [pack()],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).rejects.toThrow("banni");
  });

  it("rejette sans assignation active", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "active" }],
      mentors: [],
      family_coverages: [pack()],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).rejects.toThrow(
      "n'est pas (plus) assigné",
    );
  });

  it("rejette un enfant non accompagné (l'observateur reste lecteur)", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "active" }],
      mentors: [context()],
      family_coverages: [],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).rejects.toThrow(
      MENTOR_OPERATOR_DENIED_MESSAGE,
    );
  });

  it("accepte un enfant accompagné par campagne", async () => {
    const { db } = makeFakeDb({
      mentor_profiles: [{ mentor_user_id: "sup-1", status: "active" }],
      mentors: [context()],
      family_coverages: [],
      season_enrollments: [
        {
          child_id: "c1",
          campaign_id: "camp-1",
          campaigns: {
            id: "camp-1",
            sessions_target: 5,
            sessions_used: 1,
            start_date: past,
            end_date: future,
          },
        },
      ],
    });
    await expect(assertMentorOperator(db, "sup-1", "c1")).resolves.toBeUndefined();
  });
});

describe("isLastPayableSession (condition de paiement, décision #74)", () => {
  const base = { monthlyBudget: 12, alreadyApprovedOrPaidInMonth: 11, funded: "pack" as const };

  it("11 séances approuvées + 1 = budget atteint, pas de bilan validé → BLOQUÉ", () => {
    expect(isLastPayableSession({ ...base, hasValidatedReportForPeriod: false })).toBe(true);
  });

  it("budget atteint MAIS bilan validé pour la période → payable", () => {
    expect(isLastPayableSession({ ...base, hasValidatedReportForPeriod: true })).toBe(false);
  });

  it("séance non financée (funding none) → jamais bloqué (flux legacy intact)", () => {
    expect(
      isLastPayableSession({ ...base, funded: "none", hasValidatedReportForPeriod: false }),
    ).toBe(false);
  });

  it("sous le budget (10 approuvées) → payable même sans bilan", () => {
    expect(
      isLastPayableSession({
        monthlyBudget: 12,
        alreadyApprovedOrPaidInMonth: 10,
        funded: "pack",
        hasValidatedReportForPeriod: false,
      }),
    ).toBe(false);
  });

  it("campagne avec budget positif → même règle", () => {
    expect(
      isLastPayableSession({
        monthlyBudget: 8,
        alreadyApprovedOrPaidInMonth: 7,
        funded: "campaign",
        hasValidatedReportForPeriod: false,
      }),
    ).toBe(true);
  });

  it("budget nul ou négatif → jamais bloqué", () => {
    expect(
      isLastPayableSession({
        monthlyBudget: 0,
        alreadyApprovedOrPaidInMonth: 0,
        funded: "pack",
        hasValidatedReportForPeriod: false,
      }),
    ).toBe(false);
  });
});

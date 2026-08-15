import { describe, it, expect, vi } from "vitest";
import { resolveChildAccompaniment } from "@/lib/child-accompaniment";

// Mentor Copilote (décision #74) — résolveur d'accompagnement : pack actif avec
// séances restantes → campagne en fenêtre avec compteur restant → none. Miroir LECTURE
// de la chaîne de financement de declareSessionMentor.

// Fake DB capable de .gt()/.not()/.order()/.limit()/.maybeSingle() (le résolveur suit la
// chaîne de requête réelle). Les jointures (campaigns(...)) sont fournies pré-jointées
// dans les fixtures, comme le serveur les retourne.
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
      not: vi.fn((col: string, _op: string, val: any) => {
        filters.push((r) => !(val === null ? r[col] == null : r[col] === val));
        return chain;
      }),
      gt: vi.fn((col: string, val: any) => {
        filters.push((r) => new Date(r[col]).getTime() > new Date(val).getTime());
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(() => {
        const rows = tables[table] ?? [];
        const data = rows.find((r) => filters.every((f) => f(r))) ?? null;
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
const longFuture = new Date(now + 90 * 86_400_000).toISOString();

const packRow = (over: Partial<any>) => ({
  id: "pack-1",
  child_id: "c1",
  source: "accompaniment_pack",
  sessions_used: 0,
  sessions: 12,
  ends_at: future,
  status: "active",
  ...over,
});

const enrollmentRow = (over: Partial<any>) => ({
  child_id: "c1",
  campaign_id: "camp-1",
  campaigns: {
    id: "camp-1",
    sessions_target: 5,
    sessions_used: 1,
    start_date: past,
    end_date: future,
  },
  ...over,
});

describe("resolveChildAccompaniment", () => {
  it("aucun pack, aucune campagne → none", async () => {
    const { db } = makeFakeDb({ family_coverages: [], season_enrollments: [] });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
    expect(acc.budget).toBe(0);
    expect(acc.campaignId).toBeNull();
  });

  it("pack actif avec séances restantes → pack (le budget est pack.sessions)", async () => {
    const { db } = makeFakeDb({ family_coverages: [packRow({})] });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("pack");
    expect(acc.budget).toBe(12);
  });

  it("pack épuisé (sessions_used == sessions) → ne compte pas", async () => {
    const { db } = makeFakeDb({
      family_coverages: [packRow({ sessions_used: 12, sessions: 12 })],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("pack expiré (ends_at passé) → ne compte pas", async () => {
    const { db } = makeFakeDb({ family_coverages: [packRow({ ends_at: past })] });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("pack révoqué → ne compte pas", async () => {
    const { db } = makeFakeDb({ family_coverages: [packRow({ status: "revoked" })] });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("pas de pack → campagne en fenêtre avec compteur restant → campaign", async () => {
    const { db } = makeFakeDb({
      family_coverages: [],
      season_enrollments: [enrollmentRow({})],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("campaign");
    expect(acc.budget).toBe(5);
    expect(acc.campaignId).toBe("camp-1");
  });

  it("campagne hors fenêtre (end_date passée) → none", async () => {
    const { db } = makeFakeDb({
      family_coverages: [],
      season_enrollments: [enrollmentRow({ campaigns: { ...enrollmentRow({}).campaigns, end_date: past } })],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("campagne fenêtre pas encore commencée → none", async () => {
    const { db } = makeFakeDb({
      family_coverages: [],
      season_enrollments: [
        enrollmentRow({ campaigns: { ...enrollmentRow({}).campaigns, start_date: future } }),
      ],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("campagne compteur épuisé (sessions_used == target) → none", async () => {
    const { db } = makeFakeDb({
      family_coverages: [],
      season_enrollments: [
        enrollmentRow({ campaigns: { ...enrollmentRow({}).campaigns, sessions_used: 5 } }),
      ],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("none");
  });

  it("pack actif PRIORITAIRE sur la campagne (même si la campagne est en fenêtre)", async () => {
    const { db } = makeFakeDb({
      family_coverages: [packRow({})],
      season_enrollments: [enrollmentRow({})],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("pack");
    expect(acc.campaignId).toBeNull();
  });

  it("pack expiré mais campagne en fenêtre → campaign (le repli fonctionne)", async () => {
    const { db } = makeFakeDb({
      family_coverages: [packRow({ ends_at: past })],
      season_enrollments: [enrollmentRow({})],
    });
    const acc = await resolveChildAccompaniment(db, "c1", now);
    expect(acc.funding).toBe("campaign");
    expect(acc.campaignId).toBe("camp-1");
  });
});

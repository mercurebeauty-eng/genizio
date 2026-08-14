import { describe, it, expect, vi } from "vitest";
import {
  resolveCoverageState,
  syncFamilyCoverage,
  revokeFamilyCoverage,
} from "@/lib/family-coverages";

// V4 « Pass Enfant » (Vague A, 2026-08-14) — family_coverages est LA source unique de la
// couverture famille : l'état résolu (hasBaseCoverage, sumPurchases, coveredUntil) alimente le
// trigger miroir TS (computeAppQuota) et les UI. Mêmes règles de fenêtre que le trigger V10.

function makeFakeDb(initial: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, [...v]]),
  );
  const inserts: Array<{ table: string; value: any }> = [];
  const updates: Array<{ table: string; value: any }> = [];

  const db: any = {};
  db.from = vi.fn((table: string) => {
    let filter: { col?: string; val?: any } = {};
    const applyFilter = () => {
      const live = tables[table] ?? [];
      const { col } = filter;
      return col ? live.filter((r) => r[col] === filter.val) : live;
    };

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: any) => {
        filter = { col, val };
        return chain;
      }),
      is: vi.fn((col: string, val: any) => {
        filter = { col, val };
        return chain;
      }),
      insert: vi.fn((value: any) => {
        inserts.push({ table, value });
        (tables[table] = tables[table] ?? []).push({ ...value, id: `id-${inserts.length}` });
        return chain;
      }),
      update: vi.fn((value: any) => {
        updates.push({ table, value });
        tables[table] = (tables[table] ?? []).map((r) => ({ ...r, ...value }));
        const eqChain: any = {
          eq: vi.fn(() => eqChain),
          then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
            Promise.resolve({ data: null, error: null }).then(resolve, reject),
        };
        return eqChain;
      }),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve({ data: applyFilter(), error: null }).then(resolve, reject),
    };
    return chain;
  });
  return { db, inserts, updates };
}

const now = Date.now();
const past = new Date(now - 10 * 86_400_000).toISOString();
const future = new Date(now + 30 * 86_400_000).toISOString();
const farFuture = new Date(now + 90 * 86_400_000).toISOString();

const row = (over: Partial<any>) => ({
  id: `fc-${over.source ?? "x"}-${Math.random().toString(36).slice(2, 7)}`,
  user_id: "u1",
  child_id: null,
  source: "subscription",
  max_children: 5,
  sessions: 0,
  sessions_used: 0,
  starts_at: past,
  ends_at: future,
  status: "active",
  ...over,
});

describe("resolveCoverageState", () => {
  it("aucune ligne → aucun état de couverture", async () => {
    const { db } = makeFakeDb({ family_coverages: [] });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
    expect(state.sumPurchases).toBe(0);
    expect(state.coveredUntil).toBeNull();
  });

  it("couverture de base (abonnement) active → hasBaseCoverage + coveredUntil", async () => {
    const { db } = makeFakeDb({
      family_coverages: [row({ source: "subscription", ends_at: future })],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(true);
    expect(state.coveredUntil).toBe(future);
    expect(state.sumPurchases).toBe(0);
  });

  it("campagne et parrainage comptent comme couverture de base", async () => {
    const { db } = makeFakeDb({
      family_coverages: [
        row({ source: "campaign", ends_at: future }),
        row({ source: "sponsorship", ends_at: farFuture }),
      ],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(true);
    expect(state.coveredUntil).toBe(farFuture);
  });

  it("les paliers (purchase) s'empilent dans sumPurchases mais ne comptent pas en base", async () => {
    const { db } = makeFakeDb({
      family_coverages: [row({ source: "purchase", max_children: 5, ends_at: future })],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
    expect(state.sumPurchases).toBe(5);
  });

  it("plusieurs paliers → somme des max_children", async () => {
    const { db } = makeFakeDb({
      family_coverages: [
        row({ source: "purchase", max_children: 5, ends_at: future }),
        row({ source: "purchase", max_children: 5, ends_at: future }),
      ],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.sumPurchases).toBe(10);
  });

  it("fenêtre passée → ligne inactive (exclue du hasBase et du coveredUntil)", async () => {
    const { db } = makeFakeDb({
      family_coverages: [row({ source: "subscription", ends_at: past })],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
    expect(state.coveredUntil).toBeNull();
  });

  it("statut révoqué → ligne exclue (coupure immédiate)", async () => {
    const { db } = makeFakeDb({
      family_coverages: [row({ source: "subscription", ends_at: future, status: "revoked" })],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
    expect(state.coveredUntil).toBeNull();
  });

  it("fenêtre pas encore commencée (starts_at futur) → ligne inactive", async () => {
    const { db } = makeFakeDb({
      family_coverages: [row({ source: "campaign", starts_at: future, ends_at: farFuture })],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
  });

  it("les packs accompaniment_pack (child_id NON-NULL) ne comptent pas dans la couverture app", async () => {
    const { db } = makeFakeDb({
      family_coverages: [
        row({ source: "accompaniment_pack", child_id: "c1", sessions: 12, ends_at: future }),
      ],
    });
    const state = await resolveCoverageState(db, "u1");
    expect(state.hasBaseCoverage).toBe(false);
    expect(state.sumPurchases).toBe(0);
    expect(state.coveredUntil).toBeNull();
  });
});

describe("syncFamilyCoverage (upsert applicatif)", () => {
  it("insère une ligne absente et la met à jour au second appel (une ligne par compte+source)", async () => {
    const { db, inserts, updates } = makeFakeDb({ family_coverages: [] });
    await syncFamilyCoverage(db, { userId: "u1", source: "sponsorship", endsAt: future });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].value.source).toBe("sponsorship");

    await syncFamilyCoverage(db, { userId: "u1", source: "sponsorship", endsAt: farFuture });
    expect(inserts).toHaveLength(1); // pas de doublon
    expect(updates).toHaveLength(1);
    expect(updates[0].value.ends_at).toBe(farFuture);
  });

  it("campagne : une ligne par (compte, CAMPAGNE) — source_ref différencie", async () => {
    const { db, inserts } = makeFakeDb({ family_coverages: [] });
    await syncFamilyCoverage(db, {
      userId: "u1",
      source: "campaign",
      sourceRef: "camp-1",
      endsAt: future,
    });
    await syncFamilyCoverage(db, {
      userId: "u1",
      source: "campaign",
      sourceRef: "camp-2",
      endsAt: future,
    });
    expect(inserts).toHaveLength(2);
  });

  it("purchaseAppend → une nouvelle ligne à chaque achat (les paliers s'empilent)", async () => {
    const { db, inserts } = makeFakeDb({ family_coverages: [] });
    await syncFamilyCoverage(db, {
      userId: "u1",
      source: "purchase",
      purchaseAppend: true,
      maxChildren: 5,
      endsAt: future,
    });
    await syncFamilyCoverage(db, {
      userId: "u1",
      source: "purchase",
      purchaseAppend: true,
      maxChildren: 5,
      endsAt: future,
    });
    expect(inserts).toHaveLength(2);
  });
});

describe("revokeFamilyCoverage", () => {
  it("passe la ligne en revoked (la fenêtre est clôturée, le résolveur cesse de la compter)", async () => {
    const { db, updates } = makeFakeDb({
      family_coverages: [row({ source: "subscription", ends_at: future })],
    });
    await revokeFamilyCoverage(db, { userId: "u1", source: "subscription" });
    expect(updates).toHaveLength(1);
    expect(updates[0].value.status).toBe("revoked");
  });
});

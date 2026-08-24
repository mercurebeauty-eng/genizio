import { describe, it, expect, vi } from "vitest";
import {
  processSessionContest,
  refundSessionDebit,
  hasValidatedChildWorkNearSession,
  CONTEST_REASONS,
  CONTEST_BLOCKED_VALIDATED_WORK_MESSAGE,
  CONTEST_VALIDATED_WORK_WINDOW_DAYS,
} from "./mentor-contest";

// Contestation de séance (2026-08-15) — cœur db-paramétré (mentor-contest.ts).
// La transition atomique declared → contested est le verrou anti-double-édition ;
// le remboursement rend la séance au budget qui l'a financée (pack/campagne).

// Fake DB minimal : lecture (select/eq/maybeSingle/then) ET écriture
// (update → eq → select → maybeSingle, sémantique PostgREST : le patch est appliqué
// aux lignes matchées par le WHERE, la première est retournée).
function makeFakeDb(initial: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  );
  const db: any = {};
  db.from = vi.fn((table: string) => {
    const filters: Array<(r: any) => boolean> = [];
    const readChain: any = {
      select: vi.fn(() => readChain),
      eq: vi.fn((col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return readChain;
      }),
      is: vi.fn((col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val));
        return readChain;
      }),
      gte: vi.fn((col: string, val: any) => {
        filters.push((r) => new Date(r[col]).getTime() >= new Date(val).getTime());
        return readChain;
      }),
      lte: vi.fn((col: string, val: any) => {
        filters.push((r) => new Date(r[col]).getTime() <= new Date(val).getTime());
        return readChain;
      }),
      limit: vi.fn(() => readChain),
      maybeSingle: vi.fn(() => {
        const data = (tables[table] ?? []).find((r) => filters.every((f) => f(r))) ?? null;
        return Promise.resolve({ data, error: null });
      }),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        const data = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    const makeUpdateChain = (patch: Record<string, unknown>) => {
      const updateFilters: Array<(r: any) => boolean> = [];
      // Applique le patch aux lignes matchées (sémantique PostgREST : UPDATE …
      // WHERE …) et retourne la première, ou null si aucune ligne ne matche.
      const apply = () => {
        const matched = (tables[table] ?? []).filter((r) => updateFilters.every((f) => f(r)));
        if (matched.length === 0) return null;
        Object.assign(matched[0], patch);
        return matched[0];
      };
      const chain: any = {
        eq: vi.fn((col: string, val: any) => {
          updateFilters.push((r) => r[col] === val);
          return chain;
        }),
        select: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          const data = apply();
          return { data, error: null };
        }),
        // Un update awaité sans maybeSingle (ex. refundSessionDebit) exécute quand
        // même la mutation : la chaîne est thenable.
        then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
          try {
            apply();
            resolve({ data: null, error: null });
          } catch (err) {
            if (reject) reject(err);
          }
        },
      };
      return chain;
    };
    return {
      ...readChain,
      update: vi.fn((patch: Record<string, unknown>) => makeUpdateChain(patch)),
    };
  });
  return { db, tables };
}

const session = (over: Partial<any> = {}) => ({
  id: "s1",
  child_profile_id: "c1",
  mentor_user_id: "m1",
  occurred_at: "2026-08-15T10:00:00.000Z",
  funding: "pack",
  campaign_id: null,
  status: "declared",
  ...over,
});

const pack = (over: Partial<any> = {}) => ({
  id: "pack-1",
  child_id: "c1",
  source: "accompaniment_pack",
  status: "active",
  sessions_used: 3,
  sessions: 12,
  ...over,
});

describe("processSessionContest", () => {
  it("séance déclarée financée par pack : contestée + séance de pack remboursée (3 → 2)", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session()],
      family_coverages: [pack()],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "not_done", "absent");
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe("contested");
    expect(claimed!.contested_by).toBe("parent-1");
    expect(claimed!.contest_reason).toBe("absent");
    expect(tables.family_coverages[0].sessions_used).toBe(2);
  });

  it("séance déclarée financée par campagne : compteur campagne remboursé (5 → 4)", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session({ funding: "campaign", campaign_id: "camp-1" })],
      campaigns: [{ id: "camp-1", sessions_used: 5, sessions_target: 10 }],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "not_on_time");
    expect(claimed).not.toBeNull();
    expect(tables.campaigns[0].sessions_used).toBe(4);
  });

  it("séance déjà traitée (confirmée) : retourne null, aucune mutation", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session({ status: "confirmed" })],
      family_coverages: [pack()],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "other");
    expect(claimed).toBeNull();
    expect(tables.family_coverages[0].sessions_used).toBe(3);
  });

  it("séance déjà contestée : retourne null (jamais de double contestation)", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session({ status: "contested" })],
      family_coverages: [pack()],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "not_done");
    expect(claimed).toBeNull();
    expect(tables.family_coverages[0].sessions_used).toBe(3);
  });

  it("séance sans financement : contestée sans toucher aucun compteur", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session({ funding: "none" })],
      family_coverages: [pack()],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "not_done");
    expect(claimed).not.toBeNull();
    expect(tables.family_coverages[0].sessions_used).toBe(3);
  });

  it("pack à 0 séance utilisée : le remboursement ne passe jamais sous zéro", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session()],
      family_coverages: [pack({ sessions_used: 0 })],
    });
    await processSessionContest(db, "s1", "parent-1", "not_done");
    expect(tables.family_coverages[0].sessions_used).toBe(0);
  });
});

describe("refundSessionDebit", () => {
  it("pack : décrémente sessions_used", async () => {
    const { db, tables } = makeFakeDb({ family_coverages: [pack()] });
    await refundSessionDebit(db, {
      child_profile_id: "c1",
      funding: "pack",
      campaign_id: null,
    });
    expect(tables.family_coverages[0].sessions_used).toBe(2);
  });

  it("pack introuvable (inactif) : no-op silencieux", async () => {
    const { db } = makeFakeDb({
      family_coverages: [pack({ status: "inactive" })],
    });
    await expect(
      refundSessionDebit(db, { child_profile_id: "c1", funding: "pack", campaign_id: null }),
    ).resolves.toBeUndefined();
  });

  it("campagne : décrémente le compteur du compartiment séances", async () => {
    const { db, tables } = makeFakeDb({ campaigns: [{ id: "camp-1", sessions_used: 2 }] });
    await refundSessionDebit(db, {
      child_profile_id: "c1",
      funding: "campaign",
      campaign_id: "camp-1",
    });
    expect(tables.campaigns[0].sessions_used).toBe(1);
  });

  it("campagne sans campaign_id : no-op", async () => {
    const { db, tables } = makeFakeDb({ campaigns: [{ id: "camp-1", sessions_used: 2 }] });
    await refundSessionDebit(db, {
      child_profile_id: "c1",
      funding: "campaign",
      campaign_id: null,
    });
    expect(tables.campaigns[0].sessions_used).toBe(2);
  });
});

// ── Garde « travail validé » (anti-faille parent) ─────────────────────────────
// Si un défi a été complété et validé (preuve IA ou défi déclaratif) le JOUR de la
// séance ou dans les 7 jours SUIVANTS, le travail a eu lieu : la séance ne peut
// pas être contestée. Fenêtre à SENS UNIQUE — un défi validé AVANT la date de la
// séance n'atteste pas celle-ci. La session d'exemple a lieu le 2026-08-15 ; la
// fenêtre couvre donc du 2026-08-15 (00:00) au 2026-08-22 (23:59).

const completedChallenge = (over: Partial<any> = {}) => ({
  child_id: "c1",
  status: "completed",
  ai_observations: { note: "preuve validée" },
  proof_mode: "photo",
  completed_at: "2026-08-15T12:00:00.000Z",
  ...over,
});

describe("hasValidatedChildWorkNearSession", () => {
  it("défi complété avec preuve validée par l'IA dans la fenêtre → vrai", async () => {
    const { db } = makeFakeDb({ challenges: [completedChallenge()] });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(true);
  });

  it("défi déclaratif complété dans la fenêtre → vrai (valeur atteinte, pas de photo)", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ ai_observations: null, proof_mode: "declarative" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(true);
  });

  it("défi complété sans preuve validée (ni IA ni déclaratif) → faux", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ ai_observations: null, proof_mode: "photo" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(false);
  });

  it("défi complété hors fenêtre (avant la séance) → faux", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ completed_at: "2026-07-01T12:00:00.000Z" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(false);
  });

  it("défi validé AVANT la date de la séance (autre séance ou travail du parent) → faux — la fenêtre est à sens unique", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ completed_at: "2026-08-10T12:00:00.000Z" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(false);
  });

  it("défi validé APRÈS la séance (soumission en retard du mentor) → vrai", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ completed_at: "2026-08-20T12:00:00.000Z" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(true);
  });

  it("défi validé au 7e jour après la séance (borne incluse) → vrai", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ completed_at: "2026-08-22T23:00:00.000Z" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(true);
  });

  it("défi validé au-delà de 7 jours après la séance → faux", async () => {
    const { db } = makeFakeDb({
      challenges: [completedChallenge({ completed_at: "2026-08-23T12:00:00.000Z" })],
    });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(false);
  });

  it("aucun défi complété → faux", async () => {
    const { db } = makeFakeDb({ challenges: [{ child_id: "c1", status: "in_progress" }] });
    await expect(
      hasValidatedChildWorkNearSession(db, "c1", "2026-08-15T10:00:00.000Z"),
    ).resolves.toBe(false);
  });

  it("la fenêtre par défaut vaut 7 jours (constante documentée)", () => {
    expect(CONTEST_VALIDATED_WORK_WINDOW_DAYS).toBe(7);
  });
});

describe("processSessionContest — garde travail validé", () => {
  it("travail validé sur la période : la contestation est REFUSÉE, la séance reste déclarée, le pack n'est pas remboursé", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session()],
      family_coverages: [pack()],
      challenges: [completedChallenge()],
    });
    await expect(processSessionContest(db, "s1", "parent-1", "not_done")).rejects.toThrow(
      CONTEST_BLOCKED_VALIDATED_WORK_MESSAGE,
    );
    expect(tables.mentor_sessions[0].status).toBe("declared");
    expect(tables.family_coverages[0].sessions_used).toBe(3);
  });

  it("travail validé HORS période : la contestation est acceptée (cas normal)", async () => {
    const { db, tables } = makeFakeDb({
      mentor_sessions: [session()],
      family_coverages: [pack()],
      challenges: [completedChallenge({ completed_at: "2026-07-01T12:00:00.000Z" })],
    });
    const claimed = await processSessionContest(db, "s1", "parent-1", "not_done");
    expect(claimed).not.toBeNull();
    expect(tables.mentor_sessions[0].status).toBe("contested");
    expect(tables.family_coverages[0].sessions_used).toBe(2);
  });
});

describe("CONTEST_REASONS", () => {
  it("vocabulaire fermé stable (4 motifs) — les UI et le journal s'appuient dessus", () => {
    expect(Object.keys(CONTEST_REASONS)).toEqual([
      "not_done",
      "non_compliant",
      "not_on_time",
      "other",
    ]);
    expect(Object.values(CONTEST_REASONS)).toHaveLength(4);
  });
});

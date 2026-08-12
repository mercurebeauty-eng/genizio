import { describe, it, expect } from "vitest";
import {
  computeAccessPeriodWindow,
  computeChildCreationLimit,
  getChildAccessStatus,
  resolveChildAccessStatus,
} from "@/lib/child-access";

// Modèle d'accès mensuel par enfant (2026-08-05) — décisions utilisateur :
//  • plancher gratuit (1, ou 5 pour les comptes grand-pérés < 2026-08-04) : jamais expiré ;
//  • slots achetés avant le modèle mensuel (extra_profile_slots) : permanent, grand-pérés ;
//  • au-delà : accès MENSUEL porté par child_access_periods — actif si la période la plus
//    récente est dans le futur, sinon expired (génération de défis bloquée, reste visible).

const NOW = new Date("2026-08-05T12:00:00.000Z");

describe("resolveChildAccessStatus", () => {
  const base = { floor: 1, extraSlots: 0 };

  it("position ≤ plancher → free, même sans période payée", () => {
    expect(resolveChildAccessStatus({ position: 1, ...base, latestPeriod: null, now: NOW }).kind).toBe("free");
    // Une période périmée n'a aucune incidence sur un profil du plancher
    expect(resolveChildAccessStatus({ position: 1, ...base, latestPeriod: { endsAt: "2020-01-01T00:00:00Z" }, now: NOW }).kind).toBe("free");
  });

  it("position ≤ plancher + slots grand-pérés → permanent, même sans période", () => {
    const st = resolveChildAccessStatus({ position: 3, floor: 1, extraSlots: 2, latestPeriod: null, now: NOW });
    expect(st.kind).toBe("permanent");
  });

  it("position au-delà, sans période → expired (jamais payé) avec endsAt null", () => {
    const st = resolveChildAccessStatus({ position: 2, ...base, latestPeriod: null, now: NOW });
    expect(st.kind).toBe("expired");
    if (st.kind === "expired") expect(st.endsAt).toBeNull();
  });

  it("période future → monthly avec daysLeft exact", () => {
    const st = resolveChildAccessStatus({ position: 2, ...base, latestPeriod: { endsAt: "2026-08-20T12:00:00.000Z" }, now: NOW });
    expect(st.kind).toBe("monthly");
    if (st.kind === "monthly") expect(st.daysLeft).toBe(15);
  });

  it("période écoulée → expired en conservant la date (affichée dans la bannière)", () => {
    const st = resolveChildAccessStatus({ position: 2, ...base, latestPeriod: { endsAt: "2026-08-01T00:00:00.000Z" }, now: NOW });
    expect(st.kind).toBe("expired");
    if (st.kind === "expired") expect(st.endsAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("période qui expire exactement maintenant → expired (<= now)", () => {
    const st = resolveChildAccessStatus({ position: 2, ...base, latestPeriod: { endsAt: NOW.toISOString() }, now: NOW });
    expect(st.kind).toBe("expired");
  });

  it("date illisible → expired plutôt qu'un crash", () => {
    const st = resolveChildAccessStatus({ position: 2, ...base, latestPeriod: { endsAt: "pas-une-date" }, now: NOW });
    expect(st.kind).toBe("expired");
    if (st.kind === "expired") expect(st.endsAt).toBe("pas-une-date");
  });

  it("compte grand-péré (plancher 5) : les 5 premiers profils sont gratuits, le 6e est payant", () => {
    expect(resolveChildAccessStatus({ position: 5, floor: 5, extraSlots: 0, latestPeriod: null, now: NOW }).kind).toBe("free");
    expect(resolveChildAccessStatus({ position: 6, floor: 5, extraSlots: 0, latestPeriod: null, now: NOW }).kind).toBe("expired");
  });
});

describe("computeChildCreationLimit (miroir du trigger : plancher + extra, plafonné à 5, sans +1)", () => {
  it("compte neuf sans slot : 1 + 0 = 1 — la base refuse le 2e profil sans slot/abonnement (plus de promesse UI que la base rejette)", () => {
    expect(computeChildCreationLimit("2026-08-10T00:00:00.000Z", 0)).toBe(1);
  });

  it("compte neuf avec 2 slots : 1 + 2 = 3", () => {
    expect(computeChildCreationLimit("2026-08-10T00:00:00.000Z", 2)).toBe(3);
  });

  it("compte grand-péré : plafonné à 5 — le plafond de 5 enfants est voulu, au-delà on crée un nouveau compte", () => {
    expect(computeChildCreationLimit("2026-07-01T00:00:00.000Z", 0)).toBe(5);
    expect(computeChildCreationLimit("2026-07-01T00:00:00.000Z", 3)).toBe(5);
  });

  it("compte couvert (abonnement famille ou crédit parrainage) : création possible jusqu'au plafond de 5", () => {
    expect(computeChildCreationLimit("2026-08-10T00:00:00.000Z", 0, true)).toBe(5);
    expect(computeChildCreationLimit("2026-07-01T00:00:00.000Z", 0, true)).toBe(5);
  });
});

describe("computeAccessPeriodWindow (fenêtre partagée admin/parrain — la promesse 'le code vaut N mois')", () => {
  it("sans période courante : démarre maintenant", () => {
    const w = computeAccessPeriodWindow(null, 3, NOW);
    expect(w.startsAt).toBe(NOW.toISOString());
    expect(w.endsAt).toBe("2026-11-05T12:00:00.000Z");
  });

  it("période courante future : démarre à la fin courante (cumul sans perte)", () => {
    const w = computeAccessPeriodWindow("2026-09-01T00:00:00.000Z", 1, NOW);
    expect(w.startsAt).toBe("2026-09-01T00:00:00.000Z");
    expect(w.endsAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("période courante déjà passée : démarre maintenant", () => {
    const w = computeAccessPeriodWindow("2026-07-01T00:00:00.000Z", 1, NOW);
    expect(w.startsAt).toBe(NOW.toISOString());
    expect(w.endsAt).toBe("2026-09-05T12:00:00.000Z");
  });
});

describe("getChildAccessStatus (client fake, mêmes tables que le vrai)", () => {
  const mkDb = (overrides: {
    children?: any[];
    periods?: any[];
    enrollments?: any[];
    subscriptions?: any[];
    credits?: any[];
    user?: any;
  } = {}) => {
    const rowsFor = (table: string): any[] => {
      if (table === "child_profiles")
        return (
          overrides.children ?? [
            { id: "c1", user_id: "u1", created_at: "2026-07-01T00:00:00Z" },
            { id: "c2", user_id: "u1", created_at: "2026-07-10T00:00:00Z" },
          ]
        );
      if (table === "child_access_periods") return overrides.periods ?? [];
      if (table === "season_enrollments") return overrides.enrollments ?? [];
      if (table === "subscriptions") return overrides.subscriptions ?? [];
      if (table === "sponsorship_credits") return overrides.credits ?? [];
      return [];
    };

    // Query builder minimal : select().eq() → { order (avec .limit), maybeSingle } couvre les
    // chaînages de getChildAccessStatus + getFamilyCoverage (subscriptions/sponsorship_credits).
    const from = (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => {
          const filtered = rowsFor(table).filter((r: any) => r[col] === val);
          return {
            order: (col2: string, o: { ascending: boolean }) => {
              const sorted = [...filtered].sort((a: any, b: any) =>
                o.ascending ? (a[col2] > b[col2] ? 1 : -1) : a[col2] < b[col2] ? 1 : -1
              );
              const res = { data: sorted, error: null };
              return Object.assign(Promise.resolve(res), {
                limit: (n: number) => Promise.resolve({ data: sorted.slice(0, n), error: null }),
              });
            },
            maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
          };
        },
      }),
    });

    return {
      from,
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: {
              user:
                overrides.user ??
                { id, created_at: "2026-08-10T00:00:00Z", app_metadata: { extra_profile_slots: 0 } },
            },
            error: null,
          }),
        },
      },
    };
  };

  it("profil 2 d'un compte neuf sans période → expired", async () => {
    const status = await getChildAccessStatus(mkDb() as any, "u1", "c2");
    expect(status.kind).toBe("expired");
  });

  it("profil 2 avec période active → monthly", async () => {
    // Date future RELATIVE à l'horloge de la machine — getChildAccessStatus calcule avec
    // "maintenant" réel (contrairement aux tests purs de resolveChildAccessStatus qui
    // injectent now), une date fixe rendrait ce test dépendant de l'horloge du runner.
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const status = await getChildAccessStatus(mkDb({ periods: [{ child_id: "c2", ends_at: future }] }) as any, "u1", "c2");
    expect(status.kind).toBe("monthly");
  });

  it("profil 1 (plancher) → free même sans période", async () => {
    const status = await getChildAccessStatus(mkDb() as any, "u1", "c1");
    expect(status.kind).toBe("free");
  });

  it("6e profil d'un compte grand-péré sans slots → expired", async () => {
    const status = await getChildAccessStatus(
      mkDb({
        children: [
          { id: "c1", user_id: "u1", created_at: "2026-07-01T00:00:00Z" },
          { id: "c2", user_id: "u1", created_at: "2026-07-02T00:00:00Z" },
          { id: "c3", user_id: "u1", created_at: "2026-07-03T00:00:00Z" },
          { id: "c4", user_id: "u1", created_at: "2026-07-04T00:00:00Z" },
          { id: "c5", user_id: "u1", created_at: "2026-07-05T00:00:00Z" },
          { id: "c6", user_id: "u1", created_at: "2026-07-06T00:00:00Z" },
        ],
        user: { id: "u1", created_at: "2026-07-01T00:00:00Z", app_metadata: { extra_profile_slots: 0 } },
      }) as any,
      "u1",
      "c6"
    );
    expect(status.kind).toBe("expired");
  });

  it("enfant au-delà du plancher, famille couverte par abonnement actif → permanent", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const status = await getChildAccessStatus(
      mkDb({
        subscriptions: [{ id: "s1", user_id: "u1", status: "active", current_period_end: future }],
      }) as any,
      "u1",
      "c2"
    );
    expect(status.kind).toBe("permanent");
  });

  it("enfant au-delà du plancher, famille couverte par crédit de parrainage → permanent", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const status = await getChildAccessStatus(
      mkDb({
        credits: [{ id: "k1", user_id: "u1", ends_at: future }],
      }) as any,
      "u1",
      "c2"
    );
    expect(status.kind).toBe("permanent");
  });

  it("abonnement résilié → coupure immédiate : l'enfant au-delà du plancher retombe en expired", async () => {
    const status = await getChildAccessStatus(
      mkDb({
        subscriptions: [{ id: "s1", user_id: "u1", status: "cancelled", current_period_end: null }],
      }) as any,
      "u1",
      "c2"
    );
    expect(status.kind).toBe("expired");
  });

  it("profil du plancher : reste free même avec une famille couverte (la couverture ne change rien en dessous du plancher)", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const status = await getChildAccessStatus(
      mkDb({
        subscriptions: [{ id: "s1", user_id: "u1", status: "active", current_period_end: future }],
      }) as any,
      "u1",
      "c1"
    );
    expect(status.kind).toBe("free");
  });

  it("enfant inconnu du compte → free (l'ownership est vérifié par chaque appelant)", async () => {
    const status = await getChildAccessStatus(mkDb() as any, "u1", "inconnu");
    expect(status.kind).toBe("free");
  });

  it("enfant couvert par une campagne active (fenêtre en cours) → permanent, jamais bloqué", async () => {
    const status = await getChildAccessStatus(
      mkDb({
        enrollments: [
          {
            child_id: "c2",
            campaign_id: "camp-1",
            campaigns: {
              start_date: new Date(Date.now() - 30 * 86_400_000).toISOString(),
              end_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
            },
          },
        ],
      }) as any,
      "u1",
      "c2"
    );
    expect(status.kind).toBe("permanent");
  });

  it("enfant dont la campagne est terminée → retombe sur le modèle mensuel (expired sans période)", async () => {
    const status = await getChildAccessStatus(
      mkDb({
        enrollments: [
          {
            child_id: "c2",
            campaign_id: "camp-1",
            campaigns: {
              start_date: new Date(Date.now() - 90 * 86_400_000).toISOString(),
              end_date: new Date(Date.now() - 30 * 86_400_000).toISOString(),
            },
          },
        ],
      }) as any,
      "u1",
      "c2"
    );
    expect(status.kind).toBe("expired");
  });
});

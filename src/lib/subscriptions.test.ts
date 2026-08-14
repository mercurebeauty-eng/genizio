import { describe, it, expect, vi } from "vitest";
import { activateFamilySubscription } from "@/lib/subscriptions.functions";
import { getFamilyCoverage } from "@/lib/child-access";
import { resolveSponsorshipPrice } from "@/lib/pricing";
import { applyPaystackEntitlement, type PaymentRow } from "@/lib/payment-fulfillment.server";

// ── Prix du parrainage : 3 premiers mois OFFERTS puis 15 000 F/mois ────────────
// Corrige le bug historique « le parrainage ne prend en charge que le 5 000 F » : le
// montant suit désormais max(0, months − 3) × tarif standard (resolveSponsorshipPrice).
describe("resolveSponsorshipPrice (3 mois offerts puis 15 000 F/mois)", () => {
  it("1 à 3 mois → rien à payer (offert)", () => {
    expect(resolveSponsorshipPrice(1, "XOF").amountPaid).toBe(0);
    expect(resolveSponsorshipPrice(3, "XOF").amountPaid).toBe(0);
    expect(resolveSponsorshipPrice(3, "XOF").paidMonths).toBe(0);
    expect(resolveSponsorshipPrice(3, "XOF").totalMonths).toBe(3);
  });

  it("4 mois → 1 mois payé × 15 000 F", () => {
    const p = resolveSponsorshipPrice(4, "XOF");
    expect(p.paidMonths).toBe(1);
    expect(p.amountPaid).toBe(15000);
    expect(p.totalMonths).toBe(4);
  });

  it("12 mois → 9 mois payés × 15 000 F = 135 000 F", () => {
    const p = resolveSponsorshipPrice(12, "XOF");
    expect(p.paidMonths).toBe(9);
    expect(p.amountPaid).toBe(135000);
  });

  it("EUR : équivalent repère au taux de la saison (15 000 F ≈ 22,50 €)", () => {
    expect(resolveSponsorshipPrice(6, "EUR").amountPaid).toBe(3 * 22.5);
  });
});

// ── Fake supabaseAdmin service-role (lectures par table + capture insert/update) ─
// Même modèle que payments.test.ts mais avec maybeSingle/order/limit pour couvrir
// findSubscriptionByRefOrCode et getFamilyCoverage.
function makeFakeDb(initial: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [k, [...v]]),
  );
  const inserts: Array<{ table: string; value: any }> = [];
  const updates: Array<{ table: string; value: any; eqCol?: string; eqVal?: any }> = [];

  const db: any = {};
  db.from = vi.fn((table: string) => {
    let filter: { col?: string; val?: any } = {};
    // Lecture en direct de tables[table] à chaque résolution : l'insert ajoute une ligne,
    // les lectures suivantes (single/select) doivent la voir (cas de createSponsorshipTokenRecord).
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
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      insert: vi.fn((value: any) => {
        inserts.push({ table, value });
        (tables[table] = tables[table] ?? []).push(value);
        return chain;
      }),
      update: vi.fn((value: any) => {
        const record = {
          table,
          value,
          eqCol: undefined as string | undefined,
          eqVal: undefined as any,
        };
        updates.push(record);
        return {
          eq: (col: string, val: any) => {
            record.eqCol = col;
            record.eqVal = val;
            // mutation effective pour que les lectures suivantes reflètent la mise à jour
            tables[table] = (tables[table] ?? []).map((r) =>
              r[col] === val ? { ...r, ...value } : r,
            );
            return Promise.resolve({ data: null, error: null });
          },
        };
      }),
      maybeSingle: vi.fn(() => Promise.resolve({ data: applyFilter()[0] ?? null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: applyFilter()[0] ?? {}, error: null })),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve, reject),
    };
    return chain;
  });
  return { db, inserts, updates };
}

// ── activateFamilySubscription (partagée webhook + page de retour, idempotente) ──
describe("activateFamilySubscription", () => {
  const NOW = new Date();
  const paidAt = new Date(NOW.getTime() - 60_000).toISOString();

  it("1er paiement (aucune ligne) : crée la ligne, pose les codes Paystack et la période paid_at → +1 mois", async () => {
    const { db, inserts } = makeFakeDb({});

    await activateFamilySubscription(db, {
      userId: "user-1",
      reference: "GENIZIO-SUB-REF1",
      subscriptionCode: "SUB_ABC",
      customerCode: "CUS_1",
      planCode: "PLN_1",
      paidAt,
      priceXof: 5000,
    });

    const ins = inserts.find((i) => i.table === "subscriptions");
    expect(ins?.value).toMatchObject({
      user_id: "user-1",
      status: "active",
      paystack_subscription_code: "SUB_ABC",
      paystack_customer_code: "CUS_1",
      plan_code: "PLN_1",
      paystack_reference: "GENIZIO-SUB-REF1",
      price_xof: 5000,
    });
    // période ≈ 1 mois après paid_at
    const start = new Date(ins!.value.current_period_start).getTime();
    const end = new Date(ins!.value.current_period_end).getTime();
    expect(end - start).toBeGreaterThan(27 * 86_400_000);
    expect(end - start).toBeLessThan(32 * 86_400_000);
  });

  it("renouvellement : étend depuis la fin de période actuelle (jamais de découpe)", async () => {
    const periodEnd = new Date(NOW.getTime() + 20 * 86_400_000).toISOString();
    const { db, updates } = makeFakeDb({
      subscriptions: [
        {
          id: "sub-1",
          user_id: "user-1",
          status: "active",
          paystack_subscription_code: "SUB_ABC",
          paystack_reference: "GENIZIO-SUB-REF1",
          current_period_start: "2026-08-01T00:00:00.000Z",
          current_period_end: periodEnd,
          price_xof: 5000,
        },
      ],
    });

    await activateFamilySubscription(db, {
      userId: "user-1",
      reference: "GENIZIO-SUB-REF2", // nouvelle référence = renouvellement
      subscriptionCode: "SUB_ABC",
      paidAt: NOW.toISOString(),
      priceXof: 5000,
    });

    const upd = updates.find((u) => u.table === "subscriptions");
    expect(upd).toBeDefined();
    expect(upd!.value.status).toBe("active");
    // étendu depuis la fin de période courante (qui est > paidAt)
    expect(new Date(upd!.value.current_period_end).getTime()).toBeGreaterThan(
      new Date(periodEnd).getTime(),
    );
  });

  it("idempotence : déjà active avec ce subscription_code → complète les champs manquants, aucune double extension", async () => {
    const { db, updates, inserts } = makeFakeDb({
      subscriptions: [
        {
          id: "sub-1",
          user_id: "user-1",
          status: "active",
          paystack_subscription_code: "SUB_ABC",
          paystack_reference: "GENIZIO-SUB-REF1",
          current_period_start: "2026-08-01T00:00:00.000Z",
          current_period_end: "2026-09-01T00:00:00.000Z",
          price_xof: 5000,
          plan_code: null,
        },
      ],
    });

    await activateFamilySubscription(db, {
      userId: "user-1",
      reference: "GENIZIO-SUB-REF1",
      subscriptionCode: "SUB_ABC",
      planCode: "PLN_1",
      paidAt: NOW.toISOString(),
      priceXof: 5000,
    });

    // Aucun insert sur subscriptions (idempotent) ; la synchro family_coverages (V4, Vague A)
    // est le SEUL insert — la couverture suit la fenêtre existante sans la prolonger.
    expect(inserts.filter((i) => i.table === "subscriptions")).toHaveLength(0);
    const upd = updates.find((u) => u.table === "subscriptions");
    expect(upd?.value).toMatchObject({ plan_code: "PLN_1" });
    expect(upd?.value.current_period_end).toBeUndefined(); // pas de prolongation
  });
});

// ── getFamilyCoverage : couverture = family_coverages (source unique V4) ─────────
// L'abonnement Paystack (table subscriptions) ne fournit plus que le statut d'affichage ;
// la couverture effective est portée par family_coverages (abonnement/campagne/parrainage/
// palier — le max des ends_at des lignes child_id NULL actives fait foi).
describe("getFamilyCoverage (résolveur V4 : family_coverages)", () => {
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const later = new Date(Date.now() + 60 * 86_400_000).toISOString();
  const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
  const start = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const coverageRow = (source: string, endsAt: string, status = "active") => ({
    id: `fc-${source}`,
    user_id: "u1",
    source,
    child_id: null,
    max_children: 5,
    starts_at: start,
    ends_at: endsAt,
    status,
  });

  it("abonnement actif → couverture jusqu'à la fin de la fenêtre family_coverages", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "active", current_period_end: future }],
      family_coverages: [coverageRow("subscription", future)],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBe(future);
    expect(cov.subscriptionStatus).toBe("active");
  });

  it("abonnement past_due avec fenêtre encore valide → couvre (grâce) jusqu'à la fin de la fenêtre", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "past_due", current_period_end: future }],
      family_coverages: [coverageRow("subscription", future)],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBe(future);
  });

  it("abonnement résilié (couverture révoquée) → aucune couverture (coupure immédiate)", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "cancelled", current_period_end: null }],
      family_coverages: [coverageRow("subscription", future, "revoked")],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBeNull();
  });

  it("fenêtre déjà passée → plus de couverture (fin de période payée dépassée)", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "active", current_period_end: past }],
      family_coverages: [coverageRow("subscription", past)],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBeNull();
  });

  it("crédit de parrainage valide → couverture jusqu'à ends_at, indépendamment de l'abonnement", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "cancelled", current_period_end: null }],
      family_coverages: [coverageRow("sponsorship", later)],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBe(later);
  });

  it("prend la date la plus tardive entre les lignes de couverture (max, pas de somme)", async () => {
    const { db } = makeFakeDb({
      subscriptions: [{ id: "s1", user_id: "u1", status: "active", current_period_end: future }],
      family_coverages: [coverageRow("subscription", future), coverageRow("sponsorship", later)],
    });
    const cov = await getFamilyCoverage(db, "u1");
    expect(cov.coveredUntil).toBe(later);
  });
});

// ── Entitlement 'sponsorship' : le paiement en ligne CRÉE le code (payment_confirmed=true) ─
describe("applyPaystackEntitlement — parrainage en ligne (intent sponsorship)", () => {
  it("crée le code de parrainage avec payment_confirmed=true et la paystack_reference", async () => {
    const { db, inserts } = makeFakeDb({});
    const payment: PaymentRow = {
      id: "pay-s",
      user_id: null,
      reference: "GENIZIO-SPONSOR-ABC",
      provider: "paystack",
      status: "initiated",
      amount_xof: 30000,
      currency: "XOF",
      metadata: {
        type: "sponsorship",
        sponsor_name: "Oncle Marc",
        sponsor_email: "marc@diaspora.org",
        sponsor_message: "Bravo !",
        target_child_name: "Mohleven",
        months: 5,
        currency: "XOF",
      },
      paid_at: null,
    };

    const result = await applyPaystackEntitlement(db, payment);
    expect(result.entitlement).toBe("sponsorship");
    expect(result.detail).toContain("GENIZIO-PARRAIN-");

    const ins = inserts.find((i) => i.table === "sponsorship_tokens");
    expect(ins?.value).toMatchObject({
      sponsor_name: "Oncle Marc",
      sponsor_email: "marc@diaspora.org",
      sponsor_message: "Bravo !",
      target_child_name: "Mohleven",
      months_count: 5,
      amount_paid: 30000,
      currency: "XOF",
      paystack_reference: "GENIZIO-SPONSOR-ABC",
      payment_confirmed: true, // plus de confirmation admin WhatsApp
    });
  });

  it("idempotent : un paiement = un seul code (retourne l'existant sans re-créer)", async () => {
    const { db, inserts } = makeFakeDb({
      sponsorship_tokens: [
        {
          id: "tok-1",
          code: "GENIZIO-PARRAIN-EXISTANT",
          paystack_reference: "GENIZIO-SPONSOR-ABC",
        },
      ],
    });
    const payment: PaymentRow = {
      id: "pay-s",
      user_id: null,
      reference: "GENIZIO-SPONSOR-ABC",
      provider: "paystack",
      status: "initiated",
      amount_xof: 30000,
      currency: "XOF",
      metadata: {
        type: "sponsorship",
        sponsor_email: "marc@diaspora.org",
        months: 5,
        currency: "XOF",
      },
      paid_at: null,
    };

    const result = await applyPaystackEntitlement(db, payment);
    expect(result.detail).toContain("GENIZIO-PARRAIN-EXISTANT");
    expect(inserts.filter((i) => i.table === "sponsorship_tokens")).toHaveLength(0);
  });

  it("rejette un paiement sponsorship sans months/sponsor_email valides", async () => {
    const { db } = makeFakeDb({});
    const payment: PaymentRow = {
      id: "pay-s",
      user_id: null,
      reference: "GENIZIO-SPONSOR-ABC",
      provider: "paystack",
      status: "initiated",
      amount_xof: 30000,
      currency: "XOF",
      metadata: { type: "sponsorship" },
      paid_at: null,
    };
    await expect(applyPaystackEntitlement(db, payment)).rejects.toThrow(
      /sans months\/sponsor_email valides/,
    );
  });
});

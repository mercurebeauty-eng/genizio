import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  xofToPaystack,
  createPaystackReference,
  verifyPaystackWebhookSignature,
} from "@/lib/paystack.server";
import {
  applyPaystackEntitlement,
  markPaymentSuccessAndFulfill,
  type PaymentRow,
} from "@/lib/payment-fulfillment.server";
import { initializeAccompanimentPackPayment } from "@/lib/payments.functions";
import { computeAccessPeriodWindow } from "@/lib/child-access";

const TEST_SECRET = "sk_test_secret_for_these_tests";

beforeEach(() => {
  process.env.PAYSTACK_SECRET_KEY = TEST_SECRET;
});

afterEach(() => {
  delete process.env.PAYSTACK_SECRET_KEY;
  vi.restoreAllMocks();
});

function makePayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: "pay-1",
    user_id: "user-1",
    reference: "GENIZIO-ORDER-1",
    provider: "paystack",
    status: "initiated",
    amount_xof: 5000,
    currency: "XOF",
    metadata: { type: "order" },
    paid_at: null,
    ...overrides,
  };
}

/** Fake supabaseAdmin service-role : capture les insert/update, résout les lectures. */
function makeDb(
  overrides: {
    periods?: Array<{ ends_at: string }>;
    adminUser?: { app_metadata?: Record<string, unknown> };
    tables?: Record<string, any[]>;
  } = {},
) {
  const inserts: Array<{ table: string; value: any }> = [];
  const updates: Array<{ table: string; value: any }> = [];
  // Sémantique CAS (review 2026-08-12) : le premier update payments → success est
  // remporté ; les suivants ne trouvent plus rien (already_fulfilled).
  let paymentsSuccessClaims = 0;

  const adminUser = overrides.adminUser ?? { app_metadata: { quota_override: 2 } };
  const tableData: Record<string, any[]> = {
    child_access_periods: overrides.periods ?? [],
    ...overrides.tables,
  };

  const db: any = {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: adminUser }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: { user: adminUser }, error: null }),
      },
    },
  };

  db.from = vi.fn((table: string) => {
    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn((value: any) => {
        inserts.push({ table, value });
        return builder;
      }),
      update: vi.fn((value: any) => {
        updates.push({ table, value });
        if (table === "payments" && value.status === "success") paymentsSuccessClaims += 1;
        return builder;
      }),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      maybeSingle: vi.fn(() =>
        Promise.resolve(
          table === "payments" && paymentsSuccessClaims > 1
            ? { data: null, error: null }
            : table in tableData
              ? { data: tableData[table]?.[0] ?? null, error: null }
              : { data: { id: "p1" }, error: null },
        ),
      ),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve({ data: tableData[table] ?? [], error: null }).then(resolve, reject),
    };
    return builder;
  });

  return { db, inserts, updates };
}

describe("paystack.server — conversions & signature", () => {
  it("xofToPaystack convertit en plus petite unité (×100)", () => {
    expect(xofToPaystack(5000)).toBe(500000);
    expect(xofToPaystack(15000)).toBe(1500000);
    expect(xofToPaystack(0)).toBe(0);
  });

  it("createPaystackReference génère une référence préfixée et unique", () => {
    const a = createPaystackReference("ORDER");
    const b = createPaystackReference("ORDER");
    expect(a.startsWith("GENIZIO-ORDER-")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("vérifie une signature webhook valide et rejette les invalides", () => {
    const body = '{"event":"charge.success","data":{"reference":"REF1"}}';
    const signature = createHmac("sha512", TEST_SECRET).update(body, "utf8").digest("hex");

    expect(verifyPaystackWebhookSignature(body, signature)).toBe(true);
    expect(verifyPaystackWebhookSignature(body, "wrong-signature")).toBe(false);
    expect(verifyPaystackWebhookSignature(body, null)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, undefined)).toBe(false);
  });

  it("rejette une signature calculée avec une autre clé (payload altéré)", () => {
    const body = '{"event":"charge.success","data":{"reference":"REF1"}}';
    const forged = createHmac("sha512", "sk_test_autre_cle").update(body, "utf8").digest("hex");
    expect(verifyPaystackWebhookSignature(body, forged)).toBe(false);
  });

  it("échoue sans PAYSTACK_SECRET_KEY", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    expect(() => verifyPaystackWebhookSignature("{}", "abc")).toThrow(/PAYSTACK_SECRET_KEY/);
  });
});

describe("applyPaystackEntitlement", () => {
  it("expose initializeAccompanimentPackPayment (intent Vague B : pack par enfant)", () => {
    expect(initializeAccompanimentPackPayment).toBeDefined();
    expect(typeof initializeAccompanimentPackPayment).toBe("function");
  });

  it("order → confirme la commande + payment_reference", async () => {
    const { db, updates } = makeDb();
    const payment = makePayment({
      metadata: { type: "order", order_id: "order-9" },
      reference: "GENIZIO-ORDER-REF1",
    });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("order");
    const orderUpdate = updates.find((u) => u.table === "orders");
    expect(orderUpdate?.value).toMatchObject({
      status: "confirmed",
      payment_reference: "GENIZIO-ORDER-REF1",
    });
  });

  it("child_access → insère une période étendue (source paystack)", async () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    const currentEnd = "2026-09-08T12:00:00.000Z";
    const { db, inserts } = makeDb({ periods: [{ ends_at: currentEnd }] });
    const payment = makePayment({
      amount_xof: 15000,
      metadata: { type: "child_access", child_id: "child-1", months: 3 },
    });

    const result = await applyPaystackEntitlement(db, payment);
    expect(result.entitlement).toBe("child_access");

    const insert = inserts.find((i) => i.table === "child_access_periods");
    expect(insert).toBeDefined();
    expect(insert!.value).toMatchObject({
      child_id: "child-1",
      source: "paystack",
      amount_xof: 15000,
      currency: "XOF",
    });

    // computeAccessPeriodWindow reprend la fin de la période courante (pas de perte de cumul).
    const expected = computeAccessPeriodWindow(currentEnd, 3, now);
    expect(insert!.value.starts_at).toBe(expected.startsAt);
    expect(insert!.value.ends_at).toBe(expected.endsAt);
  });

  it("passport → pdf_unlocked = true", async () => {
    const { db, updates } = makeDb();
    const payment = makePayment({ metadata: { type: "passport", child_id: "child-2" } });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("passport");
    expect(updates.find((u) => u.table === "child_profiles")?.value).toMatchObject({
      pdf_unlocked: true,
    });
  });

  it("extra_slots (V4, décision 5) → octroie un palier de +5 enfants en family_coverages (source purchase, une ligne par achat)", async () => {
    const { db, inserts } = makeDb();
    const payment = makePayment({
      user_id: "user-1",
      amount_xof: 15000,
      metadata: { type: "extra_slots", months: 3 },
    });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("extra_slots");
    const insert = inserts.find((i) => i.table === "family_coverages");
    expect(insert).toBeDefined();
    expect(insert!.value).toMatchObject({
      user_id: "user-1",
      child_id: null,
      source: "purchase",
      max_children: 5,
      sessions: 0,
      sessions_used: 0,
      price_xof: 15000,
      status: "active",
    });
    expect(insert!.value.ends_at).toBeTruthy(); // fenêtre = now + months (computeAccessPeriodWindow)
  });

  it("extra_slots sans months → rejeté (le palier ne s'octroie jamais à l'aveugle)", async () => {
    const { db } = makeDb();
    const payment = makePayment({ user_id: "user-1", metadata: { type: "extra_slots" } });
    await expect(applyPaystackEntitlement(db, payment)).rejects.toThrow(/sans months/);
  });

  it("accompaniment_pack → crédite 12×months séances en family_coverages (insert par enfant, décision 2)", async () => {
    const { db, inserts } = makeDb({ tables: { family_coverages: [] } });
    const payment = makePayment({
      user_id: "user-1",
      amount_xof: 180000,
      metadata: { type: "accompaniment_pack", child_id: "child-1", months: 3 },
    });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("accompaniment_pack");
    const insert = inserts.find((i) => i.table === "family_coverages");
    expect(insert).toBeDefined();
    expect(insert!.value).toMatchObject({
      user_id: "user-1",
      child_id: "child-1",
      source: "accompaniment_pack",
      sessions: 36, // 12 × 3 mois
      sessions_used: 0,
      max_children: 0, // le pack est un budget de séances, pas de la couverture app
      price_xof: 180000,
      status: "active",
    });
    expect(insert!.value.ends_at).toBeTruthy();
  });

  it("accompaniment_pack avec pack existant → étend la fenêtre et ajoute les séances (jamais de découpe)", async () => {
    const { db, updates } = makeDb({
      tables: {
        family_coverages: [{ id: "pack-1", sessions: 12, ends_at: "2026-09-08T12:00:00.000Z" }],
      },
    });
    const payment = makePayment({
      user_id: "user-1",
      amount_xof: 60000,
      metadata: { type: "accompaniment_pack", child_id: "child-1", months: 1 },
    });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("accompaniment_pack");
    const upd = updates.find((u) => u.table === "family_coverages");
    expect(upd).toBeDefined();
    expect(upd!.value).toMatchObject({ sessions: 24, price_xof: 60000, status: "active" });
  });

  it("accompaniment_pack sans child_id/months → rejeté", async () => {
    const { db } = makeDb();
    const payment = makePayment({
      user_id: "user-1",
      metadata: { type: "accompaniment_pack", child_id: "child-1" },
    });
    await expect(applyPaystackEntitlement(db, payment)).rejects.toThrow(/sans child_id\/months/);
  });

  it("rejette un intent inconnu", async () => {
    const { db } = makeDb();
    const payment = makePayment({ metadata: { type: "inconnu" } as any });
    await expect(applyPaystackEntitlement(db, payment)).rejects.toThrow(
      /Intent de paiement inconnu/,
    );
  });
});

describe("markPaymentSuccessAndFulfill", () => {
  it("CAS : marque success (paid_at) puis applique le bénéfice", async () => {
    const { db, updates } = makeDb();
    const payment = makePayment({ metadata: { type: "order", order_id: "order-1" } });

    const result = await markPaymentSuccessAndFulfill(db, payment);
    expect(result.entitlement).toBe("order");

    const paymentUpdate = updates.find((u) => u.table === "payments");
    expect(paymentUpdate?.value).toMatchObject({ status: "success" });
    expect(paymentUpdate?.value.paid_at).toBeTruthy();
  });

  it("idempotence CAS : un second appel concurrent ne ré-applique pas le bénéfice", async () => {
    const { db, updates } = makeDb();
    const payment = makePayment({ metadata: { type: "order", order_id: "order-1" } });

    // Webhook + page de retour lus 'initiated' tous les deux → deux appels.
    await markPaymentSuccessAndFulfill(db, payment);
    const second = await markPaymentSuccessAndFulfill(db, payment);

    expect(second.entitlement).toBe("already_fulfilled");
    const orderUpdates = updates.filter((u) => u.table === "orders");
    expect(orderUpdates).toHaveLength(1); // bénéfice appliqué EXACTEMENT une fois
  });
});

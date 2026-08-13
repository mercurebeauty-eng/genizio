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
  } = {},
) {
  const inserts: Array<{ table: string; value: any }> = [];
  const updates: Array<{ table: string; value: any }> = [];
  // Sémantique CAS (review 2026-08-12) : le premier update payments → success est
  // remporté ; les suivants ne trouvent plus rien (already_fulfilled).
  let paymentsSuccessClaims = 0;

  const adminUser = overrides.adminUser ?? { app_metadata: { extra_profile_slots: 2 } };
  const tableData: Record<string, any[]> = {
    child_access_periods: overrides.periods ?? [],
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

  it("extra_slots → incrémente extra_profile_slots dans app_metadata (sans écraser les autres clés)", async () => {
    const { db, inserts } = makeDb({
      adminUser: { app_metadata: { extra_profile_slots: 2, provider: "google" } },
    });
    void inserts;
    const payment = makePayment({
      user_id: "user-1",
      metadata: { type: "extra_slots", months: 3 },
    });
    const result = await applyPaystackEntitlement(db, payment);

    expect(result.entitlement).toBe("extra_slots");
    expect(db.auth.admin.getUserById).toHaveBeenCalledWith("user-1");
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { extra_profile_slots: 3, provider: "google" },
    });
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

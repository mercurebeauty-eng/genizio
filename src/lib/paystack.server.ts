// Module serveur Paystack — NE JAMAIS importer côté client.
//
// Utilise PAYSTACK_SECRET_KEY (serveur uniquement, .env), fetch natif et node:crypto.
// L'import doit toujours être dynamique depuis un handler createServerFn (cf. le pattern
// supabaseAdmin : un import statique embarquerait ce module — et la clé — dans le bundle
// client). Seul le webhook (route API, 100% serveur) peut l'importer statiquement.
//
// Référence : https://paystack.com/docs/
// Montants : Paystack travaille en plus petite unité de la devise. XOF suit ISO 4217
// (2 décimales, centimes) : 5 000 FCFA → amount = 500 000.

import { createHmac, timingSafeEqual } from "node:crypto";

export const PAYSTACK_API_URL = "https://api.paystack.co";

export function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY manquante dans l'environnement serveur.");
  }
  return key;
}

/** Montant FCFA → plus petite unité Paystack (×100). */
export function xofToPaystack(amountXof: number): number {
  return Math.round(amountXof * 100);
}

/**
 * Référence de transaction unique, préfixée par intent pour le débogage côté
 * dashboard Paystack (ex. GENIZIO-ORDER-1723…).
 */
export function createPaystackReference(prefix: string): string {
  return `GENIZIO-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

type PaystackInitializePayload = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackInitializeResult = {
  authorizationUrl: string;
  reference: string;
};

/** POST /transaction/initialize — retourne l'URL hébergée vers laquelle rediriger. */
export async function initializePaystackTransaction(input: {
  email: string;
  amountXof: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResult> {
  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: xofToPaystack(input.amountXof),
      currency: "XOF",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const payload = (await response.json().catch(() => null)) as PaystackInitializePayload | null;
  if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
    const message = payload?.message ?? `Erreur HTTP ${response.status}`;
    throw new Error(`Paystack : impossible d'initialiser la transaction (${message}).`);
  }
  return { authorizationUrl: payload.data.authorization_url, reference: payload.data.reference };
}

type PaystackVerifyPayload = {
  status: boolean;
  message: string;
  data?: {
    status: string; // "success" | "abandoned" | "failed" | ...
    amount: number; // plus petite unité
    currency: string;
    paid_at?: string | null;
    reference: string;
    // Présents quand la transaction est liée à un abonnement (1er paiement ou
    // renouvellement) : le subscription_code permet d'activer/renouveler la ligne.
    subscription_code?: string | null;
    plan?: { plan_code?: string } | string | null;
    customer?: { customer_code?: string } | null;
  };
};

export type PaystackVerifyResult = {
  status: string;
  amountXof: number;
  currency: string;
  paidAt: string | null;
  subscriptionCode?: string | null;
  planCode?: string | null;
  customerCode?: string | null;
};

/** GET /transaction/verify/:reference — statut et montant réels de la transaction. */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getPaystackSecretKey()}` },
    },
  );

  const payload = (await response.json().catch(() => null)) as PaystackVerifyPayload | null;
  if (!response.ok || !payload?.status || !payload.data) {
    const message = payload?.message ?? `Erreur HTTP ${response.status}`;
    throw new Error(`Paystack : échec de vérification de la transaction (${message}).`);
  }
  const plan = payload.data.plan;
  const planCode = typeof plan === "object" && plan ? (plan.plan_code ?? null) : null;
  return {
    status: payload.data.status,
    amountXof: Math.round(payload.data.amount / 100),
    currency: payload.data.currency,
    paidAt: payload.data.paid_at ?? null,
    subscriptionCode: payload.data.subscription_code ?? null,
    planCode,
    customerCode: payload.data.customer?.customer_code ?? null,
  };
}

/**
 * Vérifie le header `x-paystack-signature` d'un webhook : HMAC-SHA512 (hex) du RAW body
 * avec la clé secrète, en comparaison à temps constant. Toujours vérifier contre le corps
 * brut reçu, jamais une re-sérialisation JSON.
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", getPaystackSecretKey())
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Abonnements récurrents (forfait famille) ──────────────────────────────────
// Paystack crée automatiquement l'abonnement quand on passe un `plan` à
// /transaction/initialize : le champ `plan` surclasse `amount`, le premier paiement
// réussit, et les webhooks charge.success + subscription.create arrivent avec le
// subscription_code. Les plans « Génizio Bienvenue » (5 000 F) et « Génizio Standard »
// (15 000 F), mensuels XOF, ont été créés dans le dashboard Paystack (2026-08-09) ;
// subscriptions.functions.ts les retrouve par nom via searchPaystackPlans et les cache
// dans paystack_plans (codes fournis par l'admin, jamais recréés tant qu'ils existent).

type PaystackPlanResponse = {
  plan_code: string;
  name: string;
  amount: number; // plus petite unité
  interval: string;
  currency: string;
};

export type PaystackPlanResult = {
  planCode: string;
  name: string;
  amountXof: number;
};

type PaystackSubscriptionResponse = {
  subscription_code: string;
  email_token: string;
  status: string;
  plan?: PaystackPlanResponse | null;
  customer?: { customer_code: string; email: string } | null;
  next_payment_date?: string | null;
};

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as {
    status: boolean;
    message: string;
    data?: T;
  } | null;
  if (!response.ok || !payload?.status) {
    throw new Error(`Paystack : erreur API ${path} (${payload?.message ?? response.status}).`);
  }
  return payload.data as T;
}

/** GET /plan?search= — retrouve un plan existant par nom (idempotence de ensurePaystackPlan). */
export async function searchPaystackPlans(search: string): Promise<PaystackPlanResult[]> {
  const plans = await paystackFetch<PaystackPlanResponse[]>(
    `/plan?search=${encodeURIComponent(search)}`,
    { method: "GET" },
  );
  return (plans ?? []).map((p) => ({
    planCode: p.plan_code,
    name: p.name,
    amountXof: Math.round(p.amount / 100),
  }));
}

/** POST /plan — crée le plan si absent. `amount` en plus petite unité (×100). */
export async function createPaystackPlan(input: {
  name: string;
  amountXof: number;
  interval?: "daily" | "weekly" | "monthly" | "biannually" | "annually";
  currency?: string;
}): Promise<PaystackPlanResult> {
  const plan = await paystackFetch<PaystackPlanResponse>("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      amount: xofToPaystack(input.amountXof),
      interval: input.interval ?? "monthly",
      currency: input.currency ?? "XOF",
    }),
  });
  return { planCode: plan.plan_code, name: plan.name, amountXof: Math.round(plan.amount / 100) };
}

/**
 * POST /transaction/initialize avec `plan` : au premier paiement Paystack crée
 * automatiquement l'abonnement (le `plan` surclasse `amount`). Retourne l'URL hébergée
 * vers laquelle rediriger le parent.
 */
export async function initializePaystackSubscriptionTransaction(input: {
  email: string;
  reference: string;
  planCode: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResult> {
  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      reference: input.reference,
      plan: input.planCode,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const payload = (await response.json().catch(() => null)) as PaystackInitializePayload | null;
  if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
    const message = payload?.message ?? `Erreur HTTP ${response.status}`;
    throw new Error(`Paystack : impossible d'initialiser l'abonnement (${message}).`);
  }
  return { authorizationUrl: payload.data.authorization_url, reference: payload.data.reference };
}

/** GET /subscription/{code} — statut, next_payment_date et email_token (nécessaire au disable). */
export async function fetchPaystackSubscription(
  subscriptionCode: string,
): Promise<PaystackSubscriptionResponse> {
  return paystackFetch<PaystackSubscriptionResponse>(
    `/subscription/${encodeURIComponent(subscriptionCode)}`,
    { method: "GET" },
  );
}

/**
 * POST /subscription/disable — résiliation côté Paystack. Exige le email_token de
 * l'abonnement (récupéré via GET /subscription/{code}) : il ne peut pas être dérivé de la
 * clé API seule. La coupure d'accès, elle, est immédiate côté app (résolveur) — on ne
 * dépend pas du webhook subscription.not_renew pour bloquer.
 */
export async function disablePaystackSubscription(subscriptionCode: string): Promise<void> {
  const sub = await fetchPaystackSubscription(subscriptionCode);
  await paystackFetch<unknown>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({ code: subscriptionCode, token: sub.email_token }),
  });
}

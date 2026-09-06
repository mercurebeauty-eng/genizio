// Fichier : src/lib/rate-limit.server.ts

/**
 * Ce fichier contient la logique de Rate Limiting (Limitation de requêtes)
 * pour protéger les routes API sensibles (Webhooks, requêtes IA, emails)
 * contre le spam et les attaques par déni de service (DDoS / Denial of Wallet).
 */

type RateLimitRecord = {
  count: number;
  lastReset: number;
};

// Stockage en mémoire (idéal pour des instances uniques ou du edge computing courte durée).
// Pour une architecture multi-instances, on utiliserait plutôt Redis.
const rateLimitCache = new Map<string, RateLimitRecord>();

// Balayage paresseux : la purge des entrées périmées (> 10 min) se fait au moment du check,
// pilotée par un timestamp, JAMAIS par un timer global. Un `setInterval` au chargement du
// module est interdit dans le global scope des Workers (workerd) et tourne inutilement dans
// chaque instance chaude des lambdas serverless — le sweep-on-access est portable partout.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweepIfDue() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [ip, record] of rateLimitCache.entries()) {
    if (now - record.lastReset > SWEEP_INTERVAL_MS) {
      rateLimitCache.delete(ip);
    }
  }
}

export type RateLimitOptions = {
  maxRequests: number; // Nombre max de requêtes
  windowMs: number; // Fenêtre de temps en ms
};

export function checkRateLimit(ip: string, options: RateLimitOptions): boolean {
  sweepIfDue();
  const now = Date.now();
  const record = rateLimitCache.get(ip);

  if (!record) {
    rateLimitCache.set(ip, { count: 1, lastReset: now });
    return true; // Autorisé
  }

  // Si la fenêtre de temps est écoulée, on réinitialise
  if (now - record.lastReset > options.windowMs) {
    record.count = 1;
    record.lastReset = now;
    return true; // Autorisé
  }

  // Si le plafond est atteint
  if (record.count >= options.maxRequests) {
    return false; // Bloqué (Rate Limited)
  }

  record.count++;
  return true; // Autorisé
}

export function getClientIp(request: Request): string {
  // x-real-ip : posé par le proxy (Vercel), non contrôlable par le client.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // x-forwarded-for : la chaîne est « client, proxy1, proxy2 » — le PREMIER hop
  // est écrit par le client (spoofable). On prend le DERNIER hop, ajouté par
  // notre propre proxy. (Audit backend vague C : l'ancien code faisait confiance
  // au premier → contournement trivial du rate limit.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "unknown-ip";
}

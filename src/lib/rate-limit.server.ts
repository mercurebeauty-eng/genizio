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

// Nettoyage périodique du cache pour éviter les fuites de mémoire (toutes les 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitCache.entries()) {
    if (now - record.lastReset > 10 * 60 * 1000) {
      rateLimitCache.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export type RateLimitOptions = {
  maxRequests: number; // Nombre max de requêtes
  windowMs: number;    // Fenêtre de temps en ms
};

export function checkRateLimit(ip: string, options: RateLimitOptions): boolean {
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
  // Récupère l'IP réelle passée par le reverse proxy (ex: Cloudflare, Vercel)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown-ip";
}

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { checkRateLimit, getClientIp } from "./rate-limit.server";

// Par défaut : limite à 10 requêtes par minute par IP pour éviter le spam sur les fonctions serveurs
export const requireRateLimit = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const request = getRequest();
    if (!request) return next();

    // Clé = utilisateur authentifié quand le middleware d'auth tourne AVANT
    // (chaîne [requireSupabaseAuth, requireRateLimit]) — sinon IP. Un compte
    // multi-appareils partage son budget ; deux comptes derrière la même IP
    // (cybercafé, WiFi familial) ne se bloquent plus mutuellement (audit C1).
    const userId = (context as { userId?: string } | undefined)?.userId;
    const key = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
    // Protection : 10 requêtes / minute / clé
    const isAllowed = checkRateLimit(key, { maxRequests: 10, windowMs: 60 * 1000 });

  if (!isAllowed) {
    throw new Error(
      "Trop de requêtes détectées. Par mesure de sécurité, veuillez patienter une minute.",
    );
  }

    return next();
  },
);

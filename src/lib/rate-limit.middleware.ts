import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { checkRateLimit, getClientIp } from "./rate-limit.server";

// Par défaut : limite à 10 requêtes par minute par IP pour éviter le spam sur les fonctions serveurs
export const requireRateLimit = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) return next();

  const ip = getClientIp(request);
  // Protection : 10 requêtes / minute / IP
  const isAllowed = checkRateLimit(ip, { maxRequests: 10, windowMs: 60 * 1000 });

  if (!isAllowed) {
    throw new Error("Trop de requêtes détectées. Par mesure de sécurité, veuillez patienter une minute.");
  }

  return next();
});

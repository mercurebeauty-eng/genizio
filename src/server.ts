import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Redirection canonique permanente (HTTP 301) pour Google Search & crawlers :
 * 1. Normalise le domaine vers www.genizio.com (évite la dispersion de PageRank genizio.vercel.app / genizio.com)
 * 2. Normalise le protocole vers HTTPS
 * 3. Supprime les slashs finals redondants (ex: /guides/sujet/ -> /guides/sujet)
 */
export function getCanonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");

  // Ne pas rediriger en environnement local ou tests
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.endsWith(".local") ||
    host === "test"
  ) {
    return null;
  }

  let needsRedirect = false;
  let targetHost = host;
  let targetProto = proto;
  let targetPath = url.pathname;

  // 1. Redirection de domaine canonique (genizio.com ou *.vercel.app -> www.genizio.com)
  if (host === "genizio.com" || host.endsWith(".vercel.app")) {
    targetHost = "www.genizio.com";
    targetProto = "https";
    needsRedirect = true;
  } else if (proto === "http" && targetHost === "www.genizio.com") {
    targetProto = "https";
    needsRedirect = true;
  }

  // 2. Normalisation du slash final (sauf pour la racine '/')
  if (targetPath.length > 1 && targetPath.endsWith("/")) {
    targetPath = targetPath.replace(/\/+$/, "");
    needsRedirect = true;
  }

  if (needsRedirect) {
    const targetUrl = `${targetProto}://${targetHost}${targetPath}${url.search}`;
    return new Response(null, {
      status: 301,
      headers: {
        Location: targetUrl,
      },
    });
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const canonicalRedirect = getCanonicalRedirect(request);
    if (canonicalRedirect) return canonicalRedirect;

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

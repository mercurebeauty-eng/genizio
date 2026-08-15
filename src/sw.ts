/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />
// Service worker custom (vite-plugin-pwa, stratégie injectManifest) — Confiance
// Mentor (2026-08-15) : le SW généré (generateSW/workbox) ne permettait pas de
// brancher les notifications push. Ce SW fait deux choses :
//   1. pre-cache des assets (même comportement qu'avant — workbox-precaching) ;
//   2. affichage des notifications push (événement `push`) + navigation à la
//      notification (`notificationclick`) vers la route voulue.
// Les requêtes de NAVIGATION ne sont PAS interceptées (SSR TanStack Start, pas de
// fallback index.html) — même principe que l'ancien navigateFallback: null.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = (event.data?.json() ?? {}) as PushPayload;
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }
  const title = payload.title ?? "Génizio";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/web-app-manifest-192x192.png",
    badge: "/web-app-manifest-192x192.png",
    data: { url: payload.url ?? "/profiles" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    ((event.notification as Notification & { data?: { url?: string } }).data?.url as string) ??
    "/profiles";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// Notifications push (Web Push PWA) — Confiance Mentor (2026-08-15).
//
// Le hook `usePushNotifications` expose l'état (support, permission) et l'action
// `enable()` (à appeler sur un geste utilisateur — le navigateur l'exige pour
// demander la permission). Le composant `PushNotificationsSetup`, monté dans
// __root, s'abonne automatiquement si la permission est déjà accordée, affiche un
// bandeau discret pour la demander sinon, et nettoie la subscription du compte à
// la déconnexion.

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { savePushSubscription, removePushSubscription } from "@/lib/notifications.functions";
import { X, Bell } from "lucide-react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

// La clé VAPID applicative est une clé publique encodée en base64url — PushManager
// attend un Uint8Array. Le type générique Uint8Array<ArrayBuffer> satisfait le
// BufferSource exigé par pushManager.subscribe (TS 5.7+, Uint8Array<ArrayBufferLike>
// est refusé).
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64url);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const supported = isSupported();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported",
  );
  const saveFn = useServerFn(savePushSubscription);
  const removeFn = useServerFn(removePushSubscription);

  const subscribe = async () => {
    if (!isSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await saveFn({
          data: {
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent.slice(0, 300),
          },
        });
      }
      return true;
    } catch (err) {
      console.error("Abonnement push échoué:", err);
      return false;
    }
  };

  const enable = async () => {
    if (!isSupported()) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") return await subscribe();
      return false;
    } catch {
      return false;
    }
  };

  const disable = async () => {
    if (!isSupported()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription?.endpoint) {
        await removeFn({ data: { endpoint: subscription.endpoint } });
      }
      await subscription?.unsubscribe();
    } catch (err) {
      console.error("Désabonnement push échoué:", err);
    }
  };

  // Au montage : si la permission est déjà accordée (visite précédente), on
  // s'abonne sans rien demander.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (isSupported() && Notification.permission === "granted") {
      void subscribe();
    }
  }, []);

  return { supported, permission, enable, disable };
}

export function PushNotificationsSetup() {
  const { session, loading } = useSession();
  const { supported, permission, enable, disable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [enabling, setEnabling] = useState(false);

  // Déconnexion : on retire la subscription du compte (le push ne doit pas suivre
  // l'utilisateur hors session).
  const userId = session?.user?.id;
  useEffect(() => {
    if (!loading && !userId) void disable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading]);

  if (!supported || !session || permission !== "default" || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 shadow-xl">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
          <Bell className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-ink">Activez les notifications</p>
          <p className="text-[11px] text-ink/60 leading-snug">
            Pour être alerté(e) des séances à valider, bilans et statuts.
          </p>
        </div>
        <button
          onClick={async () => {
            setEnabling(true);
            await enable();
            setEnabling(false);
          }}
          disabled={enabling}
          className="shrink-0 rounded-xl bg-brand px-3 py-2 text-[11px] font-black text-white hover:bg-brand/90 disabled:opacity-50 cursor-pointer"
        >
          {enabling ? "…" : "Activer"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1 text-ink/40 hover:bg-stone-100 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// Notifications push (Web Push PWA) — Confiance Mentor (2026-08-15), refonte
// de la fiabilité d'abonnement (2026-09-05).
//
// Rôle : exposer l'état (support, permission) et l'action `enable()`. Le
// composant `PushNotificationsSetup`, monté dans __root, s'abonne
// automatiquement si la permission est déjà accordée, propose la demande sinon,
// et nettoie la subscription du compte à la déconnexion.
//
// Correction majeure (2026-09-05) : le flux pendait silencieusement sur
// `navigator.serviceWorker.ready` quand le SW n'était jamais enregistré —
// push_subscriptions restait vide sans aucune erreur nulle part. Désormais :
//   • l'accès au SW passe par awaitServiceWorkerReady() (timeout + message qui
//     nomme la cause réelle, attente partagée entre composants) ;
//   • les échecs sont retournés à l'appelant (`enable()` renvoie un résultat
//     explicite) et toasts sont affichés par le composant de setup ;
//   • l'utilisateur peut réessayer : aucun échec n'est mis en cache.

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { savePushSubscription, removePushSubscription } from "@/lib/notifications.functions";
import { awaitServiceWorkerReady, isServiceWorkerSupported } from "@/lib/sw-ready";
import { useBottomOverlayClaim } from "@/hooks/use-ui-overlays";
import { X, Bell } from "lucide-react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function isSupported(): boolean {
  return isServiceWorkerSupported() && !!VAPID_PUBLIC_KEY;
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

export type PushSetupOutcome =
  | { ok: true }
  | { ok: false; reason: "permission_denied" | "subscribe_failed" | "unsupported"; message: string };

export function usePushNotifications() {
  const supported = isSupported();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported ? Notification.permission : "unsupported",
  );
  const saveFn = useServerFn(savePushSubscription);
  const removeFn = useServerFn(removePushSubscription);

  const subscribe = async (): Promise<PushSetupOutcome> => {
    if (!isSupported()) {
      return {
        ok: false,
        reason: "unsupported",
        message: "Notifications push non supportées sur cet appareil.",
      };
    }
    try {
      // Ne résout que si un SW est enregistré (timeout 8 s sinon) — plus jamais
      // de hang silencieux : l'échec remonte avec sa cause.
      const registration = await awaitServiceWorkerReady();
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
      return { ok: true };
    } catch (err) {
      console.error("Abonnement push échoué:", err);
      return {
        ok: false,
        reason: "subscribe_failed",
        message:
          err instanceof Error
            ? err.message
            : "Impossible d'activer les notifications pour le moment.",
      };
    }
  };

  const enable = async (): Promise<PushSetupOutcome> => {
    if (!isSupported()) {
      return {
        ok: false,
        reason: "unsupported",
        message: "Notifications push non supportées sur cet appareil.",
      };
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        return {
          ok: false,
          reason: "permission_denied",
          message: "Permission de notification refusée — réactivez-la dans les réglages du navigateur.",
        };
      }
      return await subscribe();
    } catch (err) {
      console.error("Demande de permission push échouée:", err);
      return {
        ok: false,
        reason: "permission_denied",
        message: "Demande de permission impossible sur ce navigateur.",
      };
    }
  };

  const disable = async () => {
    if (!isServiceWorkerSupported()) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription?.endpoint) {
        await removeFn({ data: { endpoint: subscription.endpoint } });
      }
      await subscription?.unsubscribe();
    } catch (err) {
      console.error("Désabonnement push échoué:", err);
    }
  };

  // Au montage : si la permission est déjà accordée (visite précédente), on
  // s'abonne sans rien demander — le résultat est silencieux ici (pas de
  // toast au simple chargement de page), les erreurs restent en console.
  const mounted = useRef(false);
  const [silentRetryTick, setSilentRetryTick] = useState(0);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (isSupported() && Notification.permission === "granted") {
      void subscribe().then((res) => {
        if (!res.ok) {
          // Une seule relance différée (ex : SW encore en cours d'enregistrement
          // au tout premier chargement après déploiement).
          setTimeout(() => setSilentRetryTick((t) => t + 1), 4_000);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (silentRetryTick === 0) return;
    if (isSupported() && Notification.permission === "granted") {
      void subscribe();
    }
  }, [silentRetryTick]);

  return { supported, permission, enable, disable, subscribe };
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

  const visible = supported && !!session && permission === "default" && !dismissed;
  // Occupe la zone basse d'écran tant qu'affiché — le WhatsAppFAB s'efface.
  useBottomOverlayClaim(visible);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
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
            const res = await enable();
            setEnabling(false);
            // L'utilisateur a fait un geste explicite : tout échec est visible.
            if (res.ok) {
              toast.success("Notifications activées !");
            } else {
              toast.error(res.message, { duration: 6000 });
            }
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

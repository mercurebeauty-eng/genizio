import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email.functions";

// ---------------------------------------------------------------------------
// Store singleton (2026-08-14) : useSession() était instancié 2 à 4× par page
// (la page, AppHeader, WhatsAppFAB monté globalement dans __root, dialogs).
// Chaque instance montait son propre listener onAuthStateChange ET appelait
// refreshSession() à chaque montage. Chaque refresh réussit émet
// TOKEN_REFRESHED à tous les listeners, chacun fait setSession(s) avec une
// NOUVELLE identité d'objet → tous les effets [session] des pages se
// re-déclenchent → re-fetch → loaders qui se réaffichent (« la page se
// recharge »). Le middleware serverFn attachSupabaseAuth (getSession →
// refresh réseau si le token est proche d'expiration, cf. auth-js patché)
// alimentait la boucle. Ce store partage UNE seule source de vérité : une
// seule init, un seul refresh, des identités stables.
// ---------------------------------------------------------------------------

type SessionState = {
  session: Session | null;
  loading: boolean;
  /** User id de la dernière connexion SIGNED_IN réelle (welcome email). */
  signedInUserId: string | null;
};

const INITIAL_STATE: SessionState = { session: null, loading: true, signedInUserId: null };

let state: SessionState = INITIAL_STATE;
const listeners = new Set<() => void>();
let initialized = false;

/** User ids déjà couverts par le welcome email (idempotent côté client aussi). */
const welcomeEmailSentFor = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Clé d'identité « significative » d'une session : l'objet Session est
 * recréé à chaque TOKEN_REFRESHED même quand rien d'utile ne change, or une
 * nouvelle identité re-déclenche tous les effets [session] des pages. On ne
 * propage donc que les changements réels : utilisateur, token, expiration,
 * claims app_metadata (les ajustements admin, ex. quota_override, ne
 * deviennent visibles qu'au refresh du token).
 */
function sessionIdentity(s: Session | null): string | null {
  if (!s?.user) return null;
  return [
    s.user.id,
    s.access_token,
    s.expires_at ?? 0,
    JSON.stringify(s.user.app_metadata ?? {}),
  ].join("|");
}

function setSession(next: Session | null, signedInUserId?: string | null) {
  const sameSession = sessionIdentity(next) === sessionIdentity(state.session);
  const sameSignedIn = state.signedInUserId === (signedInUserId ?? state.signedInUserId);
  if (sameSession && sameSignedIn && !state.loading) return;
  state = { session: next, loading: false, signedInUserId: signedInUserId ?? state.signedInUserId };
  emit();
}

function init() {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((event, s) => {
    setSession(s, event === "SIGNED_IN" ? (s?.user?.id ?? null) : undefined);
  });

  supabase.auth
    .getSession()
    .then(async ({ data }) => {
      if (data.session) {
        // Claims frais (2026-08-13, revue quota) : le JWT embarque app_metadata
        // (ex. quota_override ajusté par l'admin) — sans refresh au premier
        // chargement, le nouveau quota n'apparaissait qu'au prochain refresh
        // naturel du token. Le refresh tourne le token UNE seule fois par
        // chargement d'app (plus par page ni par instance : les 2-4 refresh
        // simultanés provoquaient des cascades de TOKEN_REFRESHED qui
        // re-déclenchaient tous les effets [session] — la boucle de rechargement).
        const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({
          data: null,
        }));
        setSession(refreshed?.session ?? data.session);
      } else {
        setSession(null);
      }
    })
    .catch((err) => {
      console.error("Error getting session:", err);
      setSession(null);
    });
}

function subscribe(listener: () => void): () => void {
  init();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionState {
  return state;
}

// Sûr en SSR (TanStack Start) : le serveur ne voit jamais le store client.
const getServerSnapshot = (): SessionState => INITIAL_STATE;

export function useSession() {
  const sendWelcomeEmail = useServerFn(sendWelcomeEmailIfNeeded);
  const sessionState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Welcome email — fire-and-forget : idempotent côté serveur (consent_events),
  // sûr à appeler à chaque connexion — seule la toute première déclenchera un
  // envoi réel. Déclenché ici (pas dans le store) car useServerFn est un hook.
  // Dédupliqué côté client aussi : une seule instance de useSession envoie.
  const handledSignedInRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = sessionState.signedInUserId;
    if (!userId || handledSignedInRef.current === userId) return;
    if (welcomeEmailSentFor.has(userId)) {
      handledSignedInRef.current = userId;
      return;
    }
    welcomeEmailSentFor.add(userId);
    handledSignedInRef.current = userId;
    const session = sessionState.session;
    if (!session?.user) return;
    const meta = session.user.user_metadata as Record<string, unknown> | undefined;
    const firstName =
      (meta?.given_name as string | undefined) ||
      (meta?.full_name as string | undefined) ||
      (meta?.name as string | undefined) ||
      null;
    sendWelcomeEmail({
      data: { userId: session.user.id, email: session.user.email ?? "", firstName },
    }).catch((err) => console.error("[welcome-email] appel échoué:", err));
  }, [sessionState.signedInUserId, sessionState.session, sendWelcomeEmail]);

  return { session: sessionState.session, loading: sessionState.loading };
}

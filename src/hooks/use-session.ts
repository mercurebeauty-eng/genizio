import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sendWelcomeEmail = useServerFn(sendWelcomeEmailIfNeeded);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Fire-and-forget : idempotent côté serveur (consent_events), sûr à appeler à
      // chaque connexion — seule la toute première déclenchera un envoi réel.
      if (event === "SIGNED_IN" && s?.user) {
        const meta = s.user.user_metadata as Record<string, unknown> | undefined;
        const firstName = (meta?.given_name as string | undefined) || (meta?.full_name as string | undefined) || (meta?.name as string | undefined) || null;
        sendWelcomeEmail({
          data: { userId: s.user.id, email: s.user.email ?? "", firstName },
        }).catch((err) => console.error("[welcome-email] appel échoué:", err));
      }
    });
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session) {
          // Claims frais (2026-08-13, revue quota) : le JWT embarque app_metadata
          // (ex. extra_profile_slots ajusté par l'admin) — sans refresh au montage,
          // le nouveau quota n'apparaissait qu'au prochain refresh naturel du token
          // (jusqu'à ~1 h après l'ajustement). Le refresh tourne le token à chaque
          // chargement de page : l'ajustement admin est visible dès la page suivante.
          const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({
            data: null,
          }));
          setSession(refreshed?.session ?? data.session);
        } else {
          setSession(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error getting session:", err);
        setLoading(false);
      });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

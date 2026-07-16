import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/profiles", replace: true });
  }, [session, loading, navigate]);

  const google = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/profiles",
      },
    });
    if (error) {
      setError(error.message ?? "Connexion Google échouée");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-6 py-16 text-ink">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-2xl font-extrabold text-brand">
          <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
          GÉNIZIO
        </Link>
        <div className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-ink/5">
          <h1 className="font-display text-3xl font-extrabold">Content de vous revoir</h1>
          <p className="mt-2 text-sm text-ink/60">
            Sauvegardez les profils de vos enfants et retrouvez leurs défis à tout moment.
          </p>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-bold transition-all hover:bg-stone-50 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.2 5.2C41 34.5 44 29.7 44 24c0-1.2-.1-2.3-.4-3.5z" />
            </svg>
            {busy ? "…" : "Continuer avec Google"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

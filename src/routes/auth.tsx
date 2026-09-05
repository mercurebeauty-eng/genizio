import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Mail, KeyRound, Loader2 } from "lucide-react";

interface AuthSearchParams {
  redirect?: string;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearchParams => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session, loading } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = redirect || "/profiles";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"initial" | "verify">("initial");

  useEffect(() => {
    if (!loading && session) navigate({ to: target, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, navigate]);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + target,
        },
      });
      if (error) {
        const msg = error.message ?? "Connexion Google échouée";
        setError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Une erreur est survenue lors de la connexion Google";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + target,
        },
      });
      if (error) throw error;
      setStep("verify");
      toast.success("Code envoyé ! Vérifiez votre boîte mail.");
    } catch (err: any) {
      const msg = err?.message ?? "Erreur lors de l'envoi du code";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      toast.success("Connexion réussie !");
    } catch (err: any) {
      const msg = err?.message ?? "Code invalide ou expiré";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface px-6 py-16 text-ink">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2 font-display text-balance text-2xl font-extrabold text-brand"
        >
          <img
            src="/favicon-96x96.png"
            alt="Logo Génizio"
            width="32"
            height="32"
            className="h-8 w-8"
          />
          GÉNIZIO
        </Link>
        <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-xl">
          <h1 className="font-display text-balance text-3xl font-extrabold">
            {step === "initial" ? "Content de vous revoir" : "Vérification"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {step === "initial" 
              ? "Le premier profil enfant est gratuit pour toujours. Créez votre accès et recevez le premier défi sur mesure de votre enfant."
              : "Veuillez entrer le code reçu par email à " + email}
          </p>

          {step === "initial" ? (
            <div className="mt-6 space-y-4">
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Adresse e-mail"
                      required
                      className="w-full rounded-xl border border-ink/10 bg-surface pl-10 pr-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy || !email}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition-all hover:bg-ink/90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Continuer avec l'e-mail"}
                </button>
              </form>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-ink/10"></div>
                <span className="mx-4 flex-shrink-0 text-xs text-ink/40 font-bold uppercase">Ou</span>
                <div className="flex-grow border-t border-ink/10"></div>
              </div>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="press-white flex w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.2 5.2C41 34.5 44 29.7 44 24c0-1.2-.1-2.3-.4-3.5z" />
                </svg>
                Continuer avec Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Code à 6 ou 8 chiffres"
                    required
                    maxLength={8}
                    className="w-full rounded-xl border border-ink/10 bg-surface pl-10 pr-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono font-bold tracking-widest"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || otp.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition-all hover:bg-ink/90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Vérifier le code"}
              </button>
              <button
                type="button"
                onClick={() => setStep("initial")}
                className="w-full text-xs text-ink/60 hover:text-ink font-semibold mt-2"
              >
                Retour
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs font-semibold text-ink/50">
            Gratuit pour commencer • Sans carte bancaire • Annulable à tout moment
          </p>

          <p className="mt-4 text-center text-xs text-ink/60">
            En continuant, vous acceptez nos{" "}
            <Link to="/terms" className="underline hover:text-brand">
              Conditions d'utilisation
            </Link>{" "}
            et notre{" "}
            <Link to="/privacy" className="underline hover:text-brand">
              Politique de confidentialité
            </Link>
            .
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
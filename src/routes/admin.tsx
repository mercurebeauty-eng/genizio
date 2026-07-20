import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { checkAdminStatus } from "@/lib/admin.functions";
import { ShieldAlert } from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const checkAdmin = useServerFn(checkAdminStatus);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Server-side allowlist is the only source of truth for admin status.
    checkAdmin()
      .then(({ isAdmin: isUserAdmin }) => setIsAdmin(isUserAdmin))
      .finally(() => setChecking(false));
  }, [session, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6 text-center">
        <ShieldAlert className="size-16 text-red-500 mb-4" />
        <h1 className="font-display text-2xl font-black text-ink mb-2">Accès Interdit</h1>
        <p className="text-sm text-ink/60 max-w-sm mb-6">
          Vous devez être connecté avec un compte administrateur pour accéder à cet espace.
        </p>
        <button
          onClick={() => navigate({ to: "/profiles" })}
          className="rounded-2xl border-[3px] border-ink bg-white px-6 py-3 font-bold shadow-brutal hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return <Outlet />;
}

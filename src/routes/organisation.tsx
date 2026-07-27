import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/hooks/use-session";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/organisation")({
  component: OrganisationLayout,
});

function OrganisationLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // Affichait une page blanche silencieuse quand non connecté au lieu de rediriger vers /auth
  // (seul écran protégé de l'app à ne pas suivre ce pattern) — invisible tant que cette route
  // n'avait aucun point d'entrée dans la nav, redevenu un vrai piège maintenant que le lien existe.
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-ink flex flex-col">
      <AppHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

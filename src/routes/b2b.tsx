import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/hooks/use-session";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/b2b")({
  component: B2bLayout,
});

function B2bLayout() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!session) {
    return null;
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

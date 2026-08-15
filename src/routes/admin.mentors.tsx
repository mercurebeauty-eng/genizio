import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { AdminMentorsTab } from "@/components/admin/AdminMentorsTab";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/admin/mentors")({
  component: AdminMentorsPage,
});

function AdminMentorsPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <AdminMentorsTab />
      </main>
    </div>
  );
}

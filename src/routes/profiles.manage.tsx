import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import type { ChildProfile } from "@/components/profiles/shared";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/profiles/manage")({
  component: ManageProfilesPage,
});

function ManageProfilesPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<ChildProfile | "new" | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    if (!session) return;
    setFetching(true);
    const { data } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setProfiles((data ?? []) as ChildProfile[]);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const remove = async (id: string) => {
    if (!(await confirmDialog({
      title: "Supprimer ce profil ?",
      description: "Cette action est irréversible et supprimera aussi tout l'historique de défis associé.",
      confirmLabel: "Supprimer",
      variant: "danger",
    }))) return;
    await supabase.from("child_profiles").delete().eq("id", id);
    void refetch();
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/50">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-extrabold md:text-5xl">Mes profils enfants</h1>
            <p className="mt-2 text-ink/60">
              Sauvegardez le questionnaire de chaque enfant pour retrouver ses défis en un clic.
            </p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="rounded-2xl border-[3px] border-ink bg-brand px-6 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
          >
            + Nouveau profil
          </button>
        </div>

        {fetching ? (
          <p className="text-ink/40">Chargement…</p>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-12 text-center shadow-brutal-sm">
            <p className="text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} onEdit={() => setEditing(p)} onDelete={() => remove(p.id)} />
            ))}
          </div>
        )}
      </main>

      {editing && (
        <ProfileDialog
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
          }}
          userId={session.user.id}
        />
      )}
    </div>
  );
}

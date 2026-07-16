import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import type { ChildProfile } from "@/components/profiles/shared";

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
      .order("created_at", { ascending: false });
    setProfiles((data ?? []) as ChildProfile[]);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce profil ?")) return;
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
      <nav className="border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/profiles" className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand">
            <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
            GÉNIZIO
          </Link>
          <Link to="/profiles" className="text-sm font-bold text-brand hover:text-brand-dark">
            ← Retour à l'accueil
          </Link>
        </div>
      </nav>

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
            className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
          >
            + Nouveau profil
          </button>
        </div>

        {fetching ? (
          <p className="text-ink/40">Chargement…</p>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-12 text-center">
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

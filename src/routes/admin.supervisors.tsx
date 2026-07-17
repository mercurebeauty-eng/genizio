import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import {
  listSupervisors,
  assignSupervisor,
  removeSupervisor,
} from "@/lib/supervisors.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/supervisors")({
  component: AdminSupervisorsPage,
});

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "").split(",").map((e: string) => e.trim());

function AdminSupervisorsPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [childProfiles, setChildProfiles] = useState<{ id: string; name: string; age: number }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState("");
  const [childProfileId, setChildProfileId] = useState("");
  const [saving, setSaving] = useState(false);

  const listFn = useServerFn(listSupervisors);
  const assignFn = useServerFn(assignSupervisor);
  const removeFn = useServerFn(removeSupervisor);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    try {
      const data = await listFn();
      setSupervisors((data as any[]) ?? []);
      setForbidden(false);
    } catch {
      setForbidden(true);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    // Charger tous les profils enfants pour le sélecteur
    supabase
      .from("child_profiles")
      .select("id, name, age")
      .order("name")
      .then(({ data }) => setChildProfiles((data ?? []) as any[]));

    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleAssign = async () => {
    if (!email.trim() || !childProfileId) {
      toast.error("Email et profil enfant requis.");
      return;
    }
    setSaving(true);
    try {
      await assignFn({ data: { email: email.trim(), childProfileId } });
      toast.success("Superviseur assigné avec succès !");
      setEmail("");
      setChildProfileId("");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'assignation.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Retirer ce superviseur ?")) return;
    await removeFn({ data: { id } });
    toast.success("Superviseur retiré.");
    void refetch();
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface text-ink/50">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border-[3px] border-ink bg-ink text-white shadow-brutal-sm">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Gestion des Superviseurs</h1>
            <p className="text-sm text-ink/50">Assigner des superviseurs à des profils d'enfants.</p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : forbidden ? (
          <div className="rounded-3xl border-[3px] border-ink bg-white p-10 text-center shadow-brutal">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border-2 border-ink bg-red-50 text-red-500">
              <ShieldAlert className="size-6" />
            </div>
            <p className="font-bold text-ink">Accès réservé à l'administrateur.</p>
            <p className="mt-1 text-sm text-ink/50">
              Ce compte ({session.user.email}) n'est pas autorisé à gérer les superviseurs.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Formulaire d'assignation */}
            <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
              <h2 className="font-display text-lg font-black mb-5">Assigner un nouveau superviseur</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-widest text-ink/50">
                    Email du superviseur
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superviseur@exemple.com"
                    className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-widest text-ink/50">
                    Profil enfant
                  </label>
                  <select
                    value={childProfileId}
                    onChange={(e) => setChildProfileId(e.target.value)}
                    className="w-full rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm cursor-pointer"
                  >
                    <option value="">Sélectionner un enfant…</option>
                    {childProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.age} ans)</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAssign}
                    disabled={saving || !email.trim() || !childProfileId}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-ink py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Assigner
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des superviseurs actuels */}
            <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
              <h2 className="font-display text-lg font-black mb-5">Superviseurs actifs ({supervisors.length})</h2>
              {supervisors.length === 0 ? (
                <p className="text-sm text-ink/50 italic">Aucun superviseur assigné pour le moment.</p>
              ) : (
                <ul className="space-y-3">
                  {supervisors.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-ink">
                          {(s.supervisor as any)?.email ?? "—"}
                        </p>
                        <p className="text-xs text-ink/50">
                          Supervise : {(s.child_profiles as any)?.name ?? "—"} ({(s.child_profiles as any)?.age ?? "?"} ans)
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(s.id)}
                        className="flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

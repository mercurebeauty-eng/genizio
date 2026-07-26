import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listSupervisors,
  assignSupervisor,
  removeSupervisor,
  listChildProfilesAdmin,
} from "@/lib/supervisors.functions";
import { Loader2, Plus, Trash2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export function AdminSupervisorsTab() {
  const { session, loading } = useSession();
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
  const listChildrenFn = useServerFn(listChildProfilesAdmin);

  // Même fix que AdminSeasonsTab/AdminProductsTab : sans en-tête Authorization explicite,
  // requireAdmin s'appuie uniquement sur le repli cookie, qui échoue silencieusement dans
  // certains contextes — c'est très probablement ce qui rendait cet écran (l'endroit même où
  // on associe un superviseur à un enfant) peu fiable.
  const refetch = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setFetching(true);
    try {
      const data = await listFn({ data: undefined, ...opts });
      setSupervisors((data as any[]) ?? []);
      setForbidden(false);
    } catch (err: any) {
      console.error("Error fetching supervisors:", err);
      const isForbidden =
        err?.status === 403 ||
        err?.statusCode === 403 ||
        String(err?.message || "").toLowerCase().includes("forbidden") ||
        String(err?.message || "").includes("403") ||
        String(err?.message || "").includes("Accès refusé");
      if (isForbidden) {
        setForbidden(true);
      } else {
        toast.error("Erreur de chargement des superviseurs.");
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    listChildrenFn({ data: undefined, ...opts })
      .then((data) => setChildProfiles((data as any[]) ?? []))
      .catch((err) => {
        console.error("Erreur chargement profils enfants admin:", err);
        toast.error("Erreur de chargement des profils enfants.");
        setChildProfiles([]);
      });

    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleAssign = async () => {
    if (!email.trim() || !childProfileId) {
      toast.error("Email et profil enfant requis.");
      return;
    }
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setSaving(true);
    try {
      await assignFn({ data: { email: email.trim(), childProfileId }, ...opts });
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
    if (!(await confirmDialog({ title: "Retirer ce superviseur ?", confirmLabel: "Retirer", variant: "danger" }))) return;
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await removeFn({ data: { id }, ...opts });
      toast.success("Superviseur retiré.");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait du superviseur.");
    }
  };

  const supervisedChildIds = new Set(supervisors.map((s) => s.child_profile_id as string));
  const unsupervisedChildProfiles = childProfiles.filter((p) => !supervisedChildIds.has(p.id));
  const supervisedCount = childProfiles.length - unsupervisedChildProfiles.length;

  if (loading || !session) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-ink text-white shadow-md">
          <Users className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-black text-ink">Gestion des Superviseurs</h2>
          <p className="text-sm font-medium text-ink/60">Assigner des superviseurs aux profils d'enfants et cohortes B2B.</p>
        </div>
      </div>

      {fetching ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : forbidden ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border-2 border-ink bg-red-50 text-red-500">
            <ShieldAlert className="size-6" />
          </div>
          <p className="font-bold text-ink">Accès réservé à l'administrateur.</p>
          <p className="mt-1 text-sm text-ink/60">
            Ce compte ({session.user.email}) n'est pas autorisé à gérer les superviseurs.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Formulaire d'assignation */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
            <h3 className="font-display text-balance text-lg font-black mb-5">Assigner un nouveau superviseur</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-widest text-ink/60">
                  Email du superviseur
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superviseur@exemple.com"
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-widest text-ink/60">
                  Profil enfant
                </label>
                <select
                  value={childProfileId}
                  onChange={(e) => setChildProfileId(e.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm cursor-pointer"
                >
                  <option value="">Sélectionner un enfant…</option>
                  {unsupervisedChildProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.age} ans)</option>
                  ))}
                </select>
                {/* Un enfant ne peut avoir qu'un seul superviseur (contrainte base, migration
                    20260726140000) — les enfants déjà supervisés sont donc retirés de la liste
                    plutôt que de laisser l'admin choisir puis échouer sur une erreur en base. */}
                {supervisedCount > 0 && (
                  <p className="mt-1.5 text-[11px] text-ink/50">
                    {supervisedCount} enfant{supervisedCount > 1 ? "s" : ""} déjà supervisé{supervisedCount > 1 ? "s" : ""} — non listé{supervisedCount > 1 ? "s" : ""} ici.
                  </p>
                )}
              </div>
              <div className="flex items-end md:col-span-1">
                <button
                  onClick={handleAssign}
                  disabled={saving || !email.trim() || !childProfileId}
                  className="press-ink w-full flex items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Assigner
                </button>
              </div>
            </div>
          </div>

          {/* Liste des superviseurs actuels */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
            <h3 className="font-display text-balance text-lg font-black mb-5">Superviseurs actifs ({supervisors.length})</h3>
            {supervisors.length === 0 ? (
              <p className="text-sm text-ink/60 italic">Aucun superviseur assigné pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {supervisors.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {(s.supervisor as any)?.email ?? "—"}
                      </p>
                      <p className="text-xs text-ink/60">
                        Supervise : {(s.child_profiles as any)?.name ?? "—"} ({(s.child_profiles as any)?.age ?? "?"} ans)
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(s.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-ink/20 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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
    </div>
  );
}

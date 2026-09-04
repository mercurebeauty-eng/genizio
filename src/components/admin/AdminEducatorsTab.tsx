import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listEducatorsAdmin,
  listEducatorStudentsAdmin,
  revokeAllEducatorAccessAdmin,
  type EducatorAdminRow,
  type EducatorDelegatedStudent,
} from "@/lib/educators-admin.functions";
import { revokeChildDelegation } from "@/lib/delegations.functions";
import {
  GraduationCap,
  Building2,
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Eye,
  Trash2,
  X,
  Calendar,
  PhoneCall,
  Mail,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export function AdminEducatorsTab() {
  const { session } = useSession();
  const [educators, setEducators] = useState<EducatorAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Inspection modal
  const [selectedEducator, setSelectedEducator] = useState<EducatorAdminRow | null>(null);
  const [students, setStudents] = useState<EducatorDelegatedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const listFn = useServerFn(listEducatorsAdmin);
  const listStudentsFn = useServerFn(listEducatorStudentsAdmin);
  const revokeAllFn = useServerFn(revokeAllEducatorAccessAdmin);
  const revokeSingleFn = useServerFn(revokeChildDelegation);

  const loadData = async () => {
    setLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listFn(opts);
      setEducators(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des professionnels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInspectStudents = async (educator: EducatorAdminRow) => {
    setSelectedEducator(educator);
    setLoadingStudents(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listStudentsFn({ data: educator.email, ...opts });
      setStudents(data ?? []);
    } catch (err) {
      toast.error("Erreur de chargement des élèves associés.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRevokeAll = async (educator: EducatorAdminRow) => {
    const confirmed = await confirmDialog({
      title: "⛔ Révoquer tous les accès de ce professionnel ?",
      description: `Attention : tous les élèves (${educator.activeChildrenCount}) délégués à ${educator.name || educator.email} perdront leur accès immédiatement.`,
      confirmLabel: "Révoquer tous les accès",
      variant: "danger",
    });

    if (!confirmed) return;

    setRevoking(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const res = await revokeAllFn({ data: educator.email, ...opts });
      toast.success(`${res.revokedCount} délégation(s) révoquée(s) avec succès.`);
      void loadData();
      if (selectedEducator?.email === educator.email) {
        setSelectedEducator(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation globale.");
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeSingle = async (student: EducatorDelegatedStudent) => {
    const confirmed = await confirmDialog({
      title: "Révoquer l'accès pour cet élève ?",
      description: `Ce professionnel ne pourra plus consulter le profil de ${student.childName}.`,
      confirmLabel: "Révoquer",
      variant: "danger",
    });

    if (!confirmed || !selectedEducator) return;

    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await revokeSingleFn({ data: student.delegationId, ...opts });
      toast.success("Accès élève révoqué.");
      void handleInspectStudents(selectedEducator);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation.");
    }
  };

  const filtered = educators.filter((e) => {
    const matchesSearch =
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.name && e.name.toLowerCase().includes(search.toLowerCase())) ||
      (e.organization && e.organization.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "all" || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalActiveStudents = educators.reduce((acc, curr) => acc + curr.activeChildrenCount, 0);
  const totalSchools = new Set(educators.map((e) => e.organization).filter(Boolean)).size;

  return (
    <div className="space-y-6 text-ink">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-indigo-600 text-white shadow-md">
          <GraduationCap className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-black text-ink">
            Professionnels de l'Éducation & Écoles
          </h2>
          <p className="text-sm font-medium text-ink/60">
            Supervision, gestion des délégations et pouvoir régalien de révocation.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
            Professionnels Référencés
          </p>
          <p className="text-2xl font-black text-ink mt-1">{educators.length}</p>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-900/60">
            Établissements & Écoles
          </p>
          <p className="text-2xl font-black text-indigo-900 mt-1">{totalSchools}</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900/60">
            Élèves Délégués Actifs
          </p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{totalActiveStudents}</p>
        </div>
      </div>

      {/* Barre de filtrage */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="size-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email ou école…"
            className="w-full rounded-2xl border border-ink/10 bg-surface pl-10 pr-4 py-2.5 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
        >
          <option value="all">Tous les rôles ({educators.length})</option>
          <option value="teacher">Enseignants</option>
          <option value="counselor">Conseillers d'orientation</option>
          <option value="psychologist">Psychologues</option>
          <option value="other">Autres éducateurs</option>
        </select>
      </div>

      {/* Liste des professionnels */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-sm">
          <p className="font-bold text-ink">Aucun professionnel trouvé.</p>
          <p className="text-xs text-ink/60 mt-1">
            Les professionnels apparaissent dès qu'un parent ou mentor leur accorde un accès.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((edu) => (
            <div
              key={edu.email}
              className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-200 transition-all"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display font-black text-base text-ink truncate">
                    {edu.name || edu.email}
                  </h4>
                  <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                    {edu.role === "teacher"
                      ? "Enseignant"
                      : edu.role === "counselor"
                        ? "Conseiller"
                        : "Éducateur"}
                  </span>
                  {edu.organization && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink/70 border border-ink/5">
                      <Building2 className="size-3" />
                      {edu.organization}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink/60">
                  <span className="font-medium">{edu.email}</span>
                  <span>·</span>
                  <span>
                    Élèves actifs :{" "}
                    <strong className="text-emerald-700 font-bold">{edu.activeChildrenCount}</strong>{" "}
                    ({edu.totalDelegationsCount} total)
                  </span>
                  {edu.lastAccessedAt && (
                    <>
                      <span>·</span>
                      <span>
                        Dernier accès : {new Date(edu.lastAccessedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Super Admin */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleInspectStudents(edu)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-ink/5 border border-ink/10 font-bold text-xs text-ink cursor-pointer transition-colors"
                >
                  <Eye className="size-3.5" />
                  <span>Élèves suivis ({edu.activeChildrenCount})</span>
                </button>

                {edu.activeChildrenCount > 0 && (
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => void handleRevokeAll(edu)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs text-rose-700 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Ban className="size-3.5" />
                    <span>Révoquer tout</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'inspection détaillée des élèves suivis */}
      {selectedEducator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-ink/5 pb-4">
              <div>
                <span className="rounded-full bg-indigo-100 text-indigo-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Supervision Admin OS
                </span>
                <h3 className="font-display font-black text-xl text-ink mt-1">
                  Élèves rattachés à {selectedEducator.name || selectedEducator.email}
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Établissement : {selectedEducator.organization || "Non spécifié"} ·{" "}
                  {selectedEducator.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEducator(null)}
                className="grid size-9 place-items-center rounded-full hover:bg-ink/5 text-ink/60 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-xs text-ink/50 py-4 italic text-center">
                Aucun élève rattaché à ce professionnel.
              </p>
            ) : (
              <div className="space-y-3">
                {students.map((st) => (
                  <div
                    key={st.delegationId}
                    className="rounded-2xl border border-ink/10 bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{st.childName}</span>
                        {st.childAge && (
                          <span className="text-xs text-ink/40 font-semibold">
                            ({st.childAge} ans)
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            st.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : st.status === "revoked"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {st.status === "active"
                            ? "Actif"
                            : st.status === "revoked"
                              ? "Révoqué"
                              : "Expiré"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-ink/60 text-[11px]">
                        <span>Accordé par : {st.grantedByRole}</span>
                        <span>·</span>
                        <span>
                          Valide jusqu'au {new Date(st.validUntil).toLocaleDateString("fr-FR")}
                        </span>
                        {st.parentPhone && (
                          <>
                            <span>·</span>
                            <span>Tél parent : {st.parentPhone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {st.status === "active" && (
                      <button
                        type="button"
                        onClick={() => void handleRevokeSingle(st)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                        title="Révoquer cet élève"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

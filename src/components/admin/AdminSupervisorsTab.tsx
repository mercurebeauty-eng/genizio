import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listSupervisorsAdmin,
  assignSupervisor,
  assignSupervisorToCampaignAdmin,
  removeSupervisor,
  listChildProfilesAdmin,
  listCampaignsLightAdmin,
  type SupervisorGroup,
} from "@/lib/supervisors.functions";
import { AdminPagination } from "./AdminPagination";
import {
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  Users,
  Search,
  Building2,
  GraduationCap,
  X,
  UserPlus,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

// Refonte « Gestion des Superviseurs » (2026-08-14) — répond aux trois manques signalés :
//   • « on ne sait pas comment ça fonctionne » → encadré « Comment ça marche » ci-dessous ;
//   • « comment assigne-t-on directement à une campagne ? » → bouton primaire qui ouvre la
//     modale d'assignation PAR CAMPAGNE (assignSupervisorToCampaignAdmin), l'admin Génizio
//     n'avait jusqu'ici que l'assignation enfant-par-enfant ;
//   • « ingénierie zéro » → liste GROUPÉE par superviseur, PAGINÉE, avec recherche par
//     email et filtre par campagne (l'ancienne liste plate chargeait toute la table).
export function AdminSupervisorsTab() {
  const { session, loading } = useSession();
  const [groups, setGroups] = useState<SupervisorGroup[]>([]);
  const [childProfiles, setChildProfiles] = useState<{ id: string; name: string; age: number }[]>(
    [],
  );
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

  const listFn = useServerFn(listSupervisorsAdmin);
  const removeFn = useServerFn(removeSupervisor);
  const listChildrenFn = useServerFn(listChildProfilesAdmin);
  const listCampaignsFn = useServerFn(listCampaignsLightAdmin);

  // Sans ce délai, chaque frappe déclencherait une requête serveur complète (même
  // pattern que AdminCampaignsTab).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Revenir en page 1 dès qu'un filtre change : rester en page 3 d'un résultat qui n'en
  // compte plus qu'une afficherait une grille vide sans expliquer pourquoi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, campaignFilter]);

  const refetch = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setFetching(true);
    try {
      const data = await listFn({
        data: {
          page,
          pageSize: 20,
          search: debouncedSearch || undefined,
          campaignId: campaignFilter || undefined,
        },
        ...opts,
      });
      setGroups((data as any)?.data ?? []);
      setTotal((data as any)?.total ?? 0);
      setTotalPages((data as any)?.totalPages ?? 1);
      setForbidden(false);
    } catch (err: any) {
      console.error("Error fetching supervisors:", err);
      const isForbidden =
        err?.status === 403 ||
        err?.statusCode === 403 ||
        String(err?.message || "")
          .toLowerCase()
          .includes("forbidden") ||
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
        setChildProfiles([]);
      });
    listCampaignsFn({ data: undefined, ...opts })
      .then((data) => setCampaigns((data as any[]) ?? []))
      .catch((err) => {
        console.error("Erreur chargement campagnes admin:", err);
        setCampaigns([]);
      });

    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, debouncedSearch, campaignFilter, page]);

  const handleRemove = async (assignmentId: string, childName: string) => {
    if (
      !(await confirmDialog({
        title: "Retirer ce superviseur ?",
        description: `L'assignation de « ${childName} » sera supprimée. L'enfant pourra recevoir un nouveau superviseur.`,
        confirmLabel: "Retirer",
        variant: "danger",
      }))
    )
      return;
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await removeFn({ data: { id: assignmentId }, ...opts });
      toast.success("Superviseur retiré.");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait du superviseur.");
    }
  };

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
          <p className="text-sm font-medium text-ink/60">
            Assigner des superviseurs aux profils d'enfants et cohortes B2B.
          </p>
        </div>
      </div>

      {/* « Comment ça marche » (2026-08-14) — le fonctionnement du système n'était documenté
          nulle part : un compte devient superviseur quand un admin (enfant par enfant) ou un
          gestionnaire de campagne (par cohorte) lui assigne des enfants. Le quota de 5 enfants
          par superviseur (« 5 par 5 », décision 2026-08-08) est appliqué en base par le trigger
          check_supervisor_quota. */}
      <div className="rounded-3xl border border-sky-200/70 bg-sky-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <Info className="size-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-sky-900 leading-relaxed space-y-1">
            <p className="font-black text-sky-800">Comment ça marche</p>
            <p>
              Un compte devient superviseur quand on lui <strong>assigne des enfants</strong> — par
              un admin (assignation enfant par enfant) ou par un gestionnaire de campagne
              (assignation de toute la cohorte, ici aussi possible via « Assigner à une campagne »).
              Le superviseur voit alors ces enfants dans son tableau de bord{" "}
              <code className="font-mono">/supervisor</code>.
            </p>
            <p>
              <strong>Quota :</strong> un superviseur suit au maximum <strong>5 enfants</strong>{" "}
              (plancher grand-péré 5, sinon 1 + suppléments payés, plafond absolu 5 — « 5 par 5 »).
              Au-delà, assigner un 2ᵉ superviseur.
            </p>
          </div>
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
        <div className="space-y-6">
          {/* Barre d'actions : recherche + filtre campagne + assignation */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-[14rem]">
              <Search className="size-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un superviseur par email…"
                aria-label="Rechercher un superviseur"
                className="w-full rounded-2xl border border-ink/10 bg-surface pl-9 pr-4 py-2.5 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              aria-label="Filtrer par campagne"
              className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="">Toutes les campagnes</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand/90 transition-colors cursor-pointer"
            >
              <UserPlus className="size-4" />
              <span>Assigner à une campagne</span>
            </button>
          </div>

          {/* Liste groupée par superviseur */}
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-xl">
              <Users className="size-12 text-ink/20 mx-auto mb-4" />
              <p className="font-bold text-ink">
                {debouncedSearch || campaignFilter ? "Aucun résultat" : "Aucun superviseur assigné"}
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {debouncedSearch || campaignFilter
                  ? "Aucun superviseur ne correspond à ces critères."
                  : "Assignez des enfants ou une cohorte de campagne pour créer des superviseurs."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div
                  key={g.supervisor_user_id}
                  className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand to-indigo-600 text-white font-black text-sm shrink-0">
                        {(g.email.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{g.email}</p>
                        <p className="text-xs text-ink/60">
                          {g.totalChildren} enfant{g.totalChildren > 1 ? "s" : ""} suivi
                          {g.totalChildren > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-2 rounded-full bg-surface overflow-hidden border border-ink/5">
                          <div
                            className="h-full bg-gradient-to-r from-brand to-indigo-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (g.totalChildren / Math.max(1, g.quota)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            g.totalChildren >= g.quota
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {g.totalChildren} / {g.quota}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {g.children.map((child) => (
                      <li
                        key={child.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-surface px-4 py-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-ink truncate">
                            {child.child_name}
                            {child.child_age != null ? (
                              <span className="text-ink/40 font-medium">
                                {" "}
                                ({child.child_age} ans)
                              </span>
                            ) : null}
                          </span>
                          {child.campaign_name && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand shrink-0">
                              <Building2 className="size-3" />
                              {child.campaign_name}
                            </span>
                          )}
                          {!child.campaign_name && (
                            <span className="rounded-full border border-ink/10 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink/50 shrink-0">
                              Hors campagne
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => void handleRemove(child.id, child.child_name)}
                          className="flex items-center gap-1.5 rounded-xl border border-ink/20 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={20}
            onPageChange={setPage}
            label="superviseur"
          />
        </div>
      )}

      {isAssignModalOpen && (
        <AssignSupervisorModal
          campaigns={campaigns}
          childProfiles={childProfiles}
          supervisedChildIds={
            new Set(groups.flatMap((g) => g.children.map((c) => c.child_profile_id)))
          }
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

// Modale d'assignation à deux modes (2026-08-14) :
//   • « Campagne » (primaire) : campagne + email + nombre d'enfants → le système pioche
//     automatiquement dans la cohorte parmi les enfants sans superviseur ;
//   • « Enfant précis » (secondaire) : l'assignation historique email + profil enfant.
function AssignSupervisorModal({
  campaigns,
  childProfiles,
  supervisedChildIds,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  childProfiles: { id: string; name: string; age: number }[];
  /** Enfants déjà supervisés — non listés dans le mode « enfant précis » (contrainte
   *  UNIQUE child_profile_id, mieux vaut ne pas les proposer du tout). */
  supervisedChildIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { session } = useSession();
  const [mode, setMode] = useState<"campaign" | "child">("campaign");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode campagne
  const [campaignId, setCampaignId] = useState("");
  const [email, setEmail] = useState("");
  const [count, setCount] = useState(5);

  // Mode enfant
  const [childEmail, setChildEmail] = useState("");
  const [childProfileId, setChildProfileId] = useState("");

  const assignCampaignFn = useServerFn(assignSupervisorToCampaignAdmin);
  const assignChildFn = useServerFn(assignSupervisor);

  const opts = () =>
    session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};

  const unsupervisedChildProfiles = childProfiles.filter((p) => !supervisedChildIds.has(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "campaign") {
        if (!campaignId || !email.trim()) {
          toast.error("Campagne et email du superviseur requis.");
          return;
        }
        const res = await assignCampaignFn({
          data: { campaignId, supervisorEmail: email.trim(), count },
          ...opts(),
        });
        toast.success(
          `${res.assignedCount} enfant(s) confié(s) à ${email.trim()} sur cette campagne !`,
        );
      } else {
        if (!childEmail.trim() || !childProfileId) {
          toast.error("Email et profil enfant requis.");
          return;
        }
        await assignChildFn({
          data: { email: childEmail.trim(), childProfileId },
          ...opts(),
        });
        toast.success("Superviseur assigné avec succès !");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'assignation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
            <UserPlus className="size-6 text-brand" />
            Assigner un superviseur
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-1.5 mb-5 bg-surface rounded-2xl p-1.5">
          {(["campaign", "child"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer " +
                (mode === m ? "bg-ink text-white shadow-sm" : "text-ink/60 hover:bg-white/70")
              }
            >
              {m === "campaign" ? (
                <>
                  <Building2 className="size-3.5 inline mr-1 -mt-0.5" />À une campagne
                </>
              ) : (
                <>
                  <GraduationCap className="size-3.5 inline mr-1 -mt-0.5" />À un enfant précis
                </>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "campaign" ? (
            <>
              <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
                L'application confie automatiquement des enfants de la cohorte qui n'ont encore
                aucun superviseur — jusqu'au nombre demandé, dans la limite du quota du superviseur
                (5 enfants max, « 5 par 5 »).
              </p>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Campagne
                </label>
                <select
                  required
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                >
                  <option value="">Sélectionner une campagne…</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Email du superviseur (compte Génizio)
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superviseur@ong.org"
                  className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Nombre d'enfants à confier (max 5)
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={5}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))
                  }
                  className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
                Assignation historique : choisissez précisément l'enfant que ce superviseur devra
                suivre (l'enfant déjà supervisé n'est pas listé).
              </p>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Email du superviseur
                </label>
                <input
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="superviseur@exemple.com"
                  className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Profil enfant
                </label>
                <select
                  value={childProfileId}
                  onChange={(e) => setChildProfileId(e.target.value)}
                  className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                >
                  <option value="">Sélectionner un enfant…</option>
                  {unsupervisedChildProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age} ans)
                    </option>
                  ))}
                </select>
                {supervisedChildIds.size > 0 && (
                  <p className="mt-1.5 text-[11px] text-ink/50">
                    {supervisedChildIds.size} enfant{supervisedChildIds.size > 1 ? "s" : ""} déjà
                    supervisé{supervisedChildIds.size > 1 ? "s" : ""} — non listé
                    {supervisedChildIds.size > 1 ? "s" : ""} ici.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4 border-t border-ink/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : mode === "campaign" ? (
                <Plus className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              <span>{mode === "campaign" ? "Assigner à la campagne" : "Assigner"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

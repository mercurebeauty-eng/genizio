import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listMentorsAdmin,
  assignMentor,
  assignMentorToCampaignAdmin,
  removeMentor,
  updateMentorStatusAdmin,
  listChildProfilesAdmin,
  listCampaignsLightAdmin,
  listMentorSessionsAdmin,
  approveMentorSessionAdmin,
  markMentorSessionsPaidAdmin,
  type MentorGroup,
} from "@/lib/mentors.functions";
import { formatXof } from "@/lib/pricing";
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
  Ban,
  RotateCcw,
  ListChecks,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

// Refonte « Gestion des Mentors » (2026-08-14) — répond aux trois manques signalés :
//   • « on ne sait pas comment ça fonctionne » → encadré « Comment ça marche » ci-dessous ;
//   • « comment assigne-t-on directement à une campagne ? » → bouton primaire qui ouvre la
//     modale d'assignation PAR CAMPAGNE (assignMentorToCampaignAdmin), l'admin Génizio
//     n'avait jusqu'ici que l'assignation enfant-par-enfant ;
//   • « ingénierie zéro » → liste GROUPÉE par mentor, PAGINÉE, avec recherche par
//     email et filtre par campagne (l'ancienne liste plate chargeait toute la table).
export function AdminMentorsTab() {
  const { session, loading } = useSession();
  const [groups, setGroups] = useState<MentorGroup[]>([]);
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

  const listFn = useServerFn(listMentorsAdmin);
  const removeFn = useServerFn(removeMentor);
  const listChildrenFn = useServerFn(listChildProfilesAdmin);
  const listCampaignsFn = useServerFn(listCampaignsLightAdmin);
  const listSessionsFn = useServerFn(listMentorSessionsAdmin);
  const approveSessionFn = useServerFn(approveMentorSessionAdmin);
  const markPaidFn = useServerFn(markMentorSessionsPaidAdmin);

  // Ledger payout (Vague C) : séances d'un mentor + actions Approuver / Marquer payé.
  const [payoutModalFor, setPayoutModalFor] = useState<string | null>(null);
  const [sessionsRows, setSessionsRows] = useState<
    Array<{
      id: string;
      child_name: string;
      occurred_at: string;
      status: string;
      funding: string;
      payout_xof: number;
    }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [markingPaidFor, setMarkingPaidFor] = useState<string | null>(null);

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
      console.error("Error fetching mentors:", err);
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
        toast.error("Erreur de chargement des mentors.");
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
        title: "Retirer ce mentor ?",
        description: `L'assignation de « ${childName} » sera supprimée. L'enfant pourra recevoir un nouveau mentor.`,
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
      toast.success("Mentor retiré.");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait du mentor.");
    }
  };

  // Système de confiance (V1) : suspendre/bannir/restaurer un compte mentor — le ban
  // est structurel : un mentor banni ne reçoit plus d'assignation ni ne peut déclarer
  // de séance (vérifié dans insertMentorAssignments et declareSessionMentor).
  const updateStatusFn = useServerFn(updateMentorStatusAdmin);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handleUpdateStatus = async (mentorUserId: string, status: string) => {
    const label =
      status === "banned"
        ? "Bannir"
        : status === "suspended"
          ? "Suspendre"
          : status === "warning"
            ? "Avertir"
            : "Restaurer";
    const isRestore = status === "active";
    if (
      !(await confirmDialog({
        title: `${label} ce mentor ?`,
        description: isRestore
          ? "Le mentor retrouve son accès : il peut de nouveau recevoir des assignations et déclarer des séances."
          : status === "banned"
            ? "Banni, le mentor perd tout accès : plus d'assignation, plus de déclaration de séance. Ses enfants deviennent réassignables."
            : status === "suspended"
              ? "Suspendu, le mentor est bloqué temporairement : plus d'assignation ni de déclaration, mais ses enfants restent assignés."
              : "Avertissement : le mentor garde son accès, mais son statut est signalé à l'équipe et aux organisations.",
        confirmLabel: label,
        variant: status === "banned" ? "danger" : "default",
      }))
    )
      return;
    setUpdatingStatusId(mentorUserId);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await updateStatusFn({ data: { mentorUserId, status }, ...opts });
      toast.success(
        `Mentor ${isRestore ? "restauré" : label.toLowerCase()} — statut mis à jour.`,
      );
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ── Ledger payout (Vague C) ───────────────────────────────────────────────────
  const openPayoutModal = async (mentorUserId: string) => {
    setPayoutModalFor(mentorUserId);
    setSessionsLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const rows = await listSessionsFn({ data: { mentorUserId }, ...opts });
      setSessionsRows((rows as any[]) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement des séances.");
      setPayoutModalFor(null);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await approveSessionFn({ data: { sessionId }, ...opts });
      toast.success("Séance approuvée — elle entre dans le payout dû.");
      if (payoutModalFor) void openPayoutModal(payoutModalFor);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation.");
    }
  };

  const handleMarkPaid = async (mentorUserId: string) => {
    if (
      !(await confirmDialog({
        title: "Marquer le payout comme payé ?",
        description:
          "Confirmez après avoir viré le mentor (WhatsApp/Mobile Money). Les séances approuvées passent en « payé » — cette action n'est pas réversible.",
        confirmLabel: "Marquer payé",
        variant: "default",
      }))
    )
      return;
    setMarkingPaidFor(mentorUserId);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      const res = await markPaidFn({ data: { mentorUserId }, ...opts });
      toast.success(
        `${(res as any)?.paidCount ?? 0} séance(s) marquée(s) payée(s) — payout soldé.`,
      );
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du paiement.");
    } finally {
      setMarkingPaidFor(null);
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
          <h2 className="text-xl font-display font-black text-ink">Gestion des Mentors</h2>
          <p className="text-sm font-medium text-ink/60">
            Assigner des mentors aux profils d'enfants et cohortes B2B.
          </p>
        </div>
      </div>

      {/* « Comment ça marche » (2026-08-14) — le fonctionnement du système n'était documenté
          nulle part : un compte devient mentor quand un admin (enfant par enfant) ou un
          gestionnaire de campagne (par cohorte) lui assigne des enfants. Le quota de 5 enfants
          par mentor (« 5 par 5 », décision 2026-08-08) est appliqué en base par le trigger
          check_mentor_quota. */}
      <div className="rounded-3xl border border-sky-200/70 bg-sky-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <Info className="size-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-sky-900 leading-relaxed space-y-1">
            <p className="font-black text-sky-800">Comment ça marche</p>
            <p>
              Un compte devient mentor quand on lui <strong>assigne des enfants</strong> — par
              un admin (assignation enfant par enfant) ou par un gestionnaire de campagne
              (assignation de toute la cohorte, ici aussi possible via « Assigner à une campagne »).
              Le mentor voit alors ces enfants dans son tableau de bord{" "}
              <code className="font-mono">/mentor</code>.
            </p>
            <p>
              <strong>Quota :</strong> un mentor suit au maximum <strong>5 enfants</strong>{" "}
              (plancher grand-péré 5, sinon 1 + suppléments payés, plafond absolu 5 — « 5 par 5 »).
              Au-delà, assigner un 2ᵉ mentor.
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
            Ce compte ({session.user.email}) n'est pas autorisé à gérer les mentors.
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
                placeholder="Rechercher un mentor par email…"
                aria-label="Rechercher un mentor"
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

          {/* Liste groupée par mentor */}
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-xl">
              <Users className="size-12 text-ink/20 mx-auto mb-4" />
              <p className="font-bold text-ink">
                {debouncedSearch || campaignFilter ? "Aucun résultat" : "Aucun mentor assigné"}
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {debouncedSearch || campaignFilter
                  ? "Aucun mentor ne correspond à ces critères."
                  : "Assignez des enfants ou une cohorte de campagne pour créer des mentors."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div
                  key={g.mentor_user_id}
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
                        {/* Score de fiabilité (V1) + statut : le quota ne dit plus rien de la
                            qualité — le score (séances déclarées + progression) et le statut
                            (ban/suspension) sont les vrais signaux. */}
                        <span
                          title="Score de fiabilité (séances tenues + progression des enfants)"
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            g.score >= 75
                              ? "bg-emerald-100 text-emerald-700"
                              : g.score >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {g.score}/100
                        </span>
                        {g.status !== "active" && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              g.status === "banned"
                                ? "bg-rose-600 text-white"
                                : g.status === "suspended"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {g.status === "banned"
                              ? "Banni"
                              : g.status === "suspended"
                                ? "Suspendu"
                                : "Averti"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions de statut (V1) : suspendre/bannir/restaurer le compte mentor. */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {g.status === "banned" ? (
                      <button
                        onClick={() => void handleUpdateStatus(g.mentor_user_id, "active")}
                        disabled={updatingStatusId === g.mentor_user_id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {updatingStatusId === g.mentor_user_id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Restaurer
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => void handleUpdateStatus(g.mentor_user_id, "suspended")}
                          disabled={updatingStatusId === g.mentor_user_id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Suspendre
                        </button>
                        <button
                          onClick={() => void handleUpdateStatus(g.mentor_user_id, "banned")}
                          disabled={updatingStatusId === g.mentor_user_id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Ban className="size-3.5" />
                          Bannir
                        </button>
                      </>
                    )}
                  </div>

                  {/* Ledger payout (Vague C) : dû des séances approuvées + gestion. */}
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                        Payout dû
                      </p>
                      <p className="text-sm font-black text-emerald-900">
                        {formatXof(g.duePayoutXof)}
                        <span className="ml-1.5 text-[11px] font-bold text-emerald-700/70">
                          ({g.approvedSessions} séance{g.approvedSessions > 1 ? "s" : ""} approuvée
                          {g.approvedSessions > 1 ? "s" : ""})
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => void openPayoutModal(g.mentor_user_id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
                    >
                      <ListChecks className="size-3.5" />
                      Séances
                    </button>
                    {g.approvedSessions > 0 && (
                      <button
                        onClick={() => void handleMarkPaid(g.mentor_user_id)}
                        disabled={markingPaidFor === g.mentor_user_id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {markingPaidFor === g.mentor_user_id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Banknote className="size-3.5" />
                        )}
                        Marquer payé
                      </button>
                    )}
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
            label="mentor"
          />
        </div>
      )}

      {isAssignModalOpen && (
        <AssignMentorModal
          campaigns={campaigns}
          childProfiles={childProfiles}
          mentoredChildIds={
            new Set(groups.flatMap((g) => g.children.map((c) => c.child_profile_id)))
          }
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            void refetch();
          }}
        />
      )}

      {/* Modal ledger payout (Vague C) : les séances du mentor + approbation. */}
      {payoutModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-4">
              <div>
                <h3 className="font-display text-balance text-xl font-black text-ink">
                  Séances & Payout
                </h3>
                <p className="text-sm text-ink/60 mt-0.5">
                  Approuvez les séances déclarées — elles entrent dans le payout dû (70% × séance =
                  3 500 F). Le funding (pack/campagne) est indicatif.
                </p>
              </div>
              <button
                onClick={() => setPayoutModalFor(null)}
                className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {sessionsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-7 animate-spin text-brand" />
              </div>
            ) : sessionsRows.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-ink/50">
                Aucune séance déclarée pour ce mentor.
              </p>
            ) : (
              <ul className="space-y-2">
                {sessionsRows.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{s.child_name}</p>
                      <p className="text-[11px] font-semibold text-ink/50">
                        {new Date(s.occurred_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {formatXof(s.payout_xof)} ·{" "}
                        {s.funding === "pack"
                          ? "Pack"
                          : s.funding === "campaign"
                            ? "Campagne"
                            : "Sans financement"}
                      </p>
                    </div>
                    {s.status === "declared" ? (
                      <button
                        onClick={() => void handleApproveSession(s.id)}
                        className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90 transition-all cursor-pointer"
                      >
                        Approuver
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          s.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {s.status === "paid" ? "Payé" : "Approuvé"}
                      </span>
                    )}
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

// Modale d'assignation à deux modes (2026-08-14) :
//   • « Campagne » (primaire) : campagne + email + nombre d'enfants → le système pioche
//     automatiquement dans la cohorte parmi les enfants sans mentor ;
//   • « Enfant précis » (secondaire) : l'assignation historique email + profil enfant.
function AssignMentorModal({
  campaigns,
  childProfiles,
  mentoredChildIds,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  childProfiles: { id: string; name: string; age: number }[];
  /** Enfants déjà accompagnés — non listés dans le mode « enfant précis » (contrainte
   *  UNIQUE child_profile_id, mieux vaut ne pas les proposer du tout). */
  mentoredChildIds: Set<string>;
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

  const assignCampaignFn = useServerFn(assignMentorToCampaignAdmin);
  const assignChildFn = useServerFn(assignMentor);

  const opts = () =>
    session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};

  const unmentoredChildProfiles = childProfiles.filter((p) => !mentoredChildIds.has(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "campaign") {
        if (!campaignId || !email.trim()) {
          toast.error("Campagne et email du mentor requis.");
          return;
        }
        const res = await assignCampaignFn({
          data: { campaignId, mentorEmail: email.trim(), count },
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
        toast.success("Mentor assigné avec succès !");
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
            Assigner un mentor
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
                aucun mentor — jusqu'au nombre demandé, dans la limite du quota du mentor
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
                  Email du mentor (compte Génizio)
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mentor@ong.org"
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
                Assignation historique : choisissez précisément l'enfant que ce mentor devra
                suivre (l'enfant déjà accompagné n'est pas listé).
              </p>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                  Email du mentor
                </label>
                <input
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="mentor@exemple.com"
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
                  {unmentoredChildProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age} ans)
                    </option>
                  ))}
                </select>
                {mentoredChildIds.size > 0 && (
                  <p className="mt-1.5 text-[11px] text-ink/50">
                    {mentoredChildIds.size} enfant{mentoredChildIds.size > 1 ? "s" : ""} déjà
                    accompagné{mentoredChildIds.size > 1 ? "s" : ""} — non listé
                    {mentoredChildIds.size > 1 ? "s" : ""} ici.
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

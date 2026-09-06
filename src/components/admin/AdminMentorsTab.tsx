import { Fragment, useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listMentorsAdmin,
  assignMentorToCampaignAdmin,
  removeMentor,
  updateMentorStatusAdmin,
  updateMentorCategoryAdmin,
  searchParentsAdmin,
  getChildrenOfParentAdmin,
  searchMentorsAdmin,
  assignMentorToChildAdmin,
  generateMentorActivationCodesAdmin,
  listMentorActivationCodesAdmin,
  listCampaignsLightAdmin,
  listCampaignCohortAdmin,
  listMentorSessionsAdmin,
  approveMentorSessionAdmin,
  markMentorSessionsPaidAdmin,
  type MentorGroup,
  type ParentSearchResult,
  type ChildOfParentResult,
  type MentorSearchResult,
  type MentorActivationCodeRow,
  type CampaignCohortChild,
} from "@/lib/mentors.functions";
import type { MentorCategory } from "@/lib/mentor-safeguards";
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
  KeyRound,
  HeartHandshake,
  Phone,
  Stethoscope,
  Tent,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { AdminSafeguardingAudits } from "./AdminSafeguardingAudits";
import { AdminSafetyReports } from "./AdminSafetyReports";
import { getSafeguardingPendingCountAdmin } from "@/lib/safeguarding.functions";
import { listSquadsAdmin, upsertSquadAdmin } from "@/lib/saturday-clubs.functions";

// Bandeau qui sépare l'annuaire en deux cadres : Pro (Clinique) d'abord, Soutien (Club) ensuite.
function MentorSectionHeader({
  category,
  mentors,
}: {
  category: "pro" | "support";
  mentors: number;
}) {
  const isSupport = category === "support";
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
        isSupport ? "border-sky-300 bg-sky-50" : "border-purple-300 bg-purple-50"
      }`}
    >
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${
          isSupport ? "bg-sky-500" : "bg-purple-500"
        }`}
      >
        {isSupport ? <Tent className="size-4" /> : <Stethoscope className="size-4" />}
      </div>
      <div className="min-w-0">
        <p
          className={`font-display text-sm font-black uppercase tracking-wider ${
            isSupport ? "text-sky-900" : "text-purple-900"
          }`}
        >
          {isSupport
            ? "Mentors de Soutien — Clubs du Samedi"
            : "Mentors Pro — Superviseurs Cliniques"}
        </p>
        <p
          className={`text-[11px] font-semibold ${
            isSupport ? "text-sky-700/80" : "text-purple-700/80"
          }`}
        >
          {isSupport
            ? "Escouades de 6 à 8 enfants · 10 000 F / mois / enfant · 70 % mentor"
            : "Remédiation 1-on-1 · ≤ 5 enfants · 15 000 F / séance · 70 % mentor (10 500 F)"}
        </p>
      </div>
      <span
        className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
          isSupport ? "bg-sky-100 text-sky-800" : "bg-purple-100 text-purple-800"
        }`}
      >
        {mentors} mentor{mentors > 1 ? "s" : ""}
      </span>
    </div>
  );
}

export interface AdminMentorsTabProps {
  onDataChanged?: () => void | Promise<void>;
  onPendingCountChange?: (count: number) => void;
  isRefreshing?: boolean;
}

// Refonte « Gestion des Mentors » (2026-08-14) — répond aux trois manques signalés :
//   • « on ne sait pas comment ça fonctionne » → encadré « Comment ça marche » ci-dessous ;
//   • « comment assigne-t-on directement à une campagne ? » → bouton primaire qui ouvre la
//     modale d'assignation PAR CAMPAGNE (assignMentorToCampaignAdmin), l'admin Génizio
//     n'avait jusqu'ici que l'assignation enfant-par-enfant ;
//   • « ingénierie zéro » → liste GROUPÉE par mentor, PAGINÉE, avec recherche par
//     email et filtre par campagne (l'ancienne liste plate chargeait toute la table).
export function AdminMentorsTab({
  onDataChanged,
  onPendingCountChange,
  isRefreshing: parentRefreshing = false,
}: AdminMentorsTabProps = {}) {
  const { session, loading } = useSession();
  const [groups, setGroups] = useState<MentorGroup[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [mentorSubTab, setMentorSubTab] = useState<"directory" | "audits" | "safety">("directory");
  const [openReportsCount, setOpenReportsCount] = useState(0);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  // Escouades (deux-modèles) : modal dédié pour le cadre Soutien.
  const [squadModalFor, setSquadModalFor] = useState<MentorGroup | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

  const listFn = useServerFn(listMentorsAdmin);
  const removeFn = useServerFn(removeMentor);
  const getSafetyCountFn = useServerFn(getSafeguardingPendingCountAdmin);
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

  // Codes d'activation Mentor (Vague 5, spec §7) : self-service par code.
  const generateCodesFn = useServerFn(generateMentorActivationCodesAdmin);
  const listCodesFn = useServerFn(listMentorActivationCodesAdmin);
  const [codes, setCodes] = useState<MentorActivationCodeRow[]>([]);
  const [codesTotal, setCodesTotal] = useState(0);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  // Deux modèles : chaque code porte la catégorie qu'il activera chez le mentor.
  const [codeCategory, setCodeCategory] = useState<MentorCategory>("pro");
  const [codeValidDays, setCodeValidDays] = useState<string>("");

  const loadCodes = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    const res = await listCodesFn({ data: undefined, ...opts }).catch(() => null);
    if (res) {
      setCodes(res.codes);
      setCodesTotal(res.total);
    }
  };

  const handleGenerateCodes = async (count: number) => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setGeneratingCodes(true);
    try {
      const res = await generateCodesFn({
        data: {
          count,
          category: codeCategory,
          validDays: codeValidDays ? Number(codeValidDays) : undefined,
        },
        ...opts,
      });
      toast.success(
        `${res.codes.length} code(s) ${codeCategory === "pro" ? "PRO" : "CLUB"} généré(s) — transmettez-les aux futurs mentors.`,
      );
      await loadCodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération des codes.");
    } finally {
      setGeneratingCodes(false);
    }
  };

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

  const refreshSilently = useCallback(async () => {
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};

      const [data, safetyCountRes] = await Promise.all([
        listFn({
          data: {
            page,
            pageSize: 20,
            search: debouncedSearch || undefined,
            campaignId: campaignFilter || undefined,
          },
          ...opts,
        }).catch(() => null),
        getSafetyCountFn({ data: undefined, ...opts }).catch(() => null),
      ]);

      if (data) {
        setGroups((data as any)?.data ?? []);
        setTotal((data as any)?.total ?? 0);
        setTotalPages((data as any)?.totalPages ?? 1);
        setForbidden(false);
      }
      if (safetyCountRes) {
        setOpenReportsCount(safetyCountRes.openReportsCount);
        onPendingCountChange?.(safetyCountRes.openReportsCount);
      }
    } catch (e) {
      console.error("Erreur actualisation silencieuse mentors:", e);
    }
  }, [
    listFn,
    getSafetyCountFn,
    page,
    debouncedSearch,
    campaignFilter,
    session,
    onPendingCountChange,
  ]);

  useEffect(() => {
    if (!session) return;
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    listCampaignsFn({ data: undefined, ...opts })
      .then((data) => setCampaigns((data as any[]) ?? []))
      .catch((err) => {
        console.error("Erreur chargement campagnes admin:", err);
        setCampaigns([]);
      });

    getSafetyCountFn({ data: undefined, ...opts })
      .then((res) => {
        setOpenReportsCount(res?.openReportsCount ?? 0);
        onPendingCountChange?.(res?.openReportsCount ?? 0);
      })
      .catch(() => {});

    void loadCodes();

    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, debouncedSearch, campaignFilter, page]);

  useEffect(() => {
    // Import dynamique (le reste du fichier le fait déjà pour les broadcasts) —
    // le canal est créé APRÈS le chargement du module ; au démontage, si le
    // module n'est pas encore chargé, rien à nettoyer (jamais souscrit).
    let cancelled = false;
    let channel: import("@supabase/supabase-js").RealtimeChannel | null = null;
    let client: typeof import("@/integrations/supabase/client").supabase | null = null;
    void (async () => {
      const mod = await import("@/integrations/supabase/client");
      if (cancelled) return;
      client = mod.supabase;
      channel = mod.supabase.channel("admin-mentors-tab-sync");
      channel
        .on("broadcast", { event: "safeguarding_updated" }, () => {
          void refreshSilently();
          void onDataChanged?.();
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "child_safety_reports" },
          () => {
            void refreshSilently();
            void onDataChanged?.();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "child_safety_audits" },
          () => {
            void refreshSilently();
            void onDataChanged?.();
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel && client) void client.removeChannel(channel);
    };
  }, [session, refreshSilently, onDataChanged]);

  const broadcastMentorUpdate = useCallback(async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const channel = supabase.channel("admin-mentors-tab-sync");
      void channel.send({
        type: "broadcast",
        event: "safeguarding_updated",
        payload: { timestamp: Date.now() },
      });
    } catch (e) {}
    void onDataChanged?.();
  }, [onDataChanged]);

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
      void refreshSilently();
      void broadcastMentorUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait du mentor.");
    }
  };

  // Système de confiance (V1) : suspendre/bannir/restaurer un compte mentor — le ban
  // est structurel : un mentor banni ne reçoit plus d'assignation ni ne peut déclarer
  // de séance (vérifié dans insertMentorAssignments et declareSessionMentor).
  const updateStatusFn = useServerFn(updateMentorStatusAdmin);
  const updateCategoryFn = useServerFn(updateMentorCategoryAdmin);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Bascule du modèle d'un mentor (deux-modèles) : Pro (1-on-1) ↔ Soutien (escouades).
  const handleUpdateCategory = async (mentorUserId: string, category: MentorCategory) => {
    const label = category === "support" ? "Mentor de Soutien (Club du Samedi)" : "Mentor Pro (Clinique)";
    if (
      !(await confirmDialog({
        title: `Basculer en ${label} ?`,
        description:
          category === "support"
            ? "Ce mentor ne pourra plus recevoir d'enfants en 1-on-1 : il animera des escouades de 6 à 8 enfants (Clubs du Samedi). Ses enfants actifs devront être retirés au préalable."
            : "Ce mentor redevient Superviseur Clinique : suivi 1-on-1, quota ≤ 5 enfants, 15 000 F/séance. Ses escouades ne sont plus modifiables depuis ce cadre.",
        confirmLabel: "Basculer",
      }))
    )
      return;
    setUpdatingStatusId(mentorUserId);
    // Optimistic UI : la carte change de cadre immédiatement.
    const previousGroups = groups;
    setGroups((prev) =>
      prev.map((g) => (g.mentor_user_id === mentorUserId ? { ...g, category } : g)),
    );
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await updateCategoryFn({ data: { mentorUserId, category }, ...opts });
      toast.success(`Modèle mis à jour : ${label}.`);
      void onDataChanged?.();
    } catch (err) {
      setGroups(previousGroups);
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de modèle.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

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

    // Optimistic UI Update
    const previousGroups = groups;
    setGroups((prev) =>
      prev.map((g) => (g.mentor_user_id === mentorUserId ? { ...g, status } : g)),
    );

    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await updateStatusFn({ data: { mentorUserId, status }, ...opts });
      toast.success(`Mentor ${isRestore ? "restauré" : label.toLowerCase()} — statut mis à jour.`);

      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const channel = supabase.channel("admin-mentors-tab-sync");
        void channel.send({
          type: "broadcast",
          event: "safeguarding_updated",
          payload: { timestamp: Date.now() },
        });
      } catch (e) {}

      void onDataChanged?.();
    } catch (err) {
      setGroups(previousGroups);
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
      void refreshSilently();
      void broadcastMentorUpdate();
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
      void refreshSilently();
      void broadcastMentorUpdate();
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
          <h2 className="text-xl font-display font-black text-ink">
            Gestion des Mentors & Protection
          </h2>
          <p className="text-sm font-medium text-ink/60">
            Assignation de mentors, audits de bienveillance (Génizio Care) et protection des
            enfants.
          </p>
        </div>
      </div>

      {/* Sous-navigation de l'espace Mentors & Protection */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-3">
        <button
          type="button"
          onClick={() => setMentorSubTab("directory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            mentorSubTab === "directory"
              ? "bg-ink text-white shadow-sm"
              : "bg-surface text-ink/60 hover:text-ink"
          }`}
        >
          <Users className="size-4" />
          <span>Mentors & Escouades</span>
        </button>

        <button
          type="button"
          onClick={() => setMentorSubTab("audits")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            mentorSubTab === "audits"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-surface text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          <HeartHandshake className="size-4" />
          <span>Génizio Care — Audits Trimestriels</span>
        </button>

        <button
          type="button"
          onClick={() => setMentorSubTab("safety")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            mentorSubTab === "safety"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-surface text-rose-700 hover:bg-rose-50"
          }`}
        >
          <ShieldAlert className="size-4" />
          <span>Signalements & Kill-Switch</span>
          {openReportsCount > 0 && (
            <span className="rounded-full bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 animate-pulse">
              {openReportsCount}
            </span>
          )}
        </button>
      </div>

      {mentorSubTab === "audits" ? (
        <AdminSafeguardingAudits onDataChanged={onDataChanged} isRefreshing={parentRefreshing} />
      ) : mentorSubTab === "safety" ? (
        <AdminSafetyReports
          onDataChanged={onDataChanged}
          onPendingCountChange={onPendingCountChange}
          isRefreshing={parentRefreshing}
        />
      ) : (
        <>
          {/* « Comment ça marche » (2026-08-14) */}
          <div className="rounded-3xl border border-sky-200/70 bg-sky-50 p-4 sm:p-5">
            <div className="flex gap-3">
              <Info className="size-5 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-sky-900 leading-relaxed space-y-1">
                <p className="font-black text-sky-800">Comment ça marche & Typologies</p>
                <p>
                  Un compte devient mentor quand on lui <strong>assigne des enfants</strong> — par
                  un admin ou via une campagne. Le mentor voit ces enfants dans son tableau de bord{" "}
                  <code className="font-mono">/mentor</code>.
                </p>
                <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-sky-300 bg-white/70 p-2.5">
                    <p className="font-black text-sky-950">1. Mentor Pro (Superviseur Clinique)</p>
                    <p className="text-sky-800 text-[11px] mt-0.5">
                      Quota strict <strong>≤ 5 enfants</strong> (15 000 F / séance · Pack 12 séances = 180 000 F/mois/enfant · Rémunération mentor 70% soit 10 500 F/séance · Bilan diagnostic 50 000 F · Remédiation clinique individualisée).
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-300 bg-white/70 p-2.5">
                    <p className="font-black text-sky-950">2. Mentor de Soutien (Club Samedi)</p>
                    <p className="text-sky-800 text-[11px] mt-0.5">
                      1 à 2 escouades de <strong>6 à 8 élèves</strong> (6 à 16 enfants max) · 10 000 F/mois/enfant (70% Mentor soit ~56 000 F/escouade, 30% Génizio, 0% École) · Ateliers collectifs & garde-fous anti-fraude/anti-régression actifs.
                    </p>
                  </div>
                </div>
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
                    placeholder="Rechercher un mentor par email, nom ou téléphone…"
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
                  <span>Assigner un mentor</span>
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
                  {[...groups]
                    .sort(
                      (a, b) =>
                        (a.category === "support" ? 1 : 0) - (b.category === "support" ? 1 : 0),
                    )
                    .map((g, i, arr) => (
                      <Fragment key={g.mentor_user_id}>
                        {(i === 0 || arr[i - 1].category !== g.category) && (
                          <MentorSectionHeader
                            category={g.category}
                            mentors={arr.filter((m) => m.category === g.category).length}
                          />
                        )}
                    <div
                      key={g.mentor_user_id}
                      className={`rounded-3xl border border-ink/10 border-t-4 bg-white p-5 sm:p-6 shadow-sm ${
                        g.category === "support" ? "border-t-sky-400" : "border-t-purple-500"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand to-indigo-600 text-white font-black text-sm shrink-0">
                            {((g.display_name || g.email).charAt(0) || "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-ink truncate">
                                {g.display_name || g.email}
                              </p>
                              <select
                                value={g.category}
                                disabled={updatingStatusId === g.mentor_user_id}
                                onChange={(e) =>
                                  void handleUpdateCategory(
                                    g.mentor_user_id,
                                    e.target.value as MentorCategory,
                                  )
                                }
                                title="Changer le modèle du mentor : Pro (1-on-1 ≤ 5 enfants) ou Soutien (escouades 6-8)"
                                className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider outline-none ${
                                  g.category === "support"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                <option value="pro">Pro (Clinique)</option>
                                <option value="support">Soutien (Club)</option>
                              </select>
                              {g.display_name && (
                                <span className="text-xs font-semibold text-ink/50 truncate">
                                  ({g.email})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-ink/60 mt-0.5">
                              {g.phone ? (
                                <a
                                  href={`tel:${g.phone}`}
                                  className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                                  title="Appeler le mentor"
                                >
                                  <Phone className="size-3 fill-current" />
                                  <span>{g.phone}</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-ink/40 italic">
                                  <Phone className="size-3" />
                                  <span>Sans numéro</span>
                                </span>
                              )}
                              <span className="text-ink/30">•</span>
                              <span>
                                {g.totalChildren} enfant{g.totalChildren > 1 ? "s" : ""} suivi
                                {g.totalChildren > 1 ? "s" : ""}
                              </span>
                            </div>
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
                            {/* Confiance Mentor (V3) : palier de confiance (75% payout) + solde
                            de points — les vrais signaux de récompense. */}
                            {g.tier === "trusted" && (
                              <span
                                title="Palier confiance : 75% de la séance (3 750 F) au lieu de 70%"
                                className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700"
                              >
                                ⭐ Confiance
                              </span>
                            )}
                            {g.points > 0 && (
                              <span
                                title={`Solde de points — bonus payout +${g.pointsBonusPct}%`}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  g.badge === "gold"
                                    ? "bg-amber-200 text-amber-800"
                                    : g.badge === "bronze"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-surface text-ink/60"
                                }`}
                              >
                                🏅 {g.points} pts
                                {g.pointsBonusPct > 0 ? ` +${g.pointsBonusPct}%` : ""}
                              </span>
                            )}
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

                      {/* Actions de statut (V1) : suspendre/bannir/restaurer le compte mentor.
                      Restaurer (→ active) est disponible pour les comptes bannis ET suspendus
                      (2026-08-16) : une suspension automatique antérieure à la garde
                      anti-suspension (données de séance insuffisantes) pouvait être injuste —
                      l'admin doit pouvoir la lever. NB : pour une sanction qui doit tenir
                      malgré la garde, utiliser « Bannir » (jamais touché par l'automatique). */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {g.status === "banned" || g.status === "suspended" ? (
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
                          <button
                            onClick={() => void handleUpdateStatus(g.mentor_user_id, "suspended")}
                            disabled={updatingStatusId === g.mentor_user_id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        )}
                        {g.status !== "banned" && (
                          <button
                            onClick={() => void handleUpdateStatus(g.mentor_user_id, "banned")}
                            disabled={updatingStatusId === g.mentor_user_id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Ban className="size-3.5" />
                            Bannir
                          </button>
                        )}
                        {/* Deux modèles : le mentor de Soutien gère ses escouades ici. */}
                        {g.category === "support" && g.status !== "banned" && (
                          <button
                            onClick={() => setSquadModalFor(g)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-all cursor-pointer"
                          >
                            <Tent className="size-3.5" />
                            Escouade
                          </button>
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
                              ({g.approvedSessions} séance{g.approvedSessions > 1 ? "s" : ""}{" "}
                              approuvée
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
                      </Fragment>
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

          {/* Codes d'activation Mentor (Vague 5, spec §7) : l'utilisateur active lui-même
          le mode Mentor avec un code généré ici (Paramètres → Mentor). */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-base font-black text-ink flex items-center gap-2">
                  <KeyRound className="size-5 text-brand" /> Codes d'activation Mentor
                </h3>
                <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">
                  Codes à usage unique : un parent/mentor les saisit dans Paramètres → Mentor pour
                  activer le mode Mentor lui-même (spec §7). Sans code, un mentor n'existe que par
                  assignation admin.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 shrink-0">
                <label className="text-xs">
                  <span className="block font-black uppercase tracking-wider text-ink/60 mb-1">
                    Modèle
                  </span>
                  <select
                    value={codeCategory}
                    onChange={(e) => setCodeCategory(e.target.value as MentorCategory)}
                    className="rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="pro">Pro (Clinique) — MNT-PRO-…</option>
                    <option value="support">Soutien (Club) — MNT-CLUB-…</option>
                  </select>
                </label>
                <label className="text-xs">
                  <span className="block font-black uppercase tracking-wider text-ink/60 mb-1">
                    Validité (jours)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={codeValidDays}
                    onChange={(e) => setCodeValidDays(e.target.value)}
                    placeholder="Jamais"
                    className="w-24 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-xs font-bold text-ink placeholder:text-ink/30 focus:border-brand focus:outline-none"
                  />
                </label>
                <button
                  onClick={() => void handleGenerateCodes(5)}
                  disabled={generatingCodes}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand hover:bg-brand/90 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {generatingCodes ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="size-3.5" />
                  )}
                  Générer 5 codes
                </button>
              </div>
            </div>

            {codes.length === 0 ? (
              <p className="text-xs font-semibold text-ink/50 py-3">
                Aucun code généré pour l'instant.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-ink/10">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
                      <tr>
                        <th className="px-4 py-2.5">Code</th>
                        <th className="px-4 py-2.5">Modèle</th>
                        <th className="px-4 py-2.5">Créé le</th>
                        <th className="px-4 py-2.5">Valable jusqu'au</th>
                        <th className="px-4 py-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {codes.map((c) => {
                        const expired =
                          c.valid_until && new Date(c.valid_until).getTime() < Date.now();
                        return (
                          <tr key={c.id}>
                            <td className="px-4 py-2.5 font-mono text-xs font-bold text-ink">
                              {c.code}
                            </td>
                            <td className="px-4 py-2.5">
                              {c.category === "support" ? (
                                <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                  Club
                                </span>
                              ) : (
                                <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                  Pro
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-ink/60">
                              {new Date(c.created_at).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-ink/60">
                              {c.valid_until
                                ? new Date(c.valid_until).toLocaleDateString("fr-FR")
                                : "Jamais"}
                            </td>
                            <td className="px-4 py-2.5">
                              {c.used_by_email ? (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                  Utilisé par {c.used_by_email}
                                </span>
                              ) : expired ? (
                                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                  Expiré
                                </span>
                              ) : (
                                <span className="rounded-full bg-ink/5 text-ink/70 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                  Disponible
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {codesTotal > 50 && (
                  <p className="mt-2 text-[11px] font-semibold text-ink/50">
                    Affichage des 50 codes les plus récents ({codesTotal} au total).
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal ledger payout (Vague C) : les séances du mentor + approbation. */}
      {payoutModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg my-auto max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-4">
              <div>
                <h3 className="font-display text-balance text-xl font-black text-ink">
                  Séances & Payout
                </h3>
                <p className="text-sm text-ink/60 mt-0.5">
                  Approuvez les séances <strong>confirmées par le parent</strong> — elles entrent
                  dans le payout dû (70 % × séance = 3 500 F, 75 % pour un mentor « confiance »).
                  Une séance déclarée mais non confirmée par la famille ne peut pas être approuvée.
                </p>
              </div>
              <button
                onClick={() => setPayoutModalFor(null)}
                className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {payoutModalFor && (() => {
              const cur = groups.find((g) => g.mentor_user_id === payoutModalFor);
              if (!cur) return null;
              return (
                <div className="mb-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">
                      {cur.display_name || cur.email}
                    </p>
                    {cur.display_name && (
                      <p className="text-[11px] text-ink/60 truncate">{cur.email}</p>
                    )}
                  </div>
                  {cur.phone && (
                    <a
                      href={`tel:${cur.phone}`}
                      className="inline-flex items-center gap-1 font-bold text-brand hover:underline shrink-0"
                    >
                      <Phone className="size-3 fill-current" />
                      <span>{cur.phone}</span>
                    </a>
                  )}
                </div>
              );
            })()}

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
                    {s.status === "confirmed" ? (
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
                            : s.status === "approved"
                              ? "bg-amber-100 text-amber-700"
                              : s.status === "contested"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-ink/5 text-ink/50"
                        }`}
                      >
                        {s.status === "paid"
                          ? "Payé"
                          : s.status === "approved"
                            ? "Approuvé"
                            : s.status === "contested"
                              ? "Contestée par le parent"
                              : "Déclaré (à confirmer)"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <AssignMentorModal
          campaigns={campaigns}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            void refreshSilently();
            void onDataChanged?.();
          }}
        />
      )}

      {/* Escouades (deux-modèles) : constitution 6-8 enfants pour un mentor de Soutien. */}
      {squadModalFor && (
        <SquadModal
          mentor={squadModalFor}
          onClose={() => setSquadModalFor(null)}
          onSuccess={() => {
            setSquadModalFor(null);
            void refreshSilently();
          }}
        />
      )}
    </div>
  );
}

// Modale d'assignation à deux modes (refonte deux-modèles) :
//   • « Campagne » (primaire) : campagne + email du mentor + SÉLECTION EXPLICITE des enfants
//     non accompagnés de la cohorte, avec aperçu du quota restant — plus de pioche
//     automatique tronquée en silence ;
//   • « Parent → Enfant → Mentor » (spec §2-3) : recherche du parent (email/téléphone/nom),
//     choix de l'enfant parmi SES enfants, choix du mentor avec catégorie+quota affichés,
//     confirmation — jamais une liste plate de milliers d'enfants à faire défiler.
// Les deux modes sont des flux 1-on-1 : réservés aux mentors Pro. Un mentor de Soutien
// reçoit son escouade (6-8 enfants) via le cadre Club — le serveur rejette sinon.
function AssignMentorModal({
  campaigns,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { session } = useSession();
  const [mode, setMode] = useState<"campaign" | "child">("campaign");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode campagne — sélection explicite de la cohorte
  const [campaignId, setCampaignId] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState<CampaignCohortChild[]>([]);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  // Quota : résolu via searchMentorsAdmin dès l'email saisi (aperçu avant validation).
  const [mentorPreview, setMentorPreview] = useState<MentorSearchResult | null>(null);
  const [previewingMentor, setPreviewingMentor] = useState(false);

  // Mode relationnel — étapes : 0 parent, 1 enfant, 2 mentor, 3 confirmation
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [parentQuery, setParentQuery] = useState("");
  const [parentResults, setParentResults] = useState<ParentSearchResult[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [parentSearched, setParentSearched] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentSearchResult | null>(null);
  const [childrenOfParent, setChildrenOfParent] = useState<ChildOfParentResult[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildOfParentResult | null>(null);
  const [mentorQuery, setMentorQuery] = useState("");
  const [mentorResults, setMentorResults] = useState<MentorSearchResult[]>([]);
  const [searchingMentors, setSearchingMentors] = useState(false);
  const [mentorSearched, setMentorSearched] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorSearchResult | null>(null);

  const assignCampaignFn = useServerFn(assignMentorToCampaignAdmin);
  const searchParentsFn = useServerFn(searchParentsAdmin);
  const childrenOfParentFn = useServerFn(getChildrenOfParentAdmin);
  const searchMentorsFn = useServerFn(searchMentorsAdmin);
  const assignChildFn = useServerFn(assignMentorToChildAdmin);
  const cohortFn = useServerFn(listCampaignCohortAdmin);

  const opts = () =>
    session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};

  // Étape 0 : recherche du parent
  const handleSearchParents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentQuery.trim()) return;
    setSearchingParents(true);
    try {
      const res = await searchParentsFn({ data: { query: parentQuery.trim() }, ...opts() });
      setParentResults((res as any) ?? []);
      setParentSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la recherche du parent.");
    } finally {
      setSearchingParents(false);
    }
  };

  // Étape 0 → 1 : sélection du parent puis chargement de ses enfants
  const handleSelectParent = async (parent: ParentSearchResult) => {
    setSelectedParent(parent);
    setLoadingChildren(true);
    try {
      const res = await childrenOfParentFn({
        data: { parentId: parent.user_id },
        ...opts(),
      });
      setChildrenOfParent((res as any) ?? []);
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du chargement des enfants.");
    } finally {
      setLoadingChildren(false);
    }
  };

  // Étape 2 : recherche du mentor
  const handleSearchMentors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorQuery.trim()) return;
    setSearchingMentors(true);
    try {
      const res = await searchMentorsFn({ data: { query: mentorQuery.trim() }, ...opts() });
      setMentorResults((res as any) ?? []);
      setMentorSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la recherche du mentor.");
    } finally {
      setSearchingMentors(false);
    }
  };

  // Étape 3 : confirmation + assignation via le choke-point insertMentorAssignments
  const handleAssign = async () => {
    if (!selectedParent || !selectedChild || !selectedMentor) return;
    setIsSubmitting(true);
    try {
      await assignChildFn({
        data: {
          parentId: selectedParent.user_id,
          childId: selectedChild.id,
          mentorId: selectedMentor.user_id,
        },
        ...opts(),
      });
      toast.success(
        `${selectedChild.name} est maintenant suivi(e) par ${selectedMentor.email} (parent : ${selectedParent.email}).`,
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'assignation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !email.trim()) {
      toast.error("Campagne et email du mentor requis.");
      return;
    }
    if (selectedChildIds.size === 0) {
      toast.error("Sélectionnez au moins un enfant de la cohorte.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await assignCampaignFn({
        data: {
          campaignId,
          mentorEmail: email.trim(),
          childIds: [...selectedChildIds],
        },
        ...opts(),
      });
      toast.success(
        `${res.assignedCount} enfant(s) confié(s) à ${email.trim()} sur cette campagne !`,
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'assignation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Changement de campagne → chargement de la cohorte (enfants inscrits + drapeau mentor).
  const handleCampaignChange = async (id: string) => {
    setCampaignId(id);
    setSelectedChildIds(new Set());
    if (!id) {
      setCohort([]);
      return;
    }
    setLoadingCohort(true);
    try {
      const res = await cohortFn({ data: { campaignId: id }, ...opts() });
      setCohort((res as any) ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors du chargement de la cohorte.",
      );
    } finally {
      setLoadingCohort(false);
    }
  };

  const toggleCohortChild = (child: CampaignCohortChild) => {
    if (child.already_mentored) return;
    setSelectedChildIds((prev) => {
      const next = new Set(prev);
      if (next.has(child.id)) next.delete(child.id);
      else next.add(child.id);
      return next;
    });
  };

  // Aperçu du mentor (catégorie + quota restant) dès que l'email est complet.
  useEffect(() => {
    setMentorPreview(null);
    const q = email.trim();
    if (!q.includes("@") || q.length < 5) return;
    const t = setTimeout(async () => {
      setPreviewingMentor(true);
      try {
        const res = await searchMentorsFn({ data: { query: q }, ...opts() });
        const found = ((res as any) ?? []) as MentorSearchResult[];
        setMentorPreview(
          found.find((m) => m.email.toLowerCase() === q.toLowerCase()) ?? found[0] ?? null,
        );
      } catch {
        // Aperçu silencieux : le serveur revalidera à la soumission.
      } finally {
        setPreviewingMentor(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const resetChildFlow = () => {
    setStep(0);
    setParentQuery("");
    setParentResults([]);
    setParentSearched(false);
    setSelectedParent(null);
    setChildrenOfParent([]);
    setLoadingChildren(false);
    setSelectedChild(null);
    setMentorQuery("");
    setMentorResults([]);
    setMentorSearched(false);
    setSelectedMentor(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white my-auto rounded-[2rem] w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh] overflow-y-auto">
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

        {mode === "campaign" ? (
          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
              Sélectionnez <strong>explicitement</strong> les enfants de la cohorte à confier au
              mentor. Les séances seront financées par le compartiment séances de la campagne au
              moment de leur déclaration. Réservé aux <strong>mentors Pro</strong> — pour un mentor
              de Soutien, constituez son escouade (6-8 enfants).
            </p>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
                Campagne
              </label>
              <select
                required
                value={campaignId}
                onChange={(e) => void handleCampaignChange(e.target.value)}
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
                Email du mentor Pro (compte Génizio)
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@ong.org"
                className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              {previewingMentor && (
                <p className="mt-1 text-[11px] font-semibold text-ink/40 flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Vérification du compte…
                </p>
              )}
              {!previewingMentor && mentorPreview && (
                <div
                  className={`mt-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                    mentorPreview.category === "support"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-purple-200 bg-purple-50 text-purple-800"
                  }`}
                >
                  {mentorPreview.category === "support" ? (
                    <>
                      Mentor de Soutien (Club) détecté — <strong>pas d'assignation 1-on-1</strong>.
                      Constituez son escouade de 6 à 8 enfants (cadre Club du Samedi).
                    </>
                  ) : (
                    <>
                      Mentor Pro (Clinique) · Quota <strong>{mentorPreview.quota}</strong> · Déjà{" "}
                      <strong>{mentorPreview.active_assignments}</strong> enfant(s) ·{" "}
                      <strong>
                        {Math.max(0, mentorPreview.quota - mentorPreview.active_assignments)}
                      </strong>{" "}
                      place(s) restante(s)
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cohorte : sélection explicite enfant par enfant */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-widest text-ink/50">
                  Enfants de la cohorte {cohort.length > 0 && `(${cohort.length})`}
                </label>
                {selectedChildIds.size > 0 && (
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand">
                    {selectedChildIds.size} sélectionné{selectedChildIds.size > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {!campaignId ? (
                <p className="rounded-2xl border border-dashed border-ink/15 px-3 py-4 text-center text-xs font-semibold text-ink/40">
                  Choisissez d'abord une campagne.
                </p>
              ) : loadingCohort ? (
                <p className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 px-3 py-4 text-xs font-semibold text-ink/40">
                  <Loader2 className="size-3.5 animate-spin" /> Chargement de la cohorte…
                </p>
              ) : cohort.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-ink/15 px-3 py-4 text-center text-xs font-semibold text-ink/40">
                  Aucun enfant inscrit dans cette campagne.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-ink/10 bg-surface p-2">
                  {cohort.map((child) => {
                    const checked = selectedChildIds.has(child.id);
                    return (
                      <label
                        key={child.id}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                          child.already_mentored
                            ? "cursor-not-allowed opacity-50"
                            : checked
                              ? "cursor-pointer bg-brand/10 font-bold text-ink"
                              : "cursor-pointer bg-white hover:bg-brand/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={child.already_mentored}
                          onChange={() => toggleCohortChild(child)}
                          className="size-4 accent-[var(--brand)]"
                        />
                        <span className="min-w-0 flex-1 truncate font-bold">
                          {child.name}
                          {child.age != null ? (
                            <span className="text-ink/40 font-medium"> ({child.age} ans)</span>
                          ) : null}
                        </span>
                        {child.already_mentored && (
                          <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                            Déjà suivi par {child.current_mentor_email ?? "un mentor"}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

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
                disabled={
                  isSubmitting ||
                  selectedChildIds.size === 0 ||
                  (mentorPreview?.category === "support" && !previewingMentor)
                }
                className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span>
                  Confier {selectedChildIds.size > 0 ? `${selectedChildIds.size} enfant(s)` : "la sélection"}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Étape 0 — recherche du parent (spec §2-3, §23) */}
            {step === 0 && (
              <>
                <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
                  Trouvez d'abord le parent ou tuteur (email, téléphone ou nom), puis choisissez
                  parmi ses enfants. La liste complète des enfants n'est jamais parcourue.
                </p>
                <form onSubmit={handleSearchParents} className="flex gap-2">
                  <input
                    type="text"
                    value={parentQuery}
                    onChange={(e) => setParentQuery(e.target.value)}
                    placeholder="Email, téléphone ou nom du parent…"
                    className="flex-1 min-w-0 bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="submit"
                    disabled={searchingParents || !parentQuery.trim()}
                    className="px-4 py-3 bg-ink hover:bg-ink/90 text-white rounded-2xl font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {searchingParents ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Chercher
                  </button>
                </form>

                {parentSearched && parentResults.length === 0 && (
                  <p className="text-sm font-semibold text-ink/50 py-3 text-center">
                    Aucun compte trouvé pour cette recherche.
                  </p>
                )}
                <ul className="space-y-2">
                  {parentResults.map((p) => (
                    <li
                      key={p.user_id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{p.email}</p>
                        <p className="text-[11px] font-semibold text-ink/50 truncate">
                          {[p.display_name, p.phone && `Tél : ${p.phone}`]
                            .filter(Boolean)
                            .join(" · ") || "—"}{" "}
                          · {p.child_count} enfant{p.child_count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSelectParent(p)}
                        className="shrink-0 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink/90 transition-all cursor-pointer"
                      >
                        Choisir
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Étape 1 — choix de l'enfant parmi ceux du parent */}
            {step === 1 && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      setSelectedParent(null);
                      setParentResults([]);
                      setParentSearched(false);
                    }}
                    className="text-xs font-bold text-ink/50 hover:text-ink transition-colors cursor-pointer"
                  >
                    ← Changer de parent
                  </button>
                  <p className="text-xs font-bold text-ink/70 truncate min-w-0">
                    {selectedParent?.email} · {childrenOfParent.length} enfant
                    {childrenOfParent.length > 1 ? "s" : ""}
                  </p>
                </div>

                {loadingChildren ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-brand" />
                  </div>
                ) : childrenOfParent.length === 0 ? (
                  <p className="text-sm font-semibold text-ink/50 py-3 text-center">
                    Ce parent n'a pas encore d'enfant inscrit.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {childrenOfParent.map((c) => {
                      const taken = Boolean(c.current_mentor_email);
                      return (
                        <li
                          key={c.id}
                          className={
                            "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 " +
                            (taken
                              ? "border-ink/5 bg-surface/50 opacity-60"
                              : "border-ink/10 bg-surface")
                          }
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink truncate">
                              {c.name}{" "}
                              <span className="font-semibold text-ink/50">
                                {c.age != null ? `· ${c.age} ans` : ""}
                              </span>
                            </p>
                            <p className="text-[11px] font-semibold text-ink/50 truncate">
                              {taken
                                ? `Déjà accompagné par ${c.current_mentor_email}`
                                : c.is_active
                                  ? "Disponible pour un mentor"
                                  : "Profil désactivé"}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={taken}
                            onClick={() => {
                              setSelectedChild(c);
                              setStep(2);
                            }}
                            className="shrink-0 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink/90 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Choisir
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {/* Étape 2 — choix du mentor */}
            {step === 2 && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSelectedChild(null);
                    }}
                    className="text-xs font-bold text-ink/50 hover:text-ink transition-colors cursor-pointer"
                  >
                    ← Changer d'enfant
                  </button>
                  <p className="text-xs font-bold text-ink/70 truncate min-w-0">
                    Enfant : {selectedChild?.name}
                  </p>
                </div>

                <form onSubmit={handleSearchMentors} className="flex gap-2">
                  <input
                    type="text"
                    value={mentorQuery}
                    onChange={(e) => setMentorQuery(e.target.value)}
                    placeholder="Email, téléphone ou nom du mentor…"
                    className="flex-1 min-w-0 bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="submit"
                    disabled={searchingMentors || !mentorQuery.trim()}
                    className="px-4 py-3 bg-ink hover:bg-ink/90 text-white rounded-2xl font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {searchingMentors ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Chercher
                  </button>
                </form>

                {mentorSearched && mentorResults.length === 0 && (
                  <p className="text-sm font-semibold text-ink/50 py-3 text-center">
                    Aucun compte trouvé pour cette recherche.
                  </p>
                )}
                <ul className="space-y-2">
                  {mentorResults.map((m) => {
                    const banned = m.status === "suspended" || m.status === "banned";
                    const support = m.category === "support";
                    const quotaLeft = Math.max(0, m.quota - m.active_assignments);
                    const full = quotaLeft <= 0;
                    const disabled = banned || support || full;
                    return (
                      <li
                        key={m.user_id}
                        className={
                          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 " +
                          (disabled
                            ? "border-ink/5 bg-surface/50 opacity-60"
                            : "border-ink/10 bg-surface")
                        }
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-ink truncate">{m.email}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                support
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {support ? "Soutien (Club)" : "Pro (Clinique)"}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-ink/50 truncate">
                            {[m.display_name, m.phone && `Tél : ${m.phone}`]
                              .filter(Boolean)
                              .join(" · ") || "—"}{" "}
                            · {m.active_assignments}/{m.quota} quota
                            {support
                              ? " · assignation par escouade uniquement"
                              : full
                                ? " · quota atteint"
                                : ` · ${quotaLeft} place(s) restante(s)`}
                            {m.status !== "active" && ` · ${m.status}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setSelectedMentor(m);
                            setStep(3);
                          }}
                          className="shrink-0 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink/90 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {support ? "Escouade" : full ? "Complet" : "Choisir"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* Étape 3 — confirmation de la relation Parent → Enfant → Mentor */}
            {step === 3 && (
              <>
                <div className="rounded-2xl border border-ink/10 bg-surface p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-ink w-20 shrink-0">Parent</span>
                    <span className="font-semibold text-ink/70 truncate min-w-0 flex-1">
                      {selectedParent?.display_name
                        ? `${selectedParent.display_name} (${selectedParent.email})`
                        : selectedParent?.email}
                      {selectedParent?.phone ? ` · Tél : ${selectedParent.phone}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-ink w-20 shrink-0">Enfant</span>
                    <span className="font-semibold text-ink/70 truncate min-w-0 flex-1">
                      {selectedChild?.name}
                      {selectedChild?.age != null ? ` (${selectedChild.age} ans)` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-ink w-20 shrink-0">Mentor</span>
                    <span className="font-semibold text-ink/70 truncate min-w-0 flex-1">
                      {selectedMentor?.display_name
                        ? `${selectedMentor.display_name} (${selectedMentor.email})`
                        : selectedMentor?.email}
                      {selectedMentor?.phone ? ` · Tél : ${selectedMentor.phone}` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-ink/5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      setSelectedMentor(null);
                    }}
                    className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-bold transition-colors cursor-pointer"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleAssign()}
                    className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    <span>Assigner le mentor</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Modale escouade (deux-modèles) : l'admin compose l'escouade (6 à 8 enfants) d'un
// mentor de Soutien via le flux Parent → Enfant. Le mentor ne choisit jamais ses
// membres : il consulte la sienne et déclare les séances (SaturdayClubSquadView).
function SquadModal({
  mentor,
  onClose,
  onSuccess,
}: {
  mentor: MentorGroup;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { session } = useSession();
  const [name, setName] = useState("Escouade du Samedi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Membres actuels (escouades actives du mentor).
  const [existingSquads, setExistingSquads] = useState<
    Array<{ id: string; name: string; members: Array<{ id: string; name: string }> }>
  >([]);
  const [loadingSquads, setLoadingSquads] = useState(true);

  // Sélecteur Parent → Enfants.
  const [parentQuery, setParentQuery] = useState("");
  const [parentResults, setParentResults] = useState<ParentSearchResult[]>([]);
  const [parentSearched, setParentSearched] = useState(false);
  const [childrenOfParent, setChildrenOfParent] = useState<ChildOfParentResult[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  // Sélection courante : id → nom (pré-remplie avec l'escouade existante via toggle).
  const [selected, setSelected] = useState<Map<string, string>>(new Map());

  const opts = () =>
    session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};

  const squadsFn = useServerFn(listSquadsAdmin);
  const upsertFn = useServerFn(upsertSquadAdmin);
  const searchParentsFn = useServerFn(searchParentsAdmin);
  const childrenOfParentFn = useServerFn(getChildrenOfParentAdmin);

  useEffect(() => {
    void (async () => {
      try {
        const res = await squadsFn({ data: { mentorUserId: mentor.mentor_user_id }, ...opts() });
        const squads = ((res as any) ?? []) as Array<{
          id: string;
          name: string;
          members: Array<{ id: string; name: string }>;
        }>;
        setExistingSquads(squads);
        if (squads[0]) {
          setName(squads[0].name);
          setSelected(new Map(squads[0].members.map((m) => [m.id, m.name])));
        }
      } catch {
        setExistingSquads([]);
      } finally {
        setLoadingSquads(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentor.mentor_user_id]);

  const handleSearchParents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentQuery.trim()) return;
    try {
      const res = await searchParentsFn({ data: { query: parentQuery.trim() }, ...opts() });
      setParentResults((res as any) ?? []);
      setParentSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la recherche du parent.");
    }
  };

  const handleSelectParent = async (parent: ParentSearchResult) => {
    setLoadingChildren(true);
    try {
      const res = await childrenOfParentFn({ data: { parentId: parent.user_id }, ...opts() });
      setChildrenOfParent((res as any) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du chargement des enfants.");
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleChild = (child: ChildOfParentResult) => {
    if (!child.is_active) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(child.id)) next.delete(child.id);
      else next.set(child.id, child.name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size < 6 || selected.size > 8) {
      toast.error("Une escouade compte entre 6 et 8 enfants.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Une seule escouade active par passage : si le mentor en a 2, on met à jour la
      // première (l'aperçu ci-dessus l'annonce) — le serveur borne de toute façon à 2.
      await upsertFn({
        data: {
          mentorUserId: mentor.mentor_user_id,
          name: name.trim() || "Escouade du Samedi",
          childProfileIds: [...selected.keys()],
          squadId: existingSquads[0]?.id,
        },
        ...opts(),
      });
      toast.success(
        `Escouade enregistrée pour ${mentor.display_name || mentor.email} — ${selected.size} enfants.`,
      );
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white my-auto rounded-[2rem] w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
            <Tent className="size-5 text-sky-600" />
            Escouade — {mentor.display_name || mentor.email}
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {loadingSquads ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-ink/40 py-3">
            <Loader2 className="size-3.5 animate-spin" /> Chargement des escouades actuelles…
          </p>
        ) : existingSquads.length > 0 ? (
          <div className="mb-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-sky-700">
              {existingSquads.length === 1
                ? "Escouade actuelle — enregistrer ajustera ses membres et son nom"
                : `${existingSquads.length} escouades actives — l'enregistrement ajuste la première`}
            </p>
            {existingSquads.map((s) => (
              <div key={s.id} className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
                <p className="text-xs font-black text-sky-900">{s.name}</p>
                <p className="text-[11px] font-semibold text-sky-700/80">
                  {s.members.map((m) => m.name).join(", ") || "Aucun membre"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-[11px] font-semibold text-ink/40">
            Aucune escouade active — composez-en une (6 à 8 enfants).
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">
              Nom de l'escouade
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full bg-surface border border-ink/10 rounded-2xl p-3 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <form onSubmit={handleSearchParents} className="flex gap-2">
            <input
              type="text"
              value={parentQuery}
              onChange={(e) => setParentQuery(e.target.value)}
              placeholder="Rechercher un parent (email, tél, nom) pour ajouter ses enfants…"
              className="flex-1 min-w-0 bg-surface border border-ink/10 rounded-2xl p-3 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={!parentQuery.trim()}
              className="px-4 py-3 bg-ink hover:bg-ink/90 text-white rounded-2xl font-bold flex items-center transition-all cursor-pointer disabled:opacity-50"
            >
              {parentQuery.trim() ? <Search className="size-4" /> : <Search className="size-4" />}
            </button>
          </form>

          {parentSearched && parentResults.length === 0 && (
            <p className="text-sm font-semibold text-ink/50 text-center">
              Aucun compte trouvé pour cette recherche.
            </p>
          )}
          {parentResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parentResults.map((p) => (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => void handleSelectParent(p)}
                  className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface transition-all cursor-pointer"
                >
                  {p.display_name || p.email}{" "}
                  <span className="text-ink/40">({p.child_count} enf.)</span>
                </button>
              ))}
            </div>
          )}

          {loadingChildren && (
            <p className="flex items-center gap-2 text-xs font-semibold text-ink/40">
              <Loader2 className="size-3.5 animate-spin" /> Chargement des enfants…
            </p>
          )}
          {childrenOfParent.length > 0 && (
            <div className="space-y-1.5">
              {childrenOfParent.map((child) => {
                const checked = selected.has(child.id);
                return (
                  <label
                    key={child.id}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                      !child.is_active
                        ? "cursor-not-allowed opacity-50"
                        : checked
                          ? "cursor-pointer bg-sky-100 font-bold text-ink"
                          : "cursor-pointer bg-surface hover:bg-sky-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!child.is_active}
                      onChange={() => toggleChild(child)}
                      className="size-4 accent-sky-600"
                    />
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {child.name}
                      {child.age != null ? (
                        <span className="text-ink/40 font-medium"> ({child.age} ans)</span>
                      ) : null}
                    </span>
                    {child.current_mentor_email && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                        Suivi 1-on-1 : {child.current_mentor_email}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-ink/10 bg-white pt-3">
            <span
              className={`text-xs font-black ${
                selected.size >= 6 && selected.size <= 8 ? "text-emerald-600" : "text-ink/50"
              }`}
            >
              {selected.size} / 6-8 sélectionné{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-surface hover:bg-ink/5 text-ink rounded-2xl text-sm font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || selected.size < 6 || selected.size > 8}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Tent className="size-4" />
                )}
                Enregistrer l'escouade
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


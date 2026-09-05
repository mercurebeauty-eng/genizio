import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  Search,
  ShieldCheck,
  HandCoins,
  CheckCircle2,
  HeartHandshake,
  CalendarClock,
  Plus,
  Copy,
  Wallet,
  UserX,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Users,
  Layers,
} from "lucide-react";
import {
  listPaymentsAdmin,
  retryPaymentFulfillmentAdmin,
  getPaymentsPendingCountAdmin,
  activateSubscriptionFromReferenceAdmin,
  extendSubscriptionPeriodAdmin,
  cancelSubscriptionAdmin,
  createSponsorshipTokenAdmin,
  type AdminPaymentRow,
} from "@/lib/payments-admin.functions";
import {
  getSubscriptionsDataAdmin,
  extendAccompanimentPackAdmin,
  type AdminSubscriptionRow,
  type AdminAccompanimentPackRow,
} from "@/lib/subscriptions.functions";
import {
  listSponsorshipsAdmin,
  confirmSponsorshipPaymentAdmin,
  getUpcomingExpirationsAdmin,
  type SponsorshipToken,
} from "@/lib/seasons.functions";
import { extendChildAccessAdmin } from "@/lib/child-access";
import { formatXof } from "@/lib/pricing";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { GenizioLoader } from "@/components/GenizioLoader";
import { AdminPagination } from "./AdminPagination";

// Onglet « Paiements & Accès » (refonte Admin OS, 2026-08-13, décision #71) : l'écran
// de secours des paiements. Le webhook Paystack et la page de retour sont les chemins
// normaux de fulfillment ; ici, l'admin peut VOIR les paiements restés « initiated »
// (webhook manqué) et REJOUER leur exécution (vérification Paystack puis fulfillment
// idempotent), ou les marquer reçus manuellement (WhatsApp/Mobile Money — décision
// admin). Regroupe aussi abonnements (activation 1er paiement / prolongation /
// résiliation), parrainages et renouvellements d'accès.

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  initiated: { label: "En attente", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  success: { label: "Payé", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  failed: { label: "Échoué", className: "bg-rose-500/10 text-rose-600 border-rose-200" },
  abandoned: { label: "Abandonné", className: "bg-ink/10 text-ink/60 border-ink/10" },
};

const SUB_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  initiated: { label: "Initiation", className: "bg-sky-500/10 text-sky-600 border-sky-200" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  past_due: { label: "En retard", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  cancelled: { label: "Résiliée", className: "bg-rose-500/10 text-rose-600 border-rose-200" },
  expired: { label: "Expirée", className: "bg-ink/10 text-ink/60 border-ink/10" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_LABELS[status] ?? {
    label: status,
    className: "bg-ink/10 text-ink/60 border-ink/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function SubStatusBadge({ status }: { status: string }) {
  const cfg = SUB_STATUS_LABELS[status] ?? {
    label: status,
    className: "bg-ink/10 text-ink/60 border-ink/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

type PaymentsSection = "payments" | "subscriptions" | "sponsorships" | "expirations";

export type AccompanimentFamilyGroup = {
  userId: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  totalPacks: number;
  activePacks: number;
  totalSessions: number;
  totalSessionsUsed: number;
  totalSessionsRemaining: number;
  totalPriceXof: number;
  earliestEndsAt: string | null;
  latestEndsAt: string | null;
  packs: AdminAccompanimentPackRow[];
};

export interface AdminPaymentsTabProps {
  onDataChanged?: () => void | Promise<void>;
  onPendingCountChange?: (count: number) => void;
  isRefreshing?: boolean;
}

export function AdminPaymentsTab({
  onDataChanged,
  onPendingCountChange,
  isRefreshing: parentRefreshing = false,
}: AdminPaymentsTabProps = {}) {
  const { session } = useSession();
  const opts = session?.access_token
    ? { headers: { Authorization: `Bearer ${session.access_token}` } }
    : {};

  const listPaymentsFn = useServerFn(listPaymentsAdmin);
  const retryFn = useServerFn(retryPaymentFulfillmentAdmin);
  const getSubsFn = useServerFn(getSubscriptionsDataAdmin);
  const activateSubFn = useServerFn(activateSubscriptionFromReferenceAdmin);
  const extendSubFn = useServerFn(extendSubscriptionPeriodAdmin);
  const cancelSubFn = useServerFn(cancelSubscriptionAdmin);
  const listSponsorshipsFn = useServerFn(listSponsorshipsAdmin);
  const confirmSponsorshipFn = useServerFn(confirmSponsorshipPaymentAdmin);
  const createSponsorshipFn = useServerFn(createSponsorshipTokenAdmin);
  const getExpirationsFn = useServerFn(getUpcomingExpirationsAdmin);
  const extendAccessFn = useServerFn(extendChildAccessAdmin);
  const getPendingPaymentsFn = useServerFn(getPaymentsPendingCountAdmin);

  const extendPackFn = useServerFn(extendAccompanimentPackAdmin);

  const [section, setSection] = useState<PaymentsSection>("payments");
  const [payments, setPayments] = useState<AdminPaymentRow[] | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "initiated">("initiated");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[] | null>(null);
  const [accompanimentPacks, setAccompanimentPacks] = useState<AdminAccompanimentPackRow[] | null>(
    null,
  );
  const [mrrXof, setMrrXof] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);
  const [activePacksCount, setActivePacksCount] = useState(0);
  const [totalSessionsRemaining, setTotalSessionsRemaining] = useState(0);
  const [sponsorships, setSponsorships] = useState<SponsorshipToken[] | null>(null);
  const [expirations, setExpirations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendingPackId, setExtendingPackId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showCreateSponsorship, setShowCreateSponsorship] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Recherche, pagination et accordéon pour les packs d'accompagnement
  const [packSearchQuery, setPackSearchQuery] = useState("");
  const [packPageSize, setPackPageSize] = useState<number>(10);
  const [packCurrentPage, setPackCurrentPage] = useState(1);
  const [expandedFamilyIds, setExpandedFamilyIds] = useState<Set<string>>(new Set());

  // Recherche et pagination pour les abonnements famille
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [subPageSize, setSubPageSize] = useState<number>(10);
  const [subCurrentPage, setSubCurrentPage] = useState(1);

  // Groupement des packs par compte famille (parent)
  const accompanimentFamilyGroups = useMemo<AccompanimentFamilyGroup[]>(() => {
    if (!accompanimentPacks) return [];
    const map = new Map<string, AccompanimentFamilyGroup>();
    for (const p of accompanimentPacks) {
      let g = map.get(p.userId);
      if (!g) {
        g = {
          userId: p.userId,
          parentName: p.parentName,
          parentEmail: p.parentEmail,
          parentPhone: p.parentPhone,
          totalPacks: 0,
          activePacks: 0,
          totalSessions: 0,
          totalSessionsUsed: 0,
          totalSessionsRemaining: 0,
          totalPriceXof: 0,
          earliestEndsAt: null,
          latestEndsAt: null,
          packs: [],
        };
        map.set(p.userId, g);
      }
      g.totalPacks += 1;
      const isActive =
        p.status === "active" && (!p.endsAt || new Date(p.endsAt).getTime() > Date.now());
      if (isActive) g.activePacks += 1;
      g.totalSessions += p.sessions ?? 0;
      g.totalSessionsUsed += p.sessionsUsed ?? 0;
      g.totalSessionsRemaining += Math.max(0, (p.sessions ?? 0) - (p.sessionsUsed ?? 0));
      g.totalPriceXof += p.priceXof ?? 180000;
      if (p.endsAt) {
        if (!g.latestEndsAt || new Date(p.endsAt).getTime() > new Date(g.latestEndsAt).getTime()) {
          g.latestEndsAt = p.endsAt;
        }
        if (
          !g.earliestEndsAt ||
          new Date(p.endsAt).getTime() < new Date(g.earliestEndsAt).getTime()
        ) {
          g.earliestEndsAt = p.endsAt;
        }
      }
      g.packs.push(p);
    }
    return Array.from(map.values());
  }, [accompanimentPacks]);

  // Filtrage des familles d'accompagnement
  const filteredFamilyGroups = useMemo(() => {
    const q = packSearchQuery.trim().toLowerCase();
    if (!q) return accompanimentFamilyGroups;
    return accompanimentFamilyGroups.filter((g) => {
      const matchParent =
        (g.parentName && g.parentName.toLowerCase().includes(q)) ||
        (g.parentEmail && g.parentEmail.toLowerCase().includes(q)) ||
        (g.parentPhone && g.parentPhone.toLowerCase().includes(q));
      const matchChild = g.packs.some(
        (p) =>
          (p.childName && p.childName.toLowerCase().includes(q)) ||
          (p.mentorEmail && p.mentorEmail.toLowerCase().includes(q)),
      );
      return matchParent || matchChild;
    });
  }, [accompanimentFamilyGroups, packSearchQuery]);

  const totalFamilyPages = Math.max(1, Math.ceil(filteredFamilyGroups.length / packPageSize));
  const paginatedFamilyGroups = useMemo(() => {
    const start = (packCurrentPage - 1) * packPageSize;
    return filteredFamilyGroups.slice(start, start + packPageSize);
  }, [filteredFamilyGroups, packCurrentPage, packPageSize]);

  const toggleExpandFamily = (userId: string) => {
    setExpandedFamilyIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleExpandAllFamilies = () => {
    if (expandedFamilyIds.size >= filteredFamilyGroups.length && filteredFamilyGroups.length > 0) {
      setExpandedFamilyIds(new Set());
    } else {
      setExpandedFamilyIds(new Set(filteredFamilyGroups.map((g) => g.userId)));
    }
  };

  // Filtrage des abonnements famille
  const filteredSubscriptions = useMemo(() => {
    const q = subSearchQuery.trim().toLowerCase();
    if (!q) return subscriptions ?? [];
    return (subscriptions ?? []).filter((s) => {
      return (
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.parentEmail && s.parentEmail.toLowerCase().includes(q)) ||
        (s.parentPhone && s.parentPhone.toLowerCase().includes(q))
      );
    });
  }, [subscriptions, subSearchQuery]);

  const totalSubPages = Math.max(1, Math.ceil(filteredSubscriptions.length / subPageSize));
  const paginatedSubscriptions = useMemo(() => {
    const start = (subCurrentPage - 1) * subPageSize;
    return filteredSubscriptions.slice(start, start + subPageSize);
  }, [filteredSubscriptions, subCurrentPage, subPageSize]);

  // Refetch isolé de la file des paiements (Vague 4) — changement de page ou de filtre
  // sans recharger abonnements/parrainages/expirations.
  const loadPayments = async (page: number, status: "all" | "initiated") => {
    const res = await listPaymentsFn({
      data: { page, pageSize: 50, status },
      ...opts,
    }).catch(() => null);
    if (res) {
      setPayments(res.data);
      setPaymentsTotal(res.total);
      setPaymentsTotalPages(res.totalPages);
    }
  };

  // Rafraîchissement silencieux de la file des paiements et du compteur (sans clignotement ni loader bloquant)
  const refreshSilently = useCallback(async () => {
    try {
      const [p, pending] = await Promise.all([
        listPaymentsFn({
          data: { page: paymentsPage, pageSize: 50, status: paymentFilter },
          ...opts,
        }).catch(() => null),
        getPendingPaymentsFn({ data: undefined, ...opts }).catch(() => null),
      ]);
      if (p) {
        setPayments(p.data);
        setPaymentsTotal(p.total);
        setPaymentsTotalPages(p.totalPages);
      }
      if (pending) {
        setPendingCount(pending.pendingCount);
        onPendingCountChange?.(pending.pendingCount);
      }
    } catch (e) {
      console.error("Erreur lors de l'actualisation silencieuse des paiements:", e);
    }
  }, [
    listPaymentsFn,
    getPendingPaymentsFn,
    paymentsPage,
    paymentFilter,
    opts,
    onPendingCountChange,
  ]);

  const loadAll = async (showLoader = false) => {
    if (showLoader || payments === null) setLoading(true);
    try {
      const [p, subs, sp, exp, pending] = await Promise.all([
        listPaymentsFn({
          data: { page: paymentsPage, pageSize: 50, status: paymentFilter },
          ...opts,
        }).catch(() => null),
        getSubsFn({ data: undefined, ...opts }).catch(() => ({
          subscriptions: [],
          accompanimentPacks: [],
          mrrXof: 0,
          activeCount: 0,
          pastDueCount: 0,
          cancelledCount: 0,
          churn30dCount: 0,
          activePacksCount: 0,
          totalSessionsRemaining: 0,
        })),
        listSponsorshipsFn({ data: { page: 1, pageSize: 50 }, ...opts }).catch(() => ({
          data: [],
        })),
        getExpirationsFn({ data: undefined, ...opts }).catch(() => []),
        getPendingPaymentsFn({ data: undefined, ...opts }).catch(() => null),
      ]);
      setPayments((p as any)?.data ?? []);
      setPaymentsTotal((p as any)?.total ?? 0);
      setPaymentsTotalPages((p as any)?.totalPages ?? 1);
      const newPending = (pending as any)?.pendingCount ?? 0;
      setPendingCount(newPending);
      onPendingCountChange?.(newPending);
      setSubscriptions((subs as any)?.subscriptions ?? []);
      setAccompanimentPacks((subs as any)?.accompanimentPacks ?? []);
      setMrrXof((subs as any)?.mrrXof ?? 0);
      setActiveSubsCount((subs as any)?.activeCount ?? 0);
      setActivePacksCount((subs as any)?.activePacksCount ?? 0);
      setTotalSessionsRemaining((subs as any)?.totalSessionsRemaining ?? 0);
      setSponsorships((sp as any)?.data ?? []);
      const expList = Array.isArray(exp) ? exp : ((exp as any)?.data ?? []);
      setExpirations(expList);
    } catch (err: any) {
      console.error("AdminPaymentsTab load error", err);
      toast.error(err?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) void loadAll(true);
  }, [session]);

  // Écoute temps réel Supabase sur le canal dédié aux paiements
  useEffect(() => {
    const channel = supabase.channel("admin-payments-tab-sync");

    channel
      .on("broadcast", { event: "payment_updated" }, () => {
        void refreshSilently();
        void onDataChanged?.();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        void refreshSilently();
        void onDataChanged?.();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshSilently, onDataChanged]);

  const handleRetry = async (paymentId: string, mode: "verify" | "manual") => {
    setBusyId(paymentId);

    // 1. Mise à jour optimiste immédiate : statut visuel et décrémentation directe de la pastille
    const previousPayments = payments;
    const previousPendingCount = pendingCount;
    const targetPayment = payments?.find((p) => p.id === paymentId);

    if (targetPayment) {
      const nextPendingCount = Math.max(0, pendingCount - 1);
      setPendingCount(nextPendingCount);
      onPendingCountChange?.(nextPendingCount);

      setPayments((prev) =>
        (prev ?? []).map((p) => (p.id === paymentId ? { ...p, status: "success" } : p)),
      );
    }

    try {
      const res = await retryFn({ data: { paymentId, mode }, ...opts });
      if (res.ok) {
        toast.success(`Paiement exécuté : ${res.detail}`);
        if (res.pendingCount !== undefined) {
          setPendingCount(res.pendingCount);
          onPendingCountChange?.(res.pendingCount);
        }

        // Diffusion temps réel sur le canal admin pour synchroniser instantanément les autres onglets / admins
        try {
          const ch = supabase.channel("admin-payments-sync");
          void ch.send({
            type: "broadcast",
            event: "payment_updated",
            payload: { paymentId, status: "success", timestamp: Date.now() },
          });
        } catch {
          // ignore
        }

        // Rafraîchissement silencieux de la liste sans clignotement
        await refreshSilently();
        // Notification au dashboard parent (KPIs, commandes confirmées, etc.)
        void onDataChanged?.();
      } else {
        // En cas de refus, annulation de la mise à jour optimiste
        setPayments(previousPayments);
        setPendingCount(previousPendingCount);
        onPendingCountChange?.(previousPendingCount);

        const reasons: Record<string, string> = {
          ALREADY_SUCCESS: "Ce paiement est déjà marqué payé.",
          PAYMENT_NOT_FOUND: "Paiement introuvable.",
          VERIFY_FAILED: "Vérification Paystack impossible (transaction introuvable ?).",
          TX_ABANDONED: "La transaction est abandonnée chez Paystack.",
          TX_FAILED: "La transaction a échoué chez Paystack.",
          AMOUNT_MISMATCH: "Montant Paystack différent du montant enregistré — refusé.",
          FULFILLMENT_FAILED: "L'exécution a échoué.",
        };
        toast.error(reasons[res.reason] ?? res.reason, { description: res.detail });
      }
    } catch (err: any) {
      // Annulation de la mise à jour optimiste
      setPayments(previousPayments);
      setPendingCount(previousPendingCount);
      onPendingCountChange?.(previousPendingCount);
      toast.error(err?.message || "Erreur lors de l'exécution du paiement.");
    } finally {
      setBusyId(null);
    }
  };

  const handleActivateSubscription = async (subscriptionId: string) => {
    setBusyId(subscriptionId);
    try {
      const res = await activateSubFn({ data: { subscriptionId }, ...opts });
      if (res.ok) toast.success("Abonnement activé — période ouverte.");
      else toast.error("Activation impossible", { description: res.reason });
      await loadAll();
      void onDataChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'activation.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExtendSubscription = async (subscriptionId: string, months: number) => {
    setExtendingId(subscriptionId);
    try {
      const res = await extendSubFn({ data: { subscriptionId, months }, ...opts });
      if (res.ok) {
        toast.success(
          `Période prolongée de ${months} mois — échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`,
        );
      } else {
        toast.error("Prolongation impossible", { description: res.reason });
      }
      await loadAll();
      void onDataChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la prolongation.");
    } finally {
      setExtendingId(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    const ok = await confirmDialog({
      title: "Résilier cet abonnement ?",
      description:
        "L'abonnement Paystack sera désactivé et la couverture famille s'arrêtera à la fin de la période.",
      confirmLabel: "Résilier",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(subscriptionId);
    try {
      const res = await cancelSubFn({ data: { subscriptionId }, ...opts });
      if (res.ok) toast.success("Abonnement résilié.");
      else toast.error("Résiliation impossible", { description: res.reason });
      await loadAll();
      void onDataChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la résiliation.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExtendAccompanimentPack = async (
    coverageId: string,
    months: number,
    addSessions: number,
  ) => {
    setExtendingPackId(coverageId);
    try {
      const res = await extendPackFn({
        data: { coverageId, months, addSessions },
        ...opts,
      });
      if (res.ok) {
        toast.success(
          `Pack prolongé : +${addSessions} séances (Total: ${res.sessions}) — Échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`,
        );
        await loadAll();
        void onDataChanged?.();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la prolongation du pack.");
    } finally {
      setExtendingPackId(null);
    }
  };

  const handleConfirmSponsorship = async (tokenId: string) => {
    setConfirmingId(tokenId);
    try {
      await confirmSponsorshipFn({ data: { tokenId }, ...opts });
      toast.success("Paiement du parrainage confirmé — le code est utilisable.");
      await loadAll();
      void onDataChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la confirmation.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleExtendAccess = async (childId: string, months: number) => {
    setExtendingId(childId);
    try {
      const res = await extendAccessFn({ data: { childId, months }, ...opts });
      toast.success(
        `Accès prolongé de ${months} mois — échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`,
      );
      await loadAll();
      void onDataChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la prolongation.");
    } finally {
      setExtendingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <GenizioLoader label="Chargement des paiements & accès…" />
      </div>
    );
  }

  // Le filtre est appliqué côté serveur (Vague 4) — la page contient déjà les bons paiements.
  const filteredPayments = payments ?? [];

  const SECTIONS: { id: PaymentsSection; label: string }[] = [
    {
      id: "payments",
      label: `Paiements ${pendingCount > 0 ? `· ${pendingCount} en attente` : ""}`,
    },
    { id: "subscriptions", label: "Abonnements" },
    { id: "sponsorships", label: "Parrainages" },
    { id: "expirations", label: "Renouvellements" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Sous-navigation ── */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={
              "rounded-2xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer " +
              (section === s.id
                ? "border-ink bg-ink text-white shadow-sm"
                : "border-ink/10 bg-white text-ink/70 hover:border-ink/25")
            }
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={async () => {
            await loadAll();
            void onDataChanged?.();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-surface/60 transition-all cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${parentRefreshing ? "animate-spin text-brand" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* ══ SECTION PAIEMENTS ══ */}
      {section === "payments" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-black text-ink">
                  Secours webhook de paiement
                </h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink/70">
                  Un paiement resté « en attente » n'a pas été exécuté (webhook manqué, page de
                  retour perdue, divergence de montant). <strong>Vérifier & exécuter</strong>{" "}
                  interroge Paystack (statut + montant) puis applique le bénéfice ;{" "}
                  <strong>Marquer reçu</strong> exécute sans Paystack (paiement WhatsApp / Mobile
                  Money — décision administrative). L'opération est idempotente : un paiement déjà
                  exécuté n'est jamais rejoué.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(["initiated", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setPaymentFilter(f);
                  setPaymentsPage(1);
                  void loadPayments(1, f);
                }}
                className={
                  "rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer " +
                  (paymentFilter === f
                    ? "border-ink bg-ink text-white"
                    : "border-ink/10 bg-white text-ink/60 hover:border-ink/25")
                }
              >
                {f === "initiated" ? "En attente uniquement" : "Tous les paiements"}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Secours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink/40">
                      Aucun paiement {paymentFilter === "initiated" ? "en attente" : ""} — tout est
                      fluide.
                    </td>
                  </tr>
                )}
                {filteredPayments.map((p) => (
                  <tr key={p.id} className={p.status === "initiated" ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-3 text-xs text-ink/60">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand">
                        {p.intentLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">{formatXof(p.amount_xof)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-ink/60">{p.reference}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/70">{p.parentEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "initiated" ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={busyId === p.id}
                            onClick={() => void handleRetry(p.id, "verify")}
                            className="inline-flex items-center gap-1 rounded-xl bg-ink px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-ink/90 disabled:opacity-50 cursor-pointer"
                          >
                            {busyId === p.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="size-3" />
                            )}
                            Vérifier & exécuter
                          </button>
                          <button
                            disabled={busyId === p.id}
                            onClick={() => void handleRetry(p.id, "manual")}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                            title="Paiement hors-ligne (WhatsApp / Mobile Money) — décision admin"
                          >
                            <Wallet className="size-3" />
                            Marquer reçu
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={paymentsPage}
            totalPages={paymentsTotalPages}
            total={paymentsTotal}
            pageSize={50}
            onPageChange={(pg) => {
              setPaymentsPage(pg);
              void loadPayments(pg, paymentFilter);
            }}
            label="paiement"
          />
        </div>
      )}

      {/* ══ SECTION ABONNEMENTS & ACCOMPAGNEMENT ══ */}
      {section === "subscriptions" && (
        <div className="space-y-8">
          {/* Grille KPI Abonnements & Packs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-ink/50">
                MRR Forfaits Famille
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{formatXof(mrrXof)}</p>
              <p className="mt-0.5 text-xs text-ink/50 font-medium">
                {activeSubsCount} famille{activeSubsCount > 1 ? "s" : ""} active
                {activeSubsCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Abonnements Famille
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-950">{activeSubsCount}</p>
              <p className="mt-0.5 text-xs text-emerald-700/80 font-medium">
                Pass Famille Standard (35 000 F/mois)
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-sky-800">
                Packs Accompagnement
              </p>
              <p className="mt-1 text-2xl font-extrabold text-sky-950">{activePacksCount}</p>
              <p className="mt-0.5 text-xs text-sky-700/80 font-medium">
                {accompanimentFamilyGroups.length} famille
                {accompanimentFamilyGroups.length > 1 ? "s" : ""} · {activePacksCount} enfant
                {activePacksCount > 1 ? "s" : ""} suivi{activePacksCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-800">
                Séances Mentor Disponibles
              </p>
              <p className="mt-1 text-2xl font-extrabold text-indigo-950">
                {totalSessionsRemaining}
              </p>
              <p className="mt-0.5 text-xs text-indigo-700/80 font-medium">
                Séances financées restantes sur les packs
              </p>
            </div>
          </div>

          {/* 1. TABLEAU DES PACKS ACCOMPAGNEMENT & MENTORAT (GROUPÉ PAR FAMILLE AVEC ACCORDÉON) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <span className="grid size-6 place-items-center rounded-lg bg-sky-600 text-white text-xs">
                    🎒
                  </span>
                  Packs Accompagnement & Suivi Mentor (Par Compte Famille)
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  1 ligne par compte parent — cliquez pour dérouler l'ensemble des enfants
                  accompagnés et gérer leurs séances.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                  {filteredFamilyGroups.length} famille{filteredFamilyGroups.length > 1 ? "s" : ""}{" "}
                  ({accompanimentPacks?.length ?? 0} pack
                  {(accompanimentPacks?.length ?? 0) > 1 ? "s" : ""})
                </span>
              </div>
            </div>

            {/* Barre d'outils : Recherche + Limite d'affichage + Tout Déplier/Replier */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-sky-100 shadow-sm">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
                <input
                  type="text"
                  placeholder="Rechercher par parent, email, tél, enfant ou mentor…"
                  value={packSearchQuery}
                  onChange={(e) => {
                    setPackSearchQuery(e.target.value);
                    setPackCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-ink/15 bg-surface/30 pl-10 pr-8 py-2 text-xs font-medium text-ink placeholder:text-ink/40 focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                />
                {packSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPackSearchQuery("");
                      setPackCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 hover:text-ink cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleExpandAllFamilies}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-all cursor-pointer"
                >
                  <Layers className="size-3.5" />
                  {expandedFamilyIds.size >= filteredFamilyGroups.length &&
                  filteredFamilyGroups.length > 0
                    ? "Replier tout"
                    : "Déplier tout"}
                </button>

                <div className="flex items-center gap-1.5 text-xs text-ink/60 font-medium">
                  <span>Afficher :</span>
                  <select
                    value={packPageSize}
                    onChange={(e) => {
                      setPackPageSize(Number(e.target.value));
                      setPackCurrentPage(1);
                    }}
                    className="rounded-xl border border-ink/15 bg-white px-2 py-1.5 text-xs font-bold text-ink cursor-pointer focus:border-sky-500 focus:outline-none"
                  >
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tableau principal des comptes familles */}
            <div className="overflow-x-auto rounded-2xl border border-sky-200 bg-white shadow-sm">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-sky-100 bg-sky-50/60 text-[11px] font-black uppercase tracking-wider text-sky-900">
                  <tr>
                    <th className="px-4 py-3">Compte Famille & Contact</th>
                    <th className="px-4 py-3">Enfants Suivis</th>
                    <th className="px-4 py-3">Séances Foyer</th>
                    <th className="px-4 py-3">Tarif Cumulé</th>
                    <th className="px-4 py-3">Statut & Échéance</th>
                    <th className="px-4 py-3 text-right">Détail des Enfants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {paginatedFamilyGroups.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
                        {packSearchQuery
                          ? "Aucun compte famille ne correspond à votre recherche."
                          : "Aucun pack accompagnement actif."}
                      </td>
                    </tr>
                  )}
                  {paginatedFamilyGroups.map((family) => {
                    const isExpanded = expandedFamilyIds.has(family.userId);
                    const periodEnded =
                      family.activePacks > 0 &&
                      family.latestEndsAt &&
                      new Date(family.latestEndsAt).getTime() < Date.now();

                    return (
                      <Fragment key={family.userId}>
                        <tr
                          onClick={() => toggleExpandFamily(family.userId)}
                          className={
                            "cursor-pointer transition-colors " +
                            (isExpanded ? "bg-sky-50/30 " : "hover:bg-surface/50 ") +
                            (periodEnded ? "bg-rose-50/40" : "")
                          }
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-ink text-sm">
                                {family.parentName ?? family.parentEmail ?? "Compte Famille"}
                              </p>
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-800">
                                {family.packs.length} enfant{family.packs.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-xs text-ink/50 mt-0.5">
                              {family.parentEmail ?? "—"}
                              {family.parentPhone ? ` · ${family.parentPhone}` : ""}
                            </p>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {family.packs.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-0.5 text-xs font-semibold text-ink/80 border border-ink/5"
                                >
                                  <span>{p.childName}</span>
                                  {p.childAge && (
                                    <span className="text-[10px] text-ink/40 font-bold">
                                      ({p.childAge}a)
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="text-xs font-bold text-ink">
                              <span className="text-emerald-600 font-extrabold">
                                {family.totalSessionsRemaining}
                              </span>{" "}
                              / {family.totalSessions} séances restantes
                            </p>
                            <p className="text-[10px] text-ink/50 font-medium">
                              {family.totalSessionsUsed} séance
                              {family.totalSessionsUsed > 1 ? "s" : ""} consommée
                              {family.totalSessionsUsed > 1 ? "s" : ""}
                            </p>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-ink text-xs">
                            {formatXof(family.totalPriceXof)} /mois
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                family.activePacks > 0
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                  : "bg-ink/10 text-ink/60 border-ink/10"
                              }`}
                            >
                              {family.activePacks > 0 ? "Active" : "Expirée"}
                            </span>
                            {family.latestEndsAt ? (
                              <p className="text-[11px] font-medium text-ink/60 mt-1">
                                Jusqu'au {new Date(family.latestEndsAt).toLocaleDateString("fr-FR")}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandFamily(family.userId);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-all cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  Masquer ({family.packs.length})
                                  <ChevronUp className="size-3.5" />
                                </>
                              ) : (
                                <>
                                  Voir les {family.packs.length} enfants
                                  <ChevronDown className="size-3.5" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Sous-table déroulée par enfant */}
                        {isExpanded && (
                          <tr className="bg-sky-50/40">
                            <td colSpan={6} className="px-4 py-3 border-y border-sky-100">
                              <div className="rounded-xl border border-sky-200 bg-white p-3 shadow-inner space-y-2">
                                <p className="text-[11px] font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                                  <Users className="size-3.5 text-sky-600" />
                                  Détail des {family.packs.length} enfant
                                  {family.packs.length > 1 ? "s" : ""} suivi
                                  {family.packs.length > 1 ? "s" : ""} pour{" "}
                                  {family.parentName ?? family.parentEmail} :
                                </p>
                                <div className="divide-y divide-sky-100/60">
                                  {family.packs.map((p) => {
                                    const childRemaining = Math.max(0, p.sessions - p.sessionsUsed);
                                    return (
                                      <div
                                        key={p.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                                      >
                                        <div className="flex items-center gap-2 min-w-40">
                                          <div className="grid size-7 place-items-center rounded-lg bg-sky-100 text-sky-800 text-xs font-bold shrink-0">
                                            {p.childName.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-bold text-xs text-ink flex items-center gap-1">
                                              <span>{p.childName}</span>
                                              {p.childAge && (
                                                <span className="text-[10px] text-ink/50 font-normal">
                                                  ({p.childAge} ans)
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="text-xs">
                                          <span className="text-[10px] font-bold text-ink/40 uppercase mr-1">
                                            Mentor :
                                          </span>
                                          {p.mentorEmail ? (
                                            <span className="inline-flex items-center gap-1 font-semibold text-ink/80">
                                              <span className="size-1.5 rounded-full bg-emerald-500" />
                                              {p.mentorEmail}
                                            </span>
                                          ) : (
                                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                              Non assigné
                                            </span>
                                          )}
                                        </div>

                                        <div className="text-xs">
                                          <span className="text-[10px] font-bold text-ink/40 uppercase mr-1">
                                            Séances :
                                          </span>
                                          <span className="font-bold text-emerald-700">
                                            {childRemaining}
                                          </span>
                                          <span className="text-ink/60">
                                            {" "}
                                            / {p.sessions} restantes
                                          </span>
                                        </div>

                                        <div className="text-xs font-semibold text-ink">
                                          {p.priceXof ? formatXof(p.priceXof) : "180 000 FCFA"}{" "}
                                          /mois
                                        </div>

                                        <div className="text-xs text-ink/60">
                                          {p.endsAt ? (
                                            <>
                                              Fin : {new Date(p.endsAt).toLocaleDateString("fr-FR")}
                                              <span className="ml-1 text-[10px] text-ink/40">
                                                (
                                                {Math.max(
                                                  0,
                                                  Math.ceil(
                                                    (new Date(p.endsAt).getTime() - Date.now()) /
                                                      86_400_000,
                                                  ),
                                                )}{" "}
                                                j)
                                              </span>
                                            </>
                                          ) : (
                                            "—"
                                          )}
                                        </div>

                                        <div className="shrink-0">
                                          <button
                                            type="button"
                                            disabled={extendingPackId === p.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void handleExtendAccompanimentPack(p.id, 1, 12);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
                                            title="Ajoute 12 séances et prolonge la période de 1 mois"
                                          >
                                            {extendingPackId === p.id ? (
                                              <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                              <Plus className="size-3" />
                                            )}
                                            +12 séances (+1 mois)
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination des familles */}
            <AdminPagination
              page={packCurrentPage}
              totalPages={totalFamilyPages}
              total={filteredFamilyGroups.length}
              pageSize={packPageSize}
              onPageChange={(pg) => setPackCurrentPage(pg)}
              label="famille"
            />
          </div>

          {/* 2. TABLEAU DES ABONNEMENTS FAMILLE (GLOBAL COMPTE) */}
          <div className="space-y-3 pt-4 border-t border-ink/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <CreditCard className="size-4 text-emerald-600" />
                  Abonnements Famille Standard (Au Compte)
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Abonnement récurrent débloquant l'accès à l'application Naya pour toute la fratrie
                  (35 000 FCFA/mois).
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {filteredSubscriptions.length} abonnement
                {filteredSubscriptions.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Barre de recherche abonnements standard */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-ink/10 shadow-sm">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/40" />
                <input
                  type="text"
                  placeholder="Rechercher par parent, email, téléphone…"
                  value={subSearchQuery}
                  onChange={(e) => {
                    setSubSearchQuery(e.target.value);
                    setSubCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-ink/15 bg-surface/30 pl-10 pr-8 py-2 text-xs font-medium text-ink placeholder:text-ink/40 focus:border-ink focus:bg-white focus:outline-none transition-all"
                />
                {subSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubSearchQuery("");
                      setSubCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 hover:text-ink cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink/60 font-medium shrink-0">
                <span>Afficher :</span>
                <select
                  value={subPageSize}
                  onChange={(e) => {
                    setSubPageSize(Number(e.target.value));
                    setSubCurrentPage(1);
                  }}
                  className="rounded-xl border border-ink/15 bg-white px-2 py-1.5 text-xs font-bold text-ink cursor-pointer focus:border-ink focus:outline-none"
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
                  <tr>
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Tarif</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Fin de période</th>
                    <th className="px-4 py-3">Secours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {paginatedSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink/40">
                        {subSearchQuery
                          ? "Aucun abonnement famille ne correspond à votre recherche."
                          : "Aucun abonnement famille."}
                      </td>
                    </tr>
                  )}
                  {paginatedSubscriptions.map((s: AdminSubscriptionRow) => {
                    const periodEnded =
                      s.status === "active" &&
                      s.currentPeriodEnd &&
                      new Date(s.currentPeriodEnd).getTime() < Date.now();
                    return (
                      <tr key={s.id} className={periodEnded ? "bg-rose-50/50" : ""}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-ink">{s.parentName ?? "—"}</p>
                          <p className="text-xs text-ink/50">
                            {s.parentEmail ?? "—"}
                            {s.parentPhone ? ` · ${s.parentPhone}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-bold text-ink">
                          {s.priceXof ? `${formatXof(s.priceXof)} /mois` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <SubStatusBadge status={s.status} />
                          {periodEnded && (
                            <p className="mt-1 text-[10px] font-bold text-rose-600">
                              ⚠ période dépassée — renouvellement webhook probablement manqué
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.currentPeriodEnd ? (
                            <>
                              <p className="font-semibold text-ink">
                                {new Date(s.currentPeriodEnd).toLocaleDateString("fr-FR")}
                              </p>
                              <p className="text-[10px] font-medium text-ink/40">
                                {Math.max(
                                  0,
                                  Math.ceil(
                                    (new Date(s.currentPeriodEnd).getTime() - Date.now()) /
                                      86_400_000,
                                  ),
                                )}{" "}
                                j restant
                              </p>
                            </>
                          ) : (
                            <span className="text-ink/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {s.status === "initiated" && (
                              <button
                                disabled={busyId === s.id}
                                onClick={() => void handleActivateSubscription(s.id)}
                                className="inline-flex items-center gap-1 rounded-xl bg-ink px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-ink/90 disabled:opacity-50 cursor-pointer"
                                title="Vérifie la référence Paystack puis active l'abonnement (secours du 1er paiement)"
                              >
                                {busyId === s.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <ShieldCheck className="size-3" />
                                )}
                                Activer (vérifier ref)
                              </button>
                            )}
                            {s.status === "active" && (
                              <>
                                <button
                                  disabled={extendingId === s.id}
                                  onClick={() => void handleExtendSubscription(s.id, 1)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
                                >
                                  <CalendarClock className="size-3" />
                                  +1 mois
                                </button>
                                <button
                                  disabled={extendingId === s.id}
                                  onClick={() => void handleExtendSubscription(s.id, 3)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
                                >
                                  <CalendarClock className="size-3" />
                                  +3 mois
                                </button>
                              </>
                            )}
                            {s.status !== "cancelled" && s.status !== "expired" && (
                              <button
                                disabled={busyId === s.id}
                                onClick={() => void handleCancelSubscription(s.id)}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                              >
                                <UserX className="size-3" />
                                Résilier
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination des abonnements standard */}
            <AdminPagination
              page={subCurrentPage}
              totalPages={totalSubPages}
              total={filteredSubscriptions.length}
              pageSize={subPageSize}
              onPageChange={(pg) => setSubCurrentPage(pg)}
              label="abonnement"
            />
          </div>
        </div>
      )}

      {/* ══ SECTION PARRAINAGES ══ */}
      {section === "sponsorships" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink/60">
              Historique des parrainages Diaspora & RSE (hors lots B2B — gérés par campagne).
            </p>
            <button
              onClick={() => setShowCreateSponsorship(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand/90 transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Créer un code manuellement
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Parrain</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Paiement</th>
                  <th className="px-4 py-3">État</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {(sponsorships ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink/40">
                      Aucun parrainage.
                    </td>
                  </tr>
                )}
                {(sponsorships ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-ink">{t.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{t.sponsor_name}</p>
                      <p className="text-xs text-ink/50">{t.sponsor_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink/70">
                      {t.months_count} mois
                    </td>
                    <td className="px-4 py-3">
                      {t.payment_confirmed ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          <CheckCircle2 className="size-3" />
                          Confirmé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          ⏳ Non confirmé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink/70">
                      {t.is_redeemed ? "Utilisé" : "Disponible"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {!t.payment_confirmed && (
                          <button
                            disabled={confirmingId === t.id}
                            onClick={() => void handleConfirmSponsorship(t.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-ink px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-ink/90 disabled:opacity-50 cursor-pointer"
                          >
                            {confirmingId === t.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <HandCoins className="size-3" />
                            )}
                            Confirmer paiement
                          </button>
                        )}
                        <button
                          onClick={() => copyCode(t.code)}
                          className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-2.5 py-1.5 text-[10px] font-bold text-ink/60 hover:bg-surface/60 transition-all cursor-pointer"
                        >
                          <Copy className="size-3" />
                          {copiedCode === t.code ? "Copié !" : "Copier"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SECTION RENOUVELLEMENTS ══ */}
      {section === "expirations" && (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-4 py-3">Enfant</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Secours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {(expirations ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink/40">
                    Aucune expiration à venir dans les 14 prochains jours.
                  </td>
                </tr>
              )}
              {(expirations ?? []).map((e) => (
                <tr key={e.childId}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{e.childName}</p>
                    {e.campaignName && <p className="text-xs text-ink/50">{e.campaignName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-ink/10 bg-surface px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink/60">
                      {e.source === "season"
                        ? "Saison"
                        : e.source === "access"
                          ? "Accès"
                          : "Famille"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">
                      {e.endDate ? new Date(e.endDate).toLocaleDateString("fr-FR") : "—"}
                    </p>
                    <p className="text-[10px] font-medium text-ink/40">
                      {e.daysLeft != null && e.daysLeft >= 0 ? `${e.daysLeft} j restants` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        disabled={extendingId === e.childId}
                        onClick={() => void handleExtendAccess(e.childId, 1)}
                        className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
                      >
                        <CalendarClock className="size-3" />
                        +1 mois
                      </button>
                      <button
                        disabled={extendingId === e.childId}
                        onClick={() => void handleExtendAccess(e.childId, 3)}
                        className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
                      >
                        <CalendarClock className="size-3" />
                        +3 mois
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale : créer un code de parrainage ── */}
      {showCreateSponsorship && (
        <CreateSponsorshipModal
          onClose={() => setShowCreateSponsorship(false)}
          onCreated={() => {
            setShowCreateSponsorship(false);
            void loadAll();
          }}
        />
      )}
    </div>
  );
}

function CreateSponsorshipModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { session } = useSession();
  const createFn = useServerFn(createSponsorshipTokenAdmin);
  const opts = session?.access_token
    ? { headers: { Authorization: `Bearer ${session.access_token}` } }
    : {};
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [months, setMonths] = useState(3);
  const [amountXof, setAmountXof] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!sponsorName.trim() || !sponsorEmail.trim()) {
      toast.error("Nom et email du parrain sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createFn({
        data: {
          sponsorName: sponsorName.trim(),
          sponsorEmail: sponsorEmail.trim(),
          months,
          amountXof,
        },
        ...opts,
      });
      toast.success(`Code de parrainage créé : ${res.code}`);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création du code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 overflow-y-auto"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md my-auto rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand">
            Secours parrainage
          </p>
          <h3 className="mt-1 font-display text-lg font-black text-ink">
            Créer un code de parrainage
          </h3>
          <p className="mt-1 text-xs text-ink/60">
            Crée un code CONFIRMÉ (prêt à être rédimé) — secours d'un parrainage en ligne dont le
            paiement est confirmé mais dont le code n'a jamais été généré.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-bold text-ink/70">Nom du parrain</p>
            <input
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              placeholder="ex. M. Diallo"
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-ink/70">Email du parrain</p>
            <input
              value={sponsorEmail}
              onChange={(e) => setSponsorEmail(e.target.value)}
              placeholder="ex. parrain@mail.com"
              className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-bold text-ink/70">Durée</p>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              >
                {[1, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} mois
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-ink/70">Montant payé (XOF)</p>
              <input
                type="number"
                min={0}
                value={amountXof}
                onChange={(e) => setAmountXof(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            disabled={submitting}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <HeartHandshake className="size-3.5" />
            )}
            Créer le code
          </button>
        </div>
      </div>
    </div>
  );
}

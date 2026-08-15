import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
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
import { getSubscriptionsDataAdmin, type AdminSubscriptionRow } from "@/lib/subscriptions.functions";
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
  const cfg = PAYMENT_STATUS_LABELS[status] ?? { label: status, className: "bg-ink/10 text-ink/60 border-ink/10" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function SubStatusBadge({ status }: { status: string }) {
  const cfg = SUB_STATUS_LABELS[status] ?? { label: status, className: "bg-ink/10 text-ink/60 border-ink/10" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

type PaymentsSection = "payments" | "subscriptions" | "sponsorships" | "expirations";

export function AdminPaymentsTab() {
  const { session } = useSession();
  const opts = session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};

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

  const [section, setSection] = useState<PaymentsSection>("payments");
  const [payments, setPayments] = useState<AdminPaymentRow[] | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "initiated">("initiated");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[] | null>(null);
  const [sponsorships, setSponsorships] = useState<SponsorshipToken[] | null>(null);
  const [expirations, setExpirations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showCreateSponsorship, setShowCreateSponsorship] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, subs, sp, exp, pending] = await Promise.all([
        listPaymentsFn({
          data: { page: paymentsPage, pageSize: 50, status: paymentFilter },
          ...opts,
        }).catch(() => null),
        getSubsFn({ data: undefined, ...opts }).catch(() => ({ subscriptions: [] })),
        listSponsorshipsFn({ data: { page: 1, pageSize: 50 }, ...opts }).catch(() => ({ data: [] })),
        getExpirationsFn({ data: undefined, ...opts }).catch(() => []),
        getPendingPaymentsFn({ data: undefined, ...opts }).catch(() => null),
      ]);
      setPayments((p as any)?.data ?? []);
      setPaymentsTotal((p as any)?.total ?? 0);
      setPaymentsTotalPages((p as any)?.totalPages ?? 1);
      setPendingCount((pending as any)?.pendingCount ?? 0);
      setSubscriptions((subs as any)?.subscriptions ?? []);
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
    if (session) void loadAll();
  }, [session]);

  const handleRetry = async (paymentId: string, mode: "verify" | "manual") => {
    setBusyId(paymentId);
    try {
      const res = await retryFn({ data: { paymentId, mode }, ...opts });
      if (res.ok) {
        toast.success(`Paiement exécuté : ${res.detail}`);
        await loadAll();
      } else {
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
        toast.success(`Période prolongée de ${months} mois — échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`);
      } else {
        toast.error("Prolongation impossible", { description: res.reason });
      }
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la prolongation.");
    } finally {
      setExtendingId(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    const ok = await confirmDialog({
      title: "Résilier cet abonnement ?",
      description: "L'abonnement Paystack sera désactivé et la couverture famille s'arrêtera à la fin de la période.",
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
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la résiliation.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmSponsorship = async (tokenId: string) => {
    setConfirmingId(tokenId);
    try {
      await confirmSponsorshipFn({ data: { tokenId }, ...opts });
      toast.success("Paiement du parrainage confirmé — le code est utilisable.");
      await loadAll();
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
      toast.success(`Accès prolongé de ${months} mois — échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`);
      await loadAll();
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
    { id: "payments", label: `Paiements ${pendingCount > 0 ? `· ${pendingCount} en attente` : ""}` },
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
          onClick={() => void loadAll()}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-surface/60 transition-all cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
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
                <h3 className="font-display text-base font-black text-ink">Secours webhook de paiement</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink/70">
                  Un paiement resté « en attente » n'a pas été exécuté (webhook manqué, page de retour
                  perdue, divergence de montant). <strong>Vérifier & exécuter</strong> interroge Paystack
                  (statut + montant) puis applique le bénéfice ; <strong>Marquer reçu</strong> exécute sans
                  Paystack (paiement WhatsApp / Mobile Money — décision administrative). L'opération est
                  idempotente : un paiement déjà exécuté n'est jamais rejoué.
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
                      Aucun paiement {paymentFilter === "initiated" ? "en attente" : ""} — tout est fluide.
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
                            {busyId === p.id ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
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

      {/* ══ SECTION ABONNEMENTS ══ */}
      {section === "subscriptions" && (
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
              {(subscriptions ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink/40">
                    Aucun abonnement famille.
                  </td>
                </tr>
              )}
              {(subscriptions ?? []).map((s: AdminSubscriptionRow) => {
                const periodEnded =
                  s.status === "active" && s.currentPeriodEnd && new Date(s.currentPeriodEnd).getTime() < Date.now();
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
                            {Math.max(0, Math.ceil((new Date(s.currentPeriodEnd).getTime() - Date.now()) / 86_400_000))} j restant
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
                            {busyId === s.id ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
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
                            {confirmingId === t.id ? <Loader2 className="size-3 animate-spin" /> : <HandCoins className="size-3" />}
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
                      {e.source === "season" ? "Saison" : e.source === "access" ? "Accès" : "Famille"}
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
      {showCreateSponsorship && <CreateSponsorshipModal onClose={() => setShowCreateSponsorship(false)} onCreated={() => { setShowCreateSponsorship(false); void loadAll(); }} />}
    </div>
  );
}

function CreateSponsorshipModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { session } = useSession();
  const createFn = useServerFn(createSponsorshipTokenAdmin);
  const opts = session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};
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
      const res = await createFn({ data: { sponsorName: sponsorName.trim(), sponsorEmail: sponsorEmail.trim(), months, amountXof }, ...opts });
      toast.success(`Code de parrainage créé : ${res.code}`);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création du code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => !submitting && onClose()}>
      <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand">Secours parrainage</p>
          <h3 className="mt-1 font-display text-lg font-black text-ink">Créer un code de parrainage</h3>
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
                  <option key={m} value={m}>{m} mois</option>
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
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <HeartHandshake className="size-3.5" />}
            Créer le code
          </button>
        </div>
      </div>
    </div>
  );
}

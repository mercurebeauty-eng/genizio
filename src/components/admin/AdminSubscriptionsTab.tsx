import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle,
  UserX,
  HeartHandshake,
  Search,
} from "lucide-react";
import {
  getSubscriptionsDataAdmin,
  type SubscriptionsAdminData,
  type AdminSubscriptionRow,
} from "@/lib/subscriptions.functions";
import { formatXof } from "@/lib/pricing";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  initiated: { label: "Initiation", className: "bg-sky-500/10 text-sky-600 border-sky-200" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  past_due: {
    label: "En retard",
    className: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  cancelled: { label: "Résiliée", className: "bg-rose-500/10 text-rose-600 border-rose-200" },
  expired: { label: "Expirée", className: "bg-ink/10 text-ink/60 border-ink/10" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? {
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

export function AdminSubscriptionsTab() {
  const { session } = useSession();
  const getDataFn = useServerFn(getSubscriptionsDataAdmin);
  const [data, setData] = useState<SubscriptionsAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const load = async (showMainLoader = false) => {
    if (showMainLoader) setLoading(true);
    else setRefreshing(true);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      const res = await getDataFn({ data: undefined, ...opts });
      setData(res);
    } catch (err: any) {
      console.error("getSubscriptionsDataAdmin error", err);
      toast.error(err?.message || "Erreur lors du chargement des abonnements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) void load(true);
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <GenizioLoader label="Chargement des abonnements famille…" />
      </div>
    );
  }

  const subs = data?.subscriptions ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? subs.filter(
        (s) =>
          s.parentName?.toLowerCase().includes(q) ||
          s.parentEmail?.toLowerCase().includes(q) ||
          s.parentPhone?.toLowerCase().includes(q),
      )
    : subs;

  return (
    <div className="space-y-6">
      {/* ── KPIs abonnements ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">
              MRR estimé
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">
            {formatXof(data?.mrrXof ?? 0)}
          </p>
          <p className="text-xs font-medium text-ink/50">facturé / mois (actifs + en retard)</p>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600">
            <CreditCard className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">
              Actives
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">
            {data?.activeCount ?? 0}
          </p>
          <p className="text-xs font-medium text-ink/50">familles prélevées</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">
              En retard
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">
            {data?.pastDueCount ?? 0}
          </p>
          <p className="text-xs font-medium text-ink/50">à relancer (WhatsApp)</p>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600">
            <UserX className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">
              Churn 30 j
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink">
            {data?.churn30dCount ?? 0}
          </p>
          <p className="text-xs font-medium text-ink/50">
            sur {data?.cancelledCount ?? 0} résiliée{data?.cancelledCount === 1 ? "" : "s"} au total
          </p>
        </div>
      </div>

      {/* ── Tableau des familles ── */}
      <div className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-black text-ink">Abonnements par famille</h3>
            <p className="text-xs font-medium text-ink/50">
              {subs.length} famille{subs.length > 1 ? "s" : ""} — la couverture réelle est calculée
              à la volée par le résolveur (abonnement OU parrainage).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un parent…"
                className="w-full sm:w-56 rounded-xl border border-ink/10 bg-surface/60 pl-9 pr-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand/50 focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={() => load(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-surface/60 transition-all disabled:opacity-50 cursor-pointer"
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Actualiser
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-surface/40 px-6 py-12 text-center">
            <CreditCard className="mx-auto size-8 text-ink/30" />
            <p className="mt-3 text-sm font-bold text-ink/60">
              {q
                ? "Aucun parent ne correspond à cette recherche."
                : "Aucun abonnement famille pour l'instant."}
            </p>
            <p className="text-xs font-medium text-ink/40">
              Les souscriptions apparaissent dès qu'un parent initie le checkout famille.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-[10px] font-black uppercase tracking-wider text-ink/40">
                  <th className="py-2.5 pr-3">Parent</th>
                  <th className="py-2.5 pr-3">Tarif</th>
                  <th className="py-2.5 pr-3">Statut</th>
                  <th className="py-2.5 pr-3">Fin de période</th>
                  <th className="py-2.5 pr-3">Couverte par parrainage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {filtered.map((s: AdminSubscriptionRow) => (
                  <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                          <span className="text-xs font-black">
                            {(s.parentName ?? s.parentEmail ?? "?").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{s.parentName ?? "—"}</p>
                          <p className="truncate text-xs font-medium text-ink/50">
                            {s.parentEmail ?? "—"}
                            {s.parentPhone ? ` · ${s.parentPhone}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-ink">
                        {s.priceXof ? formatXof(s.priceXof) : "—"}
                      </p>
                      <p className="text-[10px] font-medium text-ink/40">/mois · famille</p>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={s.status} />
                      {s.status === "initiated" && s.currentPeriodStart === null && (
                        <p className="mt-1 text-[10px] font-medium text-ink/40">
                          checkout non terminé
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {s.currentPeriodEnd ? (
                        <>
                          <p className="font-semibold text-ink">
                            {new Date(s.currentPeriodEnd).toLocaleDateString("fr-FR")}
                          </p>
                          <p className="text-[10px] font-medium text-ink/40">
                            {(() => {
                              const days = Math.max(
                                0,
                                Math.ceil(
                                  (new Date(s.currentPeriodEnd!).getTime() - Date.now()) /
                                    86_400_000,
                                ),
                              );
                              return `${days} j restant${days > 1 ? "s" : ""}`;
                            })()}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {s.sponsoredUntil ? (
                        <div className="flex items-center gap-1.5">
                          <HeartHandshake className="size-3.5 text-brand" />
                          <div>
                            <p className="font-semibold text-ink">
                              jusqu'au {new Date(s.sponsoredUntil).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-[10px] font-medium text-ink/40">
                              {s.creditsCount} crédit{s.creditsCount > 1 ? "s" : ""} posé
                              {s.creditsCount > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

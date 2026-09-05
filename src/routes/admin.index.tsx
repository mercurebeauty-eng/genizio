import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import {
  togglePassportUnlock,
  updateOrderStatus,
  updateProfileQuotaAdmin,
} from "@/lib/products.functions";
import {
  getExecutiveKPIsAdmin,
  getTalentCityStatsAdmin,
  getNayaTelemetryAdmin,
  getCommercePassportsDataAdmin,
  getAiProviderStatusAdmin,
  getProgressionHealthAdmin,
  ExecutiveKPIs,
  ParentBIRC,
  TalentCityStatsResponse,
  type PaginatedCommerceResponse,
  AiProviderStatus,
  ProgressionHealthResponse,
} from "@/lib/admin-os.functions";
import { NayaTelemetryResponse } from "@/lib/naya-telemetry";
import {
  decideLoupSuggestionsAdmin,
  getConstitutionSuggestionsAdmin,
  runLoupAutoAcknowledgementAdmin,
  type ConstitutionSuggestionsResponse,
} from "@/lib/naya-constitution.functions";
import { AdminNavTabBar, ADMIN_TABS, type AdminRoute } from "@/components/admin/AdminNavTabBar";
import { AdminExecutiveTab } from "@/components/admin/AdminExecutiveTab";
import { AdminTalentsCitiesTab } from "@/components/admin/AdminTalentsCitiesTab";
import { AdminNayaTab } from "@/components/admin/AdminNayaTab";
import { AdminCommerceTab } from "@/components/admin/AdminCommerceTab";
import { AdminPaymentsTab } from "@/components/admin/AdminPaymentsTab";
import { AdminCampaignsTab } from "@/components/admin/AdminCampaignsTab";
import { AdminMentorsTab } from "@/components/admin/AdminMentorsTab";
import { AdminEducatorsTab } from "@/components/admin/AdminEducatorsTab";
import { AdminEventsTab } from "@/components/admin/AdminEventsTab";
import { AdminProductsTab } from "@/components/admin/AdminProductsTab";
import { AdminProfilesTab } from "@/components/admin/AdminProfilesTab";
import { AdminTestimonialsTab } from "@/components/admin/AdminTestimonialsTab";
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminDiscoveryTab } from "@/components/admin/AdminDiscoveryTab";
import { getPaymentsPendingCountAdmin } from "@/lib/payments-admin.functions";
import { getSafeguardingPendingCountAdmin } from "@/lib/safeguarding.functions";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const { session } = useSession();
  // Refonte UI/UX (2026-08-13) : l'écran d'accueil est une grille de cartes ; un
  // onglet ouvert affiche la barre de pills persistante (bouton Accueil pour revenir).
  const [activeTab, setActiveTab] = useState<AdminRoute>("home");
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingSafetyAlerts, setPendingSafetyAlerts] = useState(0);
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);
  const [parents, setParents] = useState<ParentBIRC[]>([]);
  const [talentStats, setTalentStats] = useState<TalentCityStatsResponse | null>(null);
  const [nayaTelemetry, setNayaTelemetry] = useState<NayaTelemetryResponse | null>(null);
  const [aiProviderStatus, setAiProviderStatus] = useState<AiProviderStatus | null>(null);
  const [progressionHealth, setProgressionHealth] = useState<ProgressionHealthResponse | null>(
    null,
  );
  const [commerceData, setCommerceData] = useState<PaginatedCommerceResponse | null>(null);
  const [loupConstitution, setLoupConstitution] = useState<ConstitutionSuggestionsResponse | null>(
    null,
  );
  const [decidingRuleKeys, setDecidingRuleKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination de l'annuaire Exécutif (Vague 4) — un changement de page ne refetch
  // que l'onglet, pas tout l'Admin OS.
  const [execPage, setExecPage] = useState(1);
  const [execTotal, setExecTotal] = useState(0);
  const [execTotalPages, setExecTotalPages] = useState(1);

  // Pagination & filtre des commandes (Vague 4) — mêmes principes que l'Exécutif.
  const [commercePage, setCommercePage] = useState(1);
  const [commerceStatus, setCommerceStatus] = useState("Tous");
  const [commerceTotal, setCommerceTotal] = useState(0);
  const [commerceTotalPages, setCommerceTotalPages] = useState(1);

  const getExecutiveKPIsFn = useServerFn(getExecutiveKPIsAdmin);
  const getTalentStatsFn = useServerFn(getTalentCityStatsAdmin);
  const getNayaTelemetryFn = useServerFn(getNayaTelemetryAdmin);
  const getAiProviderStatusFn = useServerFn(getAiProviderStatusAdmin);
  const getProgressionHealthFn = useServerFn(getProgressionHealthAdmin);
  const getCommerceDataFn = useServerFn(getCommercePassportsDataAdmin);
  const getPendingPaymentsFn = useServerFn(getPaymentsPendingCountAdmin);
  const getSafetyPendingFn = useServerFn(getSafeguardingPendingCountAdmin);
  const toggleUnlockFn = useServerFn(togglePassportUnlock);
  const updateOrderStatusFn = useServerFn(updateOrderStatus);
  const updateProfileQuotaFn = useServerFn(updateProfileQuotaAdmin);
  const runLoupAutoAckFn = useServerFn(runLoupAutoAcknowledgementAdmin);
  const getConstitutionFn = useServerFn(getConstitutionSuggestionsAdmin);
  const decideLoupFn = useServerFn(decideLoupSuggestionsAdmin);

  const loadData = async (showMainLoader = false) => {
    if (showMainLoader) setLoading(true);
    else setIsRefreshing(true);

    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    try {
      const [execData, talentData, nayaData, aiStatus, progressionData, commData] =
        await Promise.all([
          getExecutiveKPIsFn({ data: { page: execPage, pageSize: 20 }, ...opts }).catch((err) => {
            console.error("execData error", err);
            return null;
          }),
          getTalentStatsFn({ data: undefined, ...opts }).catch((err) => {
            console.error("talentData error", err);
            return null;
          }),
          getNayaTelemetryFn({ data: undefined, ...opts }).catch((err) => {
            console.error("nayaData error", err);
            return null;
          }),
          getAiProviderStatusFn({ data: undefined, ...opts }).catch((err) => {
            console.error("aiStatus error", err);
            return null;
          }),
          getProgressionHealthFn({ data: undefined, ...opts }).catch((err) => {
            console.error("progressionData error", err);
            return null;
          }),
          getCommerceDataFn({
            data: { page: commercePage, pageSize: 50, status: commerceStatus },
            ...opts,
          }).catch((err) => {
            console.error("commData error", err);
            return null;
          }),
        ]);
      if (execData) {
        setKpis(execData.kpis);
        setParents(execData.parents ?? []);
        setExecTotal(execData.total ?? 0);
        setExecTotalPages(execData.totalPages ?? 1);
      }
      if (talentData) setTalentStats(talentData);
      if (nayaData) setNayaTelemetry(nayaData);
      if (aiStatus) setAiProviderStatus(aiStatus);
      if (progressionData) setProgressionHealth(progressionData);
      if (commData) {
        setCommerceData(commData);
        setCommerceTotal(commData.total ?? 0);
        setCommerceTotalPages(commData.totalPages ?? 1);
      }

      // Comptage des paiements en attente (badge de la carte « Paiements & Accès »).
      const pending = await getPendingPaymentsFn({ data: undefined, ...opts }).catch(() => null);
      if (pending) setPendingPayments(pending.pendingCount);

      // Comptage des alertes de sécurité en attente (badge de la carte « Mentors »).
      const safetyPending = await getSafetyPendingFn({ data: undefined, ...opts }).catch(() => null);
      if (safetyPending) setPendingSafetyAlerts(safetyPending.openReportsCount);

      // « Le Loup qui apprend » (Décision #56) : l'auto-acquittement paresseux
      // par seuil de confiance s'exécute AVANT la lecture des suggestions, pour
      // que le GET reflète les règles déjà décidées automatiquement. L'étape
      // est idempotente : une seconde exécution ne retrouve plus rien à faire.
      await runLoupAutoAckFn({ data: undefined, ...opts }).catch((err) => {
        console.error("loupAutoAck error", err);
        return null;
      });
      const loupConstitution = await getConstitutionFn({ data: undefined, ...opts }).catch(
        (err) => {
          console.error("loupConstitution error", err);
          return null;
        },
      );
      if (loupConstitution) setLoupConstitution(loupConstitution);
    } catch (err: any) {
      console.error("Error fetching executive data:", err);
      toast.error("Erreur lors du chargement des données Admin OS.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Changement de page de l'annuaire Exécutif — refetch isolé (Vague 4), sans relancer
  // les 5 autres onglets ni le Loup.
  const handleExecPageChange = async (page: number) => {
    setExecPage(page);
    setIsRefreshing(true);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      const execData = await getExecutiveKPIsFn({ data: { page, pageSize: 20 }, ...opts });
      if (execData) {
        setKpis(execData.kpis);
        setParents(execData.parents ?? []);
        setExecTotal(execData.total ?? 0);
        setExecTotalPages(execData.totalPages ?? 1);
      }
    } catch (err: any) {
      console.error("Erreur de pagination Exécutif:", err);
      toast.error("Erreur lors du changement de page.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Changement de page / filtre des commandes (Vague 4) — refetch isolé de l'onglet.
  const loadCommerce = async (page: number, status: string) => {
    setIsRefreshing(true);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      const data = await getCommerceDataFn({ data: { page, pageSize: 50, status }, ...opts });
      if (data) {
        setCommerceData(data);
        setCommerceTotal(data.total ?? 0);
        setCommerceTotalPages(data.totalPages ?? 1);
      }
    } catch (err: any) {
      console.error("Erreur de pagination Commerce:", err);
      toast.error("Erreur lors du changement de page.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      void loadData(true);
    }
  }, [session]);

  // Synchronisation en direct (Live Sync) de l'Admin OS (pastilles, KPIs, paiements)
  useEffect(() => {
    if (!session) return;

    const channel = supabase.channel("admin-os-global-sync");

    channel
      .on("broadcast", { event: "payment_updated" }, () => {
        void loadData(false);
      })
      .on("broadcast", { event: "commerce_updated" }, () => {
        void loadData(false);
      })
      .on("broadcast", { event: "passport_updated" }, () => {
        void loadData(false);
      })
      .on("broadcast", { event: "quota_updated" }, () => {
        void loadData(false);
      })
      .on("broadcast", { event: "loup_decision_updated" }, () => {
        void loadData(false);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          void loadData(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void loadData(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void loadData(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_profiles" },
        () => {
          void loadData(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generation_audits" },
        () => {
          void loadData(false);
        },
      )
      .subscribe();

    // Heartbeat de secours (toutes les 25s) pour parer aux coupures de connexion
    const interval = setInterval(() => {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      void getPendingPaymentsFn({ data: undefined, ...opts })
        .then((res) => {
          if (res && res.pendingCount !== pendingPayments) {
            setPendingPayments(res.pendingCount);
          }
        })
        .catch(() => {});
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [session, pendingPayments]);

  const handleTogglePassport = async (childId: string, unlock: boolean) => {
    try {
      const res = await toggleUnlockFn({ data: { childId, unlock } });
      if (res.ok) {
        toast.success(
          unlock ? "Passeport d'Excellence débloqué !" : "Passeport d'Excellence reverrouillé.",
        );
        const ch = supabase.channel("admin-os-global-sync");
        await ch.send({
          type: "broadcast",
          event: "passport_updated",
          payload: { childId, unlock, timestamp: Date.now() },
        });
        await loadData(false);
      } else {
        toast.error("Échec de la modification du statut passeport.");
      }
    } catch (err: any) {
      console.error("Erreur lors de la modification du statut passeport:", err);
      throw err;
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await updateOrderStatusFn({ data: { id: orderId, status: status as any } });
      if (res) {
        toast.success("Statut de la commande mis à jour avec succès.");
        await loadData(false);
      } else {
        toast.error("Échec de la mise à jour du statut de la commande.");
      }
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour de la commande:", err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface text-ink">
        <AppHeader />
        <div className="flex h-[80vh] items-center justify-center">
          <GenizioLoader label="Initialisation de Génizio Admin OS…" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-surface to-brand/5 text-ink pb-24">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Title Header */}
        <div className="mb-8">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand uppercase tracking-wider">
            Génizio Admin OS
          </span>
          <h1 className="font-display text-balance text-3xl font-extrabold md:text-4xl mt-1 text-ink">
            {activeTab === "home" ? "Pilotage Génizio" : "Panneau de pilotage"}
          </h1>
          <p className="text-sm font-medium text-ink/60 mt-1">
            Croissance, familles, paiements, commerce, talents et pouvoir admin — avec les secours
            manuels pour tout ce qui ne se déclenche pas tout seul.
          </p>
        </div>

        {/* Écran d'accueil : grille de cartes (refonte UI/UX 2026-08-13 ; rehaussée
            2026-08-13 — fond dégradé par onglet, pastille d'icône pleine, halo coloré,
            ombre portée au survol : fini les cartes blanches et fades). */}
        {activeTab === "home" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative overflow-hidden rounded-3xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tab.cardClass} cursor-pointer`}
                >
                  {/* Halo décoratif (coin supérieur droit) : s'intensifie au survol. */}
                  <div
                    className={`pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-gradient-to-br ${tab.haloClass} opacity-70 blur-2xl transition-all duration-300 group-hover:scale-125 group-hover:opacity-100`}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${tab.iconClass} text-white shadow-md`}
                    >
                      <Icon className="size-6" />
                    </div>
                    {tab.id === "payments" && pendingPayments > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm animate-pulse">
                        ● {pendingPayments} en attente
                      </span>
                    )}
                    {tab.id === "mentors" && pendingSafetyAlerts > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm animate-pulse">
                        ● {pendingSafetyAlerts} alerte{pendingSafetyAlerts > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-4">
                    <h3 className="font-display text-lg font-black text-ink">{tab.label}</h3>
                    <p className="text-xs font-semibold text-ink/55 mt-0.5">{tab.sublabel}</p>
                  </div>
                  <span
                    className={`relative mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 ${tab.badgeTextClass}`}
                  >
                    Ouvrir
                    <ChevronRight className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Barre de pills persistante */}
            <AdminNavTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onGoHome={() => setActiveTab("home")}
              badges={{
                payments: pendingPayments > 0 ? pendingPayments : undefined,
                mentors: pendingSafetyAlerts > 0 ? pendingSafetyAlerts : undefined,
              }}
            />

            {/* Tab Content Display */}
            {activeTab === "executive" && kpis && (
              <AdminExecutiveTab
                kpis={kpis}
                parents={parents}
                total={execTotal}
                totalPages={execTotalPages}
                page={execPage}
                onPageChange={(p) => void handleExecPageChange(p)}
                onDataChanged={() => void loadData(false)}
                onRefresh={() => loadData(false)}
                isRefreshing={isRefreshing}
              />
            )}

            {activeTab === "talents" && talentStats && (
              <AdminTalentsCitiesTab
                data={talentStats}
                isRefreshing={isRefreshing}
                onRefresh={() => loadData(false)}
              />
            )}

            {activeTab === "naya" && nayaTelemetry && (
              <AdminNayaTab
                telemetry={nayaTelemetry}
                aiProviderStatus={aiProviderStatus}
                progressionHealth={progressionHealth}
                isRefreshing={isRefreshing}
                onRefresh={() => loadData(false)}
                constitution={loupConstitution}
                onDataChanged={() => void loadData(false)}
              />
            )}

            {activeTab === "commerce" && commerceData && (
              <AdminCommerceTab
                data={commerceData}
                total={commerceTotal}
                totalPages={commerceTotalPages}
                page={commercePage}
                onPageChange={(pg) => {
                  setCommercePage(pg);
                  void loadCommerce(pg, commerceStatus);
                }}
                onStatusChange={(status) => {
                  setCommerceStatus(status);
                  setCommercePage(1);
                  void loadCommerce(1, status);
                }}
                isRefreshing={isRefreshing}
                onRefresh={() => loadData(false)}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onTogglePassport={handleTogglePassport}
                onOpenProductsTab={() => setActiveTab("products")}
              />
            )}

            {activeTab === "discovery" && <AdminDiscoveryTab />}
            {activeTab === "payments" && (
              <AdminPaymentsTab
                onDataChanged={() => void loadData(false)}
                onPendingCountChange={(count) => setPendingPayments(count)}
                isRefreshing={isRefreshing}
              />
            )}
            {activeTab === "b2b" && <AdminCampaignsTab />}
            {activeTab === "mentors" && (
              <AdminMentorsTab
                onDataChanged={() => void loadData(false)}
                onPendingCountChange={(count) => setPendingSafetyAlerts(count)}
                isRefreshing={isRefreshing}
              />
            )}
            {activeTab === "educators" && <AdminEducatorsTab />}
            {activeTab === "events" && <AdminEventsTab />}
            {activeTab === "products" && <AdminProductsTab onDataChanged={() => loadData(false)} />}
            {activeTab === "profiles" && <AdminProfilesTab onDataChanged={() => loadData(false)} />}
            {activeTab === "testimonials" && (
              <AdminTestimonialsTab isRefreshing={isRefreshing} onRefresh={() => loadData(false)} />
            )}
            {activeTab === "notifications" && <AdminNotificationsTab />}
          </>
        )}
      </main>
    </div>
  );
}

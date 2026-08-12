import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import {
  togglePassportUnlock,
  updateOrderStatus,
  updateExtraProfileSlotsAdmin,
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
  CommercePassportsDataResponse,
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
import { AdminNavTabBar, AdminTab } from "@/components/admin/AdminNavTabBar";
import { AdminExecutiveTab } from "@/components/admin/AdminExecutiveTab";
import { AdminTalentsCitiesTab } from "@/components/admin/AdminTalentsCitiesTab";
import { AdminNayaTab } from "@/components/admin/AdminNayaTab";
import { AdminCommerceTab } from "@/components/admin/AdminCommerceTab";
import { AdminSeasonsTab } from "@/components/admin/AdminSeasonsTab";
import { AdminSubscriptionsTab } from "@/components/admin/AdminSubscriptionsTab";
import { AdminCampaignsTab } from "@/components/admin/AdminCampaignsTab";
import { AdminSupervisorsTab } from "@/components/admin/AdminSupervisorsTab";
import { AdminProductsTab } from "@/components/admin/AdminProductsTab";
import { AdminProfilesTab } from "@/components/admin/AdminProfilesTab";
import { Users, ShoppingBag, Brain, Award, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<AdminTab>("executive");
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);
  const [parents, setParents] = useState<ParentBIRC[]>([]);
  const [talentStats, setTalentStats] = useState<TalentCityStatsResponse | null>(null);
  const [nayaTelemetry, setNayaTelemetry] = useState<NayaTelemetryResponse | null>(null);
  const [aiProviderStatus, setAiProviderStatus] = useState<AiProviderStatus | null>(null);
  const [progressionHealth, setProgressionHealth] = useState<ProgressionHealthResponse | null>(
    null,
  );
  const [commerceData, setCommerceData] = useState<CommercePassportsDataResponse | null>(null);
  const [loupConstitution, setLoupConstitution] = useState<ConstitutionSuggestionsResponse | null>(
    null,
  );
  const [decidingRuleKeys, setDecidingRuleKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getExecutiveKPIsFn = useServerFn(getExecutiveKPIsAdmin);
  const getTalentStatsFn = useServerFn(getTalentCityStatsAdmin);
  const getNayaTelemetryFn = useServerFn(getNayaTelemetryAdmin);
  const getAiProviderStatusFn = useServerFn(getAiProviderStatusAdmin);
  const getProgressionHealthFn = useServerFn(getProgressionHealthAdmin);
  const getCommerceDataFn = useServerFn(getCommercePassportsDataAdmin);
  const toggleUnlockFn = useServerFn(togglePassportUnlock);
  const updateOrderStatusFn = useServerFn(updateOrderStatus);
  const updateExtraSlotsFn = useServerFn(updateExtraProfileSlotsAdmin);
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
          getExecutiveKPIsFn({ data: undefined, ...opts }).catch((err) => {
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
          getCommerceDataFn({ data: undefined, ...opts }).catch((err) => {
            console.error("commData error", err);
            return null;
          }),
        ]);
      if (execData) {
        setKpis(execData.kpis);
        setParents(execData.parents ?? []);
      }
      if (talentData) setTalentStats(talentData);
      if (nayaData) setNayaTelemetry(nayaData);
      if (aiStatus) setAiProviderStatus(aiStatus);
      if (progressionData) setProgressionHealth(progressionData);
      if (commData) setCommerceData(commData);

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

  useEffect(() => {
    if (session) {
      void loadData(true);
    }
  }, [session]);

  const handleTogglePassport = async (childId: string, unlock: boolean) => {
    try {
      const res = await toggleUnlockFn({ data: { childId, unlock } });
      if (res.ok) {
        toast.success(
          unlock ? "Passeport d'Excellence débloqué !" : "Passeport d'Excellence reverrouillé.",
        );
        await loadData(false);
      } else {
        toast.error("Échec de la modification du statut passeport.");
      }
    } catch (err: any) {
      console.error("Erreur lors de la modification du statut passeport:", err);
      toast.error(err?.message || "Erreur lors du déblocage/verrouillage du passeport.");
      throw err;
    }
  };

  const handleUpdateExtraSlots = async (userId: string, extraProfileSlots: number) => {
    try {
      const res = await updateExtraSlotsFn({ data: { userId, extraProfileSlots } });
      if (res.success) {
        toast.success("Quota de profils supplémentaires mis à jour.");
        await loadData(false);
      }
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour des slots supplémentaires:", err);
      toast.error(err?.message || "Erreur lors de la mise à jour du quota.");
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
      toast.error(err?.message || "Erreur lors de la mise à jour de la commande.");
      throw err;
    }
  };

  const handleDecideSuggestion = async (
    ruleKey: string,
    decision: "valide" | "a_revoir" | "rejete",
  ) => {
    setDecidingRuleKeys((prev) => (prev.includes(ruleKey) ? prev : [...prev, ruleKey]));
    try {
      const res = await decideLoupFn({ data: { decisions: [{ ruleKey, decision }] } });
      toast.success(
        res.decided > 0
          ? "Décision enregistrée — la règle sort des suggestions et passe au journal."
          : "Aucun audit en attente ne correspond à cette règle.",
      );
      await loadData(false);
    } catch (err: any) {
      console.error("Erreur lors de la décision du Loup:", err);
      toast.error(err?.message || "Erreur lors de l'enregistrement de la décision.");
    } finally {
      setDecidingRuleKeys((prev) => prev.filter((k) => k !== ruleKey));
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
        {/* Title Header & Sub-route Links */}
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand uppercase tracking-wider">
              Génizio Admin OS • Milestone 4
            </span>
            <h1 className="font-display text-balance text-3xl font-extrabold md:text-4xl mt-1 text-ink">
              Navigation & Vue Exécutive
            </h1>
            <p className="text-sm font-medium text-ink/60 mt-1">
              Pilotage en temps réel de la croissance, du CRM parent, du commerce, des passeports et
              des talents.
            </p>
          </div>

          {/* Quick links maintaining sub-routes compatibility */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/products"
              className="press-white rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-bold text-ink flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
            >
              <ShoppingBag className="size-4 text-purple-600" />
              <span>Gérer les Kits Boutique</span>
            </Link>
            <Link
              to="/admin/supervisors"
              className="press-white rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-bold text-ink flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
            >
              <Users className="size-4 text-emerald-600" />
              <span>Gérer les Superviseurs</span>
            </Link>
          </div>
        </div>

        {/* 🎛️ Admin OS Navigation Tab Bar */}
        <AdminNavTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content Display */}
        {activeTab === "executive" && kpis && (
          <AdminExecutiveTab
            kpis={kpis}
            parents={parents}
            onTogglePassport={handleTogglePassport}
            onUpdateExtraSlots={handleUpdateExtraSlots}
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
            decidingRuleKeys={decidingRuleKeys}
            onDecideSuggestion={handleDecideSuggestion}
          />
        )}

        {activeTab === "commerce" && commerceData && (
          <AdminCommerceTab
            data={commerceData}
            isRefreshing={isRefreshing}
            onRefresh={() => loadData(false)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onTogglePassport={handleTogglePassport}
          />
        )}

        {activeTab === "seasons" && <AdminSeasonsTab />}
        {activeTab === "subscriptions" && <AdminSubscriptionsTab />}
        {activeTab === "b2b" && <AdminCampaignsTab />}
        {activeTab === "supervisors" && <AdminSupervisorsTab />}
        {activeTab === "products" && <AdminProductsTab />}
        {activeTab === "profiles" && <AdminProfilesTab />}
      </main>
    </div>
  );
}

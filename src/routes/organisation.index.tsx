import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getNgoDashboardData,
  assignCampaignSupervisor,
  listCampaignTokensForManager,
  addCampaignEducator,
  removeCampaignEducator,
  listCampaignEducators,
  type Campaign,
  type ManagerTokenDetail,
  type CampaignEducator,
} from "@/lib/campaigns.functions";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { Building2, Users, Target, ShieldCheck, Loader2, UserPlus, AlertCircle, Rocket, X, Sparkles, Key, Download, Copy, ChevronDown, FileDown, Printer, Quote, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";
import { CampaignLinkCard } from "@/components/campaigns/CampaignLinkCard";
import { computeSupervisorQuota } from "@/lib/supervisor-quota";
import { resolveExtraSlotPrice, formatXof, formatPromoDeadline, STANDARD_PRICE_XOF } from "@/lib/pricing";

export const Route = createFileRoute("/organisation/")({
  component: OrganisationDashboard,
});

interface Stats {
  totalTokens: number;
  redeemedTokens: number;
  cohortSize: number;
  totalChallenges: number;
  completedChallenges: number;
  talentDistribution: Record<string, number>;
  supervisedChildren: number;
  totalSupervisorQuota: number;
}

interface Narrative {
  domain: string;
  title: string;
  observation: string;
}

interface DashboardData {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  stats: Stats | null;
  supervisors: { email: string; assignedCount: number }[];
  narratives: Narrative[];
}

function OrganisationDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);

  const getDashboardDataFn = useServerFn(getNgoDashboardData);

  const loadData = async (campaignId?: string) => {
    try {
      setLoading(true);
      const result = await getDashboardDataFn({ data: { campaignId } });
      setData(result as DashboardData);
      if ((result as DashboardData).activeCampaignId) {
        setSelectedCampaignId((result as DashboardData).activeCampaignId!);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de chargement du dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><GenizioLoader /></div>;

  if (!data || data.campaigns.length === 0) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12 md:py-24">
        <div className="bg-white rounded-[2rem] p-12 text-center shadow-xl border border-ink/5">
          <div className="size-20 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6">
            <Building2 className="size-10" />
          </div>
          <h1 className="text-3xl font-display font-black text-ink mb-4">Aucune Campagne Associée</h1>
          <p className="text-lg text-ink/70 max-w-lg mx-auto">
            Votre compte n'est actuellement associé à aucune campagne active. Veuillez contacter l'équipe Génizio pour activer votre espace partenaire.
          </p>
        </div>
      </main>
    );
  }

  const { campaigns, stats, supervisors, narratives } = data;
  const activeCampaign = (campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0]) as Campaign;
  const completionRate = stats && stats.totalChallenges > 0 ? Math.round((stats.completedChallenges / stats.totalChallenges) * 100) : 0;
  const talentEntries = stats ? Object.entries(stats.talentDistribution).sort((a, b) => b[1] - a[1]) : [];
  const talentMax = talentEntries.length > 0 ? talentEntries[0][1] : 1;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-ink/10 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-black uppercase tracking-wider mb-3">
            <ShieldCheck className="size-4 text-brand" />
            Espace Partenaire ONG & B2B
          </div>
          {campaigns.length > 1 ? (
            <div className="relative inline-block">
              <select
                value={activeCampaign.id}
                onChange={(e) => { setSelectedCampaignId(e.target.value); loadData(e.target.value); }}
                className="appearance-none text-3xl sm:text-4xl md:text-5xl font-display font-black text-ink tracking-tight bg-transparent border-none pr-9 cursor-pointer focus:outline-none"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="size-6 text-ink/40 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ink tracking-tight">
              {activeCampaign.name}
            </h1>
          )}
          <p className="text-sm sm:text-base text-ink/70 font-medium mt-2 max-w-2xl">
            {activeCampaign.description || "Suivi de la cohorte et des performances d'impact."}
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-surface rounded-xl text-xs font-bold text-ink/60 border border-ink/5">
            <span>Période :</span>
            <strong className="text-ink">
              {new Date(activeCampaign.start_date).toLocaleDateString("fr-FR")} → {new Date(activeCampaign.end_date).toLocaleDateString("fr-FR")}
            </strong>
          </div>
        </div>
        <button
          onClick={() => setIsCodesModalOpen(true)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-ink text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-ink/90 transition-colors shadow-xs cursor-pointer"
        >
          <Key className="size-4" />
          <span>Voir mes codes</span>
        </button>
      </div>

      <CampaignLinkCard campaignId={activeCampaign.id} campaignName={activeCampaign.name} />

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-brand/15 bg-gradient-to-br from-brand/5 via-white to-white relative overflow-hidden">
          <div className="flex items-center justify-between text-brand font-black text-xs uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><Target className="size-4" /> Enrôlement</span>
            <span className="px-2 py-0.5 rounded-full bg-brand/10 text-[10px]">Codes</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-ink mt-1">
            {stats?.redeemedTokens ?? 0} <span className="text-lg text-ink/40 font-bold">/ {stats?.totalTokens ?? 0}</span>
          </div>
          <div className="text-xs font-medium text-ink/60 mt-1">Codes d'inscription activés</div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-emerald-500/15 bg-gradient-to-br from-emerald-500/5 via-white to-white relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-700 font-black text-xs uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><Users className="size-4" /> Cohorte</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px]">Actifs</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">{stats?.cohortSize ?? 0}</div>
          <div className="text-xs font-medium text-ink/60 mt-1">Enfants inscrits et suivis</div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-sky-500/15 bg-gradient-to-br from-sky-500/5 via-white to-white relative overflow-hidden">
          <div className="flex items-center justify-between text-sky-700 font-black text-xs uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><Rocket className="size-4" /> Défis Réalisés</span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-[10px]">{completionRate}%</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-sky-700 mt-1">
            {stats?.completedChallenges ?? 0} <span className="text-lg text-ink/40 font-bold">/ {stats?.totalChallenges ?? 0}</span>
          </div>
          <div className="text-xs font-medium text-ink/60 mt-1">Taux de réalisation cohorte</div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-amber-500/15 bg-gradient-to-br from-amber-500/5 via-white to-white relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-800 font-black text-xs uppercase tracking-wider mb-2">
            <span className="flex items-center gap-2"><AlertCircle className="size-4" /> Supervision</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px]">Superviseurs</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-900 mt-1">
            {stats?.supervisedChildren ?? 0} <span className="text-lg text-ink/40 font-bold">/ {stats?.cohortSize ?? 0}</span>
          </div>
          <div className="text-xs font-medium text-ink/60 mt-1">Capacité : {stats?.totalSupervisorQuota ?? 0} enfants supervisés</div>
        </div>
      </div>

      {/* Rapport d'Impact — agrégé, jamais nominatif */}
      <div className="bg-white rounded-[2rem] border border-ink/10 overflow-hidden shadow-xs p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-ink">Rapport d'Impact — Cohorte</h2>
              <p className="text-xs sm:text-sm text-ink/60 font-medium">
                Répartition agrégée des 9 intelligences éveillées chez les enfants de votre cohorte. Aucune donnée individuelle n'est partagée.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-ink text-white hover:bg-ink/90 transition-colors shrink-0 cursor-pointer"
          >
            <FileDown className="size-4" />
            Exporter le rapport
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-ink/5">
          {talentEntries.length === 0 ? (
            <div className="p-8 text-center bg-surface/50 rounded-2xl border border-dashed border-ink/10">
              <p className="text-sm text-ink/50 font-medium italic">Pas encore assez de données — les premiers défis complétés alimenteront ce rapport d'impact.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {talentEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="w-full sm:w-44 shrink-0 text-xs font-black text-ink">{TALENT_KEY_LABELS[key] || key}</span>
                  <div className="flex-1 h-3.5 rounded-full bg-surface overflow-hidden border border-ink/5 p-0.5">
                    <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (value / talentMax) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-black text-brand shrink-0">{value} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Superviseurs — gestion de capacité */}
      <div className="bg-white rounded-[2rem] border border-ink/10 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-8 border-b border-ink/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-ink">Superviseurs</h2>
            <p className="text-xs sm:text-sm text-ink/60 font-medium mt-1">
              Un superviseur suit jusqu'à {computeSupervisorQuota({ referenceCreatedAt: activeCampaign.created_at, extraQuota: 0 })} enfants de votre cohorte via son propre tableau de bord dédié.
            </p>
          </div>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-brand/90 transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>Assigner un superviseur</span>
          </button>
        </div>

        {/* Dynamic Card view on Mobile & Table view on Desktop */}
        <div className="p-4 sm:p-0">
          <div className="sm:hidden space-y-2.5">
            {supervisors.map((s) => (
              <div key={s.email} className="p-4 rounded-2xl bg-surface/70 border border-ink/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-ink">{s.email}</p>
                  <p className="text-[10px] text-ink/50 font-bold mt-0.5">Superviseur référent</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-brand/10 text-brand text-xs font-black">
                  {s.assignedCount} / {stats?.totalSupervisorQuota ?? 0} enfants
                </span>
              </div>
            ))}
            {supervisors.length === 0 && (
              <div className="p-6 text-center text-xs font-bold text-ink/40">Aucun superviseur assigné.</div>
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface/50 border-b border-ink/5">
                <tr>
                  <th className="p-4 px-6 text-xs font-extrabold uppercase tracking-widest text-ink/50">Superviseur</th>
                  <th className="p-4 px-6 text-xs font-extrabold uppercase tracking-widest text-ink/50 text-right">Enfants assignés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {supervisors.map((s) => (
                  <tr key={s.email} className="hover:bg-surface/30 transition-colors">
                    <td className="p-4 px-6 font-bold text-sm text-ink">{s.email}</td>
                    <td className="p-4 px-6 text-right font-black text-sm text-brand">{s.assignedCount} / {stats?.totalSupervisorQuota ?? 0}</td>
                  </tr>
                ))}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-ink/50 font-medium text-sm">
                      Aucun superviseur assigné pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EducatorsSection
        campaignId={activeCampaign.id}
        campaignCreatedAt={activeCampaign.created_at}
        maxEducators={activeCampaign.max_educators ?? 0}
      />

      {isAssignModalOpen && (
        <AssignSupervisorModal
          campaignId={activeCampaign.id}
          campaignCreatedAt={activeCampaign.created_at}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => { setIsAssignModalOpen(false); loadData(selectedCampaignId); }}
        />
      )}

      {isCodesModalOpen && (
        <ManagerCodesModal
          campaign={activeCampaign}
          onClose={() => setIsCodesModalOpen(false)}
        />
      )}

      {isReportModalOpen && stats && (
        <ImpactReportModal
          campaign={activeCampaign}
          stats={stats}
          narratives={narratives}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </main>
  );
}

function ManagerCodesModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [tokens, setTokens] = useState<ManagerTokenDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "unactive">("all");

  const listTokensFn = useServerFn(listCampaignTokensForManager);

  useEffect(() => {
    listTokensFn({ data: { campaignId: campaign.id } })
      .then((data) => setTokens(data || []))
      .catch((err: any) => toast.error(err.message || "Erreur lors du chargement des codes."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const filteredTokens = tokens.filter((t) => {
    if (filter === "active") return t.is_redeemed;
    if (filter === "unactive") return !t.is_redeemed;
    return true;
  });
  const redeemedCount = tokens.filter((t) => t.is_redeemed).length;
  const unredeemedCount = tokens.length - redeemedCount;

  const handleExportCSV = () => {
    if (tokens.length === 0) {
      toast.error("Aucun code à exporter.");
      return;
    }
    const headers = ["Code", "Statut", "Date d'activation", "Date de création"];
    const rows = tokens.map((t) => [
      t.code,
      t.is_redeemed ? "Activé" : "Non activé",
      t.redeemed_at ? new Date(t.redeemed_at).toLocaleString("fr-FR") : "-",
      t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "-",
    ]);
    const csvContent =
      "﻿" +
      [headers.join(";"), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = campaign.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `codes_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Fichier CSV téléchargé avec succès !");
  };

  const handleCopyUnactivated = () => {
    const unactivated = tokens.filter((t) => !t.is_redeemed).map((t) => t.code);
    if (unactivated.length === 0) {
      toast.info("Aucun code non-activé à copier.");
      return;
    }
    navigator.clipboard.writeText(unactivated.join("\n"));
    toast.success(`${unactivated.length} code(s) non-activé(s) copié(s) !`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-ink/10">
          <div>
            <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
              <Key className="size-6 text-brand" />
              Codes de la campagne : {campaign.name}
            </h3>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Total : {tokens.length} code(s) · Activés : {redeemedCount} · Non-activés : {unredeemedCount}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-ink/10">
          <div className="flex gap-2">
            <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === "all" ? "bg-ink text-white" : "bg-surface text-ink/70 hover:bg-ink/10"}`}>
              Tous ({tokens.length})
            </button>
            <button onClick={() => setFilter("unactive")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === "unactive" ? "bg-ink text-white" : "bg-surface text-ink/70 hover:bg-ink/10"}`}>
              Non-activés ({unredeemedCount})
            </button>
            <button onClick={() => setFilter("active")} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === "active" ? "bg-ink text-white" : "bg-surface text-ink/70 hover:bg-ink/10"}`}>
              Activés ({redeemedCount})
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopyUnactivated} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-surface text-ink/70 hover:bg-ink/10 transition-colors cursor-pointer">
              <Copy className="size-3.5" /> Copier non-activés
            </button>
            <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer">
              <Download className="size-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-2">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-brand" /></div>
          ) : filteredTokens.length === 0 ? (
            <p className="text-center text-sm text-ink/50 font-medium py-16">Aucun code dans cette catégorie.</p>
          ) : (
            <ul className="space-y-2 py-2">
              {filteredTokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-surface/50 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">{t.code}</p>
                    {t.is_redeemed && t.redeemed_at && (
                      <p className="text-xs text-ink/50 mt-0.5">Activé le {new Date(t.redeemed_at).toLocaleDateString("fr-FR")}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-black ${t.is_redeemed ? "bg-emerald-500/10 text-emerald-700" : "bg-surface text-ink/50 border border-ink/10"}`}>
                    {t.is_redeemed ? "Activé" : "Non activé"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignSupervisorModal({
  campaignId,
  campaignCreatedAt,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  campaignCreatedAt: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [count, setCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slotPrice = resolveExtraSlotPrice(campaignCreatedAt);
  const supervisorFloor = computeSupervisorQuota({ referenceCreatedAt: campaignCreatedAt, extraQuota: 0 });

  const assignFn = useServerFn(assignCampaignSupervisor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await assignFn({ data: { campaignId, supervisorEmail: email, count } });
      toast.success(`${res.assignedCount} enfant(s) confié(s) à ${email} !`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'assignation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <UserPlus className="size-5" />
            </div>
            <h3 className="font-display font-black text-xl text-ink">
              Assigner un superviseur
            </h3>
          </div>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
            Entrez l'adresse email d'un superviseur (compte Génizio). L'application lui confie automatiquement des enfants de votre cohorte qui n'ont pas encore de superviseur.
          </p>
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-900 leading-relaxed">
              Un superviseur ne peut gérer que {supervisorFloor} enfant{supervisorFloor > 1 ? "s" : ""} maximum. Au-delà, un supplément de {formatXof(slotPrice.priceXof)} / superviseur s'applique
              {slotPrice.isPromo && slotPrice.promoEndsAt ? ` (prix de bienvenue jusqu'au ${formatPromoDeadline(slotPrice.promoEndsAt)}, puis ${formatXof(STANDARD_PRICE_XOF)})` : ""}.
            </p>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">Email du superviseur</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="superviseur@ong.org" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">Nombre d'enfants à confier (max 5)</label>
            <input required type="number" min={1} max={5} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-ink/5">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-extrabold text-sm transition-colors cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <span>Confirmer</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Éducateurs vouchés (2026-07-30) — self-service gestionnaire, même esprit que la section
// Superviseurs ci-dessus, mais un statut différent : un éducateur EST le compte propriétaire
// des profils (comme un parent), pas un simple regard en lecture seule. D'où le prérequis
// affiché : la personne doit d'abord avoir choisi "Éducateur" comme lien avec l'enfant dans son
// propre compte (Réglages) avant de pouvoir être ajoutée ici — addCampaignEducator refuse sinon.
function EducatorsSection({
  campaignId,
  campaignCreatedAt,
  maxEducators,
}: {
  campaignId: string;
  campaignCreatedAt: string;
  maxEducators: number;
}) {
  const [educators, setEducators] = useState<CampaignEducator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const listFn = useServerFn(listCampaignEducators);
  const removeFn = useServerFn(removeCampaignEducator);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listFn({ data: { campaignId } });
      setEducators(result as CampaignEducator[]);
    } catch (err: any) {
      toast.error(err.message || "Erreur de chargement des éducateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleRemove = async (educatorUserId: string, email: string) => {
    if (!window.confirm(`Retirer ${email} de cette campagne ? Son accès aux enfants de cette campagne sera verrouillé.`)) return;
    try {
      const res = await removeFn({ data: { campaignId, educatorUserId } });
      toast.success(`${email} retiré — ${res.lockedChildrenCount} profil(s) verrouillé(s).`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du retrait.");
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-ink/10 overflow-hidden shadow-xs">
      <div className="p-5 sm:p-8 border-b border-ink/5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-ink">Éducateurs</h2>
          <p className="text-xs sm:text-sm text-ink/60 font-medium mt-1">
            Un éducateur vouché gère lui-même jusqu'à 10 profils enfants, comme un parent. Capacité de cette campagne : {educators.length} / {maxEducators}.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={educators.length >= maxEducators}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-brand/90 transition-colors shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GraduationCap className="size-4" />
          <span>Ajouter un éducateur</span>
        </button>
      </div>

      <div className="p-4 sm:p-0">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="size-5 animate-spin mx-auto text-ink/40" /></div>
        ) : (
          <>
            <div className="sm:hidden space-y-2.5">
              {educators.map((e) => (
                <div key={e.id} className="p-4 rounded-2xl bg-surface/70 border border-ink/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-ink">{e.email}</p>
                    <p className="text-[10px] text-ink/50 font-bold mt-0.5">Depuis le {new Date(e.added_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <button onClick={() => handleRemove(e.educator_user_id, e.email)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {educators.length === 0 && (
                <div className="p-6 text-center text-xs font-bold text-ink/40">Aucun éducateur vouché.</div>
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface/50 border-b border-ink/5">
                  <tr>
                    <th className="p-4 px-6 text-xs font-extrabold uppercase tracking-widest text-ink/50">Éducateur</th>
                    <th className="p-4 px-6 text-xs font-extrabold uppercase tracking-widest text-ink/50">Depuis</th>
                    <th className="p-4 px-6 text-xs font-extrabold uppercase tracking-widest text-ink/50 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {educators.map((e) => (
                    <tr key={e.id} className="hover:bg-surface/30 transition-colors">
                      <td className="p-4 px-6 font-bold text-sm text-ink">{e.email}</td>
                      <td className="p-4 px-6 text-sm text-ink/60">{new Date(e.added_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4 px-6 text-right">
                        <button onClick={() => handleRemove(e.educator_user_id, e.email)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {educators.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-ink/50 font-medium text-sm">
                        Aucun éducateur vouché pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isAddModalOpen && (
        <AddEducatorModal
          campaignId={campaignId}
          campaignCreatedAt={campaignCreatedAt}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function AddEducatorModal({
  campaignId,
  campaignCreatedAt,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  campaignCreatedAt: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addFn = useServerFn(addCampaignEducator);
  const slotPrice = resolveExtraSlotPrice(campaignCreatedAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addFn({ data: { campaignId, educatorEmail: email } });
      toast.success(`${email} ajouté comme éducateur !`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="font-display font-black text-xl text-ink">Ajouter un éducateur</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed">
            Entrez l'adresse email d'un compte Génizio ayant déjà choisi "Éducateur" comme lien avec l'enfant (Réglages). Il pourra alors gérer jusqu'à 10 profils enfants lui-même, comme un parent.
          </p>
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-900 leading-relaxed">
              Un supplément de {formatXof(slotPrice.priceXof)} / éducateur s'applique
              {slotPrice.isPromo && slotPrice.promoEndsAt ? ` (prix de bienvenue jusqu'au ${formatPromoDeadline(slotPrice.promoEndsAt)}, puis ${formatXof(STANDARD_PRICE_XOF)})` : ""}.
              Si vous retirez un éducateur plus tard, l'accès aux enfants de cette campagne se verrouille — leur progression reste intacte.
            </p>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5">Email de l'éducateur</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface border border-ink/10 rounded-2xl p-3.5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="educateur@structure.org" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-ink/5">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-extrabold text-sm transition-colors cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <span>Confirmer</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Le vrai produit qu'une ONG achète n'est pas un accès à l'app : c'est ce qu'elle peut montrer à
// SON bailleur pour justifier le budget. Un graphique à l'écran, non exportable, ne remplit pas
// ce rôle. Export via window.print() → PDF plutôt qu'une génération PDF serveur : zéro dépendance
// nouvelle, disponible ce soir, et déjà standard pour ce genre de document imprimable.
function ImpactReportModal({
  campaign,
  stats,
  narratives,
  onClose,
}: {
  campaign: Campaign;
  stats: Stats;
  narratives: Narrative[];
  onClose: () => void;
}) {
  const completionRate = stats.totalChallenges > 0 ? Math.round((stats.completedChallenges / stats.totalChallenges) * 100) : 0;
  const talentEntries = Object.entries(stats.talentDistribution).sort((a, b) => b[1] - a[1]);
  const talentMax = talentEntries.length > 0 ? talentEntries[0][1] : 1;
  const generatedOn = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-[2rem] max-h-[100vh] sm:max-h-[90vh] flex flex-col shadow-2xl print:shadow-none print:max-h-none">
        {/* Barre d'action — jamais imprimée */}
        <div className="print:hidden flex items-center justify-between p-4 sm:p-6 border-b border-ink/10 shrink-0">
          <h3 className="font-display font-black text-lg text-ink">Aperçu du rapport</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer"
            >
              <Printer className="size-4" /> Imprimer / Exporter en PDF
            </button>
            <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors cursor-pointer">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Contenu imprimable */}
        <div className="print-report overflow-y-auto p-6 sm:p-10 print:p-0 print:overflow-visible">
          <div className="flex items-start justify-between gap-4 pb-6 mb-6 border-b-2 border-ink">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-brand mb-1">Rapport d'Impact</div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-ink">{campaign.name}</h1>
              <p className="text-sm text-ink/60 font-medium mt-1">
                {new Date(campaign.start_date).toLocaleDateString("fr-FR")} — {new Date(campaign.end_date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display font-black text-lg text-ink">GÉNIZIO</div>
              <p className="text-[11px] text-ink/50 font-medium">Généré le {generatedOn}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="rounded-2xl border border-ink/10 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-black text-ink">{stats.cohortSize}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mt-1">Enfants suivis</div>
            </div>
            <div className="rounded-2xl border border-ink/10 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-black text-ink">{completionRate}%</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mt-1">Taux de réalisation</div>
            </div>
            <div className="rounded-2xl border border-ink/10 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-black text-ink">{stats.redeemedTokens}<span className="text-sm text-ink/40">/{stats.totalTokens}</span></div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mt-1">Accès activés</div>
            </div>
          </div>

          <h2 className="font-display font-black text-base text-ink mb-3">Les 9 intelligences éveillées</h2>
          {talentEntries.length === 0 ? (
            <p className="text-sm text-ink/50 italic mb-8">Pas encore assez de données sur cette cohorte.</p>
          ) : (
            <div className="space-y-2.5 mb-8">
              {talentEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs font-black text-ink">{TALENT_KEY_LABELS[key] || key}</span>
                  <div className="flex-1 h-3 rounded-full bg-surface overflow-hidden border border-ink/5">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(5, (value / talentMax) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-black text-brand shrink-0">{value}</span>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-display font-black text-base text-ink mb-3">Ce que Naya observe</h2>
          {narratives.length === 0 ? (
            <p className="text-sm text-ink/50 italic">Aucun défi complété pour l'instant — cette section s'alimentera au fil de la cohorte.</p>
          ) : (
            <div className="space-y-3">
              {narratives.map((n, i) => (
                <div key={i} className="rounded-2xl bg-surface/60 border border-ink/5 p-4 break-inside-avoid">
                  <div className="flex items-start gap-2.5">
                    <Quote className="size-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-brand mb-1">{n.title}</p>
                      <p className="text-sm text-ink/80 leading-relaxed">{n.observation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-10 pt-4 border-t border-ink/10 text-[11px] text-ink/40 text-center">
            Données agrégées et anonymisées — aucune identité d'enfant n'est partagée dans ce document. Génizio.
          </p>
        </div>
      </div>
    </div>
  );
}

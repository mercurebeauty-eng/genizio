import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getNgoDashboardData, assignCampaignSupervisor, type Campaign } from "@/lib/campaigns.functions";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { Building2, Users, Target, ShieldCheck, Loader2, UserPlus, AlertCircle, Rocket, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/b2b/")({
  component: B2bDashboard,
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

interface DashboardData {
  campaigns: Campaign[];
  stats: Stats | null;
  supervisors: { email: string; assignedCount: number }[];
}

function B2bDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const getDashboardDataFn = useServerFn(getNgoDashboardData);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getDashboardDataFn({ data: undefined });
      setData(result as DashboardData);
    } catch (err: any) {
      toast.error(err.message || "Erreur de chargement du dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const { campaigns, stats, supervisors } = data;
  const activeCampaign = campaigns[0] as Campaign;
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ink tracking-tight">
            {activeCampaign.name}
          </h1>
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
      </div>

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
        <div className="flex items-center gap-2.5 mb-2">
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
              Un superviseur suit jusqu'à 5 enfants de votre cohorte via son propre tableau de bord dédié.
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
                  {s.assignedCount} / 5 enfants
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
                    <td className="p-4 px-6 text-right font-black text-sm text-brand">{s.assignedCount} / 5</td>
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

      {isAssignModalOpen && (
        <AssignSupervisorModal
          campaignId={activeCampaign.id}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => { setIsAssignModalOpen(false); loadData(); }}
        />
      )}
    </main>
  );
}

function AssignSupervisorModal({ campaignId, onClose, onSuccess }: { campaignId: string, onClose: () => void, onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [count, setCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              Un superviseur ne peut gérer que 5 enfants maximum. Au-delà, un supplément de 7 000 FCFA / superviseur s'applique.
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

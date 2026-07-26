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
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="size-4" />
            Espace Partenaire (ONG / B2B)
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-ink tracking-tight">
            {activeCampaign.name}
          </h1>
          <p className="text-lg text-ink/60 font-medium mt-2 max-w-2xl">
            {activeCampaign.description || "Suivi de la cohorte et des performances."}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-ink/5">
          <div className="flex items-center gap-3 text-ink/50 font-bold text-sm uppercase tracking-wider mb-2">
            <Target className="size-4" /> Enrôlement
          </div>
          <div className="text-4xl font-black text-ink">{stats?.redeemedTokens ?? 0} <span className="text-xl text-ink/40">/ {stats?.totalTokens ?? 0}</span></div>
          <div className="text-sm font-medium text-ink/60 mt-1">Codes d'inscription activés</div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-ink/5">
          <div className="flex items-center gap-3 text-brand font-bold text-sm uppercase tracking-wider mb-2">
            <Users className="size-4" /> Cohorte
          </div>
          <div className="text-4xl font-black text-brand">{stats?.cohortSize ?? 0}</div>
          <div className="text-sm font-medium text-ink/60 mt-1">Enfants actifs</div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-ink/5">
          <div className="flex items-center gap-3 text-leaf font-bold text-sm uppercase tracking-wider mb-2">
            <Rocket className="size-4" /> Défis
          </div>
          <div className="text-4xl font-black text-leaf">{completionRate}<span className="text-xl text-ink/40">%</span></div>
          <div className="text-sm font-medium text-ink/60 mt-1">{stats?.completedChallenges ?? 0} / {stats?.totalChallenges ?? 0} défis complétés</div>
        </div>
        <div className="bg-ink text-white rounded-3xl p-6 shadow-sm border border-ink/5">
          <div className="flex items-center gap-3 text-white/50 font-bold text-sm uppercase tracking-wider mb-2">
            <AlertCircle className="size-4" /> Supervision
          </div>
          <div className="text-2xl font-black">{stats?.supervisedChildren ?? 0} <span className="text-base text-white/50">/ {stats?.cohortSize ?? 0} enfants</span></div>
          <div className="text-sm font-medium text-white/60 mt-1">Capacité : {stats?.totalSupervisorQuota ?? 0} places superviseurs</div>
        </div>
      </div>

      {/* Rapport d'Impact — agrégé, jamais nominatif */}
      <div className="bg-white rounded-[2rem] border border-ink/10 overflow-hidden shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-5 text-brand" />
          <h2 className="text-xl font-display font-black text-ink">Rapport d'Impact — Cohorte</h2>
        </div>
        <p className="text-sm text-ink/60 font-medium mb-6">
          Répartition agrégée des 9 intelligences éveillées chez les enfants de votre cohorte. Aucune donnée individuelle n'est partagée.
        </p>
        {talentEntries.length === 0 ? (
          <p className="text-sm text-ink/50 font-medium italic">Pas encore assez de données — les premiers défis complétés alimenteront ce rapport.</p>
        ) : (
          <div className="space-y-3">
            {talentEntries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs font-bold text-ink/70">{TALENT_KEY_LABELS[key] || key}</span>
                <div className="flex-1 h-3 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(4, (value / talentMax) * 100)}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-bold text-ink/50">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Superviseurs — gestion de capacité, jamais quel enfant précis */}
      <div className="bg-white rounded-[2rem] border border-ink/10 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-ink/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-display font-black text-ink">Superviseurs</h2>
            <p className="text-sm text-ink/60 font-medium mt-1">Un superviseur suit jusqu'à 5 enfants de votre cohorte via son propre tableau de bord.</p>
          </div>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-brand/90 transition-colors"
          >
            <UserPlus className="size-4" />
            <span>Assigner un superviseur</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface/50 border-b border-ink/5">
              <tr>
                <th className="p-4 text-xs font-extrabold uppercase tracking-widest text-ink/50">Superviseur</th>
                <th className="p-4 text-xs font-extrabold uppercase tracking-widest text-ink/50 text-right">Enfants assignés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {supervisors.map((s) => (
                <tr key={s.email} className="hover:bg-surface/30 transition-colors">
                  <td className="p-4 font-bold text-ink">{s.email}</td>
                  <td className="p-4 text-right font-bold text-ink/70">{s.assignedCount} / 5</td>
                </tr>
              ))}
              {supervisors.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-ink/50 font-medium">
                    Aucun superviseur assigné pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
            <UserPlus className="size-6 text-brand" />
            Assigner un superviseur
          </h3>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors">
            <X className="size-5" />
          </button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-medium text-ink/70">
          Entrez l'adresse email d'un superviseur (il doit déjà avoir un compte Génizio). Génizio lui confie automatiquement des enfants de votre cohorte qui n'ont pas encore de superviseur — vous n'avez pas à choisir lesquels.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-amber-800">
            Un superviseur ne peut gérer que 5 enfants maximum. Au-delà, un supplément de 7000 FCFA/superviseur s'applique.
          </p>
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Email du superviseur</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" placeholder="superviseur@ong.org" />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Nombre d'enfants à confier</label>
          <input required type="number" min={1} max={5} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-bold transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <span>Assigner</span>}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

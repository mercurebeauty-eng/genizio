import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { getEcosystemStats, listParentsBI, togglePassportUnlock, grantProfileSlot } from "@/lib/products.functions";
import { Loader2, Users, Brain, ShoppingBag, Phone, ExternalLink, Calendar, BarChart3, ChevronRight, Award } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

type EcosystemStats = {
  totalChildren: number;
  totalParents: number;
  totalChallenges: number;
  completedChallenges: number;
  totalOrders: number;
  talentTotals: Record<string, number>;
  topDomains: { domain: string; count: number }[];
} | null;

type ParentBI = {
  id: string;
  email: string;
  phone: string | null;
  createdAt: string;
  childCount: number;
  childNames: string;
  challengeCount: number;
  completedCount: number;
  extraSlots: number;
  children?: { id: string; name: string; age: number; pdfUnlocked: boolean }[];
};

function AdminIndexPage() {
  const { session } = useSession();
  const [stats, setStats] = useState<EcosystemStats>(null);
  const [parents, setParents] = useState<ParentBI[]>([]);
  const [loading, setLoading] = useState(true);

  const getStatsFn = useServerFn(getEcosystemStats);
  const listParentsFn = useServerFn(listParentsBI);
  const toggleUnlockFn = useServerFn(togglePassportUnlock);
  const grantSlotFn = useServerFn(grantProfileSlot);

  const handleGrantSlot = async (userId: string, delta: number) => {
    try {
      const res = await grantSlotFn({ data: { userId, delta } });
      if (res.ok) {
        toast.success(delta > 0 ? `Slot débloqué (total : ${res.extraSlots} slots bonus)` : `Slot révoqué (total : ${res.extraSlots} slots bonus)`);
        void fetchData();
      }
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleTogglePassport = async (childId: string, unlock: boolean) => {
    try {
      const res = await toggleUnlockFn({ data: { childId, unlock } });
      if (res.ok) {
        toast.success(unlock ? "Passeport d'Excellence débloqué !" : "Passeport d'Excellence reverrouillé.");
        void fetchData();
      }
    } catch (err: any) {
      toast.error("Erreur lors de la modification : " + err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, parentsData] = await Promise.all([
        getStatsFn(),
        listParentsFn(),
      ]);
      setStats(statsData as EcosystemStats);
      setParents((parentsData as ParentBI[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des données BI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      void fetchData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <AppHeader />
        <div className="flex h-[80vh] items-center justify-center">
          <div className="text-center font-bold">
            <Loader2 className="size-8 animate-spin text-brand mx-auto mb-2" />
            <span>Chargement des métriques BI...</span>
          </div>
        </div>
      </div>
    );
  }

  const completionRate = stats && stats.totalChallenges > 0
    ? Math.round((stats.completedChallenges / stats.totalChallenges) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 text-ink pb-24">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Title */}
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand uppercase tracking-wider">
              Console d'Administration
            </span>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl mt-1">
              Tableau de Bord BI & Métriques
            </h1>
            <p className="text-sm font-medium text-ink/50 mt-1">
              Suivi en temps réel de l'écosystème parent-enfant Génizio.
            </p>
          </div>

          {/* Quick links to subpaths */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/products"
              className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-sm font-bold text-ink shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="size-4 text-purple-600" />
              <span>Gérer les Kits Boutique</span>
            </Link>
            <Link
              to="/admin/supervisors"
              className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-sm font-bold text-ink shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="size-4 text-emerald-600" />
              <span>Gérer les Superviseurs</span>
            </Link>
          </div>
        </div>

        {/* 📊 Key Metrics Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-10">
          <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-brutal-sm">
            <div className="flex items-center justify-between text-ink/40 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Parents inscrits</span>
              <Users className="size-4" />
            </div>
            <p className="font-display text-3xl font-black text-brand">{stats?.totalParents ?? 0}</p>
          </div>

          <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-brutal-sm">
            <div className="flex items-center justify-between text-ink/40 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Enfants suivis</span>
              <Award className="size-4" />
            </div>
            <p className="font-display text-3xl font-black text-leaf">{stats?.totalChildren ?? 0}</p>
          </div>

          <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-brutal-sm">
            <div className="flex items-center justify-between text-ink/40 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Défis générés</span>
              <Brain className="size-4" />
            </div>
            <p className="font-display text-3xl font-black text-sky">{stats?.totalChallenges ?? 0}</p>
          </div>

          <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-brutal-sm">
            <div className="flex items-center justify-between text-ink/40 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Taux de réussite</span>
              <BarChart3 className="size-4" />
            </div>
            <p className="font-display text-3xl font-black text-ink">{completionRate}%</p>
            <p className="text-[10px] text-ink/50 mt-1 font-bold">
              {stats?.completedChallenges ?? 0} défis validés
            </p>
          </div>

          <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-brutal-sm">
            <div className="flex items-center justify-between text-ink/40 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Kits commandés</span>
              <ShoppingBag className="size-4" />
            </div>
            <p className="font-display text-3xl font-black text-purple-600">{stats?.totalOrders ?? 0}</p>
          </div>
        </div>

        {/* 👥 Parents BI Table */}
        <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
          <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="size-5 text-brand" />
            Annuaire des Parents & Contact Direct
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-[3px] border-ink text-xs font-extrabold uppercase tracking-wider text-ink/50">
                  <th className="pb-3 pr-4">Inscription</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Téléphone</th>
                  <th className="pb-3 pr-4">WhatsApp</th>
                  <th className="pb-3 pr-4">Enfants associés</th>
                  <th className="pb-3 pr-4 text-center">Slots Profils</th>
                  <th className="pb-3 text-center">Défis (Total/Terminés)</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {parents.map((parent) => {
                  const cleanPhone = parent.phone ? parent.phone.replace(/[^0-9]/g, "") : "";
                  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";

                  return (
                    <tr key={parent.id} className="hover:bg-surface/40 transition-colors">
                      <td className="py-4 pr-4 font-medium text-ink/60 flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-ink/30" />
                        {new Date(parent.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 pr-4 font-bold text-ink">{parent.email}</td>
                      <td className="py-4 pr-4 font-mono text-xs text-ink/70">
                        {parent.phone || (
                          <span className="text-ink/30 italic text-xs">Non renseigné</span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                          >
                            <Phone className="size-3.5 fill-current text-white" />
                            <span>WhatsApp</span>
                            <ExternalLink className="size-3 text-white/70" />
                          </a>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/20 bg-stone-100 px-3 py-1.5 text-xs font-bold text-ink/30 cursor-not-allowed"
                          >
                            <Phone className="size-3.5" />
                            <span>Indisponible</span>
                          </button>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        {parent.children && parent.children.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {parent.children.map((child: any) => (
                              <div key={child.id} className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs">{child.name} ({child.age} ans)</span>
                                {child.age >= 14 && (
                                  <button
                                    onClick={() => handleTogglePassport(child.id, !child.pdfUnlocked)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                      child.pdfUnlocked
                                        ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                                        : "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                                    }`}
                                  >
                                    {child.pdfUnlocked ? "🔒 Débloqué" : "🔓 Débloquer"}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink/30 italic text-xs">Aucun enfant</span>
                        )}
                      </td>

                      {/* ── Slots Profils ── */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleGrantSlot(parent.id, -1)}
                            disabled={parent.extraSlots <= 0}
                            title="Révoquer 1 slot"
                            className="flex size-7 items-center justify-center rounded-lg border-2 border-ink bg-red-100 text-red-700 font-black text-sm hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            −
                          </button>
                          <div className="text-center min-w-[48px]">
                            <p className="text-xs font-black text-ink">{2 + parent.extraSlots}</p>
                            <p className="text-[9px] text-ink/40 font-bold">{parent.extraSlots > 0 ? `+${parent.extraSlots} bonus` : "gratuits"}</p>
                          </div>
                          <button
                            onClick={() => handleGrantSlot(parent.id, +1)}
                            title="Accorder 1 slot"
                            className="flex size-7 items-center justify-center rounded-lg border-2 border-ink bg-emerald-100 text-emerald-700 font-black text-sm hover:bg-emerald-200 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                          {parent.challengeCount} total
                        </span>
                        <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf ml-1.5">
                          {parent.completedCount} validés
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

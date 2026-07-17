import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { getSupervisorDashboard } from "@/lib/supervisors.functions";
import { getChildGuild } from "@/lib/guilds";
import { Loader2, Users, Trophy, CheckSquare, Eye, ClipboardList, Zap, CheckCircle2 } from "lucide-react";
import { NayaAvatar } from "@/components/NayaAvatar";


export const Route = createFileRoute("/supervisor")({
  component: SupervisorDashboardPage,
});

type ChildWithChallenges = {
  id: string;
  name: string;
  age: number;
  city: string | null;
  interests: string[];
  talents: Record<string, number>;
  challenges: {
    id: string;
    title: string;
    domain: string;
    status: "todo" | "in_progress" | "completed";
    created_at: string;
  }[];
};

function SupervisorDashboardPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildWithChallenges[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getDashboardFn = useServerFn(getSupervisorDashboard);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    getDashboardFn()
      .then((res) => {
        const kids = (res.children ?? []) as ChildWithChallenges[];
        setChildren(kids);
        setSelectedId(kids[0]?.id ?? null);
      })
      .catch(() => setChildren([]))
      .finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface text-ink/50">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink md:pb-6">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-end gap-3">
            <NayaAvatar size="sm" />
            <p className="text-sm text-ink/50 mb-0.5">Espace Superviseur</p>
          </div>
          <h1 className="font-display text-3xl font-extrabold">Tableau de Bord Superviseur</h1>
        </div>

        {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-16 text-center shadow-brutal-sm">
            <Users className="size-16 text-ink/30 mx-auto mb-4" />
            <p className="font-display text-xl font-bold mb-2">Aucun enfant assigné</p>
            <p className="text-sm text-ink/60">
              Un administrateur Génizio doit vous assigner des profils d'enfants pour que vous puissiez les accompagner.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Sidebar — liste des enfants */}
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-ink/40 mb-3">Enfants assignés ({children.length})</h2>
              {children.map((child) => {
                const guild = getChildGuild(child.talents);
                const completed = child.challenges.filter((c) => c.status === "completed").length;
                const isActive = child.id === selectedId;
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedId(child.id)}
                    className={`w-full text-left rounded-3xl border-[3px] border-ink p-4 shadow-brutal-sm transition-all hover:-translate-y-0.5 ${
                      isActive ? "bg-brand text-white" : "bg-white text-ink hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{guild.emoji}</span>
                      <div className="font-display text-base font-black">{child.name}</div>
                    </div>
                    <div className={`text-xs font-bold ${isActive ? "text-white/80" : "text-ink/60"}`}>
                      {child.age} ans · {guild.name}
                    </div>
                    <div className={`text-xs mt-1 font-semibold ${isActive ? "text-white/70" : "text-ink/50"}`}>
                      {completed} défis complétés · {child.challenges.length} total
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main — profil de l'enfant sélectionné */}
            {selected && (() => {
              const guild = getChildGuild(selected.talents);
              const completed = selected.challenges.filter((c) => c.status === "completed");
              const inProgress = selected.challenges.filter((c) => c.status === "in_progress");
              const todo = selected.challenges.filter((c) => c.status === "todo");

              return (
                <div className="md:col-span-2 space-y-6">
                  {/* Guild Banner */}
                  <div className={`rounded-3xl border-[3px] border-ink p-5 shadow-brutal flex items-center gap-4 ${guild.bgColor}`}>
                    <div className="text-5xl">{guild.emoji}</div>
                    <div>
                      <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${guild.color} opacity-70`}>Guilde</p>
                      <h2 className={`font-display text-2xl font-black ${guild.color}`}>{selected.name} — {guild.name}</h2>
                      <p className={`text-sm font-medium italic mt-1 ${guild.color} opacity-80`}>« {guild.tagline} »</p>
                    </div>
                  </div>

                  {/* Stats rapides */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "À faire", count: todo.length, icon: ClipboardList, color: "bg-surface", iconColor: "text-ink/60" },
                      { label: "En cours", count: inProgress.length, icon: Zap, color: "bg-brand/10", iconColor: "text-brand" },
                      { label: "Complétés", count: completed.length, icon: CheckCircle2, color: "bg-emerald-50", iconColor: "text-emerald-600" },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className={`rounded-2xl border-[3px] border-ink p-4 text-center shadow-brutal-sm ${stat.color} flex flex-col items-center justify-center`}>
                          <Icon className={`size-6 mb-1.5 ${stat.iconColor}`} />
                          <div className="font-display text-2xl font-black">{stat.count}</div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink/50 mt-1">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>


                  {/* Timeline des défis */}
                  <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                    <h3 className="font-display text-lg font-black mb-4 flex items-center gap-2">
                      <Trophy className="size-5 text-brand" />
                      Défis de {selected.name}
                    </h3>
                    {selected.challenges.length === 0 ? (
                      <p className="text-sm text-ink/50 italic">Aucun défi assigné pour le moment.</p>
                    ) : (
                      <ul className="space-y-3">
                        {selected.challenges.map((c) => (
                          <li key={c.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3">
                            <div>
                              <p className="text-sm font-bold text-ink">{c.title}</p>
                              <p className="text-xs text-ink/50">{c.domain}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-ink ${
                              c.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                              c.status === "in_progress" ? "bg-brand/10 text-brand" :
                              "bg-surface text-ink/60"
                            }`}>
                              {c.status === "completed" ? "✅ Complété" : c.status === "in_progress" ? "⚡ En cours" : "📋 À faire"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}

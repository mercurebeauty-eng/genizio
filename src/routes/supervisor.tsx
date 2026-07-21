import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { getSupervisorDashboard } from "@/lib/supervisors.functions";
import { getChildGuild } from "@/lib/guilds";
import { Loader2, Users, Trophy, CheckSquare, Eye, ClipboardList, Zap, CheckCircle2, X, Clock, AlertTriangle, Brain } from "lucide-react";
import { NayaAvatar } from "@/components/NayaAvatar";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { GenizioLoader } from "@/components/GenizioLoader";


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
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);

  const getDashboardFn = useServerFn(getSupervisorDashboard);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    setLoadError(false);
    getDashboardFn()
      .then((res) => {
        const kids = (res.children ?? []) as ChildWithChallenges[];
        setChildren(kids);
        setSelectedId(kids[0]?.id ?? null);
      })
      .catch(() => {
        setChildren([]);
        setLoadError(true);
      })
      .finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-end gap-3" style={{ paddingTop: "3.5rem", marginTop: "-3.5rem" }}>
            <NayaAvatar size="sm" thoughts={["Bonjour Superviseur ! Voici vos enfants à accompagner."]} />
            <p className="text-sm text-ink/60 mb-0.5">Espace Superviseur</p>
          </div>
          <h1 className="font-display text-balance text-3xl font-extrabold">Tableau de Bord Superviseur</h1>
        </div>

        {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-dashed border-red-400 bg-red-50 p-16 text-center shadow-sm">
            <AlertTriangle className="size-16 text-red-400 mx-auto mb-4" />
            <p className="font-display text-balance text-xl font-bold mb-2 text-red-700">Impossible de charger votre tableau de bord</p>
            <p className="text-sm text-ink/60">
              Une erreur est survenue. Vérifiez votre connexion et réessayez, ou rechargez la page.
            </p>
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-16 text-center shadow-sm">
            <Users className="size-16 text-ink/30 mx-auto mb-4" />
            <p className="font-display text-balance text-xl font-bold mb-2">Aucun enfant assigné</p>
            <p className="text-sm text-ink/60">
              Un administrateur Génizio doit vous assigner des profils d'enfants pour que vous puissiez les accompagner.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 ">
            {/* Sidebar — liste des enfants */}
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-ink/60 mb-3">Enfants assignés ({children.length})</h2>
              {children.map((child) => {
                const guild = getChildGuild(child.talents);
                const completed = child.challenges.filter((c) => c.status === "completed").length;
                const isActive = child.id === selectedId;
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedId(child.id)}
                    className={`w-full text-left rounded-3xl border border-ink/10 p-4 shadow-sm transition-all hover:-translate-y-0.5 ${
                      isActive ? "bg-brand text-white" : "bg-white text-ink hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{guild.emoji}</span>
                      <div className="font-display text-balance text-base font-black">{child.name}</div>
                    </div>
                    <div className={`text-xs font-bold ${isActive ? "text-white/80" : "text-ink/60"}`}>
                      {child.age} ans · {guild.name}
                    </div>
                    <div className={`text-xs mt-1 font-semibold ${isActive ? "text-white/70" : "text-ink/60"}`}>
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
                  <div className={`rounded-3xl border border-ink/10 p-5 shadow-xl flex items-center gap-4 ${guild.bgColor}`}>
                    <div className="text-5xl">{guild.emoji}</div>
                    <div>
                      <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${guild.color} opacity-70`}>Guilde</p>
                      <h2 className={`font-display text-balance text-2xl font-black ${guild.color}`}>{selected.name} — {guild.name}</h2>
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
                        <div key={stat.label} className={`rounded-2xl border border-ink/10 p-4 text-center shadow-sm ${stat.color} flex flex-col items-center justify-center`}>
                          <Icon className={`size-6 mb-1.5 ${stat.iconColor}`} />
                          <div className="font-display text-balance text-2xl font-black">{stat.count}</div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-1">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>


                  {/* Timeline des défis */}
                  <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                    <h3 className="font-display text-balance text-lg font-black mb-4 flex items-center gap-2">
                      <Trophy className="size-5 text-brand" />
                      Défis de {selected.name}
                    </h3>
                    {selected.challenges.length === 0 ? (
                      <p className="text-sm text-ink/60 italic">Aucun défi assigné pour le moment.</p>
                    ) : (
                      <ul className="space-y-3">
                        {selected.challenges.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedChallenge(c)}
                            className="w-full flex items-center justify-between rounded-2xl border border-ink/10 bg-surface px-4 py-3 hover:bg-stone-50 transition-all text-left cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-bold text-ink hover:text-brand transition-colors">{c.title}</p>
                              <p className="text-xs text-ink/60">{c.domain}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border border-ink/10 ${
                              c.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                              c.status === "in_progress" ? "bg-brand/10 text-brand" :
                              "bg-surface text-ink/60"
                            }`}>
                              {c.status === "completed" ? "✅ Complété" : c.status === "in_progress" ? "⚡ En cours" : "📋 À faire"}
                            </span>
                          </button>
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
      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full border border-ink/10 bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                    {selectedChallenge.domain}
                  </span>
                  <span className={`rounded-full border border-ink/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                    selectedChallenge.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                    selectedChallenge.status === "in_progress" ? "bg-brand/10 text-brand" :
                    "bg-stone-100 text-stone-700"
                  }`}>
                    {selectedChallenge.status === "completed" ? "✅ Complété" : selectedChallenge.status === "in_progress" ? "⚡ En cours" : "📋 À faire"}
                  </span>
                  {selectedChallenge.difficulty && (
                    <span className="rounded-full border border-ink/10 bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-800">
                      🔥 {selectedChallenge.difficulty}
                    </span>
                  )}
                  {selectedChallenge.duration && (
                    <span className="rounded-full border border-ink/10 bg-sky px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink flex items-center gap-1">
                      <Clock className="size-3" />
                      {selectedChallenge.duration}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-balance text-xl font-black text-ink">{selectedChallenge.title}</h3>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Supervision warning */}
              {selectedChallenge.requires_supervision && (
                <div className="rounded-2xl border border-ink/10 bg-amber-50 p-4 flex gap-3 text-amber-900">
                  <AlertTriangle className="size-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-0.5 text-amber-800">Attention - Supervision requise</p>
                    <p className="text-sm font-medium leading-relaxed">{selectedChallenge.supervision_warning || "La présence d'un adulte est nécessaire pour cette activité."}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">Description du défi</h4>
                <div className="text-sm text-ink/80 leading-relaxed font-medium">
                  <MarkdownContent content={selectedChallenge.description} />
                </div>
              </div>

              {/* Pedagogical context */}
              {selectedChallenge.pedagogical_context && (
                <div className="rounded-2xl border border-ink/10 bg-stone-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-ink/60 mb-1">Objectif Pédagogique (Naya)</p>
                  <p className="text-xs text-ink/70 leading-relaxed font-medium">{selectedChallenge.pedagogical_context}</p>
                </div>
              )}

              {/* Materials */}
              {selectedChallenge.materials && Array.isArray(selectedChallenge.materials) && selectedChallenge.materials.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">Matériel nécessaire</h4>
                  <ul className="grid gap-2 ">
                    {selectedChallenge.materials.map((m: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-bold text-ink">
                        <span className="size-2 rounded-full bg-brand shrink-0"></span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps */}
              {selectedChallenge.steps && Array.isArray(selectedChallenge.steps) && selectedChallenge.steps.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-3">Étapes de réalisation</h4>
                  <ol className="space-y-3">
                    {selectedChallenge.steps.map((s: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="grid size-6 place-items-center rounded-lg border border-ink/10 bg-white font-mono text-xs font-bold text-ink shrink-0">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed font-semibold text-ink/80">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Proof / Observations if completed */}
              {selectedChallenge.status === "completed" && (
                <div className="border-t-2 border-ink pt-6 space-y-6">
                  <h4 className="font-display text-balance text-base font-extrabold text-ink">Retour sur la réalisation</h4>

                  {/* Proof Image */}
                  {selectedChallenge.proof_image_url && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">Preuve de réalisation</p>
                      <div className="rounded-2xl overflow-hidden border border-ink/10 bg-surface max-w-md">
                        <img src={selectedChallenge.proof_image_url} alt="Preuve" className="w-full max-h-64 object-contain" />
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {selectedChallenge.ai_observations && (
                    <div className="rounded-2xl border border-ink/10 bg-leaf/10 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                        <Brain className="size-4 text-emerald-700" />
                        Observations pédagogiques de Naya
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed italic font-medium">
                        "{selectedChallenge.ai_observations}"
                      </p>
                    </div>
                  )}

                  {/* Parent notes */}
                  {selectedChallenge.notes && (
                    <div className="rounded-2xl border border-ink/10 bg-sky/10 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-sky-800">
                        Notes du parent
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed font-medium">
                        {selectedChallenge.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-ink pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedChallenge(null)}
                className="rounded-2xl border border-ink/10 bg-ink px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

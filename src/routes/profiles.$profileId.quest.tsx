import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { NayaAvatar } from "@/components/NayaAvatar";
import { getActiveChallenge, ChallengeLike } from "@/lib/active-challenge";
import { ArrowLeft, Play, Check, Circle } from "lucide-react";

export const Route = createFileRoute("/profiles/$profileId/quest")({
  component: QuestPage,
});

type Child = {
  id: string;
  name: string;
  avatar_color: string;
};

type Challenge = ChallengeLike & {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
};

const DOMAIN_COLORS: Record<string, string> = {
  Sciences: "bg-amber-500 text-white",
  Arts: "bg-purple-500 text-white",
  Langues: "bg-blue-500 text-white",
  Sport: "bg-emerald-500 text-white",
  Artisanat: "bg-orange-500 text-white",
  Agriculture: "bg-lime-600 text-white",
  Entrepreneuriat: "bg-sky-500 text-white",
};

export function QuestPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    async function load() {
      setFetching(true);
      const [c, ch] = await Promise.all([
        supabase.from("child_profiles").select("id, name, avatar_color").eq("id", profileId).maybeSingle(),
        supabase.from("challenges").select("*").eq("child_id", profileId)
      ]);
      setChild((c.data as Child) ?? null);
      if (ch.data) {
        setChallenges(ch.data as Challenge[]);
      }
      setFetching(false);
    }
    void load();
  }, [session, profileId]);

  const activeChallenge = useMemo(() => getActiveChallenge(challenges), [challenges]);

  // Construct map nodes: [Completed 1, Completed 2, Active, Upcoming]
  const mapNodes = useMemo(() => {
    const completed = challenges
      .filter((c) => c.status === "completed")
      .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime());
    
    const active = activeChallenge;
    const todos = challenges.filter((c) => c.status === "todo" && c.id !== active?.id);

    const nodes: { type: "completed" | "active" | "upcoming"; challenge: Challenge }[] = [];
    
    // Take up to last 2 completed
    const recentCompleted = completed.slice(-2);
    recentCompleted.forEach((c) => {
      nodes.push({ type: "completed" as const, challenge: c });
    });

    // Add active
    if (active) {
      nodes.push({ type: "active" as const, challenge: active });
    }

    // Add up to 1 upcoming
    if (todos.length > 0) {
      nodes.push({ type: "upcoming" as const, challenge: todos[0] });
    } else if (!active && todos.length === 0 && completed.length === 0) {
      // Stub nodes if empty
      return [];
    }

    return nodes;
  }, [challenges, activeChallenge]);

  if (loading || fetching || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand text-white">
        <p className="font-bold">Chargement...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand text-white">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/" className="underline text-sm opacity-80 hover:opacity-100">Retour</Link>
        </div>
      </div>
    );
  }

  const verticalOffsets = ["translate-y-2", "-translate-y-2", "translate-y-1.5", "-translate-y-1"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-white flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none"></div>

      <header className="p-6 relative z-10 flex justify-between items-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          La Carte des Quêtes
        </h1>
        <Link 
          to="/profiles/$profileId/challenges" 
          params={{ profileId }} 
          className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-4 py-2 text-sm font-bold text-ink/40 hover:text-ink/80 hover:bg-white shadow-sm border border-ink/5 transition-all"
        >
          <ArrowLeft className="size-4" />
          Retour parent
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full relative z-10 text-center">
        
        {/* Quest Map Area */}
        {mapNodes.length > 0 && (
          <div className="w-full mb-12 py-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-ink/5 p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ink/60 mb-6 uppercase tracking-wider">Ton chemin de découverte</h2>
            <div className="flex items-center justify-between px-4 md:px-12 relative max-w-md mx-auto">
              
              {/* Connector Lines */}
              <div className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-0.5 border-t-2 border-dashed border-ink/20 z-0"></div>

              {mapNodes.map((node, index) => {
                const offset = verticalOffsets[index % verticalOffsets.length];
                const color = DOMAIN_COLORS[node.challenge.domain] || "bg-brand text-white";

                if (node.type === "completed") {
                  return (
                    <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}>
                      <div className="size-10 rounded-full bg-emerald-500 text-white border-2 border-white shadow flex items-center justify-center font-bold text-sm">
                        <Check className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Fait</span>
                    </div>
                  );
                }

                if (node.type === "active") {
                  return (
                    <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}>
                      <div className={`size-12 rounded-full ${color} border-4 border-white shadow-lg shadow-brand/20 flex items-center justify-center font-bold text-sm animate-pulse`}>
                        ★
                      </div>
                      <span className="text-[11px] font-extrabold text-ink uppercase tracking-wide">{node.challenge.title}</span>
                    </div>
                  );
                }

                // Upcoming
                return (
                  <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset} opacity-40`}>
                    <div className="size-9 rounded-full bg-white border-2 border-dashed border-ink/30 flex items-center justify-center text-ink/30">
                      <Circle className="size-4 fill-current opacity-20" />
                    </div>
                    <span className="text-[10px] font-bold text-ink/50 uppercase tracking-wide">Prochain</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <NayaAvatar size="md" className="mb-6" thoughts={activeChallenge ? ["Hop, on s'y met !"] : ["Bientôt de nouveaux défis !"]} />

        {activeChallenge ? (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-brand/10 w-full animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-sky to-leaf"></div>
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand mb-4">
              Mission : {activeChallenge.domain}
            </span>
            <h2 className="font-display text-2xl font-extrabold text-ink leading-tight mb-4">
              {activeChallenge.title}
            </h2>
            <p className="text-ink/70 leading-relaxed mb-8">
              {activeChallenge.description}
            </p>
            <Link
              to="/profiles/$profileId/challenges"
              params={{ profileId }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark hover:-translate-y-0.5 transition-all"
            >
              <Play className="size-5 fill-current" />
              Commencer la mission
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-ink/5 w-full">
            <p className="text-ink/60 text-lg font-semibold">
              Tu n'as pas de mission en cours pour le moment ! Demande à tes parents de t'en confier une.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

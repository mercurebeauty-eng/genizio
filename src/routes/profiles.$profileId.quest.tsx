import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getActiveChallenge, ChallengeLike } from "@/lib/active-challenge";
import { ArrowLeft, Play, Check, Circle, Sparkles, Smile, Trophy, X, ChevronRight, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NayaAvatar } from "@/components/NayaAvatar";
import nayaAvatar from "@/assets/naya-avatar.png";

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
  steps: any;
  materials: any;
  notes: string | null;
  progress: number;
  duration: string;
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

  // Quest Wizard states
  const [isQuestActive, setIsQuestActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepChecked, setStepChecked] = useState<boolean[]>([]);
  const [childFeedback, setChildFeedback] = useState("");
  const [completing, setCompleting] = useState(false);

  const loadChallenges = async () => {
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
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session) {
      void loadChallenges();
    }
  }, [session, profileId]);

  const activeChallenge = useMemo(() => getActiveChallenge(challenges), [challenges]);

  // Safe parse for steps and materials
  const steps = useMemo(() => {
    if (!activeChallenge) return [];
    const rawSteps = activeChallenge.steps;
    if (Array.isArray(rawSteps)) return rawSteps as string[];
    try {
      if (typeof rawSteps === "string") {
        const parsed = JSON.parse(rawSteps);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch (e) {}
    return [];
  }, [activeChallenge]);

  const materials = useMemo(() => {
    if (!activeChallenge) return [];
    const rawMats = activeChallenge.materials;
    if (Array.isArray(rawMats)) return rawMats as string[];
    try {
      if (typeof rawMats === "string") {
        const parsed = JSON.parse(rawMats);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch (e) {}
    return [];
  }, [activeChallenge]);

  // Initialize checked state when steps are loaded
  useEffect(() => {
    if (steps.length > 0) {
      setStepChecked(new Array(steps.length).fill(false));
    }
  }, [steps]);

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
    }

    return nodes;
  }, [challenges, activeChallenge]);

  const handleFinishQuest = async () => {
    if (!activeChallenge) return;
    setCompleting(true);
    try {
      const childText = childFeedback.trim() ? `\n\n[Enfant] : "${childFeedback.trim()}"` : "";
      const updatedNotes = (activeChallenge.notes || "") + childText;

      const { error } = await supabase
        .from("challenges")
        .update({
          status: "completed",
          progress: 100,
          notes: updatedNotes || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", activeChallenge.id);

      if (error) throw error;
      
      toast.success(`Félicitations ! Mission terminée ! 🏆`);
      setIsQuestActive(false);
      setCurrentStepIndex(0);
      setChildFeedback("");
      void loadChallenges();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la sauvegarde de ta quête.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading || fetching || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand/5 text-ink/50">
        <p className="font-bold animate-pulse">Chargement de la quête...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/profiles" className="underline text-sm opacity-80 hover:opacity-100">Retour</Link>
        </div>
      </div>
    );
  }

  const verticalOffsets = ["translate-y-2", "-translate-y-2", "translate-y-1.5", "-translate-y-1"];

  // Mascot text depending on step
  const getCompanionSpeech = () => {
    if (currentStepIndex === steps.length) {
      return `Waouh, incroyable ! Tu as relevé le défi ! Raconte-moi, comment c'était ?`;
    }
    if (currentStepIndex === 0) {
      return `Salut ${child.name} ! Prêt pour cette mission ? Commençons par la première étape !`;
    }
    return `Génial ! Passons à l'étape suivante, tu te débrouilles super bien !`;
  };

  // If the game wizard is active, show the gamified fullscreen overlay
  if (isQuestActive && activeChallenge) {
    const isCompletedScreen = currentStepIndex === steps.length;
    const currentStepText = steps[currentStepIndex] || "";

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-sky-50/50 to-emerald-50/50 flex flex-col p-6 relative overflow-hidden font-sans text-ink select-none">
        {/* Floating background decorative circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none" />

        {/* Wizard Header */}
        <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-brand">
              Mode Quête
            </span>
            <span className="text-sm font-bold text-ink/40">
              {isCompletedScreen ? "Fin de mission" : `Étape ${currentStepIndex + 1} sur ${steps.length}`}
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm("Veux-tu vraiment quitter ta mission en cours ? Ton avancée ne sera pas perdue.")) {
                setIsQuestActive(false);
                setCurrentStepIndex(0);
              }
            }}
            className="rounded-full bg-white/80 hover:bg-white p-2.5 shadow-sm border border-ink/5 text-ink/50 hover:text-ink transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Progress bar */}
        {!isCompletedScreen && (
          <div className="w-full max-w-4xl mx-auto bg-stone-200/50 h-3 rounded-full mb-10 overflow-hidden relative z-10 border border-white">
            <div
              className="bg-gradient-to-r from-brand via-sky to-leaf h-full transition-all duration-500 rounded-full"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        )}

        <main className="flex-1 flex flex-col md:grid md:grid-cols-5 items-center justify-center gap-10 max-w-4xl mx-auto w-full relative z-10">
          {/* Left Column: Mascot Naya */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="relative flex flex-col items-center gap-6">
              {/* Mascot Face */}
              <div className="relative size-32 md:size-40 rounded-full border-4 border-white shadow-2xl flex items-center justify-center animate-bounce duration-1000 overflow-hidden bg-white shrink-0">
                <img src={nayaAvatar} alt="Naya" className="h-full w-full object-cover" />
              </div>
              
              {/* Speech bubble */}
              <div className="bg-white border border-ink/5 p-4 rounded-3xl shadow-soft max-w-xs text-sm font-bold text-ink leading-relaxed relative">
                {getCompanionSpeech()}
                <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-white hidden md:block" />
              </div>
            </div>
          </div>

          {/* Right Column: Interaction Card */}
          <div className="md:col-span-3 w-full">
            <div className="bg-white rounded-3xl p-8 shadow-soft border border-ink/5 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand via-sky to-leaf" />

              {!isCompletedScreen ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚀</span>
                      <span className="text-xs font-black uppercase tracking-widest text-brand">Étape en cours</span>
                    </div>
                    <h3 className="font-display text-2xl font-black text-ink leading-tight">
                      {currentStepText}
                    </h3>
                  </div>

                  {/* Playful checkbox */}
                  <div className="mt-8">
                    <button
                      onClick={() => {
                        const copy = [...stepChecked];
                        copy[currentStepIndex] = !copy[currentStepIndex];
                        setStepChecked(copy);
                      }}
                      className={`w-full rounded-2xl p-5 border-2 border-b-4 text-left font-black text-lg flex items-center justify-between transition-all cursor-pointer transform duration-100 active:border-b-2 active:translate-y-[2px] ${
                        stepChecked[currentStepIndex]
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                          : "bg-white border-ink/15 text-ink/75 hover:bg-stone-50 hover:border-brand/40"
                      }`}
                    >
                      <span>{stepChecked[currentStepIndex] ? "✓ C'est fait !" : "J'ai terminé cette étape !"}</span>
                      <div className={`size-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        stepChecked[currentStepIndex]
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-ink/20 bg-stone-50"
                      }`}>
                        {stepChecked[currentStepIndex] && <Check className="size-4 stroke-[3px]" />}
                      </div>
                    </button>
                  </div>

                  {/* Next Step / Footer Navigation */}
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => {
                        if (currentStepIndex < steps.length - 1) {
                          setCurrentStepIndex((prev) => prev + 1);
                        } else {
                          // Go to final screen
                          setCurrentStepIndex(steps.length);
                        }
                      }}
                      disabled={!stepChecked[currentStepIndex]}
                      className="rounded-2xl bg-brand border-b-4 border-brand-dark px-7 py-3.5 text-sm font-black text-white hover:bg-brand shadow-brand hover:brightness-105 active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>Suivant</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-6 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-600">Félicitations !</span>
                    </div>
                    <h3 className="font-display text-2xl font-black text-ink leading-tight">
                      Tu as achevé toute la mission avec succès !
                    </h3>
                    <p className="text-sm text-ink/60">
                      Raconte en tes propres mots ton aventure ci-dessous (facultatif) :
                    </p>
                  </div>

                  <div className="mt-6 relative">
                    <textarea
                      value={childFeedback}
                      onChange={(e) => setChildFeedback(e.target.value.slice(0, 1000))}
                      rows={3}
                      placeholder="J'ai adoré construire le pont mais le pistolet à colle était un peu difficile..."
                      className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold outline-none focus:border-brand transition-all resize-none bg-surface/50"
                    />
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleFinishQuest}
                      disabled={completing}
                      className="flex-1 rounded-2xl bg-emerald-500 border-b-4 border-emerald-600 px-6 py-4 text-base font-black text-white shadow-lg active:border-b-0 active:translate-y-[4px] hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-emerald-400"
                    >
                      {completing ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="size-5" />
                          <span>Terminer ma Quête ! 🏆</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-white flex flex-col relative overflow-hidden font-sans text-ink">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none" />

      <header className="p-6 relative z-10 flex justify-between items-center max-w-4xl mx-auto w-full">
        <h1 className="font-display text-2xl font-black text-ink tracking-tight">
          La Carte des Quêtes
        </h1>
        <Link 
          to="/profiles" 
          className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-4 py-2 text-xs font-extrabold text-ink/50 hover:text-ink/80 hover:bg-white shadow-sm border border-ink/5 transition-all"
        >
          <ArrowLeft className="size-3.5" />
          Retour parent
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full relative z-10 text-center">
        
        {/* Quest Map Node Tree (Screen 1j) */}
        {mapNodes.length > 0 && (
          <div className="w-full mb-12 py-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-ink/5 p-6 shadow-soft">
            <h2 className="font-display text-xs font-black text-ink/40 mb-8 uppercase tracking-widest">Mon chemin de découverte</h2>
            <div className="flex items-center justify-between px-4 md:px-12 relative max-w-md mx-auto">
              
              {/* Connector Lines */}
              <div className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-0.5 border-t-2 border-dashed border-ink/20 z-0" />

              {mapNodes.map((node, index) => {
                const offset = verticalOffsets[index % verticalOffsets.length];
                const color = DOMAIN_COLORS[node.challenge.domain] || "bg-brand text-white";

                if (node.type === "completed") {
                  return (
                    <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}>
                      <div className="size-11 rounded-full bg-emerald-500 text-white border-4 border-white shadow-md flex items-center justify-center font-bold text-sm">
                        <Check className="size-5 stroke-[3px]" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Fait</span>
                    </div>
                  );
                }

                if (node.type === "active") {
                  return (
                    <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}>
                      <div className={`size-14 rounded-full ${color} border-4 border-white shadow-xl flex items-center justify-center font-bold text-base animate-pulse`}>
                        ★
                      </div>
                      <span className="text-[11px] font-black text-ink uppercase tracking-wider max-w-[120px] truncate">{node.challenge.title}</span>
                    </div>
                  );
                }

                // Upcoming
                return (
                  <div key={node.challenge.id} className={`flex flex-col items-center gap-2 relative z-10 ${offset} opacity-40`}>
                    <div className="size-10 rounded-full bg-white border-2 border-dashed border-ink/30 flex items-center justify-center text-ink/30">
                      <Circle className="size-4 fill-current opacity-20" />
                    </div>
                    <span className="text-[10px] font-black text-ink/50 uppercase tracking-wider">Prochain</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <NayaAvatar size="md" className="mb-6" thoughts={activeChallenge ? ["Hop, on s'y met !"] : ["Bientôt de nouveaux défis !"]} />

        {activeChallenge ? (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-brand/10 w-full animate-in zoom-in-95 duration-500 relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand via-sky to-leaf" />
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-block rounded-full bg-brand/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand">
                Mission : {activeChallenge.domain}
              </span>
              <span className="text-xs font-semibold text-ink/40">⏱ {activeChallenge.duration}</span>
            </div>
            <h2 className="font-display text-2xl font-black text-ink leading-tight mb-3">
              {activeChallenge.title}
            </h2>
            <p className="text-ink/70 leading-relaxed mb-6">
              {activeChallenge.description}
            </p>

            {materials.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3">Matériel à rassembler :</p>
                <div className="flex flex-wrap gap-2">
                  {materials.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold text-ink/80 border border-ink/5 shadow-sm">
                      📦 {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsQuestActive(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand border-b-4 border-brand-dark px-8 py-4 text-base font-black text-white active:border-b-0 active:translate-y-[4px] shadow-brand hover:brightness-105 transition-all cursor-pointer"
            >
              <Play className="size-5 fill-current" />
              Commencer la mission ! 🚀
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-ink/5 w-full">
            <p className="text-ink/65 text-lg font-bold">
              Tu n'as pas de mission active pour le moment ! Demande à tes parents de t'en attribuer une. 😊
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

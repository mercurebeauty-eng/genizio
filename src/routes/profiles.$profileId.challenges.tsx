import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Brain, Award, Trash2, Calendar, CheckCircle2, ArrowLeft, Sparkles, Upload, Loader2, Play, Check, X } from "lucide-react";
import {
  generateChallenges,
  updateChallenge,
  deleteChallenge,
  validateChallengeProof,
  getChildAISynthesis,
  generateSingleChallenge,
  assignTemplateChallenge,
} from "@/lib/challenges.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { StepAccordion } from "@/components/challenges/StepAccordion";
import { ObservationPrompts } from "@/components/challenges/ObservationPrompts";
import { OutcomeChat } from "@/components/challenges/OutcomeChat";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { getActiveChallenge } from "@/lib/active-challenge";

const CATEGORIES = [
  { id: "all", label: "Suggéré par Naya (Diagnostic)" },
  { id: "Sciences", label: "Sciences & Ingénierie" },
  { id: "Arts", label: "Arts & Créativité" },
  { id: "Langues", label: "Langues & Littérature" },
  { id: "Sport", label: "Sport & motricité" },
  { id: "Artisanat", label: "Artisanat & Métiers" },
  { id: "Agriculture", label: "Agriculture & Nature" },
  { id: "Entrepreneuriat", label: "Échanges & Commerce" },
];

export const Route = createFileRoute("/profiles/$profileId/challenges")({
  component: ChallengesPage,
});

type Challenge = {
  id: string;
  child_id: string;
  domain: string;
  title: string;
  description: string;
  duration: string;
  steps: string[];
  materials: string[];
  status: "todo" | "in_progress" | "completed";
  progress: number;
  notes: string | null;
  completed_at: string | null;
  pedagogical_context?: string | null;
  target_intelligences?: string[] | null;
  proof_image_url?: string | null;
  ai_observations?: string | null;
};

type Child = {
  id: string;
  name: string;
  age: number;
  interests: string[];
  avatar_color: string;
  city: string | null;
  country: string | null;
  talents: Record<string, number>;
};

const COLORS: Record<string, string> = {
  brand: "bg-brand text-white",
  leaf: "bg-leaf text-white",
  sky: "bg-sky text-white",
  ink: "bg-ink text-white",
};

const STATUS_LABEL: Record<Challenge["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
};

const STATUS_STYLE: Record<Challenge["status"], string> = {
  todo: "bg-stone-100 text-stone-700 border-stone-200",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function ChallengesPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // IA Synthesis State
  const [aiSynthesis, setAiSynthesis] = useState<string>("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);

  // Integrated Lab States
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isAssigningSingle, setIsAssigningSingle] = useState(false);
  const [currentGeneratedChallenge, setCurrentGeneratedChallenge] = useState<any | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const generate = useServerFn(generateChallenges);
  const update = useServerFn(updateChallenge);
  const del = useServerFn(deleteChallenge);
  const fetchSynthesis = useServerFn(getChildAISynthesis);
  const generateSingle = useServerFn(generateSingleChallenge);
  const assignSingle = useServerFn(assignTemplateChallenge);

  const LOADING_STEPS = [
    "Naya étudie la carte des talents...",
    "Naya analyse les réalisations passées...",
    "Naya formule un défi croisé auto-correctif...",
    "Naya rédige le contexte pédagogique...",
    "Finalisation du plan d'expérience...",
  ];

  useEffect(() => {
    let interval: any;
    if (isGeneratingSingle) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGeneratingSingle]);

  const handleGenerateSingle = async () => {
    setIsGeneratingSingle(true);
    setCurrentGeneratedChallenge(null);
    try {
      const resp = await generateSingle({
        data: {
          childId: profileId,
          domain: selectedCategory,
        }
      });
      setCurrentGeneratedChallenge(resp);
      toast.success("Nouveau défi composé avec succès !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération. Réessayez.");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleAssignSingle = async () => {
    if (!currentGeneratedChallenge) return;
    setIsAssigningSingle(true);
    try {
      await assignSingle({
        data: {
          childId: profileId,
          template: {
            title: currentGeneratedChallenge.title,
            domain: currentGeneratedChallenge.domain,
            description: currentGeneratedChallenge.description,
            duration: currentGeneratedChallenge.duration,
            steps: currentGeneratedChallenge.steps,
            materials: currentGeneratedChallenge.materials,
            intelligences: currentGeneratedChallenge.intelligences || [currentGeneratedChallenge.domain],
            pedagogical_context: currentGeneratedChallenge.pedagogical_context,
          }
        }
      });
      toast.success("Défi assigné avec succès !");
      setCurrentGeneratedChallenge(null);
      await refetch();
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigningSingle(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    const [c, ch] = await Promise.all([
      supabase.from("child_profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase
        .from("challenges")
        .select("*")
        .eq("child_id", profileId)
        .order("created_at", { ascending: false }),
    ]);
    setChild((c.data as Child) ?? null);
    const list = (ch.data ?? []) as Challenge[];
    setChallenges(list);
    const active = getActiveChallenge(list);
    if (active && !openId) {
      setOpenId(active.id);
    }
    setFetching(false);
  };

  const loadAISynthesis = async () => {
    setFetchingSynthesis(true);
    try {
      const resp = await fetchSynthesis({ data: { childId: profileId } });
      setAiSynthesis(resp || "");
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSynthesis(false);
    }
  };

  useEffect(() => {
    if (session) {
      void refetch();
      void loadAISynthesis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await generate({ data: { childId: profileId, count: 4 } });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: Challenge["status"]) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              progress: status === "completed" ? 100 : status === "todo" ? 0 : c.progress,
            }
          : c,
      ),
    );
    await update({ data: { id, status } });
  };

  const setProgress = async (id: string, progress: number) => {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, progress } : c)));
    await update({ data: { id, progress } });
  };

  const saveNotes = async (id: string, notes: string) => {
    await update({ data: { id, notes } });
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)));
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce défi ?")) return;
    await del({ data: { id } });
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/50">
        Chargement…
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="text-center">
          <p className="mb-4 text-ink/60">Profil introuvable.</p>
          <Link to="/profiles" className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const done = challenges.filter((c) => c.status === "completed").length;
  const inProgress = challenges.filter((c) => c.status === "in_progress").length;
  const totalProgress =
    challenges.length > 0
      ? Math.round(challenges.reduce((a, c) => a + c.progress, 0) / challenges.length)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 text-ink">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex md:gap-8">
        <AppTabBar profileId={profileId} />
        <div className="min-w-0 flex-1">
          {/* Child Header Profile */}
        <div className="mb-10 rounded-3xl border border-ink/5 bg-white p-6 shadow-soft md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`grid size-16 place-items-center rounded-2xl font-display text-2xl font-bold shadow-md shadow-brand/10 ${COLORS[child.avatar_color] ?? "bg-brand"}`}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand">
                Tableau de bord de
              </p>
              <h1 className="font-display text-3xl font-extrabold md:text-4xl">{child.name}</h1>
              <p className="mt-1 text-sm font-medium text-ink/50">
                {child.age} ans
                {child.interests.length > 0 && ` · ${child.interests.slice(0, 3).join(", ")}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                document.getElementById("genizio-lab")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-2xl border border-brand/20 bg-brand/5 px-5 py-3 text-sm font-bold text-brand hover:bg-brand/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="size-4" />
              Générateur d'Expériences
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark transition-all disabled:bg-brand-dark disabled:cursor-wait flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Naya compose...</span>
                </>
              ) : (
                <>
                  <Brain className="size-4" />
                  <span>Suggérer 4 défis (IA)</span>
                </>
              )}
            </button>
            <Link
              to="/profiles/$profileId/quest"
              params={{ profileId }}
              className="rounded-2xl border border-sky/30 bg-sky/5 px-5 py-3 text-sm font-bold text-sky-600 hover:bg-sky/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              Au tour de {child.name} →
            </Link>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* LEFT COLUMN: Radar chart & AI Synthesis */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Radar Chart Card */}
            <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-soft">
              <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
                <Award className="size-5 text-brand" />
                Carte des Talents
              </h3>
              <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" />
              <p className="text-[11px] text-center text-ink/40 font-medium">
                Cette carte s'affine et se développe à mesure que l'enfant réalise ses défis.
              </p>
            </div>

            {/* AI Synthesis Card */}
            <div className="rounded-3xl border border-brand/10 bg-gradient-to-br from-brand/5 to-indigo-50/20 p-6 shadow-soft relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 size-24 rounded-full bg-brand/10 blur-xl"></div>
              
              <h3 className="font-display text-lg font-bold flex items-center gap-2 text-brand mb-4">
                <Brain className="size-5" />
                Rapport de Naya
              </h3>

              {fetchingSynthesis ? (
                <div className="flex flex-col items-center justify-center py-4 text-ink/40 text-sm">
                  <NayaAvatar size="sm" className="mb-2" />
                  <span>Naya réunit ses observations...</span>
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-ink/80 space-y-3 whitespace-pre-line">
                  {aiSynthesis}
                </div>
              )}
            </div>

            {/* Micro stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-ink/5 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Défis Terminés</span>
                <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600">{done}</p>
              </div>
              <div className="bg-white rounded-2xl border border-ink/5 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Progression</span>
                <p className="mt-1 font-display text-2xl font-extrabold text-brand">{totalProgress}%</p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Challenges List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 🧪 Unified Lab Panel */}
            <div id="genizio-lab" className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50/40 via-white to-brand/5 p-6 shadow-soft md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid place-items-center rounded-xl bg-indigo-500/10 p-2 text-indigo-600">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">Le Laboratoire de Génizio</h3>
                    <p className="text-xs text-ink/50">Composez un défi d'apprentissage sur-mesure pour {child.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink/50 mb-2">
                    Sélectionner l'Intelligence
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand transition-all cursor-pointer shadow-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    onClick={handleGenerateSingle}
                    disabled={isGeneratingSingle}
                    className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 transition-all disabled:bg-indigo-500 disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isGeneratingSingle ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        <span className="text-white">Composition...</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-4 fill-current text-white" />
                        <span className="text-white">Lancer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loader display */}
              {isGeneratingSingle && (
                <div className="mt-8 flex flex-col items-center justify-center py-6 text-center border-t border-dashed border-ink/10">
                  <NayaAvatar size="md" thoughts={LOADING_STEPS} className="mb-4" />
                  <p className="text-sm font-bold text-indigo-600 animate-pulse">{LOADING_STEPS[loadingTextIndex]}</p>
                </div>
              )}

              {/* Generated challenge display */}
              {currentGeneratedChallenge && !isGeneratingSingle && (
                <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 border border-indigo-100">
                      {currentGeneratedChallenge.domain}
                    </span>
                    <span className="text-xs text-ink/40 font-semibold">🕒 {currentGeneratedChallenge.duration}</span>
                  </div>
                  <h4 className="font-display text-xl font-extrabold leading-tight text-ink mb-2">
                    {currentGeneratedChallenge.title}
                  </h4>
                  <p className="text-sm text-ink/70 leading-relaxed mb-4">
                    {currentGeneratedChallenge.description}
                  </p>

                  {currentGeneratedChallenge.pedagogical_context && (
                    <div className="mb-4 rounded-xl bg-amber-50/50 border border-amber-100/50 p-4 text-xs leading-relaxed text-amber-800">
                      <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                        💡 Intention pédagogique (Naya)
                      </p>
                      {currentGeneratedChallenge.pedagogical_context}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink/40 mb-2">Étapes du défi</h5>
                      <ul className="text-xs space-y-1.5 text-ink/70 list-decimal list-inside pl-1">
                        {currentGeneratedChallenge.steps.slice(0, 4).map((step: string, idx: number) => (
                          <li key={idx} className="truncate">{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink/40 mb-2">Matériel requis</h5>
                      <ul className="text-xs space-y-1.5 text-ink/70 list-disc list-inside pl-1">
                        {currentGeneratedChallenge.materials.slice(0, 4).map((mat: string, idx: number) => (
                          <li key={idx} className="truncate">{mat}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-ink/5 pt-4">
                    <button
                      onClick={handleAssignSingle}
                      disabled={isAssigningSingle}
                      className="flex-1 rounded-xl bg-brand py-2.5 text-center text-xs font-bold text-white shadow-md shadow-brand/10 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isAssigningSingle ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Assignation...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" />
                          <span>Assigner ce défi à {child.name}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleGenerateSingle}
                      className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink/60 hover:bg-stone-50 transition-all cursor-pointer"
                    >
                      Relancer
                    </button>
                  </div>
                </div>
              )}

            </div>

            <h3 className="font-display text-xl font-bold flex items-center gap-2">
              <Calendar className="size-5 text-indigo-500" />
              Feuille de Route des Défis ({challenges.length})
            </h3>

            {error && (
              <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-bold">{error}</p>
            )}

            {challenges.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-16 text-center">
                <p className="mb-2 text-lg font-bold">Aucune expérience entamée</p>
                <p className="mb-6 text-sm text-ink/50 max-w-sm mx-auto">
                  Démarrez des expériences sur-mesure pour {child.name} via le générateur IA ou laissez Naya composer une première liste de base.
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/laboratory"
                    className="rounded-2xl border border-brand/20 bg-brand/5 px-5 py-3 text-sm font-bold text-brand hover:bg-brand/10 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="size-4" />
                    Le Générateur IA
                  </Link>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60 transition-all"
                  >
                    ✨ Suggérer 4 défis
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {challenges.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    c={c}
                    childId={profileId}
                    childName={child.name}
                    open={openId === c.id}
                    onToggle={() => setOpenId((v) => (v === c.id ? null : c.id))}
                    onStatus={(s) => setStatus(c.id, s)}
                    onProgress={(p) => setProgress(c.id, p)}
                    onNotes={(n) => saveNotes(c.id, n)}
                    onDelete={() => remove(c.id)}
                    onValidated={async () => {
                      await refetch();
                      await loadAISynthesis();
                    }}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  </div>
  );
}

function MaterialsChecklist({ materials }: { materials: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(new Array(materials.length).fill(false));
  
  return (
    <div>
      <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-widest text-ink/40">
        Matériel requis & rassemblé
      </p>
      <div className="flex flex-wrap gap-2">
        {materials.map((m, i) => (
          <button
            key={i}
            onClick={() => {
              const copy = [...checked];
              copy[i] = !copy[i];
              setChecked(copy);
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              checked[i]
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                : "bg-surface border-ink/5 text-ink/70 hover:bg-stone-50"
            }`}
          >
            <div className={`size-3.5 rounded flex items-center justify-center border ${
              checked[i] ? "border-emerald-500 bg-emerald-500 text-white" : "border-ink/20"
            }`}>
              {checked[i] && <Check className="size-2 stroke-[3px]" />}
            </div>
            <span>{m}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({
  c,
  childId,
  childName,
  open,
  onToggle,
  onStatus,
  onProgress,
  onNotes,
  onDelete,
  onValidated,
}: {
  c: Challenge;
  childId: string;
  childName: string;
  open: boolean;
  onToggle: () => void;
  onStatus: (s: Challenge["status"]) => void;
  onProgress: (p: number) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
  onValidated: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(c.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);

  return (
    <div className="rounded-3xl bg-white p-5 border border-ink/5 shadow-soft transition-all hover:border-brand/20">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand">
          {c.domain}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[c.status]}`}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>

      <h3 className="font-display text-xl font-extrabold text-ink leading-tight mb-2">{c.title}</h3>
      <p className="text-sm text-ink/75 leading-relaxed mb-4">{c.description}</p>

      {/* Progress Slider */}
      <div className="mb-4 rounded-2xl bg-surface/50 p-4 border border-ink/5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-ink/50">Progression</span>
          <span className="font-extrabold text-brand">{c.progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={c.progress}
          onChange={(e) => onProgress(Number(e.target.value))}
          className="w-full accent-brand cursor-pointer"
        />
      </div>

      <div className="mb-4 flex items-center gap-4 text-xs font-semibold text-ink/40">
        <span>⏱ Durée : {c.duration}</span>
        {c.completed_at && (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="size-3.5" /> Complété le {new Date(c.completed_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Status control buttons */}
      <div className="mb-4 flex gap-2">
        {(["todo", "in_progress", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-bold transition-all " +
              (c.status === s
                ? "bg-brand text-white shadow-md shadow-brand/10"
                : "bg-surface text-ink/60 hover:bg-ink/5")
            }
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <button
        onClick={onToggle}
        className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-xs font-bold text-ink/70 hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
      >
        <span>{open ? "Masquer les détails" : "Afficher étapes, matériel & preuve IA"}</span>
      </button>

      {open && (
        <div className="mt-5 border-t border-ink/5 pt-5 animate-in fade-in duration-200">
          <div className="grid gap-8 md:grid-cols-2">
            
            {/* Left Pane: Child Facing (Pour l'enfant) */}
            <div className="space-y-6 bg-surface/40 p-5 rounded-3xl border border-ink/5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-1">
                  Pour {childName}
                </p>
                <h4 className="font-display text-lg font-black text-ink">
                  {c.title}
                </h4>
                <p className="mt-2 text-sm text-ink/75 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {/* steps */}
              {c.steps.length > 0 && (
                <StepAccordion steps={c.steps} />
              )}

              {/* Child-oriented Start Quest button */}
              <div className="pt-2">
                <Link
                  to="/profiles/$profileId/quest"
                  params={{ profileId: childId }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark transition-all cursor-pointer"
                >
                  <Play className="size-3.5 fill-current" />
                  Mode Enfant (Quête) 🎮
                </Link>
              </div>
            </div>

            {/* Right Pane: Parent Facing (Pendant l'observation) */}
            <div className="space-y-6">
              {/* pedagogical context */}
              {c.pedagogical_context && (
                <div className="rounded-2xl bg-brand/5 border border-brand/10 p-4 flex gap-2.5">
                  <Brain className="size-5 text-brand flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-1">
                      Intention Pédagogique
                    </p>
                    <p className="text-xs text-brand/90 leading-relaxed italic">
                      "{c.pedagogical_context}"
                    </p>
                  </div>
                </div>
              )}

              {/* Observation prompts */}
              <ObservationPrompts />

              {/* materials with checklist interactive items */}
              {c.materials.length > 0 && (
                <MaterialsChecklist materials={c.materials} />
              )}

              {/* Parent Notes */}
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40">
                  Journal d'apprentissage du parent
                </p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value.slice(0, 2000))}
                  rows={3}
                  placeholder="Écrivez ce que l'enfant a fait, ses réussites et difficultés..."
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand transition-all resize-none"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={async () => {
                      await onNotes(notesDraft);
                      setSavedFlash(true);
                      setTimeout(() => setSavedFlash(false), 1500);
                    }}
                    className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-brand transition-all cursor-pointer"
                  >
                    Enregistrer les notes
                  </button>
                  {savedFlash && <span className="text-xs text-emerald-600 font-bold">✓ Notes enregistrées</span>}
                </div>
              </div>

              {/* Validation section */}
              {c.status === "completed" && !c.ai_observations && (
                <OutcomeChat 
                  challenge={c} 
                  childId={childId} 
                  childName={childName} 
                  onValidated={onValidated} 
                />
              )}

              {/* AI Observations feedback */}
              {c.ai_observations && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1">
                    <Brain className="size-4 text-emerald-700" />
                    Analyse de Naya (IA)
                  </p>
                  <p className="text-sm italic text-ink/80 leading-relaxed mb-3">"{c.ai_observations}"</p>
                  <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">✓ La Carte des Talents de l'enfant a été enrichie !</p>
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end pt-5 border-t border-ink/5 mt-6">
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

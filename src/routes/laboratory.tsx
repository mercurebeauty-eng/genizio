import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { generateSingleChallenge, assignTemplateChallenge } from "@/lib/challenges.functions";
import { Sparkles, Loader2, RotateCcw, Check, BookOpen, ShieldAlert, Award } from "lucide-react";
import { toast } from "sonner";
import { NayaAvatar } from "@/components/NayaAvatar";

export const Route = createFileRoute("/laboratory")({
  component: LaboratoryPage,
});

const CATEGORIES = [
  { id: "all", label: "Surprenez-moi ! (Toutes)" },
  { id: "Sciences", label: "Sciences & Ingénierie" },
  { id: "Architecture", label: "Architecture & Bâtiment" },
  { id: "Artisanat", label: "Artisanat & Manuel" },
  { id: "Agriculture", label: "Agriculture & Nature" },
  { id: "Sport", label: "Sport & Corps" },
  { id: "Communication", label: "Communication & Leadership" },
  { id: "Entrepreneuriat", label: "Entrepreneuriat" },
  { id: "Arts", label: "Arts & Créativité" },
  { id: "Langues", label: "Langues & Culture" },
  { id: "Tech & IA", label: "Tech & IA" },
];

const DOMAIN_COLORS: Record<string, string> = {
  Sciences: "from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 bg-blue-50/50",
  Architecture: "from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-700 bg-amber-50/50",
  Artisanat: "from-amber-600/10 to-stone-600/10 border-amber-600/30 text-amber-900 bg-amber-50/30",
  Agriculture: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-700 bg-emerald-50/50",
  Sport: "from-red-500/10 to-rose-500/10 border-red-500/30 text-red-600 bg-red-50/50",
  Communication: "from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-600 bg-purple-50/50",
  Entrepreneuriat: "from-sky-500/10 to-cyan-500/10 border-sky-500/30 text-sky-700 bg-sky-50/50",
  Arts: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/30 text-fuchsia-600 bg-fuchsia-50/50",
  Langues: "from-indigo-500/10 to-violet-500/10 border-indigo-500/30 text-indigo-600 bg-indigo-50/50",
  "Tech & IA": "from-teal-500/10 to-cyan-500/10 border-teal-500/30 text-teal-700 bg-teal-50/50",
};

interface GeneratedChallenge {
  title: string;
  domain: string;
  description: string;
  duration: string;
  steps: string[];
  materials: string[];
  pedagogical_context?: string;
  intelligences?: string[];
}

const LOADING_STEPS = [
  "Naya étudie la carte des talents de l'enfant...",
  "Analyse des centres d'intérêt et de l'âge...",
  "Recherche d'une idée d'expérience stimulante...",
  "Conception des étapes étape par étape...",
  "Vérification de la faisabilité avec des matériaux locaux...",
  "Mise en forme pédagogique du défi...",
];

function LaboratoryPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<GeneratedChallenge | null>(null);
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "materials" | "pedagogical">("steps");

  const generateAction = useServerFn(generateSingleChallenge);
  const assignAction = useServerFn(assignTemplateChallenge);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (session) {
      supabase.from("child_profiles").select("id, name").order("created_at").then(({ data }) => {
        if (data) {
          setChildrenList(data);
          if (data.length > 0) setSelectedChild(data[0].id);
        }
      });
    }
  }, [session, loading, navigate]);

  // Loading text cycler
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!selectedChild) {
      toast.error("Veuillez d'abord sélectionner un enfant.");
      return;
    }
    setIsGenerating(true);
    setCurrentChallenge(null);
    try {
      const challenge = await generateAction({
        data: {
          childId: selectedChild,
          domain: selectedCategory,
        }
      });
      setCurrentChallenge(challenge as GeneratedChallenge);
      setActiveTab("steps");
      toast.success("Nouveau défi généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération. Réessayez d'ici quelques instants.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!currentChallenge || !selectedChild) return;
    setIsAssigning(true);
    try {
      await assignAction({
        data: {
          childId: selectedChild,
          template: {
            title: currentChallenge.title,
            domain: currentChallenge.domain,
            description: currentChallenge.description,
            duration: currentChallenge.duration,
            steps: currentChallenge.steps,
            materials: currentChallenge.materials,
            intelligences: currentChallenge.intelligences || [currentChallenge.domain],
            pedagogical_context: currentChallenge.pedagogical_context,
          }
        }
      });
      toast.success("Défi assigné avec succès !");
      navigate({ to: `/profiles/${selectedChild}/challenges` });
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface">Chargement...</div>;
  }

  const childName = childrenList.find((c) => c.id === selectedChild)?.name ?? "l'enfant";

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 p-6 font-sans text-ink">
      <nav className="mb-10 flex items-center justify-between border-b border-ink/5 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand tracking-wider">
            <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
            GÉNIZIO
          </Link>
          <span className="h-6 w-px bg-ink/10"></span>
          <p className="text-sm font-semibold text-ink/60">Le Générateur Pédagogique</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/profiles"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 hover:bg-surface/50 transition-all"
          >
            Mes Enfants
          </Link>
          <Link
            to="/feed"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 hover:bg-surface/50 transition-all"
          >
            Le Mur
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center rounded-full border border-brand/20 bg-brand/5 p-2 font-bold text-brand hover:bg-brand/10 transition-all"
            aria-label="Mon Compte"
          >
            ⚙️
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <NayaAvatar size="md" className="mx-auto mb-2" />
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles className="size-4 animate-pulse" />
            Inspiration Sharpen & IA
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Le Laboratoire d'Expériences
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
            Faites tourner le générateur pour inventer des missions pédagogiques captivantes, ancrées dans la réalité et adaptées aux talents de votre enfant.
          </p>
        </header>

        {/* Configuration Panel */}
        <div className="mb-8 rounded-3xl border border-ink/5 bg-white p-6 shadow-soft md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-ink/60">
                1. Choisir l'enfant :
              </label>
              {childrenList.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {childrenList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChild(c.id)}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                        selectedChild === c.id
                          ? "bg-brand text-white shadow-md shadow-brand/20 ring-2 ring-brand ring-offset-2"
                          : "bg-surface text-ink/80 hover:bg-ink/5"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 font-semibold bg-amber-50 p-3 rounded-2xl">
                  <ShieldAlert className="size-5 flex-shrink-0" />
                  <span>Aucun profil enfant trouvé. Créez-en un dans <Link to="/profiles" className="underline">Mes Enfants</Link> d'abord.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-ink/60">
                2. Sélectionner une Intelligence :
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-3 block w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3.5 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || childrenList.length === 0}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-brand px-8 py-4 font-display text-lg font-bold text-white shadow-lg shadow-brand/30 transition-all hover:scale-[1.02] hover:bg-brand-dark hover:shadow-brand/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Naya compose...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
                  <span>Générer un défi sur-mesure ✨</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <NayaAvatar size="lg" thoughts={LOADING_STEPS} className="mb-6" />
            <p className="text-lg font-bold text-brand">{LOADING_STEPS[loadingTextIndex]}</p>
            <p className="mt-2 text-xs text-ink/40">Génération par Naya</p>
          </div>
        )}

        {/* Challenge Display */}
        {currentChallenge && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl">
              {/* Header Gradient */}
              <div className={`bg-gradient-to-br p-6 border-b border-ink/5 md:p-8 ${DOMAIN_COLORS[currentChallenge.domain] ?? "from-brand/10 to-indigo-100/10 text-brand"}`}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-current px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
                    <Compass className="size-3.5" />
                    {currentChallenge.domain}
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider">
                    ⏱ {currentChallenge.duration}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight text-ink md:text-3xl">
                  {currentChallenge.title}
                </h2>
                <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink/70">
                  {currentChallenge.description}
                </p>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-ink/5 bg-stone-50/50">
                <button
                  onClick={() => setActiveTab("steps")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === "steps" ? "border-brand text-brand bg-white" : "border-transparent text-ink/50 hover:text-ink hover:bg-stone-50"
                  }`}
                >
                  📋 Les Étapes
                </button>
                <button
                  onClick={() => setActiveTab("materials")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === "materials" ? "border-brand text-brand bg-white" : "border-transparent text-ink/50 hover:text-ink hover:bg-stone-50"
                  }`}
                >
                  🛠 Le Matériel
                </button>
                <button
                  onClick={() => setActiveTab("pedagogical")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === "pedagogical" ? "border-brand text-brand bg-white" : "border-transparent text-ink/50 hover:text-ink hover:bg-stone-50"
                  }`}
                >
                  💡 Contexte Pédagogique
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 md:p-8">
                {activeTab === "steps" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink/50 mb-3">Plan d'action de l'expérience</h3>
                    <ol className="space-y-4">
                      {currentChallenge.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-4">
                          <div className="grid size-7 flex-shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                            {idx + 1}
                          </div>
                          <div className="text-sm leading-relaxed text-ink/80 pt-0.5">{step}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {activeTab === "materials" && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink/50 mb-4">Matériel nécessaire</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentChallenge.materials.map((mat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 rounded-2xl bg-leaf/5 px-4 py-3.5 border border-leaf/10">
                          <Check className="size-4 text-leaf flex-shrink-0" />
                          <span className="text-sm font-semibold text-leaf/90">{mat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "pedagogical" && (
                  <div className="rounded-2xl bg-brand/5 border border-brand/10 p-5 md:p-6">
                    <div className="flex gap-3">
                      <Award className="size-6 text-brand flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-brand uppercase tracking-wider mb-2">Observations de Naya</h4>
                        <p className="text-sm leading-relaxed text-ink/80 italic">
                          "{currentChallenge.pedagogical_context || "Ce défi permet d'explorer les aptitudes naturelles et de stimuler l'esprit créatif de l'enfant."}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 border-t border-ink/5 bg-stone-50/50 p-6 sm:flex-row md:px-8">
                <button
                  onClick={handleAssign}
                  disabled={isAssigning}
                  className="flex-1 rounded-2xl bg-brand py-4 text-center font-display text-sm font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Assignation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Assigner ce défi à {childName}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-2xl border border-ink/10 bg-white px-6 py-4 font-display text-sm font-bold text-ink/75 hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="size-4" />
                  <span>Relancer le générateur</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

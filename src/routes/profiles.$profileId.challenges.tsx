import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Brain, Award, Trash2, Calendar, CheckCircle2, ArrowLeft, Sparkles, Upload, Loader2, Play, Check, X, MessageCircle, Beaker, Trophy } from "lucide-react";
import {
  generateChallenges,
  updateChallenge,
  deleteChallenge,
  validateChallengeProof,
  getChildAISynthesis,
  generateSingleChallenge,
  assignTemplateChallenge,
} from "@/lib/challenges.functions";
import { createOrder } from "@/lib/products.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { StepAccordion } from "@/components/challenges/StepAccordion";
import { ObservationPrompts } from "@/components/challenges/ObservationPrompts";
import { OutcomeChat } from "@/components/challenges/OutcomeChat";
import { KitSuggestion } from "@/components/challenges/KitSuggestion";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { getActiveChallenge } from "@/lib/active-challenge";
import { ShoppingBag } from "lucide-react";

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
  material_tags?: string[] | null;
  status: "todo" | "in_progress" | "completed";
  progress: number;
  notes: string | null;
  completed_at: string | null;
  pedagogical_context?: string | null;
  target_intelligences?: string[] | null;
  proof_image_url?: string | null;
  ai_observations?: string | null;
  difficulty?: string | null;
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeProducts, setActiveProducts] = useState<any[]>([]);
  const [assignedChallengeForKit, setAssignedChallengeForKit] = useState<{ id: string; title: string; products: any[] } | null>(null);
  const [orderingKit, setOrderingKit] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price_xof, material_tags")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setActiveProducts(data);
      });
  }, []);

  const hasKit = (materialTags?: string[] | null) => {
    if (!materialTags || materialTags.length === 0) return false;
    return activeProducts.some((product) =>
      product.material_tags?.some((t: string) => materialTags.includes(t))
    );
  };

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
  const createOrderFn = useServerFn(createOrder);

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
      const resp = await assignSingle({
        data: {
          childId: profileId,
          template: {
            title: currentGeneratedChallenge.title,
            domain: currentGeneratedChallenge.domain,
            description: currentGeneratedChallenge.description,
            duration: currentGeneratedChallenge.duration,
            steps: currentGeneratedChallenge.steps,
            materials: currentGeneratedChallenge.materials,
            material_tags: currentGeneratedChallenge.material_tags ?? [],
            intelligences: currentGeneratedChallenge.intelligences || [currentGeneratedChallenge.domain],
            pedagogical_context: currentGeneratedChallenge.pedagogical_context,
            requires_supervision: currentGeneratedChallenge.requires_supervision ?? false,
            supervision_warning: currentGeneratedChallenge.supervision_warning,
            difficulty: currentGeneratedChallenge.difficulty,
          }
        }
      });
      toast.success("Défi assigné avec succès !");
      setCurrentGeneratedChallenge(null);
      await refetch();

      const matching = activeProducts.filter(p => p.material_tags?.some((t: string) => currentGeneratedChallenge.material_tags?.includes(t)));
      if (matching.length > 0) {
        setAssignedChallengeForKit({
          id: resp.id,
          title: resp.title,
          products: matching,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigningSingle(false);
    }
  };

  const handleOrderKit = async () => {
    if (!assignedChallengeForKit || !child) return;
    setOrderingKit(true);
    const total = assignedChallengeForKit.products.reduce((sum, p) => sum + p.price_xof, 0);
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
    const message = `Bonjour ! Je souhaite commander le kit pour le défi "${assignedChallengeForKit.title}" de ${child.name} :\n${assignedChallengeForKit.products
      .map((p) => `- ${p.name} (${p.price_xof.toLocaleString("fr-FR")} FCFA)`)
      .join("\n")}\nTotal : ${total.toLocaleString("fr-FR")} FCFA`;
    const waUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : null;

    try {
      const orderItems = assignedChallengeForKit.products.map((p) => ({
        id: p.id,
        name: p.name,
        price_xof: p.price_xof,
      }));

      await createOrderFn({
        data: {
          child_id: profileId,
          challenge_id: assignedChallengeForKit.id,
          total_price_xof: total,
          items: orderItems,
          delivery_notes: `Commande post-Labo (Challenges Page) pour le défi: ${assignedChallengeForKit.title}`,
        },
      });

      toast.success("Commande enregistrée ! Ouverture de WhatsApp...");
      if (waUrl) {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      setAssignedChallengeForKit(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande.");
    } finally {
      setOrderingKit(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    const [c, ch] = await Promise.all([
      supabase.from("child_profiles").select("*").eq("id", profileId).eq("user_id", session!.user.id).maybeSingle(),
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
    setInitialLoad(false);
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
    const previous = challenges;
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
    try {
      await update({ data: { id, status } });
    } catch (e) {
      setChallenges(previous);
      toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour du statut.");
    }
  };

  const setProgress = async (id: string, progress: number) => {
    const previous = challenges;
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, progress } : c)));
    try {
      await update({ data: { id, progress } });
    } catch (e) {
      setChallenges(previous);
      toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour de la progression.");
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await update({ data: { id, notes } });
      setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement des notes.");
    }
  };

  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: "Supprimer ce défi ?", confirmLabel: "Supprimer", variant: "danger" }))) return;
    try {
      await del({ data: { id } });
      setChallenges((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression du défi.");
    }
  };

  if (loading || !session || (fetching && initialLoad)) {
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
        <div className="mb-10 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
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
              className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-sm font-bold text-ink shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Beaker className="size-4 text-brand" />
              Générateur d'Expériences
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-2xl border-[3px] border-ink bg-brand px-5 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-wait flex items-center gap-2"
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
              className="rounded-2xl border-[3px] border-ink bg-sky px-5 py-3 text-sm font-bold text-ink shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
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
            <div className="rounded-3xl border-[3px] border-ink bg-ink text-white p-6 shadow-brutal flex flex-col">
              <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
                <Award className="size-5 text-brand" />
                Carte des Talents
              </h3>
              <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" age={child.age} dark />
              <p className="text-[11px] text-center text-ink/40 font-medium">
                Cette carte s'affine et se développe à mesure que l'enfant réalise ses défis.
              </p>
            </div>

            {/* AI Synthesis Card */}
            <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal relative overflow-hidden">

              <h3 className="font-display text-lg font-bold flex items-center gap-2 text-ink mb-4">
                <Brain className="size-5 text-brand" />
                Rapport de Naya
              </h3>

              {fetchingSynthesis ? (
                <div className="flex flex-col items-center justify-center py-4 text-ink/60 text-sm font-bold">
                  <NayaAvatar size="sm" className="mb-2" />
                  <span>Naya réunit ses observations...</span>
                </div>
              ) : (
                <div className="text-sm font-medium leading-relaxed text-ink space-y-3">
                  <MarkdownContent content={aiSynthesis} />
                </div>
              )}
            </div>

            {/* Micro stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border-[3px] border-ink shadow-brutal-sm p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Défis Terminés</span>
                <p className="mt-1 font-display text-2xl font-extrabold text-brand">{done}</p>
              </div>
              <div className="bg-white rounded-2xl border-[3px] border-ink shadow-brutal-sm p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Progression</span>
                <p className="mt-1 font-display text-2xl font-extrabold text-brand">{totalProgress}%</p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Challenges List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 🧪 Unified Lab Panel */}
            <div id="genizio-lab" className="rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-brutal md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center rounded-2xl bg-brand p-2.5 text-white border-2 border-ink shadow-brutal-sm">
                    <Beaker className="size-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold">Le Laboratoire de Génizio</h3>
                    <p className="text-xs font-bold text-ink/60">Composez un défi d'apprentissage sur-mesure pour {child.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4 sm:items-end">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Sélectionner l'Intelligence
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all cursor-pointer shadow-brutal-sm"
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
                    className="w-full rounded-2xl border-[3px] border-ink bg-brand px-5 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
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
                <div className="mt-8 flex flex-col items-center justify-center py-6 text-center border-t-[3px] border-dashed border-ink">
                  <NayaAvatar size="md" thoughts={LOADING_STEPS} className="mb-4" />
                  <p className="text-sm font-bold text-indigo-600 animate-pulse">{LOADING_STEPS[loadingTextIndex]}</p>
                </div>
              )}

              {/* Generated challenge display */}
              {currentGeneratedChallenge && !isGeneratingSingle && (
                <div className="mt-6 rounded-2xl border-[3px] border-ink bg-white p-6 shadow-brutal-sm animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border-2 border-ink">
                        {currentGeneratedChallenge.domain}
                      </span>
                      <DifficultyBadge difficulty={currentGeneratedChallenge.difficulty} />
                    </div>
                    <span className="text-xs text-ink/40 font-semibold">🕒 {currentGeneratedChallenge.duration}</span>
                  </div>
                  <h4 className="font-display text-xl font-extrabold leading-tight text-ink mb-2">
                    {currentGeneratedChallenge.title}
                  </h4>
                  <div className="text-sm text-ink/70 leading-relaxed mb-4">
                    <MarkdownContent content={currentGeneratedChallenge.description} />
                  </div>

                  {currentGeneratedChallenge.pedagogical_context && (
                    <div className="mb-4 rounded-xl bg-amber-50 border-2 border-ink p-4 text-xs leading-relaxed text-amber-800">
                      <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                        💡 Intention pédagogique (Naya)
                      </p>
                      <MarkdownContent content={currentGeneratedChallenge.pedagogical_context} inline />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink/40 mb-2">Étapes du défi</h5>
                      <ul className="text-xs space-y-1.5 text-ink/70 list-decimal list-inside pl-1">
                        {currentGeneratedChallenge.steps.slice(0, 4).map((step: string, idx: number) => (
                          <li key={idx} className="truncate"><MarkdownContent content={step} inline /></li>
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

                  <div className="mb-6">
                    <KitSuggestion
                      childId={profileId}
                      materialTags={currentGeneratedChallenge.material_tags}
                      challengeTitle={currentGeneratedChallenge.title}
                      childName={child.name}
                    />
                  </div>

                  <div className="flex gap-2 border-t-[3px] border-ink pt-4">
                    <button
                      onClick={handleAssignSingle}
                      disabled={isAssigningSingle}
                      className="flex-1 rounded-xl border-[3px] border-ink bg-brand py-2.5 text-center text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="rounded-xl border-[3px] border-ink bg-white px-4 py-2.5 text-xs font-bold text-ink/60 shadow-brutal-sm hover:-translate-y-0.5 transition-all cursor-pointer"
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
              <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-16 text-center shadow-brutal-sm">
                <p className="mb-2 text-lg font-bold">Aucune expérience entamée</p>
                <p className="mb-6 text-sm text-ink/70 font-medium max-w-sm mx-auto">
                  Démarrez des expériences sur-mesure pour {child.name} via le générateur IA ou laissez Naya composer une première liste de base.
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/laboratory"
                    className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-sm font-bold text-ink shadow-brutal hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <Beaker className="size-4 text-brand" />
                    Le Générateur IA
                  </Link>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="rounded-2xl border-[3px] border-ink bg-brand px-5 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 disabled:opacity-60 transition-all"
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
                    hasKit={hasKit(c.material_tags)}
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

    {/* Modal Recommandation de Kit Post-Assignation */}
    {assignedChallengeForKit && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8">
          <button
            onClick={() => setAssignedChallengeForKit(null)}
            className="absolute right-4 top-4 rounded-xl border-2 border-ink bg-stone-100 p-1.5 hover:bg-stone-200 transition-colors"
          >
            <X className="size-4" />
          </button>

          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="size-6 text-brand" />
            <h2 className="font-display text-2xl font-black">Défi assigné avec succès ! 🎉</h2>
          </div>

          <p className="text-sm text-ink/75 leading-relaxed mb-6">
            Naya a préparé le défi <strong className="text-ink">"{assignedChallengeForKit.title}"</strong>.
            Souhaitez-vous commander le kit matériel associé maintenant ?
          </p>

          <div className="rounded-2xl border-2 border-ink bg-sky/15 p-4 mb-6">
            <ul className="space-y-1.5 mb-3">
              {assignedChallengeForKit.products.map((p) => (
                <li key={p.id} className="flex justify-between text-sm font-bold text-ink">
                  <span>{p.name}</span>
                  <span>{p.price_xof.toLocaleString("fr-FR")} FCFA</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-ink/20 pt-2 text-sm font-black text-ink">
              <span>Total</span>
              <span>
                {assignedChallengeForKit.products
                  .reduce((sum, p) => sum + p.price_xof, 0)
                  .toLocaleString("fr-FR")}{" "}
                FCFA
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAssignedChallengeForKit(null)}
              className="flex-1 rounded-xl border-2 border-ink bg-stone-100 py-3 text-sm font-bold hover:bg-stone-200 transition-all cursor-pointer text-center"
            >
              Faire sans kit
            </button>
            <button
              onClick={handleOrderKit}
              disabled={orderingKit}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-leaf py-3 text-sm font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              {orderingKit ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>Commander le kit</>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
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
            className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              checked[i]
                ? "bg-leaf border-ink text-white"
                : "bg-white border-ink text-ink/70 hover:bg-surface"
            }`}
          >
            <div className={`size-3.5 rounded flex items-center justify-center border-2 ${
              checked[i] ? "border-white bg-white text-leaf" : "border-ink/30"
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
  hasKit,
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
  hasKit?: boolean;
}) {
  const [notesDraft, setNotesDraft] = useState(c.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);

  return (
    <div className="rounded-3xl bg-white p-6 border-[3px] border-ink shadow-brutal transition-all">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border-2 border-ink shadow-brutal-sm">
            {c.domain}
          </span>
          <DifficultyBadge difficulty={c.difficulty} />
          {hasKit && (
            <span className="rounded-full bg-sky px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ink border-2 border-ink shadow-brutal-sm">
              📦 Kit disponible
            </span>
          )}
        </div>
        <span
          className={`rounded-full border-2 border-ink shadow-brutal-sm px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[c.status]}`}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>

      <h3 className="font-display text-xl font-extrabold text-ink leading-tight mb-2">{c.title}</h3>
      <div className="text-sm text-ink/75 leading-relaxed mb-4">
        <MarkdownContent content={c.description} />
      </div>

      {/* Progress Slider */}
      <div className="mb-4 rounded-2xl bg-surface p-4 border-2 border-ink">
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
        className="w-full rounded-2xl border-[3px] border-ink bg-white px-3 py-3 text-xs font-bold text-ink shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5"
      >
        <span>{open ? "Masquer les détails" : "Afficher étapes, matériel & preuve IA"}</span>
      </button>

      {open && (
        <div className="mt-5 border-t-[3px] border-ink pt-5 animate-in fade-in duration-200">
          <div className="grid gap-8 md:grid-cols-2">

            {/* Left Pane: Child Facing (Pour l'enfant) */}
            <div className="space-y-6 bg-surface p-5 rounded-3xl border-2 border-ink">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-1">
                  Pour {childName}
                </p>
                <h4 className="font-display text-lg font-black text-ink">
                  {c.title}
                </h4>
                <div className="mt-2 text-sm text-ink/75 leading-relaxed">
                  <MarkdownContent content={c.description} />
                </div>
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
                  className="inline-flex items-center gap-2 rounded-xl border-[3px] border-ink bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 transition-all cursor-pointer"
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
                <div className="rounded-2xl bg-brand/5 border-[3px] border-ink p-4 flex gap-2.5">
                  <Brain className="size-5 text-brand flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-1">
                      Intention Pédagogique
                    </p>
                    <p className="text-xs text-brand/90 leading-relaxed italic">
                      "<MarkdownContent content={c.pedagogical_context} inline />"
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

              <KitSuggestion
                childId={childId}
                challengeId={c.id}
                materialTags={c.material_tags}
                challengeTitle={c.title}
                childName={childName}
              />

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
                  className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand transition-all resize-none shadow-brutal-sm"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={async () => {
                      await onNotes(notesDraft);
                      setSavedFlash(true);
                      setTimeout(() => setSavedFlash(false), 1500);
                    }}
                    className="rounded-xl border-[3px] border-ink bg-ink px-4 py-2 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 hover:bg-brand transition-all cursor-pointer"
                  >
                    Enregistrer les notes
                  </button>
                  {savedFlash && <span className="text-xs text-emerald-600 font-bold">✓ Notes enregistrées</span>}
                </div>
              </div>

              {/* If in_progress, offer to start AI debrief chat */}
              {c.status === "in_progress" && (
                <div className="rounded-2xl border-[3px] border-ink bg-brand/5 p-5 text-center mt-4">
                  <p className="text-xs font-bold text-ink/75 mb-3 leading-relaxed">
                    L'activité est terminée ? Partagez vos observations avec Naya pour débriefer le projet de {childName} et mettre à jour ses talents !
                  </p>
                  <button
                    onClick={() => onStatus("completed")}
                    className="inline-flex items-center gap-1.5 rounded-xl border-[3px] border-ink bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    Lancer le chat de débriefing 💬
                  </button>
                </div>
              )}

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
                <div className="rounded-2xl border-[3px] border-ink bg-leaf/10 p-5">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1">
                    <Brain className="size-4 text-emerald-700" />
                    Analyse de Naya (IA)
                  </p>
                  <p className="text-sm italic text-ink/80 leading-relaxed mb-3">"<MarkdownContent content={c.ai_observations} inline />"</p>
                  <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">✓ La Carte des Talents de l'enfant a été enrichie !</p>
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end pt-5 border-t-[3px] border-ink mt-6">
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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

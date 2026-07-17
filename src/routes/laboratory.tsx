import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { generateSingleChallenge, assignTemplateChallenge } from "@/lib/challenges.functions";
import { createOrder } from "@/lib/products.functions";
import { Sparkles, Loader2, RotateCcw, Check, BookOpen, ShieldAlert, Award, Compass, TriangleAlert, Clock, MapPin, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { NayaAvatar } from "@/components/NayaAvatar";
import { KitSuggestion } from "@/components/challenges/KitSuggestion";

export const Route = createFileRoute("/laboratory")({
  component: LaboratoryPage,
});

const TIME_OPTIONS = [
  { id: "10 min", label: "10 min (Mini-Défi)" },
  { id: "30 min", label: "30 min (Activité rapide)" },
  { id: "1 heure", label: "1 heure (Projet)" },
  { id: "1 après-midi", label: "Tout un après-midi" },
];

const LOCATION_OPTIONS = [
  { id: "Maison (Intérieur)", label: "À la maison" },
  { id: "Cuisine", label: "Dans la cuisine" },
  { id: "Extérieur / Jardin", label: "Dehors / Jardin" },
  { id: "En trajet (Voiture/Transport)", label: "En trajet" },
];

interface GeneratedChallenge {
  title: string;
  domain: string;
  description: string;
  duration: string;
  steps: string[];
  materials: string[];
  material_tags?: string[];
  pedagogical_context?: string;
  intelligences?: string[];
  requires_supervision?: boolean;
  supervision_warning?: string;
}

const LOADING_STEPS = [
  "Naya étudie la carte des talents de l'enfant...",
  "Analyse du contexte de temps et de lieu...",
  "Recherche d'une idée stimulante adaptée...",
  "Vérification des règles de sécurité...",
  "Mise en forme pédagogique du défi...",
];

function LaboratoryPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("30 min");
  const [selectedLocation, setSelectedLocation] = useState<string>("Maison (Intérieur)");
  const [homeMaterials, setHomeMaterials] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<GeneratedChallenge | null>(null);
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeProducts, setActiveProducts] = useState<any[]>([]);
  const [assignedChallengeForKit, setAssignedChallengeForKit] = useState<{ id: string; title: string; products: any[] } | null>(null);
  const [orderingKit, setOrderingKit] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "materials" | "pedagogical">("materials");

  const generateAction = useServerFn(generateSingleChallenge);
  const assignAction = useServerFn(assignTemplateChallenge);
  const createOrderFn = useServerFn(createOrder);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price_xof, material_tags")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setActiveProducts(data);
      });
  }, []);

  const getMatchingProducts = (tags?: string[] | null) => {
    if (!tags || tags.length === 0) return [];
    return activeProducts.filter((p) =>
      p.material_tags?.some((t: string) => tags.includes(t))
    );
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (session) {
      supabase.from("child_profiles").select("id, name").eq("user_id", session.user.id).order("created_at").then(({ data }) => {
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
          timeAvailable: selectedTime,
          location: selectedLocation,
          homeMaterials: homeMaterials.trim() || null,
        }
      });
      setCurrentChallenge(challenge as GeneratedChallenge);
      setActiveTab("materials");
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
      const resp = await assignAction({
        data: {
          childId: selectedChild,
          template: {
            title: currentChallenge.title,
            domain: currentChallenge.domain,
            description: currentChallenge.description,
            duration: currentChallenge.duration,
            steps: currentChallenge.steps,
            materials: currentChallenge.materials,
            material_tags: currentChallenge.material_tags ?? [],
            intelligences: currentChallenge.intelligences || [currentChallenge.domain],
            pedagogical_context: currentChallenge.pedagogical_context,
          }
        }
      });
      toast.success("Défi commencé avec succès !");
      
      const matching = getMatchingProducts(currentChallenge.material_tags);
      if (matching.length > 0) {
        setAssignedChallengeForKit({
          id: resp.id,
          title: resp.title,
          products: matching,
        });
      } else {
        navigate({ to: `/profiles/${selectedChild}/challenges` });
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOrderKit = async () => {
    if (!assignedChallengeForKit || !selectedChild) return;
    setOrderingKit(true);
    const total = assignedChallengeForKit.products.reduce((sum, p) => sum + p.price_xof, 0);
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
    const childName = childrenList.find((c) => c.id === selectedChild)?.name ?? "l'enfant";
    const message = `Bonjour ! Je souhaite commander le kit pour le défi "${assignedChallengeForKit.title}" de ${childName} :\n${assignedChallengeForKit.products
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
          child_id: selectedChild,
          challenge_id: assignedChallengeForKit.id,
          total_price_xof: total,
          items: orderItems,
          delivery_notes: `Commande post-Labo pour le défi: ${assignedChallengeForKit.title}`,
        },
      });

      toast.success("Commande enregistrée ! Ouverture de WhatsApp...");
      if (waUrl) {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      setAssignedChallengeForKit(null);
      navigate({ to: `/profiles/${selectedChild}/challenges` });
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande.");
    } finally {
      setOrderingKit(false);
    }
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface">Chargement...</div>;
  }

  const childName = childrenList.find((c) => c.id === selectedChild)?.name ?? "l'enfant";

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 p-6 font-sans text-ink pb-24">
      <AppHeader />

      <div className="pt-6"></div>

      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <NayaAvatar size="md" className="mx-auto mb-2" />
          <div className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white border-2 border-ink shadow-brutal-sm">
            <Sparkles className="size-4 animate-pulse" />
            Génération Contextuelle
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Inspirer Maintenant
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink/70">
            L'IA crée une activité sur-mesure basée sur votre temps, votre lieu actuel, et les talents cachés de votre enfant.
          </p>
        </header>

        {/* Configuration Panel */}
        <div className="mb-8 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8">
          <div className="grid gap-6 md:grid-cols-1">
            {/* Profil Enfant */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-ink/60 mb-2.5">
                Pour qui ?
              </label>
              {childrenList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {childrenList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChild(c.id)}
                      className={`rounded-2xl border-[3px] border-ink px-5 py-3 text-sm font-bold transition-all ${
                        selectedChild === c.id
                          ? "bg-brand text-white shadow-brutal -translate-y-0.5"
                          : "bg-surface text-ink shadow-brutal-sm hover:-translate-y-0.5 hover:bg-white"
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

            <div className="grid gap-6 sm:grid-cols-2 mt-4">
              {/* Temps */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink/60 mb-3">
                  <Clock className="size-4" />
                  Temps disponible
                </label>
                <div className="grid gap-2">
                  {TIME_OPTIONS.map((time) => (
                    <label key={time.id} className={`flex items-center gap-3 p-3 rounded-2xl border-[3px] cursor-pointer transition-all ${selectedTime === time.id ? "border-ink bg-sky text-ink shadow-brutal" : "border-ink bg-white text-ink shadow-brutal-sm hover:-translate-y-0.5"}`}>
                      <input type="radio" name="time" value={time.id} checked={selectedTime === time.id} onChange={(e) => setSelectedTime(e.target.value)} className="hidden" />
                      <div className={`size-5 rounded-full border-2 flex items-center justify-center ${selectedTime === time.id ? "border-ink bg-white" : "border-ink/20"}`}>
                        {selectedTime === time.id && <div className="size-2.5 rounded-full bg-brand" />}
                      </div>
                      <span className="font-bold text-sm">{time.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lieu */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink/60 mb-3">
                  <MapPin className="size-4" />
                  Environnement actuel
                </label>
                <div className="grid gap-2">
                  {LOCATION_OPTIONS.map((loc) => (
                    <label key={loc.id} className={`flex items-center gap-3 p-3 rounded-2xl border-[3px] cursor-pointer transition-all ${selectedLocation === loc.id ? "border-ink bg-sky text-ink shadow-brutal" : "border-ink bg-white text-ink shadow-brutal-sm hover:-translate-y-0.5"}`}>
                      <input type="radio" name="location" value={loc.id} checked={selectedLocation === loc.id} onChange={(e) => setSelectedLocation(e.target.value)} className="hidden" />
                      <div className={`size-5 rounded-full border-2 flex items-center justify-center ${selectedLocation === loc.id ? "border-ink bg-white" : "border-ink/20"}`}>
                        {selectedLocation === loc.id && <div className="size-2.5 rounded-full bg-brand" />}
                      </div>
                      <span className="font-bold text-sm">{loc.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Matériaux disponibles (Phase 3 addition) */}
            <div className="mt-6 border-t-2 border-ink/10 pt-6">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink/60 mb-2">
                🏠 Matériaux que vous avez à la maison (Optionnel)
              </label>
              <p className="text-xs text-ink/50 mb-3">
                Citez ce qui est disponible (ingrédients, cartons, cailloux...) pour que Naya concocte un défi adapté.
              </p>
              <textarea
                value={homeMaterials}
                onChange={(e) => setHomeMaterials(e.target.value)}
                placeholder="Ex: farine, concombre, oignons, carton, capsules de bouteille..."
                className="w-full min-h-[80px] rounded-xl border-[3px] border-ink p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm resize-y"
              />
              <div className="mt-2.5 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-extrabold uppercase text-ink/40 tracking-wider">Ajout rapide :</span>
                {[
                  { label: "🥬 Oignon, Farine, Oeuf", val: "farine, oignons, oeuf" },
                  { label: "📦 Bouteilles, Carton", val: "bouteille plastique, carton" },
                  { label: "🍂 Feuilles, Cailloux", val: "feuilles d'arbre, cailloux" },
                  { label: "✂️ Ciseaux, Colle", val: "ciseaux, colle" },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    onClick={() => {
                      const prefix = homeMaterials.trim() ? `${homeMaterials.trim()}, ` : "";
                      setHomeMaterials(`${prefix}${tag.val}`);
                    }}
                    type="button"
                    className="rounded-lg border-2 border-ink bg-surface px-2.5 py-1 text-[10px] font-bold text-ink hover:-translate-y-0.5 transition-all shadow-brutal-sm cursor-pointer"
                  >
                    + {tag.label}
                  </button>
                ))}
                {homeMaterials.trim() && (
                  <button
                    onClick={() => setHomeMaterials("")}
                    type="button"
                    className="ml-auto text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || childrenList.length === 0}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-ink bg-brand px-8 py-4 font-display text-lg font-bold text-white shadow-brutal transition-all hover:-translate-y-0.5 hover:bg-brand-dark active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Naya compose...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
                  <span>Générer l'activité magique ✨</span>
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
          </div>
        )}

        {/* Challenge Display */}
        {currentChallenge && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            
            {/* SÉCURITÉ : ALERTE SUPERVISION */}
            {currentChallenge.requires_supervision && (
              <div className="mb-4 overflow-hidden rounded-2xl border-[3px] border-ink bg-[#FF5A5F] p-5 shadow-brutal-sm relative text-white">
                <div className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-white text-[#FF5A5F] shadow-brutal-sm">
                    <TriangleAlert className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">Supervision Requise</h3>
                    <p className="mt-1 text-sm font-bold leading-relaxed opacity-90">
                      {currentChallenge.supervision_warning || "Cette activité nécessite la présence et l'aide d'un adulte pour des raisons de sécurité."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border-[3px] border-ink bg-white shadow-brutal">
              {/* Header */}
              <div className="bg-leaf p-6 border-b-[3px] border-ink md:p-8 text-white">
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
              <div className="flex border-b-[3px] border-ink bg-surface">
                <button
                  onClick={() => setActiveTab("materials")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-r-[3px] border-ink last:border-r-0 ${
                    activeTab === "materials" ? "bg-white text-ink shadow-[inset_0_-4px_0_0_var(--brand)]" : "text-ink/60 hover:text-ink hover:bg-white"
                  }`}
                >
                  🛠 Matériel
                </button>
                <button
                  onClick={() => setActiveTab("steps")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-r-[3px] border-ink last:border-r-0 ${
                    activeTab === "steps" ? "bg-white text-ink shadow-[inset_0_-4px_0_0_var(--brand)]" : "text-ink/60 hover:text-ink hover:bg-white"
                  }`}
                >
                  📋 Étapes
                </button>
                <button
                  onClick={() => setActiveTab("pedagogical")}
                  className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "pedagogical" ? "bg-white text-ink shadow-[inset_0_-4px_0_0_var(--brand)]" : "text-ink/60 hover:text-ink hover:bg-white"
                  }`}
                >
                  💡 Pourquoi ce défi
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 md:p-8">
                {activeTab === "materials" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-ink/50 mb-4">À réunir avant de commencer :</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentChallenge.materials.map((mat, idx) => (
                          <div key={idx} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 border-2 border-ink">
                            <div className="size-5 rounded-full border-2 border-leaf flex items-center justify-center bg-white flex-shrink-0" />
                            <span className="text-sm font-bold text-ink">{mat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <KitSuggestion
                      childId={selectedChild}
                      materialTags={currentChallenge.material_tags}
                      challengeTitle={currentChallenge.title}
                      childName={childName}
                    />
                  </div>
                )}

                {activeTab === "steps" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink/50 mb-3">Plan d'action</h3>
                    <ol className="space-y-4">
                      {currentChallenge.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-4 p-4 rounded-2xl bg-surface border-2 border-ink">
                          <div className="grid size-8 flex-shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-white">
                            {idx + 1}
                          </div>
                          <div className="text-sm font-medium leading-relaxed text-ink pt-1">{step}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {activeTab === "pedagogical" && (
                  <div className="rounded-2xl bg-brand/5 border border-brand/10 p-5 md:p-6">
                    <div className="flex gap-3">
                      <Award className="size-6 text-brand flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-brand uppercase tracking-wider mb-2">Analyse de Naya</h4>
                        <p className="text-sm font-semibold leading-relaxed text-ink/80 italic">
                          "{currentChallenge.pedagogical_context || "Ce défi permet d'explorer les aptitudes naturelles et de stimuler l'esprit créatif de l'enfant."}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 border-t-[3px] border-ink bg-surface p-6 sm:flex-row md:px-8">
                <button
                  onClick={handleAssign}
                  disabled={isAssigning}
                  className="flex-1 rounded-2xl border-[3px] border-ink bg-brand py-4 text-center font-display text-sm font-black text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      <span>Démarrage...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-5" />
                      <span>Démarrer l'activité maintenant</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Recommandation de Kit Post-Assignation */}
      {assignedChallengeForKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8">
            <button
              onClick={() => {
                setAssignedChallengeForKit(null);
                navigate({ to: `/profiles/${selectedChild}/challenges` });
              }}
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
                onClick={() => {
                  setAssignedChallengeForKit(null);
                  navigate({ to: `/profiles/${selectedChild}/challenges` });
                }}
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

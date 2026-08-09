import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { supabase } from "@/integrations/supabase/client";
import { initializeOrderPayment } from "@/lib/payments.functions";
import { generateSingleChallenge, assignTemplateChallenge } from "@/lib/challenges.functions";
import {
  ShoppingBag,
  Zap,
  Bot,
  Loader2,
  Trophy,
  Clock,
  MapPin,
  X,
  Check,
  Brain,
  Search,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { NayaAvatar } from "@/components/NayaAvatar";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { GenizioLoader } from "@/components/GenizioLoader";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";

export const Route = createFileRoute("/boutique")({
  component: BoutiquePage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_xof: number;
  stock_quantity: number | null;
  material_tags: string[];
};

type Child = {
  id: string;
  name: string;
  age: number;
  avatar_color: string;
};

type Challenge = {
  id: string;
  child_id: string;
  material_tags?: string[] | null;
};

const TIME_OPTIONS = [
  { id: "10 min", label: "10 min" },
  { id: "30 min", label: "30 min" },
  { id: "1 heure", label: "1 heure" },
  { id: "1 après-midi", label: "Après-midi" },
];

const LOCATION_OPTIONS = [
  { id: "Maison (Intérieur)", label: "Intérieur" },
  { id: "Cuisine", label: "Cuisine" },
  { id: "Extérieur / Jardin", label: "Dehors" },
  { id: "En trajet (Voiture/Transport)", label: "Trajet" },
];

const LOADING_STEPS = [
  "Naya consulte les stocks du kit...",
  "Naya prépare des objectifs pédagogiques adaptés à l'âge...",
  "Conception d'un défi exclusif basé sur ce matériel...",
  "Sécurisation des étapes pratiques...",
  "Finalisation du plan de jeu...",
];

function BoutiquePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal generation states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("30 min");
  const [selectedLocation, setSelectedLocation] = useState<string>("Maison (Intérieur)");

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [generatedChallenge, setGeneratedChallenge] = useState<any | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [tagsModalProduct, setTagsModalProduct] = useState<Product | null>(null);

  const initializeOrderPaymentFn = useServerFn(initializeOrderPayment);
  const generateSingleFn = useServerFn(generateSingleChallenge);
  const assignTemplateFn = useServerFn(assignTemplateChallenge);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const fetchData = async () => {
    if (!session) return;
    setFetching(true);
    try {
      const [prodsRes, childrenRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("name"),
        supabase
          .from("child_profiles")
          .select("id, name, age, avatar_color")
          .eq("user_id", session.user.id)
          .order("name"),
      ]);

      setProducts((prodsRes.data as Product[]) ?? []);
      const childList = (childrenRes.data as Child[]) ?? [];
      setChildren(childList);
      if (childList.length > 0) setSelectedChild(childList[0].id);

      const childIds = childList.map((c) => c.id);
      if (childIds.length > 0) {
        const { data: challs } = await supabase
          .from("challenges")
          .select("id, child_id, material_tags")
          .in("child_id", childIds);
        setChallenges((challs as Challenge[]) ?? []);
      }
    } catch (err) {
      console.error("Error loading boutique data:", err);
      toast.error("Erreur lors du chargement de la boutique.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (session) void fetchData();
  }, [session]);

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

  const getChallengeCount = (tags: string[]) => {
    if (!tags || tags.length === 0) return 0;
    return challenges.filter((c) => c.material_tags?.some((t: string) => tags.includes(t))).length;
  };

  // Paiement en ligne Paystack : le serveur recrée la commande à partir du catalogue,
  // initialise la transaction et on redirige vers la page hébergée Paystack. La
  // confirmation (webhook ou page de retour) passe la commande en `confirmed`.
  const handlePay = async (product: Product) => {
    if (children.length === 0) {
      toast.error("Veuillez d'abord créer un profil enfant dans votre compte.");
      return;
    }
    setPayingId(product.id);
    try {
      const callbackUrl = `${window.location.origin}/paiement-retour`;
      const { authorizationUrl } = await initializeOrderPaymentFn({
        data: {
          child_id: selectedChild || children[0].id,
          challenge_id: null,
          items: [{ id: product.id, name: product.name, price_xof: product.price_xof }],
          delivery_notes: `Commande directe boutique`,
          callbackUrl,
        },
      });
      toast.success("Redirection vers le paiement sécurisé Paystack…");
      window.location.href = authorizationUrl;
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'initier le paiement. Réessayez.");
    } finally {
      setPayingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedChild || !selectedProduct) return;
    setIsGenerating(true);
    setGeneratedChallenge(null);
    try {
      const kitMaterials = `${selectedProduct.name} (incluant: ${selectedProduct.material_tags.join(", ")})`;
      const resp = await generateSingleFn({
        data: {
          childId: selectedChild,
          timeAvailable: selectedTime,
          location: selectedLocation,
          homeMaterials: kitMaterials,
        },
      });
      setGeneratedChallenge(resp);
      toast.success("Nouveau défi composé par Naya !");
    } catch (err) {
      console.error(err);
      toast.error("Naya a rencontré un problème. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!generatedChallenge || !selectedChild) return;
    setIsAssigning(true);
    try {
      await assignTemplateFn({
        data: {
          childId: selectedChild,
          template: {
            // Reprend l'intégralité de l'aperçu généré par generateSingleChallenge plutôt
            // qu'une liste de champs choisis à la main — cf. le même correctif sur
            // profiles.$profileId.challenges.tsx : cette liste perdait silencieusement
            // academic_secret et plusieurs autres champs déjà générés par le serveur.
            ...generatedChallenge,
            material_tags: generatedChallenge.material_tags ?? [],
            intelligences: generatedChallenge.intelligences || [generatedChallenge.domain],
            requires_supervision: generatedChallenge.requires_supervision ?? false,
          },
        },
      });
      toast.success("Défi assigné avec succès !");
      setSelectedProduct(null);
      setGeneratedChallenge(null);
      navigate({ to: `/profiles/${selectedChild}/challenges` });
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement de la boutique…" />
      </div>
    );
  }

  const firstChildId = children[0]?.id || "";

  const query = searchQuery.trim().toLowerCase();
  const filteredProducts = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description ?? "").toLowerCase().includes(query) ||
          p.material_tags.some((t) => t.toLowerCase().includes(query)),
      )
    : products;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-surface to-brand/5 pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-6">
        <AppTabBar profileId={firstChildId} />

        <div className="min-w-0 flex-1">
          <header className="mb-6 text-center md:text-left">
            <h1 className="font-display text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
              La Boutique de Kits Naya 📦
            </h1>
            <p className="mt-3 text-lg text-ink/75 leading-relaxed">
              Des kits matériels physiques pensés pour débloquer de vrais projets d'apprentissage à
              la maison.
            </p>
          </header>

          {products.length > 0 && (
            <div className="relative mb-8 max-w-md mx-auto md:mx-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink/50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un kit (nom, matériel...)"
                aria-label="Rechercher un kit"
                className="w-full rounded-full border border-ink/10 bg-white py-2.5 pl-11 pr-10 text-sm font-bold text-ink shadow-sm outline-none focus:ring-2 focus:ring-brand transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/50 hover:text-ink hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          {products.length === 0 ? (
            <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-xl">
              <ShoppingBag className="mx-auto size-16 text-ink/20" />
              <h3 className="mt-4 text-xl font-bold">Boutique vide</h3>
              <p className="mt-2 text-sm text-ink/60">
                Aucun kit n'est actuellement disponible dans le catalogue.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-12 text-center shadow-sm">
              <Search className="mx-auto size-12 text-ink/20" />
              <h3 className="mt-4 text-xl font-bold">Aucun résultat</h3>
              <p className="mt-2 text-sm text-ink/60">
                Aucun kit ne correspond à « {searchQuery.trim()} ».
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl border border-ink/10 bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm hover:bg-surface transition-all cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredProducts.map((p) => {
                const count = getChallengeCount(p.material_tags);
                const outOfStock = p.stock_quantity !== null && p.stock_quantity <= 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-3xl border border-ink/10 bg-white p-6 shadow-xl transition-all hover:-translate-y-1"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="rounded-2xl border border-ink/10 bg-[#FFF4E5] p-3 shadow-sm">
                        <ShoppingBag className="size-6 text-ink" />
                      </div>
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-black text-white border border-ink/10 shadow-sm">
                        {p.price_xof.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    <h3 className="font-display text-balance text-xl font-black">{p.name}</h3>
                    <p className="mt-2 text-sm text-ink/70 flex-grow leading-relaxed">
                      {p.description || "Aucune description fournie pour ce kit."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {p.material_tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-ink/10 bg-stone-100 px-2 py-0.5 text-xs font-bold text-ink"
                        >
                          #{t}
                        </span>
                      ))}
                      {p.material_tags.length > 3 && (
                        <button
                          onClick={() => setTagsModalProduct(p)}
                          className="rounded-full border border-ink/10 bg-sky px-2 py-0.5 text-xs font-bold text-ink hover:bg-sky/70 transition-colors cursor-pointer"
                        >
                          +{p.material_tags.length - 3}
                        </button>
                      )}
                    </div>

                    {outOfStock && (
                      <p className="mt-4 text-xs font-bold text-red-600 flex items-center gap-1">
                        Rupture de stock — commande temporairement indisponible
                      </p>
                    )}
                    {count > 0 ? (
                      <p className="mt-4 text-xs font-bold text-brand flex items-center gap-1">
                        <Trophy className="size-3.5" />
                        Déjà utilisé dans {count} défi{count > 1 ? "s" : ""} de vos enfants
                      </p>
                    ) : (
                      <p className="mt-4 text-xs font-bold text-ink/60">Pas encore utilisé</p>
                    )}

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-brand px-4 py-3 text-xs font-extrabold text-white hover:-translate-y-0.5 active:translate-y-0 shadow-sm transition-all cursor-pointer"
                      >
                        <Zap className="size-4 animate-pulse" />
                        Générer un défi ⚡
                      </button>
                      <button
                        onClick={() => handlePay(p)}
                        disabled={payingId === p.id || outOfStock}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white hover:-translate-y-0.5 active:translate-y-0 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {payingId === p.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Paiement en cours...
                          </>
                        ) : outOfStock ? (
                          <>Rupture de stock</>
                        ) : (
                          <>
                            <CreditCard className="size-4" />
                            Payer en ligne
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal - Configuration de la génération */}
      {selectedProduct && !generatedChallenge && !isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 rounded-xl border border-ink/10 bg-stone-100 p-1.5 hover:bg-stone-200 transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <Bot className="size-6 text-brand" />
              <h2 className="font-display text-balance text-2xl font-black">
                Naya compose un défi...
              </h2>
            </div>

            <p className="text-sm text-ink/70 leading-relaxed mb-6">
              Naya va concevoir une expérience sur-mesure pour votre enfant autour du matériel du
              kit : <strong className="text-ink">"{selectedProduct.name}"</strong>.
            </p>

            <div className="space-y-5">
              {children.length > 1 && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                    Pour quel enfant ?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChild(c.id)}
                        className={`flex items-center gap-2.5 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-bold shadow-sm transition-all ${
                          selectedChild === c.id
                            ? "border-ink bg-[#FFF4E5] -translate-y-0.5"
                            : "border-stone-200 hover:border-ink"
                        }`}
                      >
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-ink/10"
                          style={{ backgroundColor: c.avatar_color }}
                        />
                        {c.name} ({c.age} ans)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                  Lieu disponible
                </label>
                <div className="grid grid-cols-2 gap-2 ">
                  {LOCATION_OPTIONS.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc.id)}
                      className={`rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold transition-all ${
                        selectedLocation === loc.id
                          ? "border-ink bg-sky shadow-sm -translate-y-0.5 text-ink"
                          : "border-stone-200 text-ink/70 hover:border-ink"
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                  Temps disponible
                </label>
                <div className="grid grid-cols-2 gap-2 ">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedTime(opt.id)}
                      className={`rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold transition-all ${
                        selectedTime === opt.id
                          ? "border-ink bg-[#FFF4E5] shadow-sm -translate-y-0.5 text-ink"
                          : "border-stone-200 text-ink/70 hover:border-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 rounded-xl border border-ink/10 bg-stone-100 py-3 text-sm font-bold hover:bg-stone-200 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 rounded-xl border border-ink/10 bg-brand py-3 text-sm font-bold text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                Composer le défi 🪄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Génération en cours */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-xl">
            <NayaAvatar size="lg" thoughts={LOADING_STEPS} className="mx-auto mb-6" />
            <p className="text-lg font-black text-brand animate-pulse">
              {LOADING_STEPS[loadingTextIndex]}
            </p>
          </div>
        </div>
      )}

      {/* Modal - Preview du défi généré */}
      {generatedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8 relative">
            <button
              onClick={() => setGeneratedChallenge(null)}
              className="absolute right-4 top-4 rounded-xl border border-ink/10 bg-stone-100 p-1.5 hover:bg-stone-200 transition-colors"
            >
              <X className="size-4" />
            </button>

            <header className="mb-6">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border border-ink/10 shadow-sm">
                  {generatedChallenge.domain}
                </span>
                <DifficultyBadge difficulty={generatedChallenge.difficulty} />
              </div>
              <h2 className="mt-3 font-display text-balance text-2xl font-black md:text-3xl">
                {generatedChallenge.title}
              </h2>
              <div className="mt-2 flex gap-4 text-xs font-bold text-ink/60">
                <span className="flex items-center gap-1">
                  <Clock className="size-4" /> {generatedChallenge.duration}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {selectedLocation}
                </span>
              </div>
            </header>

            <div className="space-y-6">
              <div className="rounded-2xl border border-ink/10 bg-stone-50 p-4">
                <div className="text-sm font-bold text-ink/80 leading-relaxed">
                  <MarkdownContent content={generatedChallenge.description} />
                </div>
              </div>

              {generatedChallenge.requires_supervision && (
                <div className="rounded-2xl border border-ink/10 bg-[#FF5A5F] p-4 text-white font-bold text-sm">
                  ⚠️ Supervision Adulte Requise : {generatedChallenge.supervision_warning}
                </div>
              )}

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                  Matériel requis
                </h4>
                <ul className="grid gap-2 ">
                  {generatedChallenge.materials.map((m: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-bold">
                      <span className="flex size-5 items-center justify-center rounded bg-stone-100 border border-ink/10 text-xs">
                        {i + 1}
                      </span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                  Les étapes d'apprentissage
                </h4>
                <ol className="space-y-3">
                  {generatedChallenge.steps.map((step: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-brand text-xs font-black text-white shadow-sm">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold leading-relaxed pt-0.5">
                        <MarkdownContent content={step} inline />
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              {formatPedagogicalIntention(generatedChallenge.pedagogical_context) && (
                <div className="rounded-2xl border border-ink/10 bg-brand/5 p-4 flex gap-3">
                  <Brain className="size-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">
                      Observation pédagogique de Naya
                    </h5>
                    <p className="text-xs font-bold text-brand leading-relaxed">
                      "
                      <MarkdownContent
                        content={formatPedagogicalIntention(
                          generatedChallenge.pedagogical_context,
                        )!}
                        inline
                      />
                      "
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3 border-t-[3px] border-ink pt-6">
              <button
                onClick={() => setGeneratedChallenge(null)}
                className="flex-1 rounded-xl border border-ink/10 bg-stone-100 py-3 text-sm font-bold hover:bg-stone-200 transition-all cursor-pointer"
              >
                Refuser le défi
              </button>
              <button
                onClick={handleAssign}
                disabled={isAssigning}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-brand py-3 text-sm font-bold text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Assignation...
                  </>
                ) : (
                  <>Démarrer ce défi ! 🎮</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Tous les tags matériel d'un kit */}
      {tagsModalProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setTagsModalProduct(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-ink/10 bg-white p-6 shadow-xl"
          >
            <button
              onClick={() => setTagsModalProduct(null)}
              className="absolute right-4 top-4 rounded-xl border border-ink/10 bg-stone-100 p-1.5 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-display text-balance text-lg font-black pr-8">
              {tagsModalProduct.name}
            </h3>
            <p className="mt-1 text-xs text-ink/60">
              {tagsModalProduct.material_tags.length} matériau
              {tagsModalProduct.material_tags.length > 1 ? "x" : ""}
            </p>
            <div className="mt-4 flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
              {tagsModalProduct.material_tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-ink/10 bg-stone-100 px-2.5 py-1 text-xs font-bold text-ink"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

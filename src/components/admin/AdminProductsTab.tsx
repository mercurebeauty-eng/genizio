import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  listMaterialSuggestions,
  ignoreMaterialSuggestion,
  getEcosystemStats,
} from "@/lib/products.functions";
import {
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  Package,
  PackageSearch,
  X,
  BarChart2,
  Pencil,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { GUILDS } from "@/lib/guilds";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { confirmDialog } from "@/components/ui/confirm-dialog";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_xof: number;
  stock_quantity: number | null;
  material_tags: string[];
  is_active: boolean;
};

type MaterialSuggestion = {
  id: string;
  tag: string;
  seen_count: number;
  sample_challenge_title?: string | null;
};

const emptyDraft = {
  name: "",
  description: "",
  price_xof: "" as number | "",
  stock_quantity: "" as number | "",
  material_tags: "",
};

type EcosystemStats = {
  totalChildren: number;
  totalParents: number;
  totalChallenges: number;
  completedChallenges: number;
  totalOrders: number;
  talentTotals: Record<string, number>;
  topDomains: { domain: string; count: number }[];
} | null;

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  shipped: "Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
};

const ORDER_STATUS_CARD: Record<string, string> = {
  pending: "bg-amber-50",
  confirmed: "bg-sky-50",
  shipped: "bg-violet-50",
  delivered: "bg-emerald-50",
  cancelled: "bg-stone-100 opacity-75",
};

const ORDER_STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-sky-100 text-sky-800 border-sky-300",
  shipped: "bg-violet-100 text-violet-800 border-violet-300",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-stone-200 text-stone-600 border-stone-300",
};

export function AdminProductsTab({ onDataChanged }: { onDataChanged?: () => void }) {
  const { session, loading } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<MaterialSuggestion[]>([]);
  const [ecosystemStats, setEcosystemStats] = useState<EcosystemStats>(null);
  const [activeTab, setActiveTab] = useState<"products" | "stats">("products");
  const [fetching, setFetching] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);
  /** Produit en cours d'édition (null = mode création). */
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const listFn = useServerFn(listProductsAdmin);
  const createFn = useServerFn(createProduct);
  const updateFn = useServerFn(updateProduct);
  const deleteFn = useServerFn(deleteProduct);
  const listSuggestionsFn = useServerFn(listMaterialSuggestions);
  const ignoreSuggestionFn = useServerFn(ignoreMaterialSuggestion);
  const getStatsFn = useServerFn(getEcosystemStats);

  // Refonte Admin OS (2026-08-13) : les commandes sont gérées dans l'onglet Commerce
  // (source unique) — ce onglet reste le catalogue + les stats.
  const refetch = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setFetching(true);
    try {
      const [productsData, suggestionsData, statsData] = await Promise.all([
        listFn({ data: undefined, ...opts }),
        listSuggestionsFn({ data: undefined, ...opts }),
        getStatsFn({ data: undefined, ...opts }),
      ]);
      setProducts((productsData as Product[]) ?? []);
      setSuggestions((suggestionsData as MaterialSuggestion[]) ?? []);
      setEcosystemStats(statsData as EcosystemStats);
    } catch (err: any) {
      console.error("Error fetching admin products data:", err);
      const isForbidden =
        err?.status === 403 ||
        err?.statusCode === 403 ||
        String(err?.message || "")
          .toLowerCase()
          .includes("forbidden") ||
        String(err?.message || "").includes("403") ||
        String(err?.message || "").includes("Accès refusé");
      if (isForbidden) {
        setForbidden(true);
      } else {
        toast.error("Erreur lors de la récupération des données d'administration.");
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSubmit = async () => {
    if (!draft.name.trim() || draft.price_xof === "" || Number(draft.price_xof) < 0) {
      toast.error("Nom et prix requis.");
      return;
    }
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setSaving(true);
    try {
      if (editingId) {
        // Édition : toutes les métadonnées du produit (nom, description, prix,
        // stock, tags) — le formulaire sert à la fois à créer et à modifier.
        await updateFn({
          data: {
            id: editingId,
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            price_xof: Number(draft.price_xof),
            stock_quantity: draft.stock_quantity === "" ? null : Number(draft.stock_quantity),
            material_tags: draft.material_tags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          },
          ...opts,
        });
        toast.success("Produit mis à jour.");
      } else {
        await createFn({
          data: {
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            price_xof: Number(draft.price_xof),
            stock_quantity: draft.stock_quantity === "" ? null : Number(draft.stock_quantity),
            material_tags: draft.material_tags
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
            is_active: true,
            fromSuggestionId: pendingSuggestionId ?? undefined,
          },
          ...opts,
        });
        toast.success("Produit ajouté au catalogue.");
      }
      setDraft(emptyDraft);
      setPendingSuggestionId(null);
      setEditingId(null);
      void refetch();
      // Synchronisation du parent (review 2026-08-12, P1) : le catalogue Commerce
      // (commerceData) doit voir le nouveau produit sans rechargement manuel.
      onDataChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const startFromSuggestion = (s: MaterialSuggestion) => {
    setEditingId(null);
    setDraft({ ...emptyDraft, name: s.tag, material_tags: s.tag });
    setPendingSuggestionId(s.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setPendingSuggestionId(null);
    setDraft({
      name: p.name,
      description: p.description ?? "",
      price_xof: p.price_xof,
      stock_quantity: p.stock_quantity ?? "",
      material_tags: p.material_tags.join(", "),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setPendingSuggestionId(null);
  };

  const ignoreSuggestion = async (id: string) => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await ignoreSuggestionFn({ data: { id }, ...opts });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du rejet de la suggestion.");
    }
  };

  const toggleActive = async (p: Product) => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await updateFn({ data: { id: p.id, is_active: !p.is_active }, ...opts });
      void refetch();
      onDataChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour du produit.");
    }
  };

  const remove = async (id: string) => {
    if (
      !(await confirmDialog({
        title: "Supprimer ce produit ?",
        confirmLabel: "Supprimer",
        variant: "danger",
      }))
    )
      return;
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    try {
      await deleteFn({ data: { id }, ...opts });
      toast.success("Produit supprimé.");
      void refetch();
      onDataChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression du produit.");
    }
  };

  if (loading || !session) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-brand text-white shadow-md">
          <Package className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-black text-ink">Catalogue de kits & Boutique</h2>
          <p className="text-sm font-medium text-ink/60">
            Prix et stock des matériaux suggérés par Naya.
          </p>
        </div>
      </div>

      {fetching ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : forbidden ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border-2 border-ink bg-red-50 text-red-500">
            <ShieldAlert className="size-6" />
          </div>
          <p className="font-bold text-ink">Accès réservé à l'administrateur.</p>
          <p className="mt-1 text-sm text-ink/60">
            Ce compte ({session.user.email}) n'est pas autorisé à gérer le catalogue.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Selector */}
          <div className="mb-6 flex gap-2 border border-ink/10 bg-white p-1 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "products"
                  ? "bg-brand text-white border border-white/20 shadow-md"
                  : "text-ink/65 hover:bg-surface"
              }`}
            >
              <Package className="size-4" />
              <span>Catalogue</span>
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "stats"
                  ? "bg-ink text-white border border-white/20 shadow-md"
                  : "text-ink/65 hover:bg-surface"
              }`}
            >
              <BarChart2 className="size-4" />
              <span>Stats</span>
            </button>
          </div>

          {activeTab === "products" && (
            <>
              {suggestions.length > 0 && (
                <div className="mb-8 rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <PackageSearch className="size-5 text-brand" />
                    <h3 className="font-display text-balance text-lg font-bold">
                      Matériaux détectés sans produit
                    </h3>
                  </div>
                  <p className="mb-4 text-sm text-ink/60">
                    Naya a mentionné ces matériaux dans des défis, mais aucun produit actif ne les
                    couvre.
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-ink">
                            {s.tag}{" "}
                            <span className="rounded-full border border-ink/10 bg-brand px-2 py-0.5 text-[10px] font-black text-white">
                              vu {s.seen_count}×
                            </span>
                          </p>
                          {s.sample_challenge_title && (
                            <p className="truncate text-xs text-ink/60">
                              ex: {s.sample_challenge_title}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => startFromSuggestion(s)}
                            className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90 transition-all"
                          >
                            Créer un produit
                          </button>
                          <button
                            onClick={() => ignoreSuggestion(s.id)}
                            className="rounded-xl border border-ink/10 bg-white p-1.5 text-ink/60 hover:bg-surface transition-all"
                            title="Ignorer"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                ref={formRef}
                className="mb-8 rounded-3xl border border-ink/10 bg-sky/30 p-4 sm:p-6 shadow-xl max-w-full overflow-hidden"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-balance text-lg font-bold">
                    {editingId ? "Modifier le produit" : "Ajouter un produit"}
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 hover:bg-surface transition-all cursor-pointer"
                    >
                      <XCircle className="size-3.5" />
                      Annuler la modification
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Nom (ex: Lot de carton)"
                    className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm sm:col-span-2 w-full"
                  />
                  <input
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Description (optionnel)"
                    className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm sm:col-span-2 w-full"
                  />
                  <input
                    type="number"
                    min={0}
                    value={draft.price_xof}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        price_xof: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="Prix (FCFA)"
                    className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm w-full"
                  />
                  <input
                    type="number"
                    min={0}
                    value={draft.stock_quantity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        stock_quantity: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="Stock (vide = illimité)"
                    className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm w-full"
                  />
                  <input
                    value={draft.material_tags}
                    onChange={(e) => setDraft({ ...draft, material_tags: e.target.value })}
                    placeholder="Tags matériaux, séparés par des virgules (ex: carton, cutter)"
                    className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm sm:col-span-2 w-full"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="press-brand mt-4 flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 w-full sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {editingId ? "Enregistrer les modifications" : "Ajouter au catalogue"}
                </button>
              </div>

              {products.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-10 text-center shadow-sm">
                  <p className="text-ink/65 font-bold">Aucun produit pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm ${!p.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{p.name}</p>
                        <p className="text-xs text-ink/60">
                          {p.price_xof.toLocaleString("fr-FR")} FCFA
                          {p.stock_quantity !== null
                            ? ` · ${p.stock_quantity} en stock`
                            : " · stock illimité"}
                        </p>
                        {p.material_tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.material_tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full border border-ink/10 bg-surface px-2 py-0.5 text-[10px] font-bold text-ink"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface transition-all"
                        >
                          <Pencil className="size-3.5" />
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface transition-all"
                        >
                          {p.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="rounded-xl border border-ink/10 bg-white p-2 text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}


          {activeTab === "stats" && ecosystemStats && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Enfants inscrits",
                    value: ecosystemStats.totalChildren,
                    emoji: "👶",
                    color: "bg-brand/10 border-brand",
                  },
                  {
                    label: "Defis lances",
                    value: ecosystemStats.totalChallenges,
                    emoji: "🎯",
                    color: "bg-sky/30 border-sky-400",
                  },
                  {
                    label: "Defis completes",
                    value: ecosystemStats.completedChallenges,
                    emoji: "✅",
                    color: "bg-emerald-50 border-emerald-400",
                  },
                  {
                    label: "Commandes",
                    value: ecosystemStats.totalOrders,
                    emoji: "🛍️",
                    color: "bg-amber-50 border-amber-400",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-3xl border ${kpi.color} bg-white p-5 shadow-md`}
                  >
                    <div className="text-3xl mb-1">{kpi.emoji}</div>
                    <div className="font-display text-balance text-3xl font-black text-ink">
                      {kpi.value.toLocaleString("fr-FR")}
                    </div>
                    <p className="text-xs font-bold text-ink/60 uppercase tracking-wider mt-1">
                      {kpi.label}
                    </p>
                  </div>
                ))}
              </div>

              {ecosystemStats.totalChallenges > 0 && (
                <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                  <h3 className="font-display text-balance text-lg font-black mb-4">
                    Taux de completion global
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-4 rounded-full bg-surface border border-ink/10 overflow-hidden">
                      <div
                        className="h-full bg-brand transition-all duration-700"
                        style={{
                          width: `${Math.round((ecosystemStats.completedChallenges / ecosystemStats.totalChallenges) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xl font-black text-brand">
                      {Math.round(
                        (ecosystemStats.completedChallenges / ecosystemStats.totalChallenges) * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                  <h3 className="font-display text-balance text-lg font-black mb-4">
                    Talents dominants
                  </h3>
                  {Object.keys(ecosystemStats.talentTotals).length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart
                        data={Object.entries(ecosystemStats.talentTotals).map(([key, val]) => ({
                          talent: TALENT_KEY_LABELS[key] ?? key,
                          score: val,
                        }))}
                      >
                        <PolarGrid stroke="#00000020" />
                        <PolarAngleAxis dataKey="talent" tick={{ fontSize: 11, fontWeight: 700 }} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="#7C3AED"
                          fill="#7C3AED"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-ink/60 italic">Pas encore de donnees de talents.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                  <h3 className="font-display text-balance text-lg font-black">Top domaines</h3>
                  <p className="text-[11px] text-ink/60 mb-4">Sur les 200 défis les plus récents</p>
                  {ecosystemStats.topDomains.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={ecosystemStats.topDomains} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="domain"
                          type="category"
                          tick={{ fontSize: 10, fontWeight: 700 }}
                          width={130}
                          tickFormatter={(val) =>
                            val.length > 20 ? val.slice(0, 18) + "..." : val
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            border: "1px solid #00000020",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                          formatter={(v) => [`${v} defis`, "Total"]}
                        />
                        <Bar dataKey="count" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-ink/60 italic">Pas encore de defis.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                <h3 className="font-display text-balance text-lg font-black mb-5">
                  Les 6 Guildes Genizio
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(GUILDS).map((guild) => (
                    <div
                      key={guild.key}
                      className={`rounded-2xl border border-ink/10 px-4 py-3 flex items-center gap-2 ${guild.bgColor}`}
                    >
                      <span className="text-2xl">{guild.emoji}</span>
                      <div>
                        <p className={`text-xs font-black leading-tight ${guild.color}`}>
                          {guild.name}
                        </p>
                        <p className={`text-[10px] font-medium opacity-70 ${guild.color}`}>
                          {guild.tagline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

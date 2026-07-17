import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import {
  listProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  listMaterialSuggestions,
  ignoreMaterialSuggestion,
  listOrdersAdmin,
  updateOrderStatus,
  getEcosystemStats,
} from "@/lib/products.functions";
import { Loader2, Plus, Trash2, ShieldAlert, Package, Sparkles, X, BarChart2, Users, CheckSquare, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { GUILDS, getChildGuild } from "@/lib/guilds";
import { confirmDialog } from "@/components/ui/confirm-dialog";


export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

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
  sample_challenge_title: string | null;
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


function AdminProductsPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<MaterialSuggestion[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ecosystemStats, setEcosystemStats] = useState<EcosystemStats>(null);
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "stats">("products");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const listFn = useServerFn(listProductsAdmin);
  const createFn = useServerFn(createProduct);
  const updateFn = useServerFn(updateProduct);
  const deleteFn = useServerFn(deleteProduct);
  const listSuggestionsFn = useServerFn(listMaterialSuggestions);
  const ignoreSuggestionFn = useServerFn(ignoreMaterialSuggestion);
  const listOrdersFn = useServerFn(listOrdersAdmin);
  const updateStatusFn = useServerFn(updateOrderStatus);
  const getStatsFn = useServerFn(getEcosystemStats);


  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    try {
      const [productsData, suggestionsData, ordersData, statsData] = await Promise.all([
        listFn(),
        listSuggestionsFn(),
        listOrdersFn(),
        getStatsFn(),
      ]);
      setProducts((productsData as Product[]) ?? []);
      setSuggestions((suggestionsData as MaterialSuggestion[]) ?? []);
      setOrders(ordersData ?? []);
      setEcosystemStats(statsData as EcosystemStats);
      setForbidden(false);
    } catch {
      setForbidden(true);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatusFn({ data: { id: orderId, status: status as any } });
      toast.success("Statut de la commande mis à jour.");
      void refetch();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleCreate = async () => {
    if (!draft.name.trim() || draft.price_xof === "" || Number(draft.price_xof) < 0) {
      toast.error("Nom et prix requis.");
      return;
    }
    setSaving(true);
    try {
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
      });
      toast.success("Produit ajouté au catalogue.");
      setDraft(emptyDraft);
      setPendingSuggestionId(null);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
    } finally {
      setSaving(false);
    }
  };

  const startFromSuggestion = (s: MaterialSuggestion) => {
    setDraft({ ...emptyDraft, name: s.tag, material_tags: s.tag });
    setPendingSuggestionId(s.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ignoreSuggestion = async (id: string) => {
    await ignoreSuggestionFn({ data: { id } });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleActive = async (p: Product) => {
    await updateFn({ data: { id: p.id, is_active: !p.is_active } });
    void refetch();
  };

  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: "Supprimer ce produit ?", confirmLabel: "Supprimer", variant: "danger" }))) return;
    await deleteFn({ data: { id } });
    toast.success("Produit supprimé.");
    void refetch();
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface text-ink/50">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border-[3px] border-ink bg-brand text-white shadow-brutal-sm">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Catalogue de kits</h1>
            <p className="text-sm text-ink/50">Prix et stock des matériaux suggérés par Naya.</p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : forbidden ? (
          <div className="rounded-3xl border-[3px] border-ink bg-white p-10 text-center shadow-brutal">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border-2 border-ink bg-red-50 text-red-500">
              <ShieldAlert className="size-6" />
            </div>
            <p className="font-bold text-ink">Accès réservé à l'administrateur.</p>
            <p className="mt-1 text-sm text-ink/50">
              Ce compte ({session.user.email}) n'est pas autorisé à gérer le catalogue.
            </p>
          </div>
        ) : (
          <>
            {/* Tab Selector */}
            <div className="mb-6 flex gap-2 border-[3px] border-ink bg-white p-1 rounded-2xl shadow-brutal-sm">
              <button
                onClick={() => setActiveTab("products")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "products"
                    ? "bg-brand text-white border-2 border-ink shadow-brutal-sm"
                    : "text-ink/65 hover:bg-surface"
                }`}
              >
                <Package className="size-4" />
                <span>Catalogue</span>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "orders"
                    ? "bg-brand text-white border-2 border-ink shadow-brutal-sm"
                    : "text-ink/65 hover:bg-surface"
                }`}
              >
                <ShoppingCart className="size-4" />
                <span>Commandes ({orders.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "stats"
                    ? "bg-ink text-white border-2 border-ink shadow-brutal-sm"
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
                  <div className="mb-8 rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                    <div className="mb-4 flex items-center gap-2">
                      <Sparkles className="size-5 text-brand" />
                      <h2 className="font-display text-lg font-bold">Matériaux détectés sans produit</h2>
                    </div>
                    <p className="mb-4 text-sm text-ink/50">
                      Naya a mentionné ces matériaux dans des défis, mais aucun produit actif ne les couvre.
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-ink">
                              {s.tag}{" "}
                              <span className="rounded-full border-2 border-ink bg-brand px-2 py-0.5 text-[10px] font-black text-white">
                                vu {s.seen_count}×
                              </span>
                            </p>
                            {s.sample_challenge_title && (
                              <p className="truncate text-xs text-ink/40">ex: {s.sample_challenge_title}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => startFromSuggestion(s)}
                              className="rounded-xl border-2 border-ink bg-brand px-3 py-1.5 text-xs font-bold text-white hover:-translate-y-0.5 transition-all"
                            >
                              Créer un produit
                            </button>
                            <button
                              onClick={() => ignoreSuggestion(s.id)}
                              className="rounded-xl border-2 border-ink bg-white p-1.5 text-ink/50 hover:-translate-y-0.5 transition-all"
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

                <div ref={formRef} className="mb-8 rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-brutal">
                  <h2 className="mb-4 font-display text-lg font-bold">Ajouter un produit</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Nom (ex: Lot de carton)"
                      className="rounded-xl border-[3px] border-ink px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm sm:col-span-2"
                    />
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      placeholder="Description (optionnel)"
                      className="rounded-xl border-[3px] border-ink px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm sm:col-span-2"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draft.price_xof}
                      onChange={(e) =>
                        setDraft({ ...draft, price_xof: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      placeholder="Prix (FCFA)"
                      className="rounded-xl border-[3px] border-ink px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draft.stock_quantity}
                      onChange={(e) =>
                        setDraft({ ...draft, stock_quantity: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      placeholder="Stock (vide = illimité)"
                      className="rounded-xl border-[3px] border-ink px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
                    />
                    <input
                      value={draft.material_tags}
                      onChange={(e) => setDraft({ ...draft, material_tags: e.target.value })}
                      placeholder="Tags matériaux, séparés par des virgules (ex: carton, cutter)"
                      className="rounded-xl border-[3px] border-ink px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm sm:col-span-2"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="mt-4 flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Ajouter au catalogue
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-10 text-center shadow-brutal-sm">
                    <p className="text-ink/65 font-bold">Aucun produit pour l'instant.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-4 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-brutal-sm ${!p.is_active ? "opacity-50" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-ink">{p.name}</p>
                          <p className="text-xs text-ink/50">
                            {p.price_xof.toLocaleString("fr-FR")} FCFA
                            {p.stock_quantity !== null ? ` · ${p.stock_quantity} en stock` : " · stock illimité"}
                          </p>
                          {p.material_tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {p.material_tags.map((t) => (
                                <span key={t} className="rounded-full border-2 border-ink bg-surface px-2 py-0.5 text-[10px] font-bold text-ink">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => toggleActive(p)}
                            className="rounded-xl border-2 border-ink bg-white px-3 py-1.5 text-xs font-bold hover:-translate-y-0.5 transition-all"
                          >
                            {p.is_active ? "Désactiver" : "Activer"}
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="rounded-xl border-2 border-ink bg-white p-2 text-red-500 hover:-translate-y-0.5 transition-all"
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

            {activeTab === "orders" && (
              <>
                {orders.length === 0 ? (
                  <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-10 text-center shadow-brutal-sm">
                    <p className="text-ink/65 font-bold">Aucune commande pour le moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-start border-b-[3px] border-ink/10 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-ink">Commande #{o.id.slice(0, 8)}</span>
                              <span className="text-xs text-ink/40">· {new Date(o.created_at).toLocaleString("fr-FR")}</span>
                            </div>
                            <p className="mt-1 text-xs text-ink/65">
                              Enfant : <span className="font-bold text-ink">{o.child_profiles?.name || "Inconnu"}</span>
                            </p>
                            {o.challenges?.title && (
                              <p className="text-xs text-ink/65">
                                Défi : <span className="font-bold text-ink">{o.challenges.title}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {updatingOrderId === o.id && <Loader2 className="size-4 animate-spin text-brand" />}
                            <select
                              value={o.status}
                              disabled={updatingOrderId === o.id}
                              onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                              className="rounded-xl border-2 border-ink px-3 py-1 text-xs font-bold outline-none bg-surface shadow-brutal-sm cursor-pointer"
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmé</option>
                              <option value="shipped">Expédié</option>
                              <option value="delivered">Livré</option>
                              <option value="cancelled">Annulé</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-ink/50 mb-2">Produits commandés :</h4>
                          <ul className="space-y-1">
                            {((Array.isArray(o.items) ? o.items : []) as any[]).map((item, idx) => (
                              <li key={idx} className="flex justify-between text-sm font-semibold text-ink">
                                <span>- {item.name}</span>
                                <span>{Number(item.price_xof).toLocaleString("fr-FR")} FCFA</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 flex justify-between border-t-[3px] border-dashed border-ink/10 pt-3 text-sm font-black text-ink">
                            <span>Total payé</span>
                            <span>{Number(o.total_price_xof).toLocaleString("fr-FR")} FCFA</span>
                          </div>
                        </div>

                        {o.delivery_notes && (
                          <div className="rounded-xl bg-surface p-3 border-2 border-ink text-xs font-medium text-ink/80 leading-relaxed">
                            <span className="font-bold text-ink">Notes admin/livraison :</span> {o.delivery_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "stats" && ecosystemStats && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Enfants inscrits", value: ecosystemStats.totalChildren, emoji: "👶", color: "bg-brand/10 border-brand" },
                    { label: "Defis lances", value: ecosystemStats.totalChallenges, emoji: "🎯", color: "bg-sky/30 border-sky-400" },
                    { label: "Defis completes", value: ecosystemStats.completedChallenges, emoji: "✅", color: "bg-emerald-50 border-emerald-400" },
                    { label: "Commandes", value: ecosystemStats.totalOrders, emoji: "🛍️", color: "bg-amber-50 border-amber-400" },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-3xl border-[3px] ${kpi.color} bg-white p-5 shadow-brutal`}>
                      <div className="text-3xl mb-1">{kpi.emoji}</div>
                      <div className="font-display text-3xl font-black text-ink">{kpi.value.toLocaleString("fr-FR")}</div>
                      <p className="text-xs font-bold text-ink/60 uppercase tracking-wider mt-1">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {ecosystemStats.totalChallenges > 0 && (
                  <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                    <h3 className="font-display text-lg font-black mb-4">Taux de completion global</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 rounded-full bg-surface border-2 border-ink overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-700"
                          style={{ width: `${Math.round((ecosystemStats.completedChallenges / ecosystemStats.totalChallenges) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xl font-black text-brand">
                        {Math.round((ecosystemStats.completedChallenges / ecosystemStats.totalChallenges) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                    <h3 className="font-display text-lg font-black mb-4">Talents dominants</h3>
                    {Object.keys(ecosystemStats.talentTotals).length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={Object.entries(ecosystemStats.talentTotals).map(([key, val]) => ({
                          talent: ({ spatial: "Spatial", corporelle: "Corporel", sociale: "Social", entrepreneuriale: "Entrepreneur", creative: "Creatif", artisanale: "Artisanal", emotionnelle: "Emotionnel", logico_mathematique: "Logique", linguistique: "Linguistique" } as Record<string,string>)[key] ?? key,
                          score: val,
                        }))}>
                          <PolarGrid stroke="#00000020" />
                          <PolarAngleAxis dataKey="talent" tick={{ fontSize: 11, fontWeight: 700 }} />
                          <Radar name="Score" dataKey="score" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-ink/50 italic">Pas encore de donnees de talents.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                    <h3 className="font-display text-lg font-black mb-4">Top domaines</h3>
                    {ecosystemStats.topDomains.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={ecosystemStats.topDomains} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            dataKey="domain"
                            type="category"
                            tick={{ fontSize: 10, fontWeight: 700 }}
                            width={130}
                            tickFormatter={(val) => (val.length > 20 ? val.slice(0, 18) + "..." : val)}
                          />
                          <Tooltip
                            contentStyle={{ border: "2px solid #000", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                            formatter={(v) => [`${v} defis`, "Total"]}
                          />
                          <Bar dataKey="count" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-ink/50 italic">Pas encore de defis.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
                  <h3 className="font-display text-lg font-black mb-5">Les 6 Guildes Genizio</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {Object.values(GUILDS).map((guild) => (
                      <div key={guild.key} className={`rounded-2xl border-2 border-ink px-4 py-3 flex items-center gap-2 ${guild.bgColor}`}>
                        <span className="text-2xl">{guild.emoji}</span>
                        <div>
                          <p className={`text-xs font-black leading-tight ${guild.color}`}>{guild.name}</p>
                          <p className={`text-[10px] font-medium opacity-70 ${guild.color}`}>{guild.tagline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

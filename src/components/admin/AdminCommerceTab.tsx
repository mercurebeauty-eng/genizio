import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Award,
  Package,
  Lock,
  Unlock,
  Printer,
  ExternalLink,
  Phone,
  BadgeCheck,
  Filter,
  Brain,
  Truck,
  XCircle,
  AlertCircle,
  Tag,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommercePassportsDataResponse,
  filterOrdersByStatus,
  formatXOF,
} from "@/lib/admin-os.functions";
import { PASSPORT_PRICE_XOF } from "@/lib/pricing";

interface AdminCommerceTabProps {
  data: CommercePassportsDataResponse;
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateOrderStatus?: (orderId: string, status: string) => Promise<void>;
  onTogglePassport?: (childId: string, unlock: boolean) => Promise<void>;
}

const STATUS_FILTERS = [
  { id: "Tous", label: "Tous" },
  { id: "pending", label: "En attente" },
  { id: "confirmed", label: "Confirmé" },
  { id: "shipped", label: "Expédié" },
  { id: "delivered", label: "Livré" },
  { id: "cancelled", label: "Annulé" },
];

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "confirmed", label: "Confirmé", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "shipped", label: "Expédié", color: "bg-purple-100 text-purple-800 border-purple-300" },
  {
    value: "delivered",
    label: "Livré",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  { value: "cancelled", label: "Annulé", color: "bg-red-100 text-red-800 border-red-300" },
];

export function AdminCommerceTab({
  data,
  isRefreshing = false,
  onRefresh,
  onUpdateOrderStatus,
  onTogglePassport,
}: AdminCommerceTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>("Tous");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [pendingPassportChildId, setPendingPassportChildId] = useState<string | null>(null);

  const filteredOrders = filterOrdersByStatus(data.orders, activeFilter);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!onUpdateOrderStatus || updatingOrderId === orderId) return;
    setUpdatingOrderId(orderId);
    try {
      await onUpdateOrderStatus(orderId, newStatus);
    } catch (err: any) {
      toast.error(
        "Erreur lors de la mise à jour du statut: " + (err?.message || "Erreur inconnue"),
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleTogglePassportClick = async (childId: string, unlock: boolean) => {
    if (!onTogglePassport || pendingPassportChildId === childId) return;
    setPendingPassportChildId(childId);
    try {
      await onTogglePassport(childId, unlock);
    } catch (err: any) {
      toast.error(
        "Erreur lors de la modification de l'accès passeport: " +
          (err?.message || "Erreur inconnue"),
      );
    } finally {
      setPendingPassportChildId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = ORDER_STATUS_OPTIONS.find((o) => o.value === status);
    if (!option) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-extrabold text-stone-700">
          {status}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${option.color}`}
      >
        {option.label}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      {/* 📊 Section 1: Commerce KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Orders */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Commandes Totales
            </span>
            <ShoppingBag className="size-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-purple-600">
              {data.summary.totalOrders}
            </span>
            <span className="text-xs font-bold text-ink/50">commandes</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Commandes de kits boutique générées
          </p>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">En Attente</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-amber-500">
              {data.summary.pendingOrders}
            </span>
            <span className="text-xs font-bold text-ink/50">à traiter</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Kits en attente de préparation ou confirmation
          </p>
        </div>

        {/* Card 3: Delivered Orders */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Commandes Livrées
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-emerald-600">
              {data.summary.deliveredOrders}
            </span>
            <span className="text-xs font-bold text-ink/50">livrées</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Taux de livraison :{" "}
            <strong className="text-ink">
              {data.summary.totalOrders > 0
                ? Math.round((data.summary.deliveredOrders / data.summary.totalOrders) * 100)
                : 0}
              %
            </strong>
          </p>
        </div>

        {/* Card 4: Passports 14+ Unlocked */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Passeports 14+ Débloqués
            </span>
            <Award className="size-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-sky-600">
              {data.summary.passportsUnlockedCount}
            </span>
            <span className="text-xs font-bold text-ink/50">/ {data.teenProfiles.length} ados</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Passeports d'Excellence actifs pour 14 ans et +
          </p>
        </div>
      </div>

      {/* 📦 Section 2: Kit Order Fulfillment Queue */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl relative">
        {isRefreshing && (
          <div className="absolute top-4 right-6 text-xs text-purple-600 font-bold animate-pulse">
            Mise à jour des commandes…
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2 text-ink">
              <Package className="size-5 text-purple-600" />
              File de Traitement des Commandes de Kits
            </h2>
            <p className="text-xs text-ink/60 font-medium mt-0.5">
              Gestion de l'expédition et mise à jour en 1-click des statuts de kits commandés par
              les parents.
            </p>
          </div>

          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 self-start md:self-auto">
            {filteredOrders.length} / {data.orders.length} Commandes
          </span>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-2 rounded-2xl bg-surface border border-ink/5">
          <span className="text-xs font-bold text-ink/60 flex items-center gap-1 px-2">
            <Filter className="size-3.5" /> Filtrer :
          </span>
          {STATUS_FILTERS.map((f) => {
            const count =
              f.id === "Tous"
                ? data.orders.length
                : data.orders.filter((o) => o.status === f.id).length;
            const isActive = activeFilter === f.id;

            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                    : "bg-white border-ink/10 text-ink/70 hover:bg-stone-50"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-ink/5 text-ink/60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center bg-surface/30">
            <ShoppingBag className="size-8 text-ink/30 mx-auto mb-2" />
            <p className="text-sm font-bold text-ink/70">
              Aucune commande ne correspond à ce filtre.
            </p>
            <p className="text-xs text-ink/50 mt-1">
              Sélectionnez un autre statut pour afficher les commandes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-[3px] border-ink text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
                  <th className="pb-3 pr-4">Date & Réf</th>
                  <th className="pb-3 pr-4">Bénéficiaire</th>
                  <th className="pb-3 pr-4">Détails du Kit</th>
                  <th className="pb-3 pr-4">Montant XOF</th>
                  <th className="pb-3 pr-4">Statut Actuel</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-surface/40 transition-colors">
                      {/* Date & Ref */}
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-ink">
                          #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-[11px] font-medium text-ink/50">
                          {new Date(order.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        {order.payment_reference && (
                          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            <BadgeCheck className="size-3" />
                            Payé · {order.payment_reference.slice(0, 12)}
                          </div>
                        )}
                      </td>

                      {/* Beneficiary */}
                      <td className="py-4 pr-4">
                        <div className="font-extrabold text-xs text-ink">
                          {order.child_profiles?.name || "Enfant inconnu"}
                        </div>
                        {order.challenges?.title && (
                          <div className="text-[11px] text-purple-600 font-bold line-clamp-1">
                            Défi: {order.challenges.title}
                          </div>
                        )}
                      </td>

                      {/* Kit Items */}
                      <td className="py-4 pr-4 max-w-xs">
                        {order.items && order.items.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs font-medium text-ink flex items-center justify-between gap-2"
                              >
                                <span className="line-clamp-1">{item.name}</span>
                                <span className="font-bold text-ink/60 text-[11px] whitespace-nowrap">
                                  {formatXOF(item.price_xof)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-ink/40 italic">Articles non spécifiés</span>
                        )}
                        {order.delivery_notes && (
                          <div className="mt-1 rounded-lg bg-amber-50 p-1.5 border border-amber-200 text-[10px] text-amber-800 font-medium italic">
                            Note: {order.delivery_notes}
                          </div>
                        )}
                      </td>

                      {/* Total Price */}
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <span className="font-display font-black text-sm text-purple-700">
                          {formatXOF(order.total_price_xof)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 pr-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Status 1-Click Update Control */}
                      <td className="py-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {updatingOrderId === order.id && (
                            <Loader2 className="size-3.5 animate-spin text-purple-600 shrink-0" />
                          )}
                          <select
                            value={order.status}
                            disabled={updatingOrderId === order.id}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="rounded-xl border-2 border-ink/20 bg-white px-3 py-1.5 text-xs font-bold text-ink cursor-pointer focus:border-purple-600 focus:outline-none transition-all disabled:opacity-50"
                          >
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🎖️ Section 3: Dedicated 1-Click Passport d'Excellence Validation Panel for Teens (age 14+) */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-xl font-bold flex items-center gap-2 text-ink">
                <Award className="size-5 text-sky-600" />
                Passeports d'Excellence 14+ (Validation 1-Click)
              </h2>
              <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                {formatXOF(PASSPORT_PRICE_XOF)}
              </span>
            </div>
            <p className="text-xs text-ink/60 font-medium">
              Espace de validation et d'activation des Passeports d'Excellence officiels pour les
              adolescents âgés de 14 ans et plus.
            </p>
          </div>

          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-700 self-start md:self-auto">
            {data.teenProfiles.filter((p) => p.pdfUnlocked).length} / {data.teenProfiles.length}{" "}
            Débloqués
          </span>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-sky-50 via-purple-50 to-surface border border-sky-200/60 p-4 flex items-start gap-3">
          <BadgeCheck className="size-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80 leading-relaxed">
            <strong>Activation du Passeport d'Excellence (14 ans et +) :</strong> Le déblocage
            autorise la génération et l'impression HD du passeport certifiant l'ensemble des
            compétences et des guildes de l'adolescent. Tarif de validation officiel :{" "}
            <strong>{formatXOF(PASSPORT_PRICE_XOF)}</strong>.
          </div>
        </div>

        {/* Teen Table */}
        {data.teenProfiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center bg-surface/30">
            <Award className="size-8 text-ink/30 mx-auto mb-2" />
            <p className="text-sm font-bold text-ink/70">
              Aucun profil adolescent (14 ans et +) enregistré pour le moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-[3px] border-ink text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
                  <th className="pb-3 pr-4">Adolescent</th>
                  <th className="pb-3 pr-4">Ville</th>
                  <th className="pb-3 pr-4">Contact Parent & WhatsApp</th>
                  <th className="pb-3 pr-4">Statut Passeport</th>
                  <th className="pb-3 text-center">Action</th>
                  <th className="pb-3 text-center">Impression</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {data.teenProfiles.map((teen) => {
                  return (
                    <tr key={teen.id} className="hover:bg-surface/40 transition-colors">
                      {/* Adolescent */}
                      <td className="py-4 pr-4">
                        <div className="font-extrabold text-xs text-ink">{teen.name}</div>
                        <div className="text-[11px] font-bold text-purple-600">{teen.age} ans</div>
                      </td>

                      {/* Ville */}
                      <td className="py-4 pr-4 font-medium text-xs text-ink/70">{teen.city}</td>

                      {/* Contact Parent */}
                      <td className="py-4 pr-4">
                        <div className="font-bold text-xs text-ink">{teen.parentEmail}</div>
                        {teen.whatsappUrl ? (
                          <a
                            href={teen.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#25D366] hover:underline mt-0.5"
                          >
                            <Phone className="size-3 fill-current" />
                            <span>Contacter sur WhatsApp</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-ink/40 italic">Sans WhatsApp</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 pr-4 whitespace-nowrap">
                        {teen.pdfUnlocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                            <Unlock className="size-3 text-emerald-600" />
                            Passeport Débloqué
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                            <Lock className="size-3 text-amber-600" />
                            Verrouillé ({formatXOF(PASSPORT_PRICE_XOF)})
                          </span>
                        )}
                      </td>

                      {/* 1-Click Toggle Button */}
                      <td className="py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePassportClick(teen.id, !teen.pdfUnlocked)}
                          disabled={pendingPassportChildId === teen.id}
                          className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
                            teen.pdfUnlocked
                              ? "bg-amber-100 border-2 border-amber-400 text-amber-900 hover:bg-amber-200"
                              : "bg-emerald-600 border-2 border-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {pendingPassportChildId === teen.id ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Traitement…
                            </>
                          ) : teen.pdfUnlocked ? (
                            <>
                              <Lock className="size-3.5" /> Reverrouiller
                            </>
                          ) : (
                            <>
                              <Unlock className="size-3.5" /> Débloquer (50k FCFA)
                            </>
                          )}
                        </button>
                      </td>

                      {/* Print Quick Link */}
                      <td className="py-4 text-center whitespace-nowrap">
                        <Link
                          to="/profiles/$profileId/passport-print"
                          params={{ profileId: teen.id }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 shadow-sm transition-all cursor-pointer"
                        >
                          <Printer className="size-3.5 text-purple-600" />
                          <span>Imprimer</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🛍️ Section 4: Catalog & Naya AI Material Suggestions Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sub-section A: Products Catalog */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <Tag className="size-5 text-purple-600" />
              Catalogue Produits Boutique
            </h3>
            <Link
              to="/admin/products"
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              <span>Gérer tout</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>

          {data.products.length === 0 ? (
            <p className="text-xs text-ink/50 italic py-4">Aucun produit dans le catalogue.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {data.products.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-ink/10 bg-surface/30 p-3 flex items-center justify-between gap-3 hover:bg-surface transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-ink">{product.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-black text-purple-600">
                        {formatXOF(product.price_xof)}
                      </span>
                      {product.stock_quantity !== null && product.stock_quantity !== undefined && (
                        <span className="text-[10px] text-ink/50 font-medium">
                          • Stock : {product.stock_quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      product.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {product.is_active ? "Actif" : "Masqué"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-section B: Naya AI Material Suggestions */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <Brain className="size-5 text-sky-600" />
              Suggestions Matériel Naya IA
            </h3>
            <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-700">
              {data.materialSuggestions.length} Nouveaux
            </span>
          </div>

          {data.materialSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/10 p-6 text-center">
              <p className="text-xs text-ink/50 italic">
                Aucune suggestion de matériel détectée par Naya IA.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {data.materialSuggestions.slice(0, 6).map((sug) => (
                <div
                  key={sug.id}
                  className="rounded-2xl border border-ink/10 bg-surface/30 p-3 flex items-center justify-between gap-3 hover:bg-surface transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-ink">
                      {sug.tag || sug.material_name || "Matériel"}
                    </div>
                    <div className="text-[10px] text-ink/50 font-medium">
                      Domaine : {sug.domain || "Général"} • Demandé {sug.seen_count} fois
                    </div>
                  </div>

                  <Link
                    to="/admin/products"
                    className="rounded-xl bg-purple-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Ajouter au catalogue
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

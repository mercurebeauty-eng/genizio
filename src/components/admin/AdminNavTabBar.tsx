import React from "react";
import {
  BarChart3,
  Building2,
  Users,
  Package,
  Award,
  Brain,
  CreditCard,
  ShoppingBag,
  ShieldCheck,
  Home,
} from "lucide-react";

// Refonte Admin OS (2026-08-13, décision #71) : 9 onglets — « Seasons » supprimé
// (vestige de la dégradation des saisons), « Abonnements » fusionné dans le nouvel
// onglet « Paiements & Accès ». ADMIN_TABS est la source unique partagée par la
// grille d'accueil (admin.index) et la barre de navigation persistante.

export type AdminTab =
  | "executive"
  | "b2b"
  | "supervisors"
  | "products"
  | "talents"
  | "naya"
  | "payments"
  | "commerce"
  | "profiles";

/** Écran d'accueil (grille de cartes) ou onglet ouvert. */
export type AdminRoute = AdminTab | "home";

export interface AdminTabDef {
  id: AdminTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

export const ADMIN_TABS: AdminTabDef[] = [
  {
    id: "executive",
    label: "Exécutif",
    sublabel: "KPIs & Annuaire",
    icon: BarChart3,
    badge: "KPIs",
    badgeBgClass: "bg-brand/10",
    badgeTextClass: "text-brand",
  },
  {
    id: "b2b",
    label: "Campagnes B2B",
    sublabel: "ONG & Cohortes",
    icon: Building2,
    badge: "B2B",
    badgeBgClass: "bg-ink/10",
    badgeTextClass: "text-ink",
  },
  {
    id: "supervisors",
    label: "Superviseurs",
    sublabel: "Assignations",
    icon: Users,
    badge: "Super",
    badgeBgClass: "bg-emerald-500/10",
    badgeTextClass: "text-emerald-600",
  },
  {
    id: "products",
    label: "Produits & Stock",
    sublabel: "Catalogue & Kits",
    icon: Package,
    badge: "Kits",
    badgeBgClass: "bg-indigo-500/10",
    badgeTextClass: "text-indigo-600",
  },
  {
    id: "talents",
    label: "Talents & Villes",
    sublabel: "Guildes & Radar",
    icon: Award,
    badge: "Radar",
    badgeBgClass: "bg-leaf/10",
    badgeTextClass: "text-leaf",
  },
  {
    id: "naya",
    label: "IA Naya",
    sublabel: "Diagnostics & Loup",
    icon: Brain,
    badge: "IA",
    badgeBgClass: "bg-sky/10",
    badgeTextClass: "text-sky-600",
  },
  {
    id: "payments",
    label: "Paiements & Accès",
    sublabel: "Secours & Abonnements",
    icon: CreditCard,
    badge: "Secours",
    badgeBgClass: "bg-amber-500/10",
    badgeTextClass: "text-amber-600",
  },
  {
    id: "commerce",
    label: "Commerce",
    sublabel: "Commandes & Passeports",
    icon: ShoppingBag,
    badge: "Ventes",
    badgeBgClass: "bg-purple-500/10",
    badgeTextClass: "text-purple-600",
  },
  {
    id: "profiles",
    label: "Profils",
    sublabel: "Pouvoir Admin",
    icon: ShieldCheck,
    badge: "Admin",
    badgeBgClass: "bg-rose-500/10",
    badgeTextClass: "text-rose-600",
  },
];

interface AdminNavTabBarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onGoHome: () => void;
}

/** Barre de pills persistante (affichée quand un onglet est ouvert) : bouton
 *  Accueil + 9 onglets compacts — scroll horizontal sur mobile, wrap sur desktop. */
export function AdminNavTabBar({ activeTab, onTabChange, onGoHome }: AdminNavTabBarProps) {
  return (
    <div className="w-full rounded-2xl border border-ink/10 bg-surface/80 p-1.5 shadow-sm backdrop-blur-md mb-6 sm:mb-8">
      <nav
        className="flex flex-wrap items-center gap-1.5 no-scrollbar"
        aria-label="Navigation Admin OS"
      >
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/70 transition-all hover:border-ink/25 hover:text-ink cursor-pointer"
          title="Retour à l'accueil"
        >
          <Home className="size-3.5" />
          <span className="hidden sm:inline">Accueil</span>
        </button>

        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-transparent bg-white/60 text-ink/60 hover:bg-white hover:text-ink"
              }`}
            >
              <Icon className={`size-3.5 ${isActive ? "" : "opacity-70"}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

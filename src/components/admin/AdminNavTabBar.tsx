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
  | "mentors"
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
  /** Carte d'accueil : fond dégradé + bordure + ombre colorée au hover (classes
   *  statiques complètes — purge Tailwind, jamais composées à la volée). */
  cardClass: string;
  /** Pastille d'icône : dégradé plein + ombre colorée (icône blanche dessus). */
  iconClass: string;
  /** Halo décoratif en coin de carte (dégradé flouté). */
  haloClass: string;
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
    cardClass:
      "bg-gradient-to-br from-violet-500/10 via-white to-white border-violet-500/20 hover:shadow-violet-500/25",
    iconClass: "from-violet-500 to-indigo-600 shadow-violet-500/40",
    haloClass: "from-violet-400/50 to-indigo-400/10",
  },
  {
    id: "b2b",
    label: "Campagnes B2B",
    sublabel: "ONG & Cohortes",
    icon: Building2,
    badge: "B2B",
    badgeBgClass: "bg-ink/10",
    badgeTextClass: "text-ink",
    cardClass:
      "bg-gradient-to-br from-slate-500/10 via-white to-white border-slate-400/30 hover:shadow-slate-500/25",
    iconClass: "from-slate-700 to-slate-900 shadow-slate-500/40",
    haloClass: "from-slate-400/50 to-slate-600/10",
  },
  {
    id: "mentors",
    label: "Mentors",
    sublabel: "Assignations",
    icon: Users,
    badge: "Super",
    badgeBgClass: "bg-emerald-500/10",
    badgeTextClass: "text-emerald-600",
    cardClass:
      "bg-gradient-to-br from-emerald-500/10 via-white to-white border-emerald-500/20 hover:shadow-emerald-500/25",
    iconClass: "from-emerald-500 to-teal-600 shadow-emerald-500/40",
    haloClass: "from-emerald-400/50 to-teal-400/10",
  },
  {
    id: "products",
    label: "Produits & Stock",
    sublabel: "Catalogue & Kits",
    icon: Package,
    badge: "Kits",
    badgeBgClass: "bg-indigo-500/10",
    badgeTextClass: "text-indigo-600",
    cardClass:
      "bg-gradient-to-br from-indigo-500/10 via-white to-white border-indigo-500/20 hover:shadow-indigo-500/25",
    iconClass: "from-indigo-500 to-blue-700 shadow-indigo-500/40",
    haloClass: "from-indigo-400/50 to-blue-400/10",
  },
  {
    id: "talents",
    label: "Talents & Villes",
    sublabel: "Guildes & Radar",
    icon: Award,
    badge: "Radar",
    badgeBgClass: "bg-leaf/10",
    badgeTextClass: "text-leaf",
    cardClass:
      "bg-gradient-to-br from-green-500/10 via-white to-white border-green-500/20 hover:shadow-green-500/25",
    iconClass: "from-green-600 to-emerald-700 shadow-green-500/40",
    haloClass: "from-green-400/50 to-emerald-400/10",
  },
  {
    id: "naya",
    label: "IA Naya",
    sublabel: "Diagnostics & Loup",
    icon: Brain,
    badge: "IA",
    badgeBgClass: "bg-sky/10",
    badgeTextClass: "text-sky-600",
    cardClass:
      "bg-gradient-to-br from-sky-500/10 via-white to-white border-sky-500/20 hover:shadow-sky-500/25",
    iconClass: "from-sky-500 to-blue-600 shadow-sky-500/40",
    haloClass: "from-sky-400/50 to-blue-400/10",
  },
  {
    id: "payments",
    label: "Paiements & Accès",
    sublabel: "Secours & Abonnements",
    icon: CreditCard,
    badge: "Secours",
    badgeBgClass: "bg-amber-500/10",
    badgeTextClass: "text-amber-600",
    cardClass:
      "bg-gradient-to-br from-amber-500/10 via-white to-white border-amber-500/20 hover:shadow-amber-500/25",
    iconClass: "from-amber-500 to-orange-600 shadow-amber-500/40",
    haloClass: "from-amber-400/50 to-orange-400/10",
  },
  {
    id: "commerce",
    label: "Commerce",
    sublabel: "Commandes & Passeports",
    icon: ShoppingBag,
    badge: "Ventes",
    badgeBgClass: "bg-purple-500/10",
    badgeTextClass: "text-purple-600",
    cardClass:
      "bg-gradient-to-br from-purple-500/10 via-white to-white border-purple-500/20 hover:shadow-purple-500/25",
    iconClass: "from-purple-500 to-fuchsia-600 shadow-purple-500/40",
    haloClass: "from-purple-400/50 to-fuchsia-400/10",
  },
  {
    id: "profiles",
    label: "Profils",
    sublabel: "Pouvoir Admin",
    icon: ShieldCheck,
    badge: "Admin",
    badgeBgClass: "bg-rose-500/10",
    badgeTextClass: "text-rose-600",
    cardClass:
      "bg-gradient-to-br from-rose-500/10 via-white to-white border-rose-500/20 hover:shadow-rose-500/25",
    iconClass: "from-rose-500 to-red-600 shadow-rose-500/40",
    haloClass: "from-rose-400/50 to-red-400/10",
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

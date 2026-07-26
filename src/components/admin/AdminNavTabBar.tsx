import React from "react";
import { BarChart3, Award, Brain, ShoppingBag, Calendar, Building2, Users, Package } from "lucide-react";

export type AdminTab =
  | "executive"
  | "b2b"
  | "supervisors"
  | "products"
  | "talents"
  | "naya"
  | "commerce"
  | "seasons";

interface AdminNavTabBarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const ADMIN_TABS: Array<{
  id: AdminTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge: string;
  badgeBgClass: string;
  badgeTextClass: string;
}> = [
  {
    id: "executive",
    label: "Exécutif",
    sublabel: "KPIs & CRM",
    icon: BarChart3,
    badge: "BI CRM",
    badgeBgClass: "bg-brand/10",
    badgeTextClass: "text-brand",
  },
  {
    id: "b2b",
    label: "Campagnes B2B",
    sublabel: "ONG & Cohortes",
    icon: Building2,
    badge: "BI B2B",
    badgeBgClass: "bg-ink/10",
    badgeTextClass: "text-ink",
  },
  {
    id: "supervisors",
    label: "Superviseurs",
    sublabel: "Mentors & Quotas",
    icon: Users,
    badge: "Mentors",
    badgeBgClass: "bg-emerald-500/10",
    badgeTextClass: "text-emerald-600",
  },
  {
    id: "products",
    label: "Produits",
    sublabel: "Kits & Stock",
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
    sublabel: "Diagnostics & Prompts",
    icon: Brain,
    badge: "IA",
    badgeBgClass: "bg-sky/10",
    badgeTextClass: "text-sky-600",
  },
  {
    id: "commerce",
    label: "Commerce",
    sublabel: "Boutique & Orders",
    icon: ShoppingBag,
    badge: "Ventes",
    badgeBgClass: "bg-purple-500/10",
    badgeTextClass: "text-purple-600",
  },
  {
    id: "seasons",
    label: "Seasons",
    sublabel: "Trimestres & Diaspora",
    icon: Calendar,
    badge: "3 Mois",
    badgeBgClass: "bg-amber-500/10",
    badgeTextClass: "text-amber-600",
  },
];

export function AdminNavTabBar({ activeTab, onTabChange }: AdminNavTabBarProps) {
  return (
    <div className="w-full overflow-x-auto bg-surface/80 backdrop-blur-md border border-ink/10 p-1.5 sm:p-2 rounded-3xl shadow-sm mb-6 sm:mb-8 no-scrollbar scroll-smooth">
      <nav className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8" aria-label="Navigation Admin OS">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex flex-col items-start p-3 sm:p-4 rounded-2xl transition-all duration-200 text-left cursor-pointer border min-w-[140px] sm:min-w-0 flex-1 ${
                isActive
                  ? "bg-white border-ink/15 shadow-md scale-[1.01]"
                  : "bg-white/40 border-transparent hover:bg-white/80 hover:border-ink/5 text-ink/70"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2 gap-1">
                <div
                  className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                    isActive ? `${tab.badgeBgClass} ${tab.badgeTextClass}` : "bg-ink/5 text-ink/50 group-hover:text-ink"
                  }`}
                >
                  <Icon className="size-4 sm:size-5 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                    tab.badgeBgClass
                  } ${tab.badgeTextClass}`}
                >
                  {tab.badge}
                </span>
              </div>

              <span className="font-display font-extrabold text-xs sm:text-sm text-ink leading-tight truncate w-full">
                {tab.label}
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-ink/60 mt-0.5 line-clamp-1 w-full">
                {tab.sublabel}
              </span>

              {isActive && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-6 bg-brand rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

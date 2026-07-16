import { Link } from "@tanstack/react-router";
import { Home, Sparkles, PieChart, Users, Settings } from "lucide-react";

type AppTabBarProps = {
  profileId: string;
};

const activeClass = "text-brand";
const inactiveClass = "text-ink/40 hover:text-ink/70";

export function AppTabBar({ profileId }: AppTabBarProps) {
  const items = [
    {to: "/profiles" as const, label: "Accueil", icon: Home, needsProfileId: false},
    { to: "/profiles/$profileId/challenges" as const, label: "Défi", icon: Sparkles, needsProfileId: true },
    { to: "/profiles/$profileId/portfolio" as const, label: "Portfolio", icon: PieChart, needsProfileId: true },
    { to: "/profiles/$profileId/mentors" as const, label: "Mentors", icon: Users, needsProfileId: true },
    { to: "/profile" as const, label: "Réglages", icon: Settings, needsProfileId: false },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/5 bg-white/95 backdrop-blur-md md:sticky md:top-16 md:inset-x-auto md:h-fit md:w-20 md:rounded-3xl md:border md:border-ink/5 md:bg-white md:shadow-soft md:py-4"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2 md:flex-col md:gap-4 md:py-0">
        {items.map(({ to, label, icon: Icon, needsProfileId }) => (
          <Link
            key={to}
            to={to}
            params={(needsProfileId ? { profileId } : undefined) as never}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors ${inactiveClass}`}
            activeProps={{ className: activeClass }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

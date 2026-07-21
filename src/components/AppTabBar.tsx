import { Link } from "@tanstack/react-router";
import { Home, Trophy, Clock, ShoppingBag, Users, Settings } from "lucide-react";

type AppTabBarProps = {
  profileId: string;
};

const activeClass = "text-brand";
const inactiveClass = "text-ink/60 hover:text-ink/70";

export function AppTabBar({ profileId }: AppTabBarProps) {
  const items = [
    { to: "/profiles" as const, label: "Accueil", icon: Home, needsProfileId: false, hideOnDesktop: true },
    { to: "/profiles/$profileId/challenges" as const, label: "Défis", icon: Trophy, needsProfileId: true },
    { to: "/laboratory" as const, label: "Atelier", icon: Clock, needsProfileId: false },
    { to: "/boutique" as const, label: "Boutique", icon: ShoppingBag, needsProfileId: false },
    { to: "/profiles/$profileId/mentors" as const, label: "Mentors", icon: Users, needsProfileId: true },
    { to: "/profile" as const, label: "Réglages", icon: Settings, needsProfileId: false, hideOnDesktop: true },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur-md md:sticky md:top-20 md:inset-x-auto md:h-fit md:w-20 md:rounded-3xl md:border md:border-ink/10 md:shadow-md md:py-4 transition-all"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2 md:flex-col md:gap-4 md:py-0">
        {items.map(({ to, label, icon: Icon, needsProfileId, hideOnDesktop }) => {
          if (needsProfileId && !profileId) {
            return (
              <Link
                key={label}
                to="/profiles"
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors ${inactiveClass}`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              params={(needsProfileId ? { profileId } : undefined) as never}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors ${inactiveClass} ${
                hideOnDesktop ? "md:hidden" : ""
              }`}
              activeProps={{ className: activeClass }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

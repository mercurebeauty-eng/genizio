import { Link } from "@tanstack/react-router";
import { Home, Trophy, ShoppingBag, Users, Settings } from "lucide-react";

type AppTabBarProps = {
  profileId: string;
};

export function AppTabBar({ profileId }: AppTabBarProps) {
  const items = [
    { to: "/profiles" as const, label: "Accueil", icon: Home, needsProfileId: false },
    { to: "/profiles/$profileId/challenges" as const, label: "Défis", icon: Trophy, needsProfileId: true },
    { to: "/boutique" as const, label: "Boutique", icon: ShoppingBag, needsProfileId: false },
    { to: "/profiles/$profileId/mentors" as const, label: "Mentors", icon: Users, needsProfileId: true },
    { to: "/profile" as const, label: "Réglages", icon: Settings, needsProfileId: false },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[414px] z-40 bg-white/95 backdrop-blur-md border-t border-ink/5 pt-2.5 pb-2.5 px-2 flex flex-col justify-between shadow-xl rounded-t-[28px] transition-all"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-around w-full">
        {items.map(({ to, label, icon: Icon, needsProfileId }) => {
          const targetTo = (needsProfileId && !profileId) ? "/profiles" : to;
          const params = (needsProfileId && profileId ? { profileId } : undefined) as never;

          return (
            <Link
              key={label}
              to={targetTo as any}
              params={params}
              activeOptions={{ exact: label === "Accueil" }}
              className="flex flex-col items-center gap-1 px-3 py-1 cursor-pointer transition-all duration-150 text-ink/40 hover:text-ink/70"
              activeProps={{
                className: "!text-brand font-bold",
              }}
            >
              {({ isActive }) => (
                <>
                  <div className={`p-0.5 rounded-full transition-all ${isActive ? "ring-2 ring-brand rounded-full text-brand" : ""}`}>
                    <Icon className="size-5 stroke-[2.1]" />
                  </div>
                  <span className="text-[10px] font-bold text-balance">{label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* iOS Home Indicator Bar */}
      <div className="w-32 h-1 bg-ink/20 rounded-full mx-auto mt-2 mb-0.5 pointer-events-none" />
    </nav>
  );
}

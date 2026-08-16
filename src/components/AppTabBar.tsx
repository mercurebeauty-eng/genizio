import { Link } from "@tanstack/react-router";
import { Home, Trophy, Layers, Users, Settings } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { isMentorMode } from "@/lib/mentor-mode";

type AppTabBarProps = {
  profileId: string;
};

export function AppTabBar({ profileId }: AppTabBarProps) {
  // Mode actif (décision #79-81) : en mode Mentor, l'onglet « Mentor » (le hub de
  // l'enfant) disparaît — on ne se suit pas soi-même. Le mode est un pur
  // commutateur stocké dans user_metadata, changé depuis Réglages → Mode Mentor.
  const { session } = useSession();
  const mentorMode = isMentorMode(session);

  // Boutique retirée de la nav principale : aucun autre point d'entrée dans l'app ne pointe
  // vers /boutique (le flux de commande de kit est déjà intégré directement dans la carte de
  // défi via handleOrderKit — cf. profiles.$profileId.challenges.tsx), donc elle n'occupait
  // qu'un cinquième de la barre sans jamais être le point d'entrée réel du parcours. Le
  // Portfolio — la promesse centrale du produit ("portfolio vivant") — prend sa place.
  const items = [
    { to: "/profiles" as const, label: "Accueil", icon: Home, needsProfileId: false },
    {
      to: "/profiles/$profileId/challenges" as const,
      label: "Défis",
      icon: Trophy,
      needsProfileId: true,
    },
    {
      to: "/profiles/$profileId/portfolio" as const,
      label: "Portfolio",
      icon: Layers,
      needsProfileId: true,
    },
    {
      to: "/profiles/$profileId/mentors" as const,
      label: "Mentor",
      icon: Users,
      needsProfileId: true,
    },
    { to: "/profile" as const, label: "Réglages", icon: Settings, needsProfileId: false },
  ];
  const visibleItems = mentorMode ? items.filter((item) => item.label !== "Mentor") : items;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[414px] z-40 bg-white/95 backdrop-blur-md border-t border-ink/5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] px-2 flex flex-col justify-between shadow-xl rounded-t-[28px] transition-all"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-around w-full">
        {visibleItems.map(({ to, label, icon: Icon, needsProfileId }) => {
          const targetTo = needsProfileId && !profileId ? "/profiles" : to;
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
                  <div
                    className={`p-0.5 rounded-full transition-all ${isActive ? "ring-2 ring-brand rounded-full text-brand" : ""}`}
                  >
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

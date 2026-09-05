import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { session } = useSession();
  const navigate = useNavigate();

  if (!session) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email?.split("@")[0] ||
    "Mon compte";

  return (
    <nav className="border-b border-ink/5 bg-surface/90 backdrop-blur-md sticky top-0 z-50 transition-all shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to="/profiles"
          className="flex items-center gap-2 font-display text-balance text-2xl font-extrabold text-brand tracking-wider"
        >
          <img
            src="/favicon-96x96.png"
            alt="Logo Génizio"
            width="32"
            height="32"
            className="h-8 w-8"
          />
          GÉNIZIO
        </Link>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-ink/10 bg-white pl-2 pr-3 py-1.5 text-xs font-bold text-ink hover:bg-ink/5 focus:outline-none transition-colors">
              <div className="grid size-6 place-items-center rounded-full bg-brand/10 text-brand">
                <User className="size-3.5" />
              </div>
              <span className="max-w-[100px] sm:max-w-[150px] truncate">{displayName}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl">
              <Link to="/profile" className="w-full">
                <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-ink">
                  <Settings className="mr-2 size-4 text-ink/50" />
                  Paramètres
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <LogOut className="mr-2 size-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
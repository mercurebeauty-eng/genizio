import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Settings, LogOut, LayoutDashboard, Beaker, Users, Sparkles } from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!session) return null;

  return (
    <nav className="border-b border-ink/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/profiles" className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand tracking-wider">
          <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
          GÉNIZIO
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 text-sm font-bold md:flex">
          <Link to="/profiles" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Accueil
          </Link>
          <Link to="/laboratory" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Laboratoire
          </Link>
          <Link to="/feed" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Mur Public
          </Link>
          <Link to="/profiles/manage" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Gérer mes profils
          </Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 text-sm font-semibold md:flex">
          <Link
            to="/profile"
            className="flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-brand hover:bg-brand/10 transition-all"
            activeProps={{ className: "bg-brand text-white border-brand" }}
          >
            <Settings className="size-4" />
            {session.user.email?.split("@")[0]}
          </Link>
          <button
            onClick={signOut}
            className="rounded-full border border-ink/10 px-4 py-2 font-semibold hover:bg-white transition-all text-ink/75 hover:text-ink cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl p-2 text-ink/60 hover:bg-ink/5 md:hidden"
        >
          {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile navigation drawer */}
      {isOpen && (
        <div className="border-t border-ink/5 bg-white px-6 py-4 md:hidden space-y-4 animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-3">
            <Link
              to="/profiles"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <LayoutDashboard className="size-4" />
              Accueil
            </Link>
            <Link
              to="/laboratory"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <Beaker className="size-4" />
              Laboratoire
            </Link>
            <Link
              to="/feed"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <Sparkles className="size-4" />
              Mur Public
            </Link>
            <Link
              to="/profiles/manage"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <Users className="size-4" />
              Gérer mes profils
            </Link>
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <Settings className="size-4" />
              Mon Compte
            </Link>
          </div>
          <div className="pt-2 border-t border-ink/5">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

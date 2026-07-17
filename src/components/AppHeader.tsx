import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminStatus } from "@/lib/admin.functions";
import { Menu, X, Settings, LogOut, LayoutDashboard, Users, Brain, ShoppingBag, Eye, ChevronDown, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function AppHeader() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const checkAdmin = useServerFn(checkAdminStatus);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  useEffect(() => {
    if (!session) return;

    // Check admin status — server-side allowlist is the only source of truth.
    checkAdmin().then(({ isAdmin }) => setIsAdmin(isAdmin));

    // Check supervisor status
    supabase
      .from("supervisors")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_user_id", session.user.id)
      .then(({ count }) => {
        setIsSupervisor((count ?? 0) > 0);
      });
  }, [session]);

  if (!session) return null;


  return (
    <nav className="border-b-[3px] border-ink bg-surface sticky top-0 z-50">
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
          <Link to="/feed" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Mur Public
          </Link>
          <Link to="/boutique" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Boutique
          </Link>
          <Link to="/profiles/manage" className="text-ink/60 hover:text-brand transition-colors" activeProps={{ className: "text-brand" }}>
            Gérer mes profils
          </Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 text-sm font-semibold md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4.5 py-2 text-sm font-bold text-ink hover:bg-surface transition-all cursor-pointer shadow-brutal-sm">
                <Settings className="size-4 text-brand" />
                <span>{session.user.email?.split("@")[0]}</span>
                <ChevronDown className="size-3.5 text-ink/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[3px] border-ink rounded-2xl p-1.5 bg-white shadow-brutal mt-1">
              <DropdownMenuLabel className="font-display font-extrabold text-[10px] text-ink/50 uppercase tracking-widest px-2.5 py-1.5">
                Mon Espace
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-ink/75 hover:bg-surface cursor-pointer">
                  <Settings className="size-4 text-brand" />
                  <span>Mon Compte</span>
                </Link>
              </DropdownMenuItem>

              {(isSupervisor || isAdmin) && (
                <>
                  <DropdownMenuSeparator className="-mx-1.5 my-1.5 border-t-[2px] border-ink/10" />
                  <DropdownMenuLabel className="font-display font-extrabold text-[10px] text-ink/50 uppercase tracking-widest px-2.5 py-1.5">
                    Accompagnant & Pro
                  </DropdownMenuLabel>
                  {isSupervisor && (
                    <DropdownMenuItem asChild>
                      <Link to="/supervisor" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-brand hover:bg-brand/5 cursor-pointer">
                        <Eye className="size-4" />
                        <span>Superviseur</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                   {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-purple-600 hover:bg-purple-50 cursor-pointer">
                          <LayoutDashboard className="size-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/products" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-purple-600 hover:bg-purple-50 cursor-pointer">
                          <ShoppingBag className="size-4" />
                          <span>Admin Kits</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/supervisors" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-purple-600 hover:bg-purple-50 cursor-pointer">
                          <Users className="size-4" />
                          <span>Admin Superviseurs</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}

              <DropdownMenuSeparator className="-mx-1.5 my-1.5 border-t-[2px] border-ink/10" />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-50 cursor-pointer">
                <LogOut className="size-4" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              to="/feed"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <Brain className="size-4" />
              Mur Public
            </Link>
            <Link
              to="/boutique"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-surface"
              activeProps={{ className: "bg-brand/5 text-brand" }}
            >
              <ShoppingBag className="size-4" />
              Boutique
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
            {(isSupervisor || isAdmin) && (
              <div className="border-t border-ink/10 my-1 pt-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 px-4 mb-1.5">
                  Accompagnant & Pro
                </p>
                {isSupervisor && (
                  <Link
                    to="/supervisor"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-brand hover:bg-brand/5"
                    activeProps={{ className: "bg-brand/5 text-brand" }}
                  >
                    <Eye className="size-4" />
                    Superviseur
                  </Link>
                )}
                 {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50"
                      activeProps={{ className: "bg-purple-50 text-purple-600" }}
                    >
                      <LayoutDashboard className="size-4" />
                      Admin Dashboard
                    </Link>
                    <Link
                      to="/admin/products"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50"
                      activeProps={{ className: "bg-purple-50 text-purple-600" }}
                    >
                      <ShoppingBag className="size-4" />
                      Admin Kits
                    </Link>
                    <Link
                      to="/admin/supervisors"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50"
                      activeProps={{ className: "bg-purple-50 text-purple-600" }}
                    >
                      <Users className="size-4" />
                      Admin Superviseurs
                    </Link>
                  </>
                )}
              </div>
            )}

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

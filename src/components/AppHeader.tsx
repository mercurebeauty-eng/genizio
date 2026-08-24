import { Link } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";

export function AppHeader() {
  const { session } = useSession();

  if (!session) return null;

  return (
    <nav className="border-b border-ink/5 bg-surface/90 backdrop-blur-md sticky top-0 z-50 transition-all shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
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
      </div>
    </nav>
  );
}

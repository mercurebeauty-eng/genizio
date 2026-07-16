import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { NayaAvatar } from "@/components/NayaAvatar";
import { getActiveChallenge, ChallengeLike } from "@/lib/active-challenge";
import { ArrowLeft, Play } from "lucide-react";

export const Route = createFileRoute("/profiles/$profileId/quest")({
  component: QuestPage,
});

type Child = {
  id: string;
  name: string;
  avatar_color: string;
};

type Challenge = ChallengeLike & {
  title: string;
  description: string;
  domain: string;
};

function QuestPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    async function load() {
      setFetching(true);
      const [c, ch] = await Promise.all([
        supabase.from("child_profiles").select("id, name, avatar_color").eq("id", profileId).maybeSingle(),
        supabase.from("challenges").select("*").eq("child_id", profileId)
      ]);
      setChild((c.data as Child) ?? null);
      if (ch.data) {
        setActiveChallenge(getActiveChallenge(ch.data as Challenge[]));
      }
      setFetching(false);
    }
    void load();
  }, [session, profileId]);

  if (loading || fetching || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand text-white">
        <p className="font-bold">Chargement...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand text-white">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/" className="underline text-sm opacity-80 hover:opacity-100">Retour</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/5 to-white flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none"></div>

      <header className="p-6 relative z-10 flex justify-end">
        <Link 
          to="/profiles/$profileId/challenges" 
          params={{ profileId }} 
          className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-4 py-2 text-sm font-bold text-ink/40 hover:text-ink/80 hover:bg-white shadow-sm border border-ink/5 transition-all"
        >
          <ArrowLeft className="size-4" />
          Retour parent
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full relative z-10 text-center">
        <NayaAvatar size="lg" className="mb-8" thoughts={["Prêt(e) ?"]} />
        
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink mb-2">
          Salut {child.name} !
        </h1>
        <p className="text-lg text-ink/60 font-semibold mb-10">
          Prêt(e) pour ta mission du jour ?
        </p>

        {activeChallenge ? (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-brand/10 w-full animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-sky to-leaf"></div>
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand mb-4">
              Mission : {activeChallenge.domain}
            </span>
            <h2 className="font-display text-2xl font-extrabold text-ink leading-tight mb-4">
              {activeChallenge.title}
            </h2>
            <p className="text-ink/70 leading-relaxed mb-8">
              {activeChallenge.description}
            </p>
            <Link
              to="/profiles/$profileId/challenges"
              params={{ profileId }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark hover:-translate-y-0.5 transition-all"
            >
              <Play className="size-5 fill-current" />
              Commencer la mission
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-soft border border-ink/5 w-full">
            <p className="text-ink/60 text-lg font-semibold">
              Tu n'as pas de mission en cours pour le moment ! Demande à tes parents de t'en confier une.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

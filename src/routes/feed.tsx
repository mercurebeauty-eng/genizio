import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

const MOCK_FEED = [
  {
    id: "1",
    childName: "Léo",
    avatarColor: "bg-sky",
    missionTitle: "Construire un pont en carton",
    description: "Léo a réussi à faire tenir 1,5 kg sur son pont ! Il a utilisé une structure en triangle très astucieuse.",
    date: "Il y a 2 heures",
    likes: 12,
    badge: "🏆 Ingénieur en Herbe",
    image: "https://images.unsplash.com/photo-1584483758362-e64e9e51c86d?w=500&q=80",
  },
  {
    id: "2",
    childName: "Mia",
    avatarColor: "bg-leaf",
    missionTitle: "Teste 3 types de terre",
    description: "La graine plantée dans le terreau avec compost a poussé 2x plus vite que celle dans le sable.",
    date: "Hier",
    likes: 8,
    badge: "🌱 Main Verte",
    image: "https://images.unsplash.com/photo-1599940778173-e276d4acb2bb?w=500&q=80",
  },
];

function FeedPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session) {
      const fetchFeed = async () => {
        setFetching(true);
        // We fetch completed challenges for the current user's children
        // In a real app with friends, this would fetch from a wider pool, but for now we fetch the user's completed challenges.
        const { data, error } = await supabase
          .from("challenges")
          .select("*, child_profiles(name, avatar_color)")
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching feed:", error);
        } else {
          setFeedItems(data || []);
        }
        setFetching(false);
      };
      void fetchFeed();
    }
  }, [session]);

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-surface p-6 font-sans text-ink">
      <header className="mx-auto mb-8 max-w-2xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand">Mur de Célébration</h1>
          <p className="mt-2 text-ink/70">
            Découvrez les réalisations de vos enfants et célébrez leurs nouveaux talents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/profiles"
            className="rounded-full bg-white px-4 py-2 font-medium text-ink shadow-sm ring-1 ring-ink/10 hover:bg-surface/50"
          >
            Mes Enfants
          </Link>
          <Link
            to="/laboratory"
            className="rounded-full bg-white px-4 py-2 font-medium text-ink shadow-sm ring-1 ring-ink/10 hover:bg-surface/50"
          >
            Le Labo
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center rounded-full border border-brand/20 bg-brand/5 p-2 font-bold text-brand hover:bg-brand/10 transition-all"
            aria-label="Mon Compte"
          >
            ⚙️
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8">
        {fetching ? (
          <p className="text-center text-ink/50 py-10">Chargement des exploits...</p>
        ) : feedItems.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-12 text-center">
            <p className="text-ink/60">Aucun défi complété pour l'instant. Direction le Labo !</p>
          </div>
        ) : (
          feedItems.map((item) => {
            const childName = item.child_profiles?.name || "Enfant";
            const avatarColor = item.child_profiles?.avatar_color || "brand";
            
            // Generate a color class for the avatar
            let bgClass = "bg-brand";
            if (avatarColor === "leaf") bgClass = "bg-leaf";
            if (avatarColor === "sky") bgClass = "bg-sky";
            if (avatarColor === "ink") bgClass = "bg-ink";

            const date = item.completed_at
              ? new Date(item.completed_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "Récemment";

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink/5"
              >
                <div className="flex items-center gap-4 p-6 pb-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white text-xl font-bold ${bgClass}`}
                  >
                    {childName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">{childName}</h3>
                    <p className="text-sm text-ink/50">{date}</p>
                  </div>
                  {item.domain && (
                    <div className="ml-auto rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand uppercase tracking-wider">
                      {item.domain}
                    </div>
                  )}
                </div>

                <div className="px-6 pb-4">
                  <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-2">
                    Mission : {item.title}
                  </p>
                  {item.ai_observations && (
                    <p className="text-ink/80 leading-relaxed mb-4 italic border-l-2 border-brand/20 pl-3">
                      " {item.ai_observations} " - Naya
                    </p>
                  )}
                  {item.proof_image_url && (
                    <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-surface">
                      <img
                        src={item.proof_image_url}
                        alt="Preuve"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 p-4 px-6 border-t border-ink/5 bg-surface/30">
                  <button className="flex items-center gap-2 text-ink/60 hover:text-brand transition-colors font-medium mr-auto">
                    <span className="text-xl">✨</span> Bravo
                  </button>
                  {item.target_intelligences && item.target_intelligences.map((intelligence: string) => (
                    <span key={intelligence} className="rounded-full bg-brand/5 px-2 py-1 text-[10px] font-bold text-brand uppercase">
                      +{intelligence}
                    </span>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

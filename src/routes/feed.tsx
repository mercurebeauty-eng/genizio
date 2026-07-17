import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { Heart, MessageCircle, Send, MoreHorizontal, Plus, Loader2 } from "lucide-react";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

// Simulated public feed posts to give the "Instagram" feel
const MOCK_PUBLIC_POSTS = [
  {
    id: "pub-1",
    childName: "Léo",
    familyName: "Famille Martin",
    avatarColor: "bg-sky",
    missionTitle: "Construire un pont en carton",
    description: "Léo a réussi à faire tenir 1,5 kg sur son pont ! Il a utilisé une structure en triangle très astucieuse. Trop fier de lui ! 🏗️",
    date: "Il y a 2 heures",
    likes: 124,
    badge: "🏆 Ingénieur en Herbe",
    image: "https://images.unsplash.com/photo-1584483758362-e64e9e51c86d?w=800&q=80",
    isLiked: false,
    aiTalentTag: "Naya détecte une forte intelligence spatiale et créative dans cette magnifique construction !",
  },
  {
    id: "pub-2",
    childName: "Mia",
    familyName: "Famille Dubois",
    avatarColor: "bg-leaf",
    missionTitle: "Teste 3 types de terre",
    description: "La graine plantée dans le terreau avec compost a poussé 2x plus vite que celle dans le sable. Expérience botanique validée ! 🌿",
    date: "Hier",
    likes: 89,
    badge: "🌱 Main Verte",
    image: "https://images.unsplash.com/photo-1599940778173-e276d4acb2bb?w=800&q=80",
    isLiked: true,
    aiTalentTag: "L'intelligence naturaliste et logique de Mia est particulièrement sollicitée ici !",
  },
  {
    id: "pub-3",
    childName: "Noah",
    familyName: "Famille Petit",
    avatarColor: "bg-amber-500",
    missionTitle: "Atelier Peinture Naturelle",
    description: "On a fabriqué de la peinture avec du chou rouge et du citron. Les couleurs sont incroyables ! 🎨",
    date: "Il y a 3 jours",
    likes: 245,
    badge: "🎨 Artiste",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
    isLiked: false,
    aiTalentTag: null,
  }
];

// Simulated Stories
const STORIES = [
  { id: 1, name: "Léo", image: "https://images.unsplash.com/photo-1584483758362-e64e9e51c86d?w=100&q=80", hasUnseen: true },
  { id: 2, name: "Mia", image: "https://images.unsplash.com/photo-1599940778173-e276d4acb2bb?w=100&q=80", hasUnseen: true },
  { id: 3, name: "Noah", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=100&q=80", hasUnseen: false },
  { id: 4, name: "Emma", image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=100&q=80", hasUnseen: true },
  { id: 5, name: "Lucas", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&q=80", hasUnseen: false },
];

function FeedPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<any[]>([...MOCK_PUBLIC_POSTS]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session) {
      const fetchFeed = async () => {
        setFetching(true);
        // Fetch real community posts from the database
        const { data, error } = await supabase
          .from("posts")
          .select("*, child_profiles(name, avatar_color)")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          const userPosts = data.map(item => ({
            id: item.id,
            childName: item.child_profiles?.name || "Enfant",
            familyName: "Votre Famille",
            avatarColor: item.child_profiles?.avatar_color === "leaf" ? "bg-leaf" : item.child_profiles?.avatar_color === "sky" ? "bg-sky" : "bg-brand",
            missionTitle: "Mission", // We don't join challenges title yet, we can just say "Mission Accomplie"
            description: item.caption,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Récemment",
            likes: item.likes_count || 0,
            badge: "⭐ Exploit",
            image: item.image_url,
            isLiked: false,
            aiTalentTag: item.ai_talent_tag,
          }));
          
          setFeedItems([...userPosts, ...MOCK_PUBLIC_POSTS]);
        }
        setFetching(false);
      };
      void fetchFeed();
    }
  }, [session]);

  const handleLike = (id: string) => {
    setFeedItems(items => items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          isLiked: !item.isLiked,
          likes: item.isLiked ? item.likes - 1 : item.likes + 1
        };
      }
      return item;
    }));
  };

  const handlePostCreated = (newPost: any) => {
    setFeedItems(prev => [newPost, ...prev]);
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-surface pb-10 font-sans text-ink">
      <AppHeader />
      {/* Genizio Instagram-like Header */}
      <header className="sticky top-0 z-40 bg-surface border-b-[3px] border-ink px-4 h-16 flex items-center justify-between">
        <h1 className="font-display text-2xl font-black tracking-tight text-brand">Mur Public</h1>
        <div className="flex items-center gap-3">
          <CreatePostModal onPostCreated={handlePostCreated} />
        </div>
      </header>

      <main className="mx-auto max-w-lg pt-4">
        {/* Stories Bar */}
        <div className="px-2 mb-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
            {/* My Story (Add) */}
            <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
              <div className="relative size-16 rounded-full border-[3px] border-ink bg-white shadow-brutal-sm overflow-hidden group-hover:-translate-y-0.5 transition-all">
                <div className="absolute inset-0 flex items-center justify-center bg-brand/10">
                  <Plus className="size-6 text-brand" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-ink">Votre story</span>
            </div>
            
            {/* Community Stories */}
            {STORIES.map(story => (
              <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
                <div className={`relative size-16 rounded-full border-[3px] border-ink overflow-hidden shadow-brutal-sm group-hover:-translate-y-0.5 transition-all ${story.hasUnseen ? "bg-brand" : "bg-white"} p-0.5`}>
                  <div className="size-full rounded-full overflow-hidden bg-white border border-ink">
                    <img src={story.image} alt={story.name} className="size-full object-cover" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-ink">{story.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6">
          {fetching ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
          ) : feedItems.length === 0 ? (
            <div className="px-4">
              <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-12 text-center shadow-brutal-sm">
                <p className="text-ink font-bold">Aucune publication pour l'instant.</p>
              </div>
            </div>
          ) : (
            feedItems.map((post) => (
              <article key={post.id} className="bg-white border-y-[3px] sm:border-[3px] sm:rounded-3xl border-ink sm:shadow-brutal overflow-hidden">
                {/* Post Header */}
                <div className="flex items-center justify-between p-4 border-b-[3px] border-ink bg-leaf/10">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-2xl border-[3px] border-ink text-white font-black shadow-brutal-sm ${post.avatarColor}`}>
                      {post.childName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-ink leading-tight flex items-center gap-1">
                        {post.childName}
                        <span className="text-[10px] font-bold text-ink/60 uppercase tracking-widest ml-1">• {post.familyName}</span>
                      </h3>
                      <p className="text-[11px] font-bold text-ink/60 mt-0.5">{post.missionTitle}</p>
                    </div>
                  </div>
                  <button className="p-2 text-ink/40 hover:text-ink transition-colors border-2 border-transparent hover:border-ink rounded-xl">
                    <MoreHorizontal className="size-5" />
                  </button>
                </div>

                {/* Media Full Bleed */}
                <div className="aspect-[4/5] w-full bg-surface relative border-b-[3px] border-ink">
                  <img src={post.image} alt="Post" className="h-full w-full object-cover" />
                  <div className="absolute top-4 right-4 rounded-full border-2 border-ink bg-white px-3 py-1 text-[10px] font-black text-ink uppercase tracking-wider shadow-brutal-sm">
                    {post.badge}
                  </div>
                </div>

                {/* Interaction Bar */}
                <div className="p-4 pb-2 flex items-center gap-4">
                  <button onClick={() => handleLike(post.id)} className="group transition-transform active:scale-90 cursor-pointer">
                    {post.isLiked ? (
                      <span className="text-2xl hover:scale-105 transition-transform block">🙌</span>
                    ) : (
                      <span className="text-2xl grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all block">🙌</span>
                    )}
                  </button>
                  <button className="group transition-transform active:scale-90 cursor-pointer">
                    <MessageCircle className="size-7 text-ink hover:text-ink/70 group-hover:scale-105" />
                  </button>
                  <button className="group transition-transform active:scale-90 cursor-pointer">
                    <Send className="size-7 text-ink hover:text-ink/70 group-hover:scale-105" />
                  </button>
                </div>

                {/* Likes & Caption */}
                <div className="px-4 pb-4">
                  <p className="text-sm font-black text-ink mb-2">{post.likes.toLocaleString()} High-Fives</p>
                  
                  {post.aiTalentTag && (
                    <div className="mb-3 rounded-2xl border-[3px] border-ink bg-sky p-3 shadow-brutal-sm flex items-start gap-2">
                      <span className="text-lg leading-none shrink-0">✨</span>
                      <p className="text-[13px] font-bold text-ink italic leading-relaxed">
                        "{post.aiTalentTag}"
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-ink">
                    <span className="font-bold mr-2">{post.childName}</span>
                    <span className="text-ink/90">{post.description}</span>
                  </p>
                  <p className="text-[11px] text-ink/40 mt-3 font-medium uppercase tracking-wide">{post.date}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

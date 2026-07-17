import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { MessageCircle, Send, MoreHorizontal, Loader2 } from "lucide-react";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

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
            avatarColor: item.child_profiles?.avatar_color === "leaf" ? "bg-leaf" : item.child_profiles?.avatar_color === "sky" ? "bg-sky" : "bg-brand",
            description: item.caption,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Récemment",
            likes: item.likes_count || 0,
            badge: "⭐ Exploit",
            image: item.image_url,
            isLiked: false,
            aiTalentTag: item.ai_talent_tag,
          }));

          setFeedItems(userPosts);
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
                      <h3 className="text-sm font-black text-ink leading-tight">
                        {post.childName}
                      </h3>
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

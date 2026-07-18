import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { MessageCircle, Send, MoreHorizontal, Loader2, Trash2 } from "lucide-react";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

function FeedPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [fetchingComments, setFetchingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

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
            parentId: item.parent_id,
            childName: item.child_profiles?.name || "Enfant",
            avatarColor: item.child_profiles?.avatar_color === "leaf" ? "bg-leaf" : item.child_profiles?.avatar_color === "sky" ? "bg-sky" : "bg-brand",
            description: item.caption,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Récemment",
            likes: item.likes_count || 0,
            badge: "⭐ Exploit",
            image: item.image_url,
            aiTalentTag: item.ai_talent_tag,
          }));

          setFeedItems(userPosts);

          const postIds = userPosts.map((p) => p.id);
          if (postIds.length > 0) {
            const { data: myLikes } = await supabase
              .from("post_likes")
              .select("post_id")
              .eq("user_id", session.user.id)
              .in("post_id", postIds);
            setLikedPostIds(new Set((myLikes ?? []).map((l) => l.post_id)));
          }
        }
        setFetching(false);
      };
      void fetchFeed();
    }
  }, [session]);

  const handleLike = async (id: string) => {
    if (!session || pendingLikes.has(id)) return;
    const alreadyLiked = likedPostIds.has(id);

    setPendingLikes((prev) => new Set(prev).add(id));
    // Optimistic update
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(id); else next.add(id);
      return next;
    });
    setFeedItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, likes: item.likes + (alreadyLiked ? -1 : 1) } : item
      )
    );

    if (alreadyLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", session.user.id);
      if (error) {
        toast.error("Erreur lors du retrait du High-Five.");
        setLikedPostIds((prev) => new Set(prev).add(id));
        setFeedItems((items) => items.map((item) => (item.id === id ? { ...item, likes: item.likes + 1 } : item)));
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: id, user_id: session.user.id });
      if (error) {
        toast.error("Erreur lors du High-Five.");
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setFeedItems((items) => items.map((item) => (item.id === id ? { ...item, likes: item.likes - 1 } : item)));
      }
    }

    setPendingLikes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleComments = async (postId: string) => {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null);
      return;
    }
    setOpenCommentsFor(postId);
    setCommentDraft("");
    if (!commentsByPost[postId]) {
      setFetchingComments(true);
      const { data } = await supabase
        .from("comments")
        .select("id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      setCommentsByPost((prev) => ({ ...prev, [postId]: (data as Comment[]) ?? [] }));
      setFetchingComments(false);
    }
  };

  const submitComment = async (postId: string) => {
    if (!session || !commentDraft.trim()) return;
    setPostingComment(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: session.user.id, body: commentDraft.trim() })
      .select("id, user_id, body, created_at")
      .single();
    setPostingComment(false);
    if (error) {
      toast.error("Erreur lors de l'envoi du commentaire.");
      return;
    }
    setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), data as Comment] }));
    setCommentDraft("");
  };

  const deleteComment = async (postId: string, commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      toast.error("Erreur lors de la suppression.");
      return;
    }
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
    }));
  };

  const deletePost = async (post: any) => {
    if (!(await confirmDialog({
      title: "Supprimer cette publication ?",
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    }))) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Erreur lors de la suppression de la publication.");
      return;
    }
    setFeedItems((items) => items.filter((item) => item.id !== post.id));
    toast.success("Publication supprimée.");
  };

  const handleShare = async (post: any) => {
    try {
      await navigator.clipboard.writeText(post.image);
      toast.success("Lien de la photo copié !");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
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
            feedItems.map((post) => {
              const isLiked = likedPostIds.has(post.id);
              const commentsOpen = openCommentsFor === post.id;
              const comments = commentsByPost[post.id] ?? [];
              return (
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
                    {post.parentId === session.user.id && (
                      <button
                        onClick={() => deletePost(post)}
                        aria-label="Supprimer la publication"
                        title="Supprimer la publication"
                        className="p-2 text-ink/60 hover:text-red-600 transition-colors border-2 border-transparent hover:border-ink rounded-xl cursor-pointer"
                      >
                        <MoreHorizontal className="size-5" />
                      </button>
                    )}
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
                    <button onClick={() => handleLike(post.id)} disabled={pendingLikes.has(post.id)} className="group transition-transform active:scale-90 cursor-pointer disabled:opacity-70">
                      {isLiked ? (
                        <span className="text-2xl hover:scale-105 transition-transform block">🙌</span>
                      ) : (
                        <span className="text-2xl grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all block">🙌</span>
                      )}
                    </button>
                    <button onClick={() => toggleComments(post.id)} className="group transition-transform active:scale-90 cursor-pointer">
                      <MessageCircle className={`size-7 group-hover:scale-105 ${commentsOpen ? "text-brand" : "text-ink hover:text-ink/70"}`} />
                    </button>
                    <button onClick={() => handleShare(post)} className="group transition-transform active:scale-90 cursor-pointer">
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
                    <p className="text-[11px] text-ink/60 mt-3 font-medium uppercase tracking-wide">{post.date}</p>

                    {commentsOpen && (
                      <div className="mt-4 border-t-2 border-ink/10 pt-3 space-y-3">
                        {fetchingComments && comments.length === 0 ? (
                          <div className="flex justify-center py-3">
                            <Loader2 className="size-4 animate-spin text-brand" />
                          </div>
                        ) : comments.length === 0 ? (
                          <p className="text-xs text-ink/60">Aucun commentaire pour l'instant.</p>
                        ) : (
                          comments.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                              <p className="text-ink/80">
                                <span className="font-bold text-ink mr-1.5">
                                  {c.user_id === session.user.id ? "Vous" : "Un parent"}
                                </span>
                                {c.body}
                                <span className="ml-2 text-[10px] font-medium text-ink/30 uppercase tracking-wide">
                                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                                </span>
                              </p>
                              {c.user_id === session.user.id && (
                                <button
                                  onClick={() => deleteComment(post.id, c.id)}
                                  className="shrink-0 text-ink/30 hover:text-red-600 transition-colors"
                                  aria-label="Supprimer le commentaire"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submitComment(post.id); }}
                            placeholder="Ajouter un commentaire..."
                            maxLength={500}
                            className="flex-1 rounded-xl border-2 border-ink px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={postingComment || !commentDraft.trim()}
                            className="rounded-xl border-2 border-ink bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {postingComment ? <Loader2 className="size-3.5 animate-spin" /> : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

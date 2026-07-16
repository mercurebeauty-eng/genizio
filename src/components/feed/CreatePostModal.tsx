import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Loader2, X, ChevronDown } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePostModalProps {
  onPostCreated: (post: any) => void;
}

export function CreatePostModal({ onPostCreated }: CreatePostModalProps) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");

  useEffect(() => {
    if (open && session) {
      // Fetch completed challenges to link to the post
      const fetchChallenges = async () => {
        const { data, error } = await supabase
          .from("challenges")
          .select("id, title, domain, child_id, child_profiles(id, name, avatar_color)")
          .eq("status", "completed");
          
        if (!error && data) {
          setChallenges(data);
          if (data.length > 0) {
            setSelectedChallengeId(data[0].id);
          }
        }
      };
      void fetchChallenges();
    }
  }, [open, session]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload with local object URL
    const url = URL.createObjectURL(file);
    setPreview(url);
    setFileToUpload(file);
  };

  const handlePost = async () => {
    if (!preview) {
      toast.error("Veuillez sélectionner une image pour votre post.");
      return;
    }
    
    if (!selectedChallengeId) {
      toast.error("Veuillez sélectionner une mission à lier.");
      return;
    }

    const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);
    if (!selectedChallenge) return;

    setLoading(true);

    try {
      // 1. Upload image to Supabase Storage
      const fileExt = fileToUpload?.name.split('.').pop() || 'png';
      const fileName = `${session?.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, fileToUpload!);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      // 3. Insert into posts table
      const { data: newPostData, error: insertError } = await supabase
        .from('posts')
        .insert({
          parent_id: session?.user.id,
          child_profile_id: selectedChallenge.child_profiles?.id, // Wait, challenges query gives child_profiles(name, avatar_color) but not child_profile_id easily unless selectedChallenge has it
          image_url: publicUrl,
          caption: caption || "",
          likes_count: 0
        })
        .select('*, child_profiles(name, avatar_color)')
        .single();

      if (insertError) throw insertError;

      const newPost = {
        id: newPostData.id,
        childName: newPostData.child_profiles?.name || "Enfant",
        familyName: "Votre Famille",
        avatarColor: newPostData.child_profiles?.avatar_color === "leaf" ? "bg-leaf" : newPostData.child_profiles?.avatar_color === "sky" ? "bg-sky" : "bg-brand",
        missionTitle: selectedChallenge.title,
        description: newPostData.caption ?? "",
        date: "À l'instant",
        likes: newPostData.likes_count,
        badge: selectedChallenge.domain || "⭐ Exploit",
        image: newPostData.image_url,
        isLiked: false,
      };

      onPostCreated(newPost);
      toast.success("Post publié avec succès !");
      setOpen(false);
      setCaption("");
      setPreview(null);
      setFileToUpload(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la publication : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark transition-all border-b-4 border-brand-dark active:border-b-0 active:translate-y-[4px] shadow-sm">
          <Plus className="size-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-black text-ink">Créer un post public</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Challenge Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink/60 uppercase tracking-wider">Mission liée</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-ink/10 bg-surface/50 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-brand transition-all cursor-pointer"
                value={selectedChallengeId}
                onChange={(e) => setSelectedChallengeId(e.target.value)}
              >
                {challenges.length === 0 && <option value="" disabled>Aucune mission complétée trouvée</option>}
                {challenges.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.child_profiles?.name} - {c.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/40">
                <ChevronDown className="size-4" />
              </div>
            </div>
          </div>

          {/* Image Upload Area */}
          {!preview ? (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-ink/20 bg-surface hover:bg-ink/5 hover:border-brand/50 transition-all">
              <div className="rounded-full bg-brand/10 p-4">
                <ImageIcon className="size-8 text-brand" />
              </div>
              <div className="text-center">
                <p className="font-bold text-ink">Ajouter une photo</p>
                <p className="text-xs text-ink/50 mt-1">PNG, JPG jusqu'à 5MB</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          ) : (
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface">
              <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
              <button
                onClick={() => setPreview(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 backdrop-blur-sm transition-all"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Caption */}
          <div>
            <textarea
              placeholder="Racontez l'exploit de votre enfant à la communauté..."
              className="w-full min-h-[100px] resize-none rounded-xl border border-ink/10 bg-surface/50 p-4 text-sm font-medium text-ink outline-none focus:border-brand transition-all placeholder:text-ink/40"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <button
            onClick={handlePost}
            disabled={loading || !preview || !selectedChallengeId}
            className="w-full rounded-2xl bg-brand border-b-4 border-brand-dark py-4 text-base font-black text-white active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Publier l'exploit"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

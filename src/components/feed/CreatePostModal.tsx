import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Loader2, X, ChevronDown } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { analyzePostProof } from "@/lib/challenges.functions";
import { useServerFn } from "@tanstack/react-start";

interface CreatePostModalProps {
  onPostCreated?: (post: any) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialChallengeId?: string;
  initialImageUrl?: string;
}

export function CreatePostModal({ 
  onPostCreated, 
  isOpen, 
  onOpenChange, 
  initialChallengeId,
  initialImageUrl 
}: CreatePostModalProps) {
  const { session } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(initialImageUrl || null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(initialChallengeId || "");
  const [loadingText, setLoadingText] = useState("");

  const analyzeAction = useServerFn(analyzePostProof);

  useEffect(() => {
    if (open && session) {
      // Fetch completed challenges to link to the post
      const fetchChallenges = async () => {
        const { data, error } = await supabase
          .from("challenges")
          .select("id, title, domain, child_id, child_profiles(id, name, avatar_color)")
          .eq("status", "completed")
          .eq("user_id", session.user.id);
          
        if (!error && data) {
          setChallenges(data);
          if (data.length > 0 && !selectedChallengeId) {
            setSelectedChallengeId(data[0].id);
          }
        }
      };
      void fetchChallenges();
    }
  }, [open, session]);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Format non supporté — utilisez une image PNG, JPG, WEBP ou GIF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image trop volumineuse (5MB maximum).");
      e.target.value = "";
      return;
    }

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
    if (!session) return;

    setLoading(true);
    setLoadingText("Téléchargement de l'image...");

    try {
      let publicUrl = preview;
      
      if (fileToUpload) {
        setLoadingText("Téléchargement de l'image...");
        const fileExt = fileToUpload.name.split('.').pop() || 'png';
        const fileName = `${session?.user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);
          
        publicUrl = publicUrlData.publicUrl;
      }

      if (!publicUrl) throw new Error("Image manquante");

      // 3. AI Analysis
      setLoadingText("Analyse de la photo par Naya...");
      let aiAnalysisTag = null;
      try {
        aiAnalysisTag = await analyzeAction({
          data: {
            imageUrl: publicUrl,
            domain: selectedChallenge.domain
          }
        });
      } catch (aiErr) {
        console.error("AI Analysis failed", aiErr);
        toast.warning("Naya n'a pas pu analyser la photo — la publication continue sans son commentaire.");
      }

      // 4. Insert into posts table
      setLoadingText("Publication en cours...");
      const { data: newPostData, error: insertError } = await supabase
        .from('posts')
        .insert({
          parent_id: session.user.id,
          child_profile_id: selectedChallenge.child_profiles?.id,
          image_url: publicUrl,
          caption: caption || "",
          likes_count: 0,
          ai_talent_tag: aiAnalysisTag
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
        aiTalentTag: newPostData.ai_talent_tag
      };

      if (onPostCreated) onPostCreated(newPost);
      toast.success("Post publié avec succès !");
      handleOpenChange(false);
      setCaption("");
      if (!initialImageUrl) setPreview(null);
      setFileToUpload(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la publication : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isOpen === undefined && (
        <DialogTrigger asChild>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-ink bg-brand text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all">
            <Plus className="size-6" />
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-[3px] border-ink shadow-brutal">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-black text-ink">Publier dans le Cerveau Collectif</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Challenge Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink/60 uppercase tracking-wider">Mission liée</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border-[3px] border-ink bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand transition-all cursor-pointer shadow-brutal-sm"
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
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-[3px] border-dashed border-ink bg-white/50 shadow-brutal-sm hover:-translate-y-0.5 transition-all">
              <div className="rounded-full border-2 border-ink bg-brand/10 p-4">
                <ImageIcon className="size-8 text-brand" />
              </div>
              <div className="text-center">
                <p className="font-bold text-ink">Ajouter une photo</p>
                <p className="text-xs text-ink/50 mt-1">PNG, JPG jusqu'à 5MB</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          ) : (
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-surface">
              <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
              <button
                onClick={() => setPreview(null)}
                className="absolute right-3 top-3 rounded-full border-2 border-white bg-black/50 p-2 text-white hover:bg-black/70 backdrop-blur-sm transition-all"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div>
            <textarea
              placeholder="Racontez l'exploit de votre enfant à la communauté..."
              className="w-full min-h-[100px] resize-none rounded-xl border-[3px] border-ink bg-white p-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand transition-all placeholder:text-ink/40 shadow-brutal-sm"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <button
            onClick={handlePost}
            disabled={loading || !preview || !selectedChallengeId}
            className="w-full rounded-2xl border-[3px] border-ink bg-brand py-4 text-base font-black text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>{loadingText || "Publication..."}</span>
              </>
            ) : (
              "Publier l'exploit"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

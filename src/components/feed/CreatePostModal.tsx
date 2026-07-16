import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useSession } from "@/hooks/use-session";
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload with local object URL
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handlePost = async () => {
    if (!preview) {
      toast.error("Veuillez sélectionner une image pour votre post.");
      return;
    }

    setLoading(true);
    // Simuler le délai réseau
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newPost = {
      id: "local-" + Date.now(),
      childName: "Votre Enfant",
      avatarColor: "bg-brand",
      missionTitle: "Publication Libre",
      description: caption || "Une nouvelle découverte géniale !",
      date: "À l'instant",
      likes: 0,
      badge: "⭐ Nouvel Exploit",
      image: preview,
      isLiked: false,
    };

    onPostCreated(newPost);
    toast.success("Post publié avec succès !");
    setLoading(false);
    setOpen(false);
    setCaption("");
    setPreview(null);
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
            disabled={loading || !preview}
            className="w-full rounded-2xl bg-brand border-b-4 border-brand-dark py-4 text-base font-black text-white active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Publier"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

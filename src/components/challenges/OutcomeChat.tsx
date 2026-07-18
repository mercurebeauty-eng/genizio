import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateChallengeProof } from "@/lib/challenges.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { Loader2, Upload, Check, X, Play, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { MarkdownContent } from "@/components/ui/markdown-content";

type Challenge = {
  id: string;
  domain: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed";
};

// Reads a File as base64 in the browser and sends the bytes directly to the
// server — no Supabase Storage upload happens until after the AI confirms
// the photo is actually relevant (see validateChallengeProof), instead of
// uploading on every attempt regardless of outcome.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type OutcomeChatProps = {
  challenge: Challenge;
  childName: string;
  // The parent's "Journal d'apprentissage" notes just above this card — reused
  // as the proof text instead of a separate 3-question interview, which asked
  // for the same information a second time and gated the photo step behind it.
  notes: string;
  // The Journal's own textarea only persists on its separate "Enregistrer les
  // notes" button — without also saving here, the exact text the AI analyzed
  // could be lost on reload (never written to the DB) even though Naya just
  // used it. Persist it alongside submission instead of relying on the parent
  // having clicked that other button first.
  onSaveNotes: (n: string) => void;
  onValidated: () => void;
};

export function OutcomeChat({ challenge, childName, notes = "", onSaveNotes, onValidated }: OutcomeChatProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [report, setReport] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const validateAI = useServerFn(validateChallengeProof);

  const canSubmit = !!notes.trim() || !!selectedFile;

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      const trimmedNotes = notes.trim();
      if (trimmedNotes) onSaveNotes(trimmedNotes);

      const file = selectedFile;
      const proofImageBase64 = file ? await fileToBase64(file) : undefined;

      const result = await validateAI({
        data: {
          id: challenge.id,
          proofText: trimmedNotes.slice(0, 2000),
          proofImageBase64,
          proofImageMediaType: file?.type,
        },
      });
      setReport(result);
      if (file && !result.imageAnalyzed) {
        toast.warning("Naya n'a pas pu analyser la photo — son observation se base uniquement sur vos notes.");
      }
      toast.success("Analyse terminée !");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="rounded-3xl border-[3px] border-ink bg-sky p-6 mt-5 relative overflow-hidden shadow-brutal">
      {report ? (
        <div className="animate-in zoom-in-95 duration-500">
          <div className="absolute -top-10 -right-10 size-40 bg-brand/10 rounded-full blur-3xl"></div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-brand/10 rounded-full mb-3">
              <Sparkles className="size-8 text-brand" />
            </div>
            <h3 className="text-xl font-black text-ink">Bulletin de Découverte</h3>
            <p className="text-sm font-semibold text-ink/60">Analyse de Naya</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-brutal-sm mb-6 border-[3px] border-ink relative">
            <p className="text-sm italic text-ink/80 leading-relaxed font-medium">"<MarkdownContent content={report.challenge.ai_observations} inline /></p>

            <div className="mt-5 pt-5 border-t-2 border-ink/20">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-3">
                Intelligences enrichies
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.awarded_points || {}).map(([key, points]) => (
                  <div key={key} className="flex items-center gap-1.5 bg-sky border-[3px] border-ink px-3 py-1.5 rounded-full shadow-brutal-sm">
                    <span className="text-xs font-bold text-brand capitalize">{key.replace('_', ' ')}</span>
                    <span className="text-xs font-black text-brand bg-brand/10 px-1.5 rounded-md">+{String(points)}</span>
                  </div>
                ))}
                {Object.keys(report.awarded_points || {}).length === 0 && (
                  <span className="text-xs text-ink/60 italic">Aucune intelligence spécifique détectée.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowPostModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-brand py-4 text-sm font-black text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
            >
              <Share2 className="size-5" />
              <span>Partager sur le Cerveau Collectif</span>
            </button>
            <button
              onClick={() => onValidated()}
              className="w-full rounded-2xl border-[3px] border-ink bg-white py-3.5 text-sm font-bold text-ink shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
            >
              Fermer et voir le profil
            </button>
          </div>

          {showPostModal && (
            <CreatePostModal
              isOpen={showPostModal}
              onOpenChange={(open) => {
                setShowPostModal(open);
                if (!open) onValidated(); // close OutcomeChat if they close the post modal
              }}
              initialChallengeId={challenge.id}
              initialImageUrl={report.challenge.proof_image_url}
              onPostCreated={() => {
                setShowPostModal(false);
                onValidated();
              }}
            />
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <NayaAvatar size="sm" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-brand mb-1">
                Échange avec Naya
              </p>
              <p className="text-sm font-semibold text-ink/70">
                Ajoutez une photo du résultat pour que Naya découvre les talents de {childName} !
              </p>
            </div>
          </div>

          <div className="mb-6">
            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-ink bg-white/50 p-6 hover:-translate-y-0.5 shadow-brutal-sm transition-all cursor-pointer text-center w-full">
                <Upload className="size-6 text-brand animate-pulse" />
                <span className="text-xs font-black text-brand">Sélectionner une photo</span>
                <span className="text-[10px] text-ink/60 font-bold">Formats acceptés : PNG, JPG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-2xl border-[3px] border-ink bg-leaf px-4 py-3 text-xs font-bold text-white shadow-brutal-sm w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="size-4 shrink-0 stroke-[3px]" />
                  <span className="truncate max-w-[180px]">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="hover:text-red-300 hover:bg-black/10 p-1.5 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            {!notes.trim() && (
              <p className="mt-2 text-xs text-ink/60 italic">
                Astuce : remplissez le journal d'apprentissage ci-dessus pour une analyse plus précise.
              </p>
            )}
          </div>

          {validationError && (
            <p className="mb-3 text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
              {validationError}
            </p>
          )}
          <button
            onClick={handleValidate}
            disabled={validating || !canSubmit}
            className="w-full rounded-2xl border-[3px] border-ink bg-brand py-3.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>Naya analyse le projet...</span>
              </>
            ) : (
              <>
                <Play className="size-5" />
                <span>Soumettre pour Analyse</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { validateChallengeProof } from "@/lib/challenges.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { Loader2, Play, Upload, Check, X, Send, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CreatePostModal } from "@/components/feed/CreatePostModal";

type Challenge = {
  id: string;
  domain: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed";
};

type OutcomeChatProps = {
  challenge: Challenge;
  childId: string;
  childName: string;
  onValidated: () => void;
};

const QUESTIONS = [
  "Qu'a-t-il/elle fait en premier ?",
  "Où a-t-il/elle buté ?",
  "Qu'est-ce qui l'a animé(e) ?",
];

export function OutcomeChat({ challenge, childId, childName, onValidated }: OutcomeChatProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [report, setReport] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const validateAI = useServerFn(validateChallengeProof);

  const handleNextQuestion = () => {
    if (!currentInput.trim()) return;
    setAnswers([...answers, currentInput.trim()]);
    setCurrentInput("");
    setStep(step + 1);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      let imageUrl = undefined;
      const file = selectedFile;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${childId}/${challenge.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('proofs')
          .upload(fileName, file);
          
        if (uploadError) {
          console.error("Erreur d'upload ignorée (fallback texte) :", uploadError);
          toast.warning("L'image n'a pas pu être envoyée. Naya analyse uniquement vos notes.");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('proofs')
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      // Combine answers into a single proofText
      const proofText = answers
        .map((ans, i) => `Q: ${QUESTIONS[i]}\nR: ${ans}`)
        .join("\n\n")
        .slice(0, 2000); // respect 2000 char cap

      const result = await validateAI({
        data: {
          id: challenge.id,
          proofText: proofText,
          proofImageUrl: imageUrl
        }
      });
      setReport(result);
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
            <p className="text-sm italic text-ink/80 leading-relaxed font-medium">"{report.challenge.ai_observations}"</p>
            
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
                  <span className="text-xs text-ink/50 italic">Aucune intelligence spécifique détectée.</span>
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
                Racontez-moi comment ça s'est passé pour {childName} !
              </p>
            </div>
          </div>

      <div className="space-y-4 mb-6">
        {answers.map((ans, i) => (
          <div key={i} className="space-y-3">
            <div className="flex gap-3">
              <NayaAvatar size="sm" />
              <div className="bg-white rounded-2xl rounded-tl-none p-4 border-[3px] border-ink shadow-brutal-sm text-sm text-ink max-w-[85%] font-bold">
                {QUESTIONS[i]}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-brand text-white border-[3px] border-ink rounded-2xl rounded-tr-none p-4 shadow-brutal-sm text-sm max-w-[85%] font-bold">
                {ans}
              </div>
            </div>
          </div>
        ))}

        {step < QUESTIONS.length && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NayaAvatar size="sm" />
            <div className="bg-white rounded-2xl rounded-tl-none p-4 border-[3px] border-ink shadow-brutal-sm text-sm text-ink font-bold max-w-[85%]">
              {QUESTIONS[step]}
            </div>
          </div>
        )}

        {step === QUESTIONS.length && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NayaAvatar size="sm" />
            <div className="bg-white rounded-2xl rounded-tl-none p-4 border-[3px] border-ink shadow-brutal-sm text-sm text-ink max-w-[85%]">
              <p className="font-semibold mb-3">Super ! Pour finir, avez-vous une photo du projet ou du résultat final ?</p>
              
              {!selectedFile ? (
                <label className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-ink bg-white/50 p-6 hover:-translate-y-0.5 shadow-brutal-sm transition-all cursor-pointer text-center w-full">
                  <Upload className="size-6 text-brand animate-pulse" />
                  <span className="text-xs font-black text-brand">Sélectionner une photo</span>
                  <span className="text-[10px] text-ink/40 font-bold">Formats acceptés : PNG, JPG</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border-[3px] border-ink bg-leaf px-4 py-3 text-xs font-bold text-white shadow-brutal-sm w-full">
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
            </div>
          </div>
        )}
      </div>

      {step < QUESTIONS.length && (
        <div className="flex items-end gap-2">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleNextQuestion();
              }
            }}
            rows={2}
            placeholder="Écrivez votre réponse ici..."
            className="flex-1 rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand transition-all resize-none shadow-brutal-sm"
          />
          <button
            onClick={handleNextQuestion}
            disabled={!currentInput.trim()}
            className="rounded-2xl border-[3px] border-ink bg-brand p-3 text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-5" />
          </button>
        </div>
      )}

      {step === QUESTIONS.length && (
        <div className="pt-2">
          {validationError && (
            <p className="mb-3 text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
              {validationError}
            </p>
          )}
          <button
            onClick={handleValidate}
            disabled={validating}
            className="w-full rounded-2xl border-[3px] border-ink bg-brand py-3.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
        </div>
      )}
      </>
      )}
    </div>
  );
}

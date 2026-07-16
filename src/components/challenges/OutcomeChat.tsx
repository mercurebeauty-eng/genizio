import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { validateChallengeProof } from "@/lib/challenges.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { Loader2, Play, Upload, Check, X, Send } from "lucide-react";
import { toast } from "sonner";

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

      await validateAI({
        data: {
          id: challenge.id,
          proofText: proofText,
          proofImageUrl: imageUrl
        }
      });
      onValidated();
      toast.success("Félicitations ! L'analyse de preuve a été rédigée avec succès.");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-brand/20 bg-brand/5 p-5 mt-5">
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
              <div className="bg-white rounded-2xl rounded-tl-none p-3 border border-ink/5 shadow-sm text-sm text-ink/80 max-w-[85%]">
                {QUESTIONS[i]}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-brand text-white rounded-2xl rounded-tr-none p-3 shadow-sm text-sm max-w-[85%]">
                {ans}
              </div>
            </div>
          </div>
        ))}

        {step < QUESTIONS.length && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NayaAvatar size="sm" />
            <div className="bg-white rounded-2xl rounded-tl-none p-3 border border-ink/5 shadow-sm text-sm text-ink/80 font-medium max-w-[85%]">
              {QUESTIONS[step]}
            </div>
          </div>
        )}

        {step === QUESTIONS.length && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <NayaAvatar size="sm" />
            <div className="bg-white rounded-2xl rounded-tl-none p-4 border border-ink/5 shadow-sm text-sm text-ink/80 max-w-[85%]">
              <p className="font-semibold mb-3">Super ! Pour finir, avez-vous une photo du projet ou du résultat final ?</p>
              
              {!selectedFile ? (
                <label className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/30 bg-brand/5 p-6 hover:bg-brand/10 transition-all cursor-pointer text-center w-full">
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
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 shadow-sm w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="size-4 shrink-0 stroke-[3px]" />
                    <span className="truncate max-w-[180px]">{selectedFile.name}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)} 
                    className="hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors cursor-pointer shrink-0"
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
            className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand transition-all resize-none shadow-sm"
          />
          <button
            onClick={handleNextQuestion}
            disabled={!currentInput.trim()}
            className="rounded-2xl bg-brand p-3 text-white shadow-md shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
    </div>
  );
}

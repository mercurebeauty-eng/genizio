import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateChallengeProof, submitDeclarativeProof } from "@/lib/challenges.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { LevelUpCelebration } from "@/components/challenges/LevelUpCelebration";
import { BadgeUnlockedCelebration } from "@/components/challenges/BadgeUnlockedCelebration";
import { Loader2, Upload, Check, X, Play, BotMessageSquare, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { fileToCompressedProof } from "@/lib/image-proof";

type Challenge = {
  id: string;
  domain: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed" | "not_completed";
  // Génizio — mode de preuve déclaratif (cf. genizio-decisions #35) : absent sur
  // tout défi antérieur à cette fonctionnalité, d'où l'optionnalité.
  proof_mode?: string;
  proof_target?: { metric?: string; value?: number } | null;
};

// Atelier du Temps — mécanique "Estimation" (cf. genizio-decisions #30). Toujours en
// langage de processus, jamais de score/pourcentage affiché (non-négociable établi en
// décision #11 — "aucun score/percentile/pass-fail nulle part") : on montre les deux
// durées brutes et un message chaleureux, jamais un "tu étais à 40% d'écart".
function getTimeReflection(estimatedMinutes: number, actualMinutes: number): string {
  const rounded = Math.max(1, Math.round(actualMinutes));
  const diff = actualMinutes - estimatedMinutes;
  const relativeDiff = Math.abs(diff) / Math.max(estimatedMinutes, actualMinutes);

  if (relativeDiff <= 0.2) {
    return `Tu avais prévu ${estimatedMinutes} min, tu as mis ${rounded} min — ton estimation était juste ! Tu sens de mieux en mieux ton temps.`;
  }
  if (diff > 0) {
    return `Tu avais prévu ${estimatedMinutes} min, ça t'a pris ${rounded} min — pas grave, certains défis prennent plus de temps qu'on ne le pense. Chaque essai t'aide à mieux le sentir.`;
  }
  return `Tu avais prévu ${estimatedMinutes} min, tu as fini en ${rounded} min — tu es allé plus vite que prévu !`;
}

// Reads a File as base64 in the browser and sends the bytes directly to the
// server — no Supabase Storage upload happens until after the AI confirms
// the photo is actually relevant (see validateChallengeProof), instead of
// uploading on every attempt regardless of outcome. La compression sans perte
// de qualité visible (D-04, 2026-08-13) vit dans image-proof.ts (partagé /quest).

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
  onSaveNotes: (n: string) => Promise<void> | void;
  onValidated: () => void;
};

export function OutcomeChat({
  challenge,
  childName,
  notes = "",
  onSaveNotes,
  onValidated,
}: OutcomeChatProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportedValue, setReportedValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [report, setReport] = useState<any>(null);
  // Séquence des célébrations plein écran avant le bulletin normal — dans cet
  // ordre si les deux surviennent sur la même complétion (ex: 3e défi Sciences
  // qui franchit aussi un palier de 500 XP) : Level Up d'abord, Badge ensuite.
  const [celebrationStep, setCelebrationStep] = useState<"levelup" | "badge" | null>(null);
  // Set instead of `report` when the AI judges the proof irrelevant — that
  // response is never persisted server-side (see validateChallengeProof),
  // so staying on this form (instead of switching to the success screen) is
  // what actually lets the parent try again, matching what the AI's own
  // message promises.
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);

  const validateAI = useServerFn(validateChallengeProof);
  const submitDeclarative = useServerFn(submitDeclarativeProof);

  // Génizio — défis à preuve déclarative (cf. genizio-decisions #35) : pas de
  // photo/IA, un champ chiffré comparé strictement à la cible du défi.
  const isDeclarative = challenge.proof_mode === "declarative" && !!challenge.proof_target?.metric;
  const declarativeValueNum = parseFloat(reportedValue.replace(",", "."));

  const canSubmit = isDeclarative
    ? reportedValue.trim() !== "" && Number.isFinite(declarativeValueNum)
    : !!notes.trim() || !!selectedFile;

  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    setRejectionNotice(null);
    try {
      const trimmedNotes = notes.trim();
      if (trimmedNotes) await onSaveNotes(trimmedNotes);

      const file = selectedFile;
      let proofImageBase64: string | undefined;
      let proofImageMediaType: string | undefined;
      if (file) {
        // D-04 : compression sans perte de qualité visible (module partagé /quest).
        const proof = await fileToCompressedProof(file);
        proofImageBase64 = proof.base64;
        proofImageMediaType = proof.mediaType;
      }

      const result = await validateAI({
        data: {
          id: challenge.id,
          proofText: trimmedNotes.slice(0, 2000),
          proofImageBase64,
          proofImageMediaType,
        },
      });

      if (!result.relevant) {
        setRejectionNotice(result.observations);
        setSelectedFile(null);
        return;
      }

      setReport(result);
      if (result.levelUp?.leveledUp) setCelebrationStep("levelup");
      else if (result.badgeUnlocked) setCelebrationStep("badge");
      if (file && !result.imageAnalyzed) {
        toast.warning(
          "Naya n'a pas pu analyser la photo — son observation se base uniquement sur vos notes.",
        );
      }
      toast.success("Analyse terminée !");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  const handleValidateDeclarative = async () => {
    setValidating(true);
    setValidationError(null);
    setRejectionNotice(null);
    try {
      const result = await submitDeclarative({
        data: { id: challenge.id, reportedValue: declarativeValueNum },
      });

      if (!result.relevant) {
        setRejectionNotice(result.observations);
        setReportedValue("");
        return;
      }

      setReport(result);
      if (result.levelUp?.leveledUp) setCelebrationStep("levelup");
      else if (result.badgeUnlocked) setCelebrationStep("badge");
      toast.success("Défi validé !");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-ink/10 bg-sky p-6 mt-5 relative overflow-hidden shadow-xl">
      {celebrationStep === "levelup" && report?.levelUp?.leveledUp && (
        <LevelUpCelebration
          newLevel={report.levelUp.newLevel}
          xpGained={report.levelUp.xpGained}
          newStreak={report.levelUp.newStreak}
          onContinue={() => setCelebrationStep(report?.badgeUnlocked ? "badge" : null)}
        />
      )}
      {celebrationStep === "badge" && report?.badgeUnlocked && (
        <BadgeUnlockedCelebration
          title={report.badgeUnlocked.title}
          description={report.badgeUnlocked.description}
          onContinue={() => setCelebrationStep(null)}
        />
      )}
      {report ? (
        <div className="animate-in zoom-in-95 duration-500">
          <div className="absolute -top-10 -right-10 size-40 bg-brand/10 rounded-full blur-3xl"></div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-brand/10 rounded-full mb-3">
              <BotMessageSquare className="size-8 text-brand" />
            </div>
            <h3 className="text-xl font-black text-ink">Bulletin de Découverte</h3>
            <p className="text-sm font-semibold text-ink/60">Analyse de Naya</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border border-ink/10 relative">
            <p className="text-sm italic text-ink/80 leading-relaxed font-medium">
              "<MarkdownContent content={report.challenge.ai_observations} inline />
            </p>

            {report.challenge.estimated_duration_minutes &&
              report.challenge.started_at &&
              report.challenge.completed_at && (
                <div className="mt-5 pt-5 border-t-2 border-ink/20">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-3 flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    L'Atelier du Temps
                  </p>
                  <p className="text-sm font-semibold text-ink/80 leading-relaxed">
                    {getTimeReflection(
                      report.challenge.estimated_duration_minutes,
                      (new Date(report.challenge.completed_at).getTime() -
                        new Date(report.challenge.started_at).getTime()) /
                        60000,
                    )}
                  </p>
                </div>
              )}

            <div className="mt-5 pt-5 border-t-2 border-ink/20">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand mb-3">
                Intelligences enrichies
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.awarded_points || {}).map(([key, points]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 bg-white border border-ink/10 px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <span className="text-xs font-bold text-brand capitalize">
                      {key.replace("_", " ")}
                    </span>
                    <span className="text-xs font-black text-brand bg-brand/10 px-1.5 rounded-md">
                      +{String(points)}
                    </span>
                  </div>
                ))}
                {Object.keys(report.awarded_points || {}).length === 0 && (
                  <span className="text-xs text-ink/60 italic">
                    Aucune intelligence spécifique détectée.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onValidated()}
              className="press-white w-full rounded-2xl border border-ink/10 bg-white py-3.5 text-sm font-bold text-ink"
            >
              Fermer et voir le profil
            </button>
          </div>
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
                {isDeclarative
                  ? `Indiquez le résultat obtenu pour que Naya valide le défi de ${childName} !`
                  : `Ajoutez une photo du résultat pour que Naya découvre les talents de ${childName} !`}
              </p>
            </div>
          </div>

          {rejectionNotice && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-ink/80 leading-relaxed">
                <MarkdownContent content={rejectionNotice} inline />
              </p>
            </div>
          )}

          {isDeclarative ? (
            <div className="mb-6">
              <label className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white/50 p-4 shadow-sm w-full">
                <span className="flex items-center gap-1.5 text-xs font-black text-brand">
                  <Target className="size-4" />
                  {challenge.proof_target?.metric} (objectif : {challenge.proof_target?.value})
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={reportedValue}
                  onChange={(e) => setReportedValue(e.target.value)}
                  placeholder={`Ex : ${challenge.proof_target?.value}`}
                  className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm"
                />
              </label>
              <p className="mt-2 text-xs text-ink/60 italic">
                Ce défi se valide par déclaration : indiquez le résultat réellement obtenu, sans
                photo.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-white/50 p-6 hover:-translate-y-0.5 shadow-sm transition-all cursor-pointer text-center w-full">
                  <Upload className="size-6 text-brand animate-pulse" />
                  <span className="text-xs font-black text-brand">Sélectionner une photo</span>
                  <span className="text-[10px] text-ink/60 font-bold">
                    Formats acceptés : PNG, JPG
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/20 bg-leaf px-4 py-3 text-xs font-bold text-white shadow-sm w-full">
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
                  Astuce : remplissez le journal d'apprentissage ci-dessus pour une analyse plus
                  précise.
                </p>
              )}
            </div>
          )}

          {validationError && (
            <p className="mb-3 text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
              {validationError}
            </p>
          )}
          <button
            onClick={isDeclarative ? handleValidateDeclarative : handleValidate}
            disabled={validating || !canSubmit}
            className="press-brand w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>{isDeclarative ? "Naya vérifie..." : "Naya analyse le projet..."}</span>
              </>
            ) : (
              <>
                <Play className="size-5" />
                <span>{isDeclarative ? "Valider le résultat" : "Soumettre pour Analyse"}</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

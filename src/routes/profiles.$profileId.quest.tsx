import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { updateChallenge, validateChallengeProof } from "@/lib/challenges.functions";
import { getActiveChallenge, ChallengeLike } from "@/lib/active-challenge";
import {
  ArrowLeft,
  Play,
  Check,
  Circle,
  Smile,
  Trophy,
  X,
  ChevronRight,
  MessageCircle,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { NayaAvatar } from "@/components/NayaAvatar";
import nayaAvatar from "@/assets/naya-avatar.png";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { ChallengeKindBadge } from "@/components/challenges/ChallengeKindBadge";
import { AspirationCompassCard } from "@/components/aspirations/AspirationCompassCard";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { GenizioLoader } from "@/components/GenizioLoader";
import { fileToCompressedProof } from "@/lib/image-proof";

export const Route = createFileRoute("/profiles/$profileId/quest")({
  component: QuestPage,
});

type Child = {
  id: string;
  name: string;
  avatar_color: string;
};

type Challenge = ChallengeLike & {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  steps: any;
  materials: any;
  notes: string | null;
  progress: number;
  duration: string;
  difficulty?: string | null;
  kind?: string | null;
};

const DOMAIN_COLORS: Record<string, string> = {
  Sciences: "bg-amber-500 text-white",
  Arts: "bg-purple-500 text-white",
  Langues: "bg-blue-500 text-white",
  Sport: "bg-emerald-500 text-white",
  Artisanat: "bg-orange-500 text-white",
  Agriculture: "bg-lime-600 text-white",
  Entrepreneuriat: "bg-sky-500 text-white",
};

function QuestPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const updateChallengeFn = useServerFn(updateChallenge);

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);

  // Quest Wizard states
  const [isQuestActive, setIsQuestActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepChecked, setStepChecked] = useState<boolean[]>([]);
  const [childFeedback, setChildFeedback] = useState("");
  const [completing, setCompleting] = useState(false);

  // Celebration screen state
  const [isCelebrated, setIsCelebrated] = useState(false);
  const [completedChallengeId, setCompletedChallengeId] = useState<string | null>(null);
  const [completedChallengeTitle, setCompletedChallengeTitle] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [aiObservations, setAiObservations] = useState<string | null>(null);
  const validateAI = useServerFn(validateChallengeProof);

  // Keyé sur userId (string stable), pas sur l'objet session : le store de
  // useSession ne propage une nouvelle identité que sur changement réel du
  // token/claims — mais un rejeu ici réafficherait le loader. (2026-08-14)
  const userId = session?.user.id;

  const loadChallenges = async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const [c, ch] = await Promise.all([
        supabase
          .from("child_profiles")
          .select("id, name, avatar_color")
          .eq("id", profileId)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("challenges")
          .select("*")
          .eq("child_id", profileId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      setChild((c.data as Child) ?? null);
      if (ch.data) {
        setChallenges(ch.data as Challenge[]);
      }
    } catch (err) {
      console.error("Erreur de chargement de la quête:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (userId) {
      void loadChallenges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profileId]);

  const activeChallenge = useMemo(() => getActiveChallenge(challenges), [challenges]);

  // Safe parse for steps and materials
  const steps = useMemo(() => {
    if (!activeChallenge) return [];
    const rawSteps = activeChallenge.steps;
    if (Array.isArray(rawSteps)) return rawSteps as string[];
    try {
      if (typeof rawSteps === "string") {
        const parsed = JSON.parse(rawSteps);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch (e) {}
    return [];
  }, [activeChallenge]);

  const materials = useMemo(() => {
    if (!activeChallenge) return [];
    const rawMats = activeChallenge.materials;
    if (Array.isArray(rawMats)) return rawMats as string[];
    try {
      if (typeof rawMats === "string") {
        const parsed = JSON.parse(rawMats);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch (e) {}
    return [];
  }, [activeChallenge]);

  // Initialize checked state when steps are loaded
  useEffect(() => {
    if (steps.length > 0) {
      setStepChecked(new Array(steps.length).fill(false));
    }
  }, [steps]);

  // Construct map nodes: [Completed 1, Completed 2, Active, Upcoming]
  const mapNodes = useMemo(() => {
    const completed = challenges
      .filter((c) => c.status === "completed")
      .sort(
        (a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime(),
      );

    const active = activeChallenge;
    const todos = challenges.filter((c) => c.status === "todo" && c.id !== active?.id);

    const nodes: { type: "completed" | "active" | "upcoming"; challenge: Challenge }[] = [];

    // Take up to last 2 completed
    const recentCompleted = completed.slice(-2);
    recentCompleted.forEach((c) => {
      nodes.push({ type: "completed" as const, challenge: c });
    });

    // Add active
    if (active) {
      nodes.push({ type: "active" as const, challenge: active });
    }

    // Add up to 1 upcoming
    if (todos.length > 0) {
      nodes.push({ type: "upcoming" as const, challenge: todos[0] });
    }

    return nodes;
  }, [challenges, activeChallenge]);

  const handleFinishQuest = async () => {
    if (!activeChallenge) return;
    setCompleting(true);
    try {
      const childText = childFeedback.trim() ? `\n\n[Enfant] : "${childFeedback.trim()}"` : "";
      const updatedNotes = (activeChallenge.notes || "") + childText;

      await updateChallengeFn({
        data: {
          id: activeChallenge.id,
          progress: 100,
          notes: updatedNotes || null,
        },
      });

      setCompletedChallengeId(activeChallenge.id);
      setCompletedChallengeTitle(activeChallenge.title);
      setIsCelebrated(true);
      setChildFeedback("");
      void loadChallenges();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la sauvegarde de ta quête.");
    } finally {
      setCompleting(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = completedChallengeId || activeChallenge?.id;
    if (!file) return; // le sélecteur n'émet rien sans fichier
    if (!targetId) {
      // D-03 (review 2026-08-13) : plus de clic silencieux — l'enfant sait pourquoi
      // rien ne part au lieu de voir un bouton « mort ».
      toast.error("Aucun défi à valider pour le moment — termine d'abord les étapes de ta quête.");
      return;
    }
    setUploadingProof(true);
    try {
      // D-04 : compression SANS PERTE DE QUALITÉ VISIBLE (1920 px max + WebP 0.92,
      // PNG lossless) — la photo brute du téléphone ne part plus telle quelle.
      const proof = await fileToCompressedProof(file);
      const challengeToValidate = challenges.find((c) => c.id === targetId) || activeChallenge;

      const result = await validateAI({
        data: {
          id: targetId,
          proofText: challengeToValidate?.notes || "",
          proofImageBase64: proof.base64,
          proofImageMediaType: proof.mediaType,
        },
      });

      if (!result.relevant) {
        // D-05 : ton Naya — jamais de verdict sec pour un enfant (même règle que le
        // chantier 5) ; l'observation IA reste utile en complément.
        toast("Naya ne reconnaît pas encore tout sur cette photo… 📸", {
          description:
            "Prends-la plus près de ton travail et réessaie — elle veut voir ce que tu as fait !",
        });
        return;
      }

      setAiObservations(result.observations);
      setProofUrl(URL.createObjectURL(file)); // Affichage local immédiat

      // D-06 : signal de célébration pour le parent — consommé par la page Défis au
      // retour/focus (toast 🎉 + rechargement), sans infrastructure de push.
      try {
        localStorage.setItem(
          "genizio:celebrate",
          JSON.stringify({
            childId: child?.id ?? "",
            title: challengeToValidate?.title ?? "un défi",
            at: Date.now(),
          }),
        );
      } catch {
        /* stockage indisponible — jamais bloquant */
      }

      toast.success("Preuve validée par Naya ! 📸");
      void loadChallenges(); // Reload to get updated status and talents
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading || fetching || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-brand/5">
        <GenizioLoader label="Chargement de la quête…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface text-ink">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/profiles" className="underline text-sm opacity-80 hover:opacity-100">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  if (isCelebrated) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-amber-100 via-sky-100 to-emerald-100 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden font-sans text-ink">
        {/* Floating stars and confetti elements */}
        <div className="absolute top-10 left-10 text-4xl animate-bounce">✨</div>
        <div className="absolute top-20 right-14 text-4xl animate-pulse">🎉</div>
        <div className="absolute bottom-20 left-16 text-4xl animate-bounce">🌟</div>
        <div className="absolute bottom-10 right-10 text-4xl animate-pulse">🏆</div>

        <div className="max-w-md w-full bg-white rounded-3xl p-8 border-2 border-brand/20 shadow-2xl space-y-6 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center size-20 rounded-full bg-amber-100 border-4 border-amber-300 text-amber-600 shadow-lg animate-bounce mx-auto">
            <Trophy className="size-10 stroke-[2.5]" />
          </div>

          <div>
            <h2 className="font-display text-balance text-3xl font-black text-ink mb-1">
              Bravo ! 🎉
            </h2>
            <p className="text-xs font-black uppercase tracking-widest text-brand">
              Mission accomplie avec succès !
            </p>
          </div>

          {/* Mascot Praise */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-center gap-3 text-left">
            <img
              src={nayaAvatar}
              alt="Naya"
              className="size-12 rounded-full border-2 border-amber-400 shrink-0 object-cover"
            />
            <div className="text-xs font-bold text-amber-950 leading-relaxed">
              {aiObservations ? (
                <MarkdownContent content={aiObservations} inline />
              ) : (
                `"Incroyable ${child.name} ! Tu as brillamment réussi les étapes du défi '${completedChallengeTitle}' ! Prends une photo pour me montrer ton chef-d'œuvre ! ✨"`
              )}
            </div>
          </div>

          {/* Photo Upload Option */}
          <div className="bg-surface rounded-2xl p-4 border border-ink/10 text-left space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-brand" />
              <span className="text-xs font-extrabold text-ink">
                Ajouter une photo souvenir (preuve)
              </span>
            </div>

            {proofUrl ? (
              <div className="space-y-2">
                <img
                  src={proofUrl}
                  alt="Preuve"
                  className="h-36 w-full object-cover rounded-xl border border-ink/10"
                />
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  ✓ Preuve validée et enregistrée dans tes talents !
                </p>
              </div>
            ) : (
              <div>
                <label className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs font-bold text-ink shadow-sm hover:bg-surface cursor-pointer transition-all">
                  {uploadingProof ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-brand" />
                      <span>Envoi de la photo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 text-brand" />
                      <span>Prendre ou choisir une photo 📸</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadProof}
                    disabled={uploadingProof}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Return Button to Child View */}
          <button
            onClick={() => {
              setIsCelebrated(false);
              setIsQuestActive(false);
              setCurrentStepIndex(0);
              setProofUrl(null);
              setCompletedChallengeId(null);
              navigate({
                to: "/profiles/$profileId/challenges",
                params: { profileId },
                search: { mode: "child" },
              });
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-brand px-6 py-4 text-base font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>Retour au Mode Enfant 🎮</span>
          </button>
        </div>
      </div>
    );
  }

  const verticalOffsets = ["translate-y-2", "-translate-y-2", "translate-y-1.5", "-translate-y-1"];

  // Mascot text depending on step
  const getCompanionSpeech = () => {
    if (currentStepIndex === steps.length) {
      return `Waouh, incroyable ! Tu as relevé le défi ! Raconte-moi, comment c'était ?`;
    }
    if (currentStepIndex === 0) {
      return `Salut ${child.name} ! Prêt pour cette mission ? Commençons par la première étape !`;
    }
    return `Génial ! Passons à l'étape suivante, tu te débrouilles super bien !`;
  };

  // If the game wizard is active, show the gamified fullscreen overlay
  if (isQuestActive && activeChallenge) {
    const isCompletedScreen = currentStepIndex === steps.length;
    const currentStepText = steps[currentStepIndex] || "";

    return (
      <div className="min-h-dvh bg-gradient-to-br from-amber-50/50 via-sky-50/50 to-emerald-50/50 flex flex-col p-6 pb-24 relative overflow-hidden font-sans text-ink select-none ">
        {/* Floating background decorative circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none" />

        {/* Wizard Header */}
        <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-brand">
              Mode Quête
            </span>
            <span className="text-sm font-bold text-ink/60">
              {isCompletedScreen
                ? "Fin de mission"
                : `Étape ${currentStepIndex + 1} sur ${steps.length}`}
            </span>
          </div>
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Quitter la mission en cours ?",
                description: "Ton avancée ne sera pas perdue.",
                confirmLabel: "Quitter",
              });
              if (ok) {
                setIsQuestActive(false);
                setCurrentStepIndex(0);
              }
            }}
            className="rounded-full bg-white p-2.5 border border-ink/10 shadow-sm text-ink hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Progress bar */}
        {!isCompletedScreen && (
          <div className="w-full max-w-4xl mx-auto bg-white h-4 rounded-full mb-10 overflow-hidden relative z-10 border border-ink/10 shadow-sm">
            <div
              className="bg-brand h-full transition-all duration-500 border-r-[3px] border-ink"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        )}

        <main className="flex-1 flex flex-col md:grid  items-center justify-center gap-10 max-w-4xl mx-auto w-full relative z-10">
          {/* Left Column: Mascot Naya */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="relative flex flex-col items-center gap-6">
              {/* Mascot Face */}
              <div className="relative size-32 md:size-40 rounded-full border-[4px] border-ink shadow-xl flex items-center justify-center animate-bounce duration-1000 overflow-hidden bg-white shrink-0">
                <img src={nayaAvatar} alt="Naya" className="h-full w-full object-cover" />
              </div>

              {/* Speech bubble */}
              <div className="bg-white border border-ink/10 p-4 rounded-3xl shadow-sm max-w-xs text-sm font-black text-ink leading-relaxed relative">
                {getCompanionSpeech()}
              </div>
            </div>
          </div>

          {/* Right Column: Interaction Card */}
          <div className="md:col-span-3 w-full">
            <div className="bg-white rounded-3xl p-8 border border-ink/10 shadow-xl min-h-[340px] flex flex-col justify-between relative overflow-hidden">
              {!isCompletedScreen ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚀</span>
                      <span className="text-xs font-black uppercase tracking-widest text-brand">
                        Étape en cours
                      </span>
                    </div>
                    <h3 className="font-display text-balance text-2xl font-black text-ink leading-tight">
                      {currentStepText}
                    </h3>
                  </div>

                  {/* Playful checkbox */}
                  <div className="mt-8">
                    <button
                      onClick={() => {
                        const copy = [...stepChecked];
                        copy[currentStepIndex] = !copy[currentStepIndex];
                        setStepChecked(copy);
                      }}
                      className={`w-full rounded-2xl p-5 border text-left font-black text-lg flex items-center justify-between transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                        stepChecked[currentStepIndex]
                          ? "bg-leaf border-ink text-white shadow-sm"
                          : "bg-white border-ink shadow-sm text-ink"
                      }`}
                    >
                      <span>
                        {stepChecked[currentStepIndex]
                          ? "✓ C'est fait !"
                          : "J'ai terminé cette étape !"}
                      </span>
                      <div
                        className={`size-8 rounded-full border flex items-center justify-center transition-all ${
                          stepChecked[currentStepIndex]
                            ? "border-ink bg-white text-ink"
                            : "border-ink bg-surface"
                        }`}
                      >
                        {stepChecked[currentStepIndex] && <Check className="size-5 stroke-[3px]" />}
                      </div>
                    </button>
                  </div>

                  {/* Next Step / Footer Navigation */}
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => {
                        if (currentStepIndex < steps.length - 1) {
                          setCurrentStepIndex((prev) => prev + 1);
                        } else {
                          // Go to final screen
                          setCurrentStepIndex(steps.length);
                        }
                      }}
                      disabled={!stepChecked[currentStepIndex]}
                      className="rounded-2xl border border-ink/10 bg-brand px-7 py-3.5 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>Suivant</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-6 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                        Félicitations !
                      </span>
                    </div>
                    <h3 className="font-display text-balance text-2xl font-black text-ink leading-tight">
                      Tu as achevé toute la mission avec succès !
                    </h3>
                    <p className="text-sm text-ink/60">
                      Raconte en tes propres mots ton aventure ci-dessous (facultatif) :
                    </p>
                  </div>

                  <div className="mt-6 relative">
                    <textarea
                      value={childFeedback}
                      onChange={(e) => setChildFeedback(e.target.value.slice(0, 1000))}
                      rows={3}
                      placeholder="J'ai adoré construire le pont mais le pistolet à colle était un peu difficile..."
                      className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand bg-white shadow-sm resize-none"
                    />
                  </div>

                  <div className="mt-6 flex flex-col  gap-3">
                    <button
                      onClick={handleFinishQuest}
                      disabled={completing}
                      className="flex-1 rounded-2xl border border-ink/10 bg-leaf px-6 py-4 text-base font-black text-white shadow-xl active:translate-y-0 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {completing ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="size-5" />
                          <span>Terminer ma Quête ! 🏆</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand/5 to-white flex flex-col relative overflow-hidden pb-24 font-sans text-ink ">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-sky/10 blur-3xl pointer-events-none" />

      <header className="p-6 relative z-10 flex justify-between items-center max-w-4xl mx-auto w-full">
        <h1 className="font-display text-balance text-2xl font-black text-ink tracking-tight">
          La Carte des Quêtes
        </h1>
        <Link
          to="/profiles"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink/60 hover:text-ink/80 hover:bg-white shadow-sm border border-ink/10 transition-all"
        >
          <ArrowLeft className="size-3.5" />
          Retour parent
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full relative z-10 text-center">
        {/* Quest Map Node Tree (Screen 1j) */}
        {mapNodes.length > 0 && (
          <div className="w-full mb-12 py-8 bg-white rounded-3xl border border-ink/10 p-6 shadow-xl">
            <h2 className="font-display text-balance text-xs font-black text-ink/60 mb-8 uppercase tracking-widest">
              Mon chemin de découverte
            </h2>
            <div className="flex items-center justify-between px-4 md:px-12 relative max-w-md mx-auto">
              {/* Connector Lines */}
              <div className="absolute left-[15%] right-[15%] top-1/2 -translate-y-1/2 h-0.5 border-t-2 border-dashed border-ink/20 z-0" />

              {mapNodes.map((node, index) => {
                const offset = verticalOffsets[index % verticalOffsets.length];
                const color = DOMAIN_COLORS[node.challenge.domain] || "bg-brand text-white";

                if (node.type === "completed") {
                  return (
                    <div
                      key={node.challenge.id}
                      className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}
                    >
                      <div className="size-11 rounded-full bg-emerald-500 text-white border border-ink/10 shadow-sm flex items-center justify-center font-bold text-sm">
                        <Check className="size-5 stroke-[3px]" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                        Fait
                      </span>
                    </div>
                  );
                }

                if (node.type === "active") {
                  return (
                    <div
                      key={node.challenge.id}
                      className={`flex flex-col items-center gap-2 relative z-10 ${offset}`}
                    >
                      <div
                        className={`size-14 rounded-full ${color} border border-ink/10 shadow-xl flex items-center justify-center font-bold text-base animate-pulse`}
                      >
                        ★
                      </div>
                      <span className="text-[11px] font-black text-ink uppercase tracking-wider max-w-[120px] truncate">
                        {node.challenge.title}
                      </span>
                    </div>
                  );
                }

                // Upcoming
                return (
                  <div
                    key={node.challenge.id}
                    className={`flex flex-col items-center gap-2 relative z-10 ${offset} opacity-40`}
                  >
                    <div className="size-10 rounded-full bg-white border border-dashed border-ink/20 flex items-center justify-center text-ink">
                      <Circle className="size-4 fill-current opacity-20" />
                    </div>
                    <span className="text-[10px] font-black text-ink uppercase tracking-wider">
                      Prochain
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <NayaAvatar
          size="md"
          className="mb-6"
          thoughts={activeChallenge ? ["Hop, on s'y met !"] : ["Bientôt de nouveaux défis !"]}
        />

        {/* Boussole de Naya (2026-08-12, analyse §16) : la séquence « Explorons cela →
            voici ce que Naya observe » — jamais un verdict, jamais de chiffres. */}
        <AspirationCompassCard childId={profileId} mode="child" />

        {activeChallenge ? (
          <div className="bg-white rounded-3xl p-8 border border-ink/10 shadow-xl w-full animate-in zoom-in-95 duration-500 relative overflow-hidden text-left">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full border border-ink/10 bg-brand px-3.5 py-1 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                  Mission : {activeChallenge.domain}
                </span>
                <DifficultyBadge difficulty={activeChallenge.difficulty} />
                <ChallengeKindBadge kind={activeChallenge.kind} />
              </div>
              <span className="text-xs font-black text-ink/60">⏱ {activeChallenge.duration}</span>
            </div>
            <h2 className="font-display text-balance text-2xl font-black text-ink leading-tight mb-3">
              {activeChallenge.title}
            </h2>
            <div className="text-ink/70 leading-relaxed mb-6">
              <MarkdownContent content={activeChallenge.description} />
            </div>

            {materials.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/60 mb-3">
                  Matériel à rassembler :
                </p>
                <div className="flex flex-wrap gap-2">
                  {materials.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm"
                    >
                      📦 {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsQuestActive(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-brand px-8 py-4 text-base font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Play className="size-5 fill-current" />
              Commencer la mission ! 🚀
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-ink/10 shadow-xl w-full text-center">
            <p className="text-ink/65 text-lg font-bold">
              Tu n'as pas de mission active pour le moment ! Demande à tes parents de t'en attribuer
              une. 😊
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

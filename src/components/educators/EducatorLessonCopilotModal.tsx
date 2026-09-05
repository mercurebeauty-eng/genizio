// Modale du Copilote Professeur — préparation de cours différenciée en 30 s.
// Trois entrées (Texte / Photo / Dictée vocale), rendu de fiche 4 canaux +
// 3 niveaux + plan de tableau + chronométrage. La compression image réutilise
// fileToCompressedProof (image-proof.ts) ; la dictée passe par la Web Speech API
// avec repli champ texte. Zéro écran élève par construction : la fiche est pour
// le professeur, jamais projetée.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  Check,
  Clipboard,
  Loader2,
  Mic,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import {
  generateClassLessonDeconstruction,
  deleteMyLessonFiche,
  listMyLessonFiches,
  type LessonFicheResult,
} from "@/lib/educator-copilot.functions";
import {
  COGNITIVE_CHANNEL_LABEL,
  type CognitiveChannel,
  type LessonFiche,
} from "@/lib/educator-copilot";
import { fileToCompressedProof } from "@/lib/image-proof";
import type { EstablishmentOverview } from "@/lib/educators-lookup.functions";

interface EducatorLessonCopilotModalProps {
  open: boolean;
  onClose: () => void;
  /** Vue établissement chargée par la route (classe, pays, effectif). */
  establishment: EstablishmentOverview | null;
}

type InputTab = "text" | "photo" | "voice";

interface FicheHistoryItem {
  id: string;
  fiche: LessonFiche;
  provider: string;
  createdAt: string;
}

const LEVEL_STYLES: Record<number, { label: string; cls: string }> = {
  1: { label: "Niveau 1 · Socle", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  2: { label: "Niveau 2 · Standard", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  3: { label: "Niveau 3 · Dépassement", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

// ── Rendu d'une fiche ───────────────────────────────────────────────────────

function FicheView({ fiche }: { fiche: LessonFiche }) {
  const channelOrder: CognitiveChannel[] = ["manipulatif", "visuo_spatial", "logico_abstrait", "narratif"];
  const groups = channelOrder
    .map((c) => fiche.channel_groups.find((g) => g.channel === c))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <div className="space-y-5">
      {/* Ancrage local — la réponse à « À quoi ça sert ? » */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
          À quoi ça sert ? · {fiche.local_anchor.trade}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink/90 leading-relaxed">
          {fiche.local_anchor.explanation}
        </p>
        <p className="mt-2 text-sm italic text-amber-900/80">« {fiche.local_anchor.hook_question} »</p>
      </div>

      {/* 4 canaux */}
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.channel} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-ink">{COGNITIVE_CHANNEL_LABEL[g.channel] ?? g.channel}</p>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                {g.group_size} élèves
              </span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-ink/90">{g.activity.title}</p>
            {g.activity.materials.length > 0 && (
              <p className="mt-1 text-[11px] font-semibold text-ink/60">
                Matériel : {g.activity.materials.join(" · ")}
              </p>
            )}
            <ol className="mt-2 space-y-1">
              {g.activity.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink/80">
                  <span className="font-black text-indigo-600">{i + 1}.</span>
                  <span className="font-medium">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* 3 niveaux d'exercices */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">Exercices différenciés</p>
        {fiche.exercises.map((e) => {
          const style = LEVEL_STYLES[e.level] ?? LEVEL_STYLES[2];
          return (
            <div key={e.level} className={`rounded-2xl border p-3.5 ${style.cls}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-black">{style.label}</p>
                {e.common_mistake && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold opacity-75">
                    <AlertTriangle className="size-3" /> piège fréquent
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink/90">{e.statement}</p>
              <p className="mt-1 text-[11px] font-medium opacity-70">Réponse attendue : {e.expected_answer}</p>
            </div>
          );
        })}
      </div>

      {/* Plan de tableau + chronométrage */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-stone-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">Ce que vous écrivez au tableau</p>
          <ul className="mt-2 space-y-1">
            {fiche.board_plan.map((line, i) => (
              <li key={i} className="text-xs font-medium text-ink/80">• {line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-stone-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">Déroulé chronométré</p>
          <ul className="mt-2 space-y-1">
            {fiche.timing.map((t, i) => (
              <li key={i} className="flex justify-between text-xs font-medium text-ink/80">
                <span>{t.phase}</span>
                <span className="font-black text-ink">{t.minutes} min</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Copier le texte de la fiche (partage WhatsApp natif) ────────────────────

function ficheToPlainText(fiche: LessonFiche): string {
  const lines: string[] = [];
  lines.push(`FICHE — ${fiche.subject} · ${fiche.topic} (${fiche.grade_level})`);
  lines.push("");
  lines.push(`À QUOI ÇA SERT ? (${fiche.local_anchor.trade})`);
  lines.push(fiche.local_anchor.explanation);
  lines.push(`Accroche : « ${fiche.local_anchor.hook_question} »`);
  lines.push("");
  for (const g of fiche.channel_groups) {
    lines.push(`${COGNITIVE_CHANNEL_LABEL[g.channel] ?? g.channel} — ${g.group_size} élèves`);
    lines.push(`Activité : ${g.activity.title} (${g.activity.duration_min} min)`);
    if (g.activity.materials.length) lines.push(`Matériel : ${g.activity.materials.join(", ")}`);
    g.activity.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }
  lines.push("EXERCICES");
  for (const e of fiche.exercises) {
    lines.push(`Niveau ${e.level} (${e.label}) : ${e.statement}`);
    lines.push(`Réponse : ${e.expected_answer}`);
  }
  lines.push("");
  lines.push("TABLEAU");
  fiche.board_plan.forEach((l) => lines.push(`• ${l}`));
  lines.push("");
  lines.push("DÉROULÉ");
  fiche.timing.forEach((t) => lines.push(`• ${t.phase} : ${t.minutes} min`));
  return lines.join("\n");
}

// ── Modale principale ───────────────────────────────────────────────────────

export function EducatorLessonCopilotModal({ open, onClose, establishment }: EducatorLessonCopilotModalProps) {
  const generateFn = useServerFn(generateClassLessonDeconstruction);
  const listFn = useServerFn(listMyLessonFiches);
  const deleteFn = useServerFn(deleteMyLessonFiche);

  const [tab, setTab] = useState<InputTab>("text");
  const [subject, setSubject] = useState("");
  const [theme, setTheme] = useState("");
  const [chapter, setChapter] = useState("");
  const [objectives, setObjectives] = useState("");
  const [photo, setPhoto] = useState<{ base64: string; mediaType: string; name: string } | null>(null);
  const [photoHint, setPhotoHint] = useState("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [headcount, setHeadcount] = useState(50);
  const [gradeLevel, setGradeLevel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<LessonFicheResult | null>(null);
  const [history, setHistory] = useState<FicheHistoryItem[]>([]);
  const [viewingHistory, setViewingHistory] = useState<FicheHistoryItem | null>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = useMemo(
    () => typeof window !== "undefined" && "webkitSpeechRecognition" in window,
    [],
  );

  // Historique chargé à l'ouverture.
  useEffect(() => {
    if (!open) return;
    listFn()
      .then((rows) => setHistory(rows))
      .catch(() => setHistory([]));
  }, [open, listFn]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!open) return null;

  const resetInputs = () => {
    setSubject("");
    setTheme("");
    setChapter("");
    setObjectives("");
    setPhoto(null);
    setPhotoHint("");
    setTranscript("");
  };

  const handleFile = async (file: File | null) => {
    if (!file) {
      setPhoto(null);
      return;
    }
    try {
      // Compression WebP ≤1920px (pattern preuves) dès la sélection — une seule
      // compression, le résultat part tel quel au serveur.
      const compressed = await fileToCompressedProof(file);
      setPhoto({ base64: compressed.base64, mediaType: compressed.mediaType, name: file.name });
    } catch {
      toast.error("Image illisible — essayez une autre photo.");
      setPhoto(null);
    }
  };

  const startDictation = () => {
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) {
      toast.error("Dictée non supportée par ce navigateur — utilisez la saisie texte.");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "fr-FR";
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (event: any) => {
        let chunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) chunk += event.results[i][0].transcript;
        }
        setTranscript((prev) => (prev ? `${prev} ${chunk}` : chunk).slice(0, 2000));
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => {
        setListening(false);
        toast.error("Dictée interrompue — vérifiez le microphone.");
      };
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      toast.error("Dictée indisponible — utilisez la saisie texte.");
    }
  };

  const stopDictation = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  const handleGenerate = async () => {
    if (tab === "text" && (subject.trim().length < 1 || theme.trim().length < 2)) {
      toast.error("Indiquez au minimum la discipline et le thème de la leçon.");
      return;
    }
    if (tab === "photo" && !photo) {
      toast.error("Ajoutez une photo de la page de manuel ou de l'exercice.");
      return;
    }
    if (tab === "voice" && transcript.trim().length < 2) {
      toast.error("Dictez votre leçon ou basculez sur la saisie texte.");
      return;
    }

    setGenerating(true);
    setResult(null);
    try {
      let source: any;
      if (tab === "photo" && photo) {
        source = {
          kind: "photo",
          imageBase64: photo.base64,
          mediaType: photo.mediaType,
          hint: photoHint.trim() || undefined,
        };
      } else if (tab === "voice") {
        source = { kind: "voice", transcript: transcript.trim(), subject: subject.trim() || undefined };
      } else {
        source = {
          kind: "text",
          subject: subject.trim(),
          theme: theme.trim(),
          chapter: chapter.trim() || undefined,
          objectives: objectives.trim() || undefined,
        };
      }

      const res: LessonFicheResult = await generateFn({
        data: {
          classCode: gradeLevel.trim() || "CLASSE",
          gradeLevel: gradeLevel.trim() || "Général",
          headcount,
          countryContext: establishment?.schoolCity ?? "Afrique de l'Ouest",
          source,
        },
      });
      setResult(res);
      toast.success("Fiche prête ! Bonne séance.");
      listFn().then(setHistory).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Génération impossible pour le moment.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFn({ data: { ficheId: id } });
      setHistory((h) => h.filter((item) => item.id !== id));
      if (viewingHistory?.id === id) setViewingHistory(null);
      toast.success("Fiche supprimée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  const activeFiche = viewingHistory?.fiche ?? result?.fiche ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="relative flex h-[95dvh] sm:h-auto sm:max-h-[90dvh] w-full sm:max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-black text-ink">Copilote de préparation</h2>
              <p className="text-[11px] font-semibold text-ink/50">
                Fiche différenciée 4 canaux · zéro écran élève
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && !viewingHistory && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(ficheToPlainText(result.fiche));
                  toast.success("Fiche copiée — collez-la où vous voulez (WhatsApp, notes…).");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 px-3 py-1.5 text-xs font-black text-ink/70 hover:bg-stone-50"
              >
                <Clipboard className="size-3.5" /> Copier
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl border border-ink/10 text-ink/60 hover:bg-stone-50"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeFiche ? (
            <div className="space-y-4">
              {(result?.warnings.length ?? 0) > 0 && !viewingHistory && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  {result!.warnings.map((w, i) => (
                    <p key={i} className="text-xs font-semibold text-amber-800">⚠️ {w}</p>
                  ))}
                </div>
              )}
              {viewingHistory && (
                <button
                  type="button"
                  onClick={() => setViewingHistory(null)}
                  className="text-xs font-black text-indigo-600 hover:underline"
                >
                  ← Retour à l'historique
                </button>
              )}
              <FicheView fiche={activeFiche} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Onglets d'entrée */}
              <div className="flex gap-2">
                {(
                  [
                    { key: "text", label: "Texte", icon: Wand2 },
                    { key: "photo", label: "Photo", icon: Camera },
                    { key: "voice", label: "Dictée", icon: Mic },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      tab === key
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-ink/10 bg-white text-ink/60 hover:bg-stone-50"
                    }`}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              {/* Classe (pré-remplie) + effectif */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Classe / Niveau</span>
                  <input
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="ex : 6e B"
                    className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Effectif ({headcount})</span>
                  <input
                    type="range" min={5} max={90} value={headcount}
                    onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="mt-3 w-full accent-indigo-600"
                  />
                </label>
              </div>

              {tab === "text" && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Discipline *</span>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="ex : Mathématiques"
                      className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Thème de la leçon *</span>
                    <input
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="ex : Périmètre et aire du rectangle"
                      className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Chapitre</span>
                    <input
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      placeholder="ex : Chapitre 3 — Mesures"
                      className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink/50">Objectifs pédagogiques</span>
                    <textarea
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                      rows={2}
                      placeholder="Ce que les élèves doivent savoir faire à la fin…"
                      className="mt-1 w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                    />
                  </label>
                </div>
              )}

              {tab === "photo" && (
                <div className="space-y-3">
                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-ink/20 bg-stone-50 p-6 text-center hover:border-indigo-300">
                    <input
                      type="file"
                      accept="image/*,.heic"
                      className="hidden"
                      onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                    />
                    {photo ? (
                      <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                        <Check className="size-4" /> Photo prête : {photo.name}
                      </span>
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1.5 text-sm font-bold text-ink/60">
                        <Camera className="size-6" />
                        Photographiez la page de manuel ou l'exercice
                      </span>
                    )}
                  </label>
                  <input
                    value={photoHint}
                    onChange={(e) => setPhotoHint(e.target.value)}
                    placeholder="Indication (optionnel) : « l'exercice 4, page 42 »"
                    className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                  />
                </div>
              )}

              {tab === "voice" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-stone-50 p-4">
                    <button
                      type="button"
                      onClick={() => (listening ? stopDictation() : startDictation())}
                      disabled={!speechSupported}
                      className={`grid size-12 place-items-center rounded-full text-white transition-all ${
                        listening ? "bg-red-600 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"
                      } disabled:bg-stone-300`}
                      aria-label={listening ? "Arrêter la dictée" : "Démarrer la dictée"}
                    >
                      <Mic className="size-5" />
                    </button>
                    <div className="text-xs font-semibold text-ink/60">
                      {listening ? "J'écoute… dictez votre leçon." : speechSupported ? "Appuyez et dictez (français)." : "Dictée non supportée ici — utilisez la saisie texte."}
                    </div>
                  </div>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder="La transcription apparaît ici — vous pouvez la corriger à la main."
                    className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
                  />
                </div>
              )}

              {/* Historique */}
              {history.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">
                    Fiches récentes ({history.length})
                  </p>
                  <div className="space-y-1.5">
                    {history.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink/10 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setViewingHistory(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-black text-ink">{item.fiche.topic}</p>
                          <p className="text-[10px] font-semibold text-ink/50">
                            {item.fiche.subject} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-ink/40 hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer la fiche"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied : génération */}
        {!activeFiche && (
          <div className="border-t border-ink/10 px-5 py-3.5">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Le copilote prépare votre fiche…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Générer ma fiche différenciée
                </>
              )}
            </button>
            <p className="mt-1.5 text-center text-[10px] font-semibold text-ink/40">
              Agrégats de classe uniquement — jamais de données individuelles d'élèves.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

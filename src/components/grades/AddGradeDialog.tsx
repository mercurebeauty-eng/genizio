import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSchoolGrade } from "@/lib/school-grades.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

// Liste fermée + "Autre" plutôt que du texte libre pur : la matière sert de clé de
// regroupement pour le calcul du Z-score par le trigger detect_grade_anomaly()
// (Phase 2, cf. genizio-decisions #31) — une orthographe qui varie d'une saisie à
// l'autre casserait silencieusement le regroupement statistique.
const SCHOOL_SUBJECTS = [
  "Mathématiques", "Français", "Anglais", "Sciences (SVT/Physique-Chimie)",
  "Histoire-Géographie", "Éducation Civique", "EPS", "Arts Plastiques",
  "Musique", "Informatique", "Philosophie", "Autre",
];

const EVALUATION_TYPES = ["Contrôle", "Devoir", "Interrogation", "Examen", "Autre"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddGradeDialog({ childId, childName, onCreated }: { childId: string; childName: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(SCHOOL_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [maxGrade, setMaxGrade] = useState("20");
  const [evaluationType, setEvaluationType] = useState<string>("");
  const [gradedAt, setGradedAt] = useState(todayISO());
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);

  const createFn = useServerFn(createSchoolGrade);

  const reset = () => {
    setSubject(SCHOOL_SUBJECTS[0]);
    setCustomSubject("");
    setGrade("");
    setMaxGrade("20");
    setEvaluationType("");
    setGradedAt(todayISO());
    setContext("");
  };

  const effectiveSubject = subject === "Autre" ? customSubject.trim() : subject;
  const gradeNum = parseFloat(grade.replace(",", "."));
  const maxGradeNum = parseFloat(maxGrade.replace(",", "."));
  const canSubmit =
    effectiveSubject.length > 0 &&
    Number.isFinite(gradeNum) && gradeNum >= 0 &&
    Number.isFinite(maxGradeNum) && maxGradeNum > 0 &&
    gradeNum <= maxGradeNum;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await createFn({
        data: {
          childId,
          subject: effectiveSubject,
          grade: gradeNum,
          maxGrade: maxGradeNum,
          evaluationType: evaluationType || null,
          context: context.trim() || null,
          gradedAt,
        },
      });
      toast.success("Note enregistrée.");
      setOpen(false);
      reset();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all">
          <Plus className="size-4" />
          Ajouter une note
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-[3px] border-ink shadow-brutal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold text-ink">
            Nouvelle note scolaire
          </DialogTitle>
          <p className="text-sm text-ink/60">
            Naya s'en sert pour mieux comprendre le parcours de {childName} — jamais pour la juger.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Matière</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm bg-white"
            >
              {SCHOOL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {subject === "Autre" && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Nom de la matière"
                className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink">Note</label>
              <input
                type="text"
                inputMode="decimal"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="12"
                className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink">Sur</label>
              <input
                type="text"
                inputMode="decimal"
                value={maxGrade}
                onChange={(e) => setMaxGrade(e.target.value)}
                placeholder="20"
                className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Type d'évaluation (optionnel)</label>
            <div className="flex flex-wrap gap-2">
              {EVALUATION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEvaluationType(evaluationType === t ? "" : t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all border-2 ${
                    evaluationType === t
                      ? "bg-brand border-ink text-white"
                      : "bg-white border-ink text-ink/60 hover:bg-surface"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Date de l'évaluation</label>
            <input
              type="date"
              value={gradedAt}
              max={todayISO()}
              onChange={(e) => setGradedAt(e.target.value)}
              className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Contexte (optionnel)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex : évaluation chronométrée, il semblait stressé avant..."
              className="w-full min-h-[70px] rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm resize-y"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="w-full rounded-2xl border-[3px] border-ink bg-brand py-3.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Enregistrer la note"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

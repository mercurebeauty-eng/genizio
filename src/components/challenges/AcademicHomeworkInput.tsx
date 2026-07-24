import React, { useState, useEffect } from "react";
import { Sparkles, Layers, BookOpen, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_METADATA,
  ACADEMIC_SUBJECTS,
  ACADEMIC_SUBJECT_LABELS,
  BEHAVIORAL_DRIVERS,
  DRIVER_FUSION_GUIDANCE,
  CURRICULUM_TOPICS,
  getCurriculumTopics,
  type GradeLevel,
  type AcademicSubject,
  type BehavioralDriver,
  type CurriculumTopic,
} from "@/lib/academic-homework.functions";

export const BEHAVIORAL_DRIVER_LABELS: Record<
  BehavioralDriver,
  { title: string; subtitle: string }
> = {
  deconstruire: { title: "Déconstruire", subtitle: "Démonter, analyser à l'envers" },
  schematiser: { title: "Schématiser", subtitle: "Schémas, cartes géantes, maquettes" },
  simuler: { title: "Simuler", subtitle: "Jeu de rôle, expérience en direct" },
  enqueter: { title: "Enquêter", subtitle: "Chasse aux indices, déduction" },
  optimiser: { title: "Optimiser", subtitle: "Précision, record & rapidité" },
};

export function getDefaultGradeLevel(age: number): GradeLevel {
  if (age <= 6) return "CP";
  if (age === 7) return "CE1";
  if (age === 8) return "CE2";
  if (age === 9) return "CM1";
  if (age === 10) return "CM2";
  if (age === 11) return "6eme";
  if (age === 12) return "5eme";
  if (age === 13) return "4eme";
  return "3eme";
}

export interface AcademicHomeworkInputProps {
  childAge: number;
  childName: string;
  detectedGaps?: Record<string, number>;
  onGenerate: (params: {
    gradeLevel: GradeLevel;
    subject: AcademicSubject;
    homeworkInstruction: string;
    behavioralDriver?: BehavioralDriver;
    suggestedTopicId?: string;
  }) => Promise<void> | void;
  isGenerating: boolean;
  className?: string;
}

export function AcademicHomeworkInput({
  childAge,
  childName,
  detectedGaps = {},
  onGenerate,
  isGenerating,
  className = "",
}: AcademicHomeworkInputProps) {
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() =>
    getDefaultGradeLevel(childAge)
  );
  const [subject, setSubject] = useState<AcademicSubject>("maths");
  const [instruction, setInstruction] = useState("");
  const [driver, setDriver] = useState<BehavioralDriver | "auto">("auto");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showDriverOptions, setShowDriverOptions] = useState(false);

  useEffect(() => {
    setGradeLevel(getDefaultGradeLevel(childAge));
  }, [childAge]);

  const curriculumTopics = getCurriculumTopics(gradeLevel, subject);
  const activeGap = detectedGaps[subject];

  const handleTopicClick = (topic: CurriculumTopic) => {
    if (selectedTopicId === topic.id) {
      setSelectedTopicId(null);
      setInstruction("");
    } else {
      setSelectedTopicId(topic.id);
      setInstruction(topic.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed) {
      toast.error("Veuillez saisir la consigne du devoir ou cliquer sur un sujet au programme.");
      return;
    }
    if (isGenerating) return;

    try {
      await onGenerate({
        gradeLevel,
        subject,
        homeworkInstruction: trimmed,
        behavioralDriver: driver === "auto" ? undefined : driver,
        suggestedTopicId: selectedTopicId ?? undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la fusion du devoir.";
      toast.error(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-5 animate-in fade-in duration-300 ${className}`}
      data-testid="academic-homework-input-form"
    >
      {/* 1. Grade Level Selector Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="grade-level-selector" className="text-xs font-display font-black uppercase tracking-wider text-ink">
            1. Classe de {childName}
          </label>
          <span className="text-[11px] font-bold text-ink/60">
            {GRADE_LEVEL_METADATA[gradeLevel]?.cycle}
          </span>
        </div>
        <div
          id="grade-level-selector"
          role="group"
          aria-label={`Classe de ${childName}`}
          className="flex flex-wrap gap-1.5"
          data-testid="grade-level-selector"
        >
          {GRADE_LEVELS.map((g) => {
            const isSelected = gradeLevel === g;
            const meta = GRADE_LEVEL_METADATA[g];
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGradeLevel(g);
                  setSelectedTopicId(null);
                }}
                data-grade={g}
                aria-pressed={isSelected}
                className={`rounded-xl px-3 py-1.5 text-xs font-display font-black transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-brand border-brand text-white shadow-xs scale-105"
                    : "bg-white border-ink/10 text-ink/70 hover:bg-surface hover:text-ink"
                }`}
              >
                {meta?.label ?? g}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subject Grid Buttons */}
      <div>
        <label htmlFor="subject-grid" className="block text-xs font-display font-black uppercase tracking-wider text-ink mb-2">
          2. Matière du Devoir
        </label>
        <div
          id="subject-grid"
          role="group"
          aria-label="Matière du Devoir"
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
          data-testid="subject-grid"
        >
          {ACADEMIC_SUBJECTS.map((s) => {
            const isSelected = subject === s;
            const hasGap = Boolean(detectedGaps[s]);
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSubject(s);
                  setSelectedTopicId(null);
                }}
                data-subject={s}
                aria-pressed={isSelected}
                className={`rounded-2xl p-3 text-left transition-all cursor-pointer border flex flex-col justify-between ${
                  isSelected
                    ? "bg-sky-50 border-brand text-ink font-extrabold shadow-sm ring-2 ring-brand/30"
                    : "bg-white border-ink/10 text-ink/75 hover:bg-surface font-semibold"
                }`}
              >
                <span className="text-xs font-bold">{ACADEMIC_SUBJECT_LABELS[s]}</span>
                {hasGap && (
                  <span
                    data-testid={`gap-badge-${s}`}
                    className="mt-1 text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 w-fit"
                  >
                    <Target className="size-2.5" />
                    Lacune détectée
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Dynamic Curriculum Topic Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="curriculum-topics" className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
            Sujets du programme au {GRADE_LEVEL_METADATA[gradeLevel]?.label}
          </label>
          {activeGap !== undefined && (
            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              🎯 Cible Naya : {activeGap} ans
            </span>
          )}
        </div>
        <div
          id="curriculum-topics"
          role="group"
          aria-label={`Sujets du programme au ${GRADE_LEVEL_METADATA[gradeLevel]?.label}`}
          className="flex flex-wrap gap-1.5"
          data-testid="curriculum-topics"
        >
          {curriculumTopics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleTopicClick(topic)}
                data-topic-id={topic.id}
                aria-pressed={isSelected}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-brand text-white border-brand scale-105"
                    : "bg-white border-ink/10 text-ink/80 hover:bg-brand-50 hover:border-brand/30 hover:text-brand"
                }`}
                title={topic.hook}
              >
                {isSelected ? "✓ " : "+ "}
                {topic.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Explicit Homework Text Input Field */}
      <div>
        <label htmlFor="homework-instruction-input" className="block text-xs font-display font-black uppercase tracking-wider text-ink mb-2">
          3. Consigne précise du devoir
        </label>
        <textarea
          id="homework-instruction-input"
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value.slice(0, 500));
            if (selectedTopicId) setSelectedTopicId(null);
          }}
          rows={3}
          placeholder={`Ex: "Réviser les tables de multiplication de 7 et 8", "Accord du participe passé", ou "Le cycle de l'eau"`}
          className="w-full rounded-2xl border border-ink/10 bg-white p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm resize-none transition-all text-ink"
          data-testid="homework-instruction-input"
        />
        <div className="flex justify-between items-center mt-1 text-[10px] text-ink/50 font-bold">
          <span>Tapez le sujet ou choisissez une suggestion ci-dessus.</span>
          <span>{instruction.length} / 500</span>
        </div>
      </div>

      {/* 5. Behavioral Driver Selector */}
      <div className="pt-2 border-t border-dashed border-ink/15">
        <button
          type="button"
          onClick={() => setShowDriverOptions(!showDriverOptions)}
          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          data-testid="toggle-driver-options"
        >
          <Layers className="size-3.5" />
          <span>
            {showDriverOptions
              ? "Masquer les options de fusion"
              : "Mécanique de fusion de Naya (Optionnel)"}
          </span>
        </button>

        {showDriverOptions && (
          <div className="mt-3 p-3.5 rounded-2xl bg-white border border-ink/10 space-y-2 animate-in fade-in duration-200">
            <p id="driver-selector-label" className="text-xs font-bold text-ink mb-2">
              Comment Naya doit-elle transformer ce devoir ?
            </p>
            <div
              id="driver-selector"
              role="group"
              aria-labelledby="driver-selector-label"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              data-testid="driver-selector"
            >
              <button
                type="button"
                onClick={() => setDriver("auto")}
                aria-pressed={driver === "auto"}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  driver === "auto"
                    ? "bg-brand text-white border-brand font-black"
                    : "bg-surface text-ink border-ink/10 font-semibold hover:bg-surface/80"
                }`}
              >
                <span className="block font-bold">🪄 Mode Automatique</span>
                <span className="text-[10px] opacity-80">Naya sélectionne le meilleur levier</span>
              </button>
              {BEHAVIORAL_DRIVERS.map((d) => {
                const info = BEHAVIORAL_DRIVER_LABELS[d];
                const isSelected = driver === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDriver(d)}
                    data-driver={d}
                    aria-pressed={isSelected}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand text-white border-brand font-black"
                        : "bg-surface text-ink border-ink/10 font-semibold hover:bg-surface/80"
                    }`}
                  >
                    <span className="block font-bold">{info.title}</span>
                    <span className="text-[10px] opacity-80 line-clamp-1">{info.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!instruction.trim() || isGenerating}
        data-testid="submit-homework-button"
        className="w-full press-brand rounded-2xl bg-brand py-3.5 px-4 text-sm font-display font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="size-4 animate-spin text-white" />
            <span>Fusion du devoir en quête...</span>
          </>
        ) : (
          <>
            <Sparkles className="size-5" />
            <span>Transformer le devoir en défi ludique 🚀</span>
          </>
        )}
      </button>
    </form>
  );
}

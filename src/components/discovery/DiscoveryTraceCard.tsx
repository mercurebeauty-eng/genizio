import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_DOMAIN_LABELS,
  DISCOVERY_AUTONOMY_LABELS,
  DISCOVERY_OUTCOME_LABELS,
  type DiscoverySourceType,
  type DiscoveryDomain,
  type DiscoveryAutonomyLevel,
  type DiscoveryOutcomeStatus,
  type DiscoveryAIAnalysis,
  addMentorDiscoveryFeedback,
} from "@/lib/discovery.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import {
  Sparkles,
  Compass,
  Lightbulb,
  Beaker,
  Hammer,
  Users,
  Award,
  Clock,
  RotateCcw,
  ShieldCheck,
  Zap,
  TrendingUp,
  MessageSquare,
  UserCheck,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type DiscoveryTraceCardProps = {
  trace: {
    id: string;
    child_id: string;
    source_type: string;
    title: string;
    description: string;
    domain: string;
    perceived_difficulty?: string | null;
    attempts_count: number;
    duration_minutes?: number | null;
    autonomy_level?: string | null;
    help_context?: string | null;
    strategy_used?: string | null;
    outcome_status: string;
    proof_image_url?: string | null;
    naya_dialogue?: any;
    ai_behavioral_analysis?: any;
    mentor_notes?: string | null;
    mentor_reviewed_at?: string | null;
    created_at: string;
  };
  isMentorView?: boolean;
  onFeedbackSaved?: (updatedTrace: any) => void;
};

export function DiscoveryTraceCard({
  trace,
  isMentorView = false,
  onFeedbackSaved,
}: DiscoveryTraceCardProps) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [mentorInput, setMentorInput] = useState(trace.mentor_notes || "");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const addMentorDiscoveryFeedbackFn = useServerFn(addMentorDiscoveryFeedback);

  const sourceMeta = DISCOVERY_SOURCE_LABELS[trace.source_type as DiscoverySourceType] || {
    label: "Découverte",
    badge: "Exploration",
    description: "",
  };

  const domainLabel = DISCOVERY_DOMAIN_LABELS[trace.domain as DiscoveryDomain] || trace.domain;

  const outcomeMeta = DISCOVERY_OUTCOME_LABELS[trace.outcome_status as DiscoveryOutcomeStatus] || {
    label: trace.outcome_status,
    tone: "info" as const,
  };

  const ai = trace.ai_behavioral_analysis as DiscoveryAIAnalysis | null;
  const dialogue = Array.isArray(trace.naya_dialogue) ? trace.naya_dialogue : [];

  // Extraction structurée si projet collectif ou événement officiel
  const isTeamProject = trace.source_type === "projet_collectif";
  let teamRolesStr = "";
  let teamDynamicStr = "";
  let teamNoteStr = "";
  let officialEventName = "";

  if (trace.strategy_used) {
    const parts = trace.strategy_used.split("|").map((p: string) => p.trim());
    for (const part of parts) {
      if (part.startsWith("Événement:")) {
        officialEventName = part.replace(/^Événement:\s*/, "");
      } else if (part.startsWith("Rôle(s):") || part.startsWith("Rôle:")) {
        teamRolesStr = part.replace(/^Rôle(\(s\))?:\s*/, "");
      } else if (part.startsWith("Dynamique:")) {
        teamDynamicStr = part.replace(/^Dynamique:\s*/, "");
      } else if (part.startsWith("Note:") || part.startsWith("Précision:")) {
        teamNoteStr = part.replace(/^(Note|Précision):\s*/, "");
      }
    }
  }

  const handleSaveMentorFeedback = async () => {
    if (!mentorInput.trim()) return;
    setIsSavingFeedback(true);
    try {
      const res = await addMentorDiscoveryFeedbackFn({
        data: {
          traceId: trace.id,
          notes: mentorInput.trim(),
        },
      });
      if (res.success && res.trace) {
        toast.success("Observation mentor enregistrée.");
        if (onFeedbackSaved) onFeedbackSaved(res.trace);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors de l'enregistrement de l'observation mentor.");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-ink/10 shadow-sm hover:shadow-md transition-all space-y-4">
      {/* En-tête de la carte */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge Source */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              trace.source_type === "self_chosen"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : trace.source_type === "found_external"
                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                  : trace.source_type === "open_sandbox"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : trace.source_type === "fablab_marathon"
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
            }`}
          >
            {trace.source_type === "self_chosen" && <Sparkles className="size-3.5" />}
            {trace.source_type === "found_external" && <Lightbulb className="size-3.5" />}
            {trace.source_type === "open_sandbox" && <Beaker className="size-3.5" />}
            {trace.source_type === "fablab_marathon" && <Hammer className="size-3.5" />}
            {trace.source_type === "projet_collectif" && <Users className="size-3.5" />}
            <span>{sourceMeta.label}</span>
          </span>

          {/* Badge Domaine */}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-ink/70 border border-ink/5">
            {domainLabel}
          </span>

          {(trace as any).child_profiles?.username &&
            (trace as any).source_type === "projet_collectif" && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Users className="size-3" />
                Par @{(trace as any).child_profiles.username}
              </span>
            )}

          {/* Badge Événement Officiel Certifié */}
          {officialEventName && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
              <Award className="size-3 text-amber-700" />
              <span>🏛️ {officialEventName}</span>
            </span>
          )}

          {/* Badges Spécifiques Équipe ou Stratégie standard */}
          {isTeamProject && teamRolesStr ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-900 border border-rose-200/80 flex items-center gap-1">
              <Award className="size-3 text-rose-700" />
              <span>{teamRolesStr}</span>
            </span>
          ) : trace.strategy_used && !officialEventName ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60 max-w-xs truncate">
              {trace.strategy_used}
            </span>
          ) : null}

          {isTeamProject && teamDynamicStr && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-900 border border-sky-200/80 flex items-center gap-1">
              <Users className="size-3 text-sky-700" />
              <span>{teamDynamicStr}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink/50 font-medium">
          <Clock className="size-3.5" />
          <span>{formatDate(trace.created_at)}</span>
        </div>
      </div>

      {/* Titre & Description */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-ink tracking-tight">{trace.title}</h3>
        <p className="text-xs sm:text-sm text-ink/75 leading-relaxed">{trace.description}</p>
        {trace.help_context && (
          <p className="text-[11px] text-ink/60 font-medium bg-stone-50 p-2 rounded-xl border border-ink/5">
            <strong>Contexte :</strong> {trace.help_context}
          </p>
        )}
        {teamNoteStr && (
          <p className="text-[11px] text-rose-900/80 font-medium bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/60 flex items-start gap-1.5">
            <span className="font-bold text-rose-950 shrink-0">Note d'équipe :</span>
            <span className="italic leading-snug">{teamNoteStr}</span>
          </p>
        )}
      </div>

      {/* Métriques d'exploration */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        {trace.autonomy_level && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-50 text-violet-800 font-bold border border-violet-100">
            <ShieldCheck className="size-3.5" />
            <span>
              {DISCOVERY_AUTONOMY_LABELS[trace.autonomy_level as DiscoveryAutonomyLevel] ||
                trace.autonomy_level}
            </span>
          </span>
        )}

        {trace.duration_minutes && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 text-ink/70 font-semibold border border-ink/5">
            <Clock className="size-3.5" />
            <span>{trace.duration_minutes} min</span>
          </span>
        )}

        {trace.attempts_count > 1 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-800 font-bold border border-orange-100">
            <RotateCcw className="size-3.5" />
            <span>{trace.attempts_count} essais (Persévérance)</span>
          </span>
        )}

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
            outcomeMeta.tone === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : outcomeMeta.tone === "warning"
                ? "bg-amber-50 text-amber-800 border border-amber-100"
                : "bg-blue-50 text-blue-800 border border-blue-100"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>{outcomeMeta.label}</span>
        </span>
      </div>

      {/* Preuve photo si existante & synchronisée au Portfolio */}
      {trace.proof_image_url && (
        <div className="pt-2 space-y-1.5">
          <div className="relative rounded-2xl overflow-hidden border border-ink/10 max-h-56 max-w-sm shadow-xs group">
            <img
              src={trace.proof_image_url}
              alt={trace.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="size-3 text-emerald-400" />
              <span>Dans la Galerie Portfolio</span>
            </div>
          </div>
          {ai?.image_feedback && (
            <p className="text-[11px] text-ink/65 italic pl-1">"{ai.image_feedback}"</p>
          )}
        </div>
      )}

      {/* Analyse IA Naya */}
      {ai && (
        <div className="mt-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NayaAvatar className="size-7 border border-amber-300" />
              <span className="text-xs font-black text-ink">Observation cognitive de Naya</span>
            </div>
            {ai.potential_anomaly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 animate-pulse">
                <Zap className="size-3 fill-current" />
                <span>Anomalie Positive détectée</span>
              </span>
            )}
          </div>

          <p className="text-xs text-ink/80 leading-relaxed font-medium">{ai.summary}</p>

          {/* Jauges d'initiative & persévérance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100 text-center">
              <span className="text-[10px] text-ink/60 font-bold block">Initiative</span>
              <span className="text-sm font-black text-brand">{ai.initiative_score || 8}/10</span>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100 text-center">
              <span className="text-[10px] text-ink/60 font-bold block">Persévérance</span>
              <span className="text-sm font-black text-orange-600">
                {ai.perseverance_score || 7}/10
              </span>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100 text-center">
              <span className="text-[10px] text-ink/60 font-bold block">Curiosité</span>
              <span className="text-sm font-black text-sky-600">{ai.curiosity_score || 9}/10</span>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100 text-center">
              <span className="text-[10px] text-ink/60 font-bold block">Autonomie</span>
              <span className="text-sm font-black text-violet-600">
                {ai.autonomy_score || 8}/10
              </span>
            </div>
          </div>

          {/* Hypothèse de calibration si anomalie */}
          {ai.potential_anomaly && ai.anomaly_hypothesis && (
            <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
              <TrendingUp className="size-4 shrink-0 text-amber-700 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Hypothèse de calibration :</span>
                <p className="leading-snug">{ai.anomaly_hypothesis}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogue métacognitif Naya (Repliable) */}
      {dialogue.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDialogue(!showDialogue)}
            className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="size-3.5" />
            <span>
              {showDialogue
                ? "Masquer les échanges avec Naya"
                : `Voir les échanges métacognitifs (${dialogue.length})`}
            </span>
          </button>

          {showDialogue && (
            <div className="mt-2 space-y-2 p-3 rounded-2xl bg-stone-50 border border-ink/5 text-xs">
              {dialogue.map((d: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <span className="font-bold text-ink/60 block">{d.question}</span>
                  <p className="text-ink font-medium pl-2 border-l-2 border-brand/40 bg-white/60 p-1.5 rounded-r-lg">
                    {d.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Espace Mentor */}
      <div className="pt-2 border-t border-ink/5 space-y-2">
        {trace.mentor_notes ? (
          <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
              <UserCheck className="size-4 text-sky-700" />
              <span>
                Observation du Mentor ({formatDate(trace.mentor_reviewed_at || trace.created_at)})
              </span>
            </div>
            <p className="text-xs text-sky-950 leading-relaxed pl-5">{trace.mentor_notes}</p>
          </div>
        ) : null}

        {isMentorView && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-ink/70 flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-sky-600" />
              <span>Votre retour de mentor sur cette exploration :</span>
            </label>
            <div className="flex gap-2">
              <Textarea
                value={mentorInput}
                onChange={(e) => setMentorInput(e.target.value)}
                placeholder="Notez vos observations pour la prochaine séance ou pour le bilan..."
                rows={2}
                className="rounded-xl text-xs border-ink/15 focus:border-sky-500 font-medium"
              />
              <Button
                type="button"
                onClick={handleSaveMentorFeedback}
                disabled={isSavingFeedback || !mentorInput.trim()}
                className="self-end rounded-xl px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0"
              >
                {isSavingFeedback ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

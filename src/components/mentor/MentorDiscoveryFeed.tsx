import React, { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDiscoveryTracesForChild } from "@/lib/discovery.functions";
import { DiscoveryTraceCard } from "@/components/discovery/DiscoveryTraceCard";
import { DiscoveryRecordDialog } from "@/components/discovery/DiscoveryRecordDialog";
import { Compass, Sparkles, Plus, Loader2, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type MentorDiscoveryFeedProps = {
  childId: string;
  childName: string;
};

export function MentorDiscoveryFeed({ childId, childName }: MentorDiscoveryFeedProps) {
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTracesFn = useServerFn(getDiscoveryTracesForChild);

  const loadTraces = async () => {
    setLoading(true);
    try {
      const res = await getTracesFn({ data: { childId } });
      setTraces(res || []);
    } catch (err) {
      console.error("Erreur chargement traces découverte mentor :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (childId) loadTraces();
  }, [childId]);

  const handleFeedbackSaved = (updatedTrace: any) => {
    setTraces((prev) =>
      prev.map((t) => (t.id === updatedTrace.id ? { ...t, ...updatedTrace } : t)),
    );
  };

  const handleTraceCreated = (newTrace: any) => {
    setTraces((prev) => [newTrace, ...prev]);
  };

  const anomalies = traces.filter(
    (t) => t.ai_behavioral_analysis?.potential_anomaly === true,
  );

  return (
    <div className="space-y-6">
      {/* Explication Pédagogique Mentor */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-amber-700 stroke-[2.2]" />
            <h3 className="text-sm font-black text-amber-950">
              Espace Découverte — Initiatives & Explorations Libres
            </h3>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="rounded-xl px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Noter une exploration</span>
          </Button>
        </div>
        <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
          Ce flux répertorie les activités et réalisations que <strong>{childName}</strong> entreprend de son propre chef ou explore en dehors des quêtes imposées. Ces traces révèlent son autonomie réelle, sa curiosité spontanée et ses stratégies d'apprentissage naturelles.
        </p>
      </div>

      {/* Alerte Anomalies Positives / Hypothèses */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-100/90 to-orange-100/80 border border-amber-300 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-800 fill-current animate-bounce" />
            <span className="text-xs font-black text-amber-950">
              {anomalies.length} signalement(s) d'anomalie positive détecté(s) par Naya
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-snug">
            Naya a identifié des indices de potentiel supérieur ou d'initiative marquée sur certaines explorations. Vous pouvez vous appuyer sur ces pistes pour calibrer vos prochaines séances.
          </p>
        </div>
      )}

      {/* Liste des Traces */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-ink/50">
          <Loader2 className="size-6 animate-spin text-brand" />
          <span className="text-xs font-medium">Chargement des traces d'initiative...</span>
        </div>
      ) : traces.length === 0 ? (
        <div className="p-8 rounded-2xl bg-stone-50 border border-ink/10 text-center space-y-3">
          <Info className="size-8 text-ink/30 mx-auto" />
          <p className="text-sm font-bold text-ink/70">
            Aucune exploration libre enregistrée pour le moment.
          </p>
          <p className="text-xs text-ink/50 max-w-sm mx-auto leading-relaxed">
            Encouragez la famille ou notez lors de votre prochaine séance les réalisations spontanées de {childName} pour enrichir son profil d'apprentissage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {traces.map((t) => (
            <DiscoveryTraceCard
              key={t.id}
              trace={t}
              isMentorView={true}
              onFeedbackSaved={handleFeedbackSaved}
            />
          ))}
        </div>
      )}

      <DiscoveryRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        childId={childId}
        childName={childName}
        onTraceCreated={handleTraceCreated}
        initialSource="open_sandbox"
      />
    </div>
  );
}

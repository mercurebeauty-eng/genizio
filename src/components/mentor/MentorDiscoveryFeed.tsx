import React, { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDiscoveryTracesForChild, type DiscoverySourceType } from "@/lib/discovery.functions";
import { DiscoveryTraceCard } from "@/components/discovery/DiscoveryTraceCard";
import { DiscoveryRecordDialog } from "@/components/discovery/DiscoveryRecordDialog";
import {
  Compass,
  Sparkles,
  Lightbulb,
  Beaker,
  Hammer,
  Users,
  Plus,
  Loader2,
  Zap,
  Info,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MentorDiscoveryFeedProps = {
  childId: string;
  childName: string;
};

export function MentorDiscoveryFeed({ childId, childName }: MentorDiscoveryFeedProps) {
  const [traces, setTraces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSource, setDialogSource] = useState<DiscoverySourceType>("self_chosen");
  const [sourceFilter, setSourceFilter] = useState<DiscoverySourceType | "all">("all");

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

  const handleOpenForSource = (source: DiscoverySourceType) => {
    setDialogSource(source);
    setDialogOpen(true);
  };

  const handleFeedbackSaved = (updatedTrace: any) => {
    setTraces((prev) =>
      prev.map((t) => (t.id === updatedTrace.id ? { ...t, ...updatedTrace } : t)),
    );
  };

  const handleTraceCreated = (newTrace: any) => {
    setTraces((prev) => [newTrace, ...prev]);
  };

  const anomalies = traces.filter((t) => t.ai_behavioral_analysis?.potential_anomaly === true);

  const filteredTraces =
    sourceFilter === "all" ? traces : traces.filter((t) => t.source_type === sourceFilter);

  return (
    <div className="space-y-6">
      {/* Explication Pédagogique Mentor */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-amber-700 stroke-[2.2]" />
            <h3 className="text-sm font-black text-amber-950">
              Espace Découverte — Initiatives & Explorations Libres
            </h3>
          </div>

          {/* Menu Déroulant 5 Portes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="rounded-xl px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>Noter une exploration</span>
                <ChevronDown className="size-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 rounded-2xl shadow-xl border border-ink/10"
            >
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-ink/50 px-2 py-1">
                Explorations Individuelles
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleOpenForSource("self_chosen")}
                className="rounded-xl p-2 cursor-pointer focus:bg-amber-50"
              >
                <Sparkles className="size-4 text-amber-600 mr-2" />
                <div className="text-xs">
                  <span className="font-bold text-ink block">🚀 1. Je choisis</span>
                  <span className="text-[10px] text-ink/60 font-medium">Initiative & Création</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenForSource("found_external")}
                className="rounded-xl p-2 cursor-pointer focus:bg-sky-50"
              >
                <Lightbulb className="size-4 text-sky-600 mr-2" />
                <div className="text-xs">
                  <span className="font-bold text-ink block">🔍 2. Je trouve</span>
                  <span className="text-[10px] text-ink/60 font-medium">Curiosité Externe</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenForSource("open_sandbox")}
                className="rounded-xl p-2 cursor-pointer focus:bg-emerald-50"
              >
                <Beaker className="size-4 text-emerald-600 mr-2" />
                <div className="text-xs">
                  <span className="font-bold text-ink block">🧪 3. Je tente</span>
                  <span className="text-[10px] text-ink/60 font-medium">Laboratoire Libre</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-ink/50 px-2 py-1">
                Ateliers & Collectif
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleOpenForSource("fablab_marathon")}
                className="rounded-xl p-2 cursor-pointer focus:bg-indigo-50"
              >
                <Hammer className="size-4 text-indigo-600 mr-2" />
                <div className="text-xs">
                  <span className="font-bold text-ink block">⚙️ 4. Fab Lab & Atelier</span>
                  <span className="text-[10px] text-ink/60 font-medium">Immersion Outils</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenForSource("projet_collectif")}
                className="rounded-xl p-2 cursor-pointer focus:bg-rose-50"
              >
                <Users className="size-4 text-rose-600 mr-2" />
                <div className="text-xs">
                  <span className="font-bold text-ink block">👥 5. Projet d'Équipe</span>
                  <span className="text-[10px] text-ink/60 font-medium">Coopération & Guilde</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
          Ce flux répertorie les activités et réalisations que <strong>{childName}</strong>{" "}
          entreprend de son propre chef ou explore en dehors des quêtes imposées. Ces traces
          révèlent son autonomie réelle, sa curiosité spontanée et ses stratégies d'apprentissage
          naturelles.
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
            Naya a identifié des indices de potentiel supérieur ou d'initiative marquée sur
            certaines explorations. Vous pouvez vous appuyer sur ces pistes pour calibrer vos
            prochaines séances.
          </p>
        </div>
      )}

      {/* Barre de Filtres */}
      {traces.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "Toutes", count: traces.length },
            {
              id: "self_chosen",
              label: "🚀 Créations",
              count: traces.filter((t) => t.source_type === "self_chosen").length,
            },
            {
              id: "found_external",
              label: "🔍 Trouvées",
              count: traces.filter((t) => t.source_type === "found_external").length,
            },
            {
              id: "open_sandbox",
              label: "🧪 Labo",
              count: traces.filter((t) => t.source_type === "open_sandbox").length,
            },
            {
              id: "fablab_marathon",
              label: "⚙️ Fab Lab",
              count: traces.filter((t) => t.source_type === "fablab_marathon").length,
            },
            {
              id: "projet_collectif",
              label: "👥 Équipe",
              count: traces.filter((t) => t.source_type === "projet_collectif").length,
            },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSourceFilter(f.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                sourceFilter === f.id
                  ? "bg-ink text-white shadow-xs"
                  : "bg-white border border-ink/10 text-ink/60 hover:text-ink hover:border-ink/20"
              }`}
            >
              <span>{f.label}</span>
              {f.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    sourceFilter === f.id ? "bg-white/20 text-white" : "bg-stone-100 text-ink/60"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
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
            Encouragez la famille ou notez lors de votre prochaine séance les réalisations
            spontanées de {childName} pour enrichir son profil d'apprentissage.
          </p>
        </div>
      ) : filteredTraces.length === 0 ? (
        <div className="p-6 rounded-2xl bg-stone-50 border border-ink/10 text-center space-y-2">
          <p className="text-xs text-ink/60 font-medium">
            Aucune exploration ne correspond à ce filtre.
          </p>
          <button
            onClick={() => setSourceFilter("all")}
            className="text-xs font-bold text-brand hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTraces.map((t) => (
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
        initialSource={dialogSource}
      />
    </div>
  );
}

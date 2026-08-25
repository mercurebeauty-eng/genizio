import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getDiscoveryTracesForChild, type DiscoverySourceType } from "@/lib/discovery.functions";
import { getMentorChildView } from "@/lib/mentors.functions";
import { isMentorMode } from "@/lib/mentor-mode";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { GenizioLoader } from "@/components/GenizioLoader";
import { DiscoveryRecordDialog } from "@/components/discovery/DiscoveryRecordDialog";
import { DiscoveryTraceCard } from "@/components/discovery/DiscoveryTraceCard";
import { NayaAvatar } from "@/components/NayaAvatar";
import {
  Compass,
  Sparkles,
  Lightbulb,
  Beaker,
  ArrowLeft,
  BookOpen,
  Trophy,
  Filter,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profiles/$profileId/decouverte")({
  component: DiscoveryPage,
});

type ChildProfile = {
  id: string;
  name: string;
  age: number;
  talents: Record<string, number> | null;
};

function DiscoveryPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [traces, setTraces] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSource, setDialogSource] = useState<DiscoverySourceType>("self_chosen");
  const [sourceFilter, setSourceFilter] = useState<DiscoverySourceType | "all">("all");

  const getTracesFn = useServerFn(getDiscoveryTracesForChild);
  const getMentorChildViewFn = useServerFn(getMentorChildView);
  const mentorMode = isMentorMode(session);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [session, loading, navigate]);

  const loadData = async () => {
    if (!session?.user?.id) return;
    setFetching(true);
    try {
      if (mentorMode) {
        const view = await getMentorChildViewFn({ data: { childId: profileId } });
        setChild(view.child as ChildProfile);
      } else {
        const { data: c } = await supabase
          .from("child_profiles")
          .select("id, name, age, talents")
          .eq("id", profileId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        setChild(c as ChildProfile);
      }

      const traceList = await getTracesFn({ data: { childId: profileId } });
      setTraces(traceList || []);
    } catch (err) {
      console.error("Erreur lors du chargement de l'espace découverte :", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profileId, session?.user?.id, mentorMode]);

  const handleOpenDialog = (source: DiscoverySourceType = "self_chosen") => {
    setDialogSource(source);
    setDialogOpen(true);
  };

  const handleTraceCreated = (newTrace: any) => {
    setTraces((prev) => [newTrace, ...prev]);
  };

  const handleFeedbackSaved = (updatedTrace: any) => {
    setTraces((prev) =>
      prev.map((t) => (t.id === updatedTrace.id ? { ...t, ...updatedTrace } : t)),
    );
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <GenizioLoader label="Ouverture de l'Espace Découverte..." />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-sm font-bold text-ink/70">Profil enfant introuvable.</p>
        <Link
          to="/profiles"
          className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs"
        >
          Retour aux profils
        </Link>
      </div>
    );
  }

  const filteredTraces =
    sourceFilter === "all" ? traces : traces.filter((t) => t.source_type === sourceFilter);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-ink pb-32">
      <AppHeader profileId={profileId} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Barre de retour propre sans redondance */}
        <div className="flex items-center justify-between">
          <Link
            to="/profiles/$profileId/challenges"
            params={{ profileId }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Retour aux défis de {child.name}</span>
          </Link>

          <Link
            to="/profiles/$profileId/portfolio"
            params={{ profileId }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-3 py-1.5 rounded-full border border-amber-300/60 transition-all cursor-pointer"
          >
            <Trophy className="size-3.5" />
            <span>Voir le Portfolio & Galerie</span>
          </Link>
        </div>

        {/* Hero Banner Découverte — 3 Pôles d'Action Dédiés */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-amber-100/40 border border-amber-200/80 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-200/80 text-amber-900 border border-amber-300/50">
                <Compass className="size-3.5 stroke-[2.5]" />
                <span>Laboratoire d'Initiative Libre</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                Espace Découverte
              </h1>
              <p className="text-xs sm:text-sm text-ink/75 font-medium leading-relaxed max-w-lg">
                Ici, aucune consigne n'est imposée. Choisissez une porte d'entrée ci-dessous pour raconter à Naya ce que{" "}
                <strong className="text-brand font-black">{child.name}</strong> a exploré de son propre élan.
              </p>
            </div>

            <NayaAvatar className="size-14 sm:size-16 shrink-0 border-2 border-amber-300 shadow-md hidden xs:flex" />
          </div>

          {/* 3 Grandes Portes d'Entrée aux Questionnements Métacognitifs Distincts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Je choisis */}
            <button
              type="button"
              onClick={() => handleOpenDialog("self_chosen")}
              className="p-4 rounded-2xl bg-white/95 hover:bg-white border-2 border-amber-300 text-left transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer space-y-2 group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full">
                    🚀 1. Je choisis
                  </span>
                  <Sparkles className="size-4 text-amber-600 group-hover:scale-125 transition-transform" />
                </div>
                <h3 className="text-sm font-black text-ink group-hover:text-amber-900 transition-colors">
                  Initiative & Création
                </h3>
                <p className="text-[11px] text-ink/65 font-medium leading-snug">
                  Une idée, un bricolage, un conte ou un projet né de sa propre imagination.
                </p>
              </div>
              <span className="text-[10px] font-black text-amber-700 inline-flex items-center gap-1 pt-1">
                <span>Raconter sa création</span>
                <ChevronRight className="size-3" />
              </span>
            </button>

            {/* 2. Je trouve */}
            <button
              type="button"
              onClick={() => handleOpenDialog("found_external")}
              className="p-4 rounded-2xl bg-white/95 hover:bg-white border-2 border-sky-300 text-left transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer space-y-2 group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-900 bg-sky-100/90 px-2 py-0.5 rounded-full">
                    🔍 2. Je trouve
                  </span>
                  <Lightbulb className="size-4 text-sky-600 group-hover:scale-125 transition-transform" />
                </div>
                <h3 className="text-sm font-black text-ink group-hover:text-sky-900 transition-colors">
                  Curiosité Externe
                </h3>
                <p className="text-[11px] text-ink/65 font-medium leading-snug">
                  Un casse-tête, un défi scolaire ardu ou une énigme découverte ailleurs.
                </p>
              </div>
              <span className="text-[10px] font-black text-sky-700 inline-flex items-center gap-1 pt-1">
                <span>Décortiquer le défi</span>
                <ChevronRight className="size-3" />
              </span>
            </button>

            {/* 3. Je tente */}
            <button
              type="button"
              onClick={() => handleOpenDialog("open_sandbox")}
              className="p-4 rounded-2xl bg-white/95 hover:bg-white border-2 border-emerald-300 text-left transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer space-y-2 group shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    🧪 3. Je tente
                  </span>
                  <Beaker className="size-4 text-emerald-600 group-hover:scale-125 transition-transform" />
                </div>
                <h3 className="text-sm font-black text-ink group-hover:text-emerald-900 transition-colors">
                  Laboratoire Libre
                </h3>
                <p className="text-[11px] text-ink/65 font-medium leading-snug">
                  Une expérience spontanée par essais-erreurs sans consigne scolaire fermée.
                </p>
              </div>
              <span className="text-[10px] font-black text-emerald-700 inline-flex items-center gap-1 pt-1">
                <span>Consigner l'expérience</span>
                <ChevronRight className="size-3" />
              </span>
            </button>
          </div>
        </div>

        {/* Section Liste des Explorations avec Filtres Dédiés */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h2 className="text-base font-black text-ink flex items-center gap-2">
              <span>Journal des explorations</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-200 text-ink/70">
                {traces.length}
              </span>
            </h2>

            {traces.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "Toutes" },
                  { id: "self_chosen", label: "🚀 Créations" },
                  { id: "found_external", label: "🔍 Trouvées" },
                  { id: "open_sandbox", label: "🧪 Labo" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSourceFilter(f.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      sourceFilter === f.id
                        ? "bg-ink text-white shadow-xs"
                        : "bg-white border border-ink/10 text-ink/60 hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {traces.length === 0 ? (
            <div className="w-full bg-white rounded-3xl p-8 sm:p-10 border border-ink/10 shadow-sm text-center space-y-3">
              <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/60 shadow-inner">
                <Compass className="size-7 stroke-[2.2]" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-black text-ink">
                  Aucune exploration enregistrée pour l'instant
                </h3>
                <p className="text-xs text-ink/65 leading-relaxed font-medium">
                  Cliquez sur l'une des 3 portes ci-dessus (<strong>Je choisis</strong>, <strong>Je trouve</strong> ou <strong>Je tente</strong>) pour raconter la première aventure libre de {child.name} !
                </p>
              </div>
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="w-full bg-white rounded-3xl p-6 border border-ink/10 text-center space-y-2">
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
              {filteredTraces.map((trace) => (
                <DiscoveryTraceCard
                  key={trace.id}
                  trace={trace}
                  onFeedbackSaved={handleFeedbackSaved}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <DiscoveryRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        childId={profileId}
        childName={child.name}
        onTraceCreated={handleTraceCreated}
        initialSource={dialogSource}
      />

      <AppTabBar profileId={profileId} />
    </div>
  );
}

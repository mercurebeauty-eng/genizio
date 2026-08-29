import React, { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getDiscoveryAdminStats,
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_DOMAIN_LABELS,
  type DiscoverySourceType,
  type DiscoveryDomain,
} from "@/lib/discovery.functions";
import {
  Compass,
  Sparkles,
  Lightbulb,
  Beaker,
  Zap,
  TrendingUp,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AdminDiscoveryTab() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const getStatsFn = useServerFn(getDiscoveryAdminStats);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await getStatsFn();
      setStats(res);
    } catch (err) {
      console.error("Erreur chargement stats découverte admin :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3 text-ink/50">
        <Loader2 className="size-8 animate-spin text-amber-600" />
        <span className="text-sm font-semibold">Chargement de la télémétrie Découverte...</span>
      </div>
    );
  }

  const bySource = stats?.bySource || { self_chosen: 0, found_external: 0, open_sandbox: 0 };
  const total = stats?.totalTraces || 0;
  const anomalies = stats?.anomalyCount || 0;
  const byDomain: Record<string, number> = stats?.byDomain || {};

  return (
    <div className="space-y-6">
      {/* Header & Vision */}
      <div className="rounded-3xl border border-amber-300/70 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-100/40 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-amber-200/80 text-amber-900 flex items-center justify-center shadow-sm">
            <Compass className="size-7 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">
              Télémétrie Découverte & Initiatives Libres
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-medium">
              Mesure de l'élan d'exploration spontanée des enfants, des signaux d'initiative et des anomalies positives de calibration.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-ink/50">
              Total Explorations Enregistrées
            </CardDescription>
            <CardTitle className="text-3xl font-black text-ink">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              Traces comportementales et cognitives libres recueillies.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-amber-700">
              Initiatives Personnelles (« Je choisis »)
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-700">
              {bySource.self_chosen || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              {total > 0
                ? `${Math.round(((bySource.self_chosen || 0) / total) * 100)}% de toutes les explorations`
                : "Initiatives spontanées de l'enfant"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-emerald-700">
              Anomalies Positives Détectées
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700 flex items-center gap-2">
              <span>{anomalies}</span>
              <Zap className="size-5 fill-current text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              Hypothèses de capacité supérieure transmises au moteur de calibration.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par Source & par Domaine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Typologie des Sources */}
        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white p-6 space-y-4">
          <h3 className="text-base font-black text-ink flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            <span>Répartition des 5 Sources d'Exploration</span>
          </h3>
          <div className="space-y-3">
            {[
              {
                key: "self_chosen" as DiscoverySourceType,
                count: bySource.self_chosen || 0,
                color: "bg-amber-500",
              },
              {
                key: "found_external" as DiscoverySourceType,
                count: bySource.found_external || 0,
                color: "bg-sky-500",
              },
              {
                key: "open_sandbox" as DiscoverySourceType,
                count: bySource.open_sandbox || 0,
                color: "bg-emerald-500",
              },
              {
                key: "fablab_marathon" as DiscoverySourceType,
                count: bySource.fablab_marathon || 0,
                color: "bg-indigo-500",
              },
              {
                key: "projet_collectif" as DiscoverySourceType,
                count: bySource.projet_collectif || 0,
                color: "bg-rose-500",
              },
            ].map(({ key, count, color }) => {
              const meta = DISCOVERY_SOURCE_LABELS[key];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-ink">{meta.label} ({meta.badge})</span>
                    <span className="text-ink/60">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Domaines les plus explorés */}
        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white p-6 space-y-4">
          <h3 className="text-base font-black text-ink flex items-center gap-2">
            <TrendingUp className="size-4 text-brand" />
            <span>Domaines Spontanés les plus Explorés</span>
          </h3>
          {Object.keys(byDomain).length === 0 ? (
            <p className="text-xs text-ink/50 italic py-4 text-center">
              Aucune donnée de domaine disponible.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {Object.entries(byDomain)
                .sort(([, a], [, b]) => b - a)
                .map(([d, count]) => {
                  const label = DISCOVERY_DOMAIN_LABELS[d as DiscoveryDomain] || d;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={d} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-ink">{label}</span>
                        <span className="text-ink/60">{count} explorations</span>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-brand h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

      {/* Dernières explorations */}
      <Card className="rounded-3xl border-ink/10 shadow-sm bg-white p-6 space-y-4">
        <h3 className="text-base font-black text-ink flex items-center gap-2">
          <Clock className="size-4 text-ink/60" />
          <span>Dernières Découvertes Enregistrées</span>
        </h3>
        {stats?.recentTraces && stats.recentTraces.length > 0 ? (
          <div className="divide-y divide-ink/5">
            {stats.recentTraces.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink truncate">
                      {DISCOVERY_DOMAIN_LABELS[t.domain as DiscoveryDomain] || t.domain}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-ink/70">
                      {DISCOVERY_SOURCE_LABELS[t.source_type as DiscoverySourceType]?.label || t.source_type}
                    </span>
                    {t.ai_behavioral_analysis?.potential_anomaly && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                        ⚡ Anomalie
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink/50 block">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <span className="shrink-0 text-emerald-700 font-bold text-[11px]">
                  {t.outcome_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink/50 italic py-4 text-center">
            Aucune découverte récente.
          </p>
        )}
      </Card>
    </div>
  );
}

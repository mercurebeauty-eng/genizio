import React, { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getDiscoveryAdminStats,
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_DOMAIN_LABELS,
  DISCOVERY_TEAM_ROLES,
  DISCOVERY_TEAM_DYNAMICS,
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
  Users,
  Award,
  ShieldCheck,
  Flame,
  ArrowUpRight,
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

  const bySource = stats?.bySource || {
    self_chosen: 0,
    found_external: 0,
    open_sandbox: 0,
    fablab_marathon: 0,
    projet_collectif: 0,
  };
  const total = stats?.totalTraces || 0;
  const anomalies = stats?.anomalyCount || 0;
  const byDomain: Record<string, number> = stats?.byDomain || {};
  const rolesDistribution: Record<string, number> = stats?.rolesDistribution || {};
  const dynamicsDistribution: Record<string, number> = stats?.dynamicsDistribution || {};
  const anomaliesList: any[] = stats?.anomaliesList || [];
  const reviewedCount: number = stats?.reviewedCount || 0;

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
              Télémétrie Découverte, Rôles d'Équipe & Anomalies Positives
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-medium">
              Mesure de l'élan d'exploration spontanée, des postures d'équipe (10 rôles), des
              dynamiques collectives et des signaux de précocité Naya.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-ink/50">
              Total Explorations
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
              Initiatives Spontanées
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-700">
              {bySource.self_chosen || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              {total > 0
                ? `${Math.round(((bySource.self_chosen || 0) / total) * 100)}% de choix 100% autonome`
                : "Initiatives personnelles"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-rose-700">
              Projets d'Équipe
            </CardDescription>
            <CardTitle className="text-3xl font-black text-rose-700 flex items-center gap-2">
              <span>{bySource.projet_collectif || 0}</span>
              <Users className="size-5 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              Coopérations avec rôles et tags de pairs enregistrés.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase text-emerald-700">
              Anomalies Positives
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700 flex items-center gap-2">
              <span>{anomalies}</span>
              <Zap className="size-5 fill-current text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-ink/60 font-medium">
              Signaux de sur-performance transmis à Naya ({reviewedCount} revues par mentor).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par Source & par Domaine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Typologie des Sources (5 Portes) */}
        <Card className="rounded-3xl border-ink/10 shadow-sm bg-white p-6 space-y-4">
          <h3 className="text-base font-black text-ink flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            <span>Répartition des 5 Portes d'Exploration</span>
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
                    <span className="text-ink">
                      {meta?.label || key} ({meta?.badge || "Exploration"})
                    </span>
                    <span className="text-ink/60">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${color} h-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
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

      {/* Matrice des Rôles Naturels & Dynamiques Collectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matrice des 10 Rôles d'Équipe */}
        <Card className="rounded-3xl border-rose-200/80 shadow-sm bg-gradient-to-b from-rose-50/40 to-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-rose-950 flex items-center gap-2">
              <Award className="size-4 text-rose-700" />
              <span>Matrice des Rôles Naturels en Équipe</span>
            </h3>
            <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-100 px-2 py-0.5 rounded-full">
              Intelligence Interpersonnelle
            </span>
          </div>

          {Object.keys(rolesDistribution).length === 0 ? (
            <p className="text-xs text-rose-900/60 italic py-6 text-center">
              En attente de traces de Projets d'Équipe pour cartographier les rôles naturels.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {DISCOVERY_TEAM_ROLES.map((r) => {
                const count = rolesDistribution[r.label] || 0;
                const totalRoles = Object.values(rolesDistribution).reduce((a, b) => a + b, 0);
                const pct = totalRoles > 0 ? Math.round((count / totalRoles) * 100) : 0;
                return (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-white border border-rose-100 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                      <span>{r.label}</span>
                      <span className="text-rose-700">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[10px] text-ink/50 font-normal">{r.desc}</p>
                    <div className="w-full bg-rose-50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Dynamiques Relationnelles d'Équipe */}
        <Card className="rounded-3xl border-sky-200/80 shadow-sm bg-gradient-to-b from-sky-50/40 to-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-sky-950 flex items-center gap-2">
              <Users className="size-4 text-sky-700" />
              <span>Dynamiques Relationnelles Observées</span>
            </h3>
            <span className="text-[10px] font-bold text-sky-700 uppercase bg-sky-100 px-2 py-0.5 rounded-full">
              Synergie de Groupe
            </span>
          </div>

          {Object.keys(dynamicsDistribution).length === 0 ? (
            <p className="text-xs text-sky-900/60 italic py-6 text-center">
              En attente d'enregistrements collectifs pour profiler les dynamiques de groupe.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {DISCOVERY_TEAM_DYNAMICS.map((dyn) => {
                const count = dynamicsDistribution[dyn.label] || 0;
                const totalDyn = Object.values(dynamicsDistribution).reduce((a, b) => a + b, 0);
                const pct = totalDyn > 0 ? Math.round((count / totalDyn) * 100) : 0;
                return (
                  <div
                    key={dyn.id}
                    className="p-2.5 rounded-xl bg-white border border-sky-100 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                      <span>{dyn.label}</span>
                      <span className="text-sky-700">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[10px] text-ink/50 font-normal">{dyn.desc}</p>
                    <div className="w-full bg-sky-50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Radar des Anomalies Positives de Calibration */}
      <Card className="rounded-3xl border-emerald-200 shadow-sm bg-gradient-to-b from-emerald-50/40 to-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-emerald-600 fill-current" />
            <h3 className="text-base font-black text-emerald-950">
              Radar des Anomalies Positives & Signaux Faibles de Précocité
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {anomaliesList.length} signalement{anomaliesList.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-emerald-900/70 font-medium">
          Traces où Naya a détecté une capacité supérieure ou une aisance inattendue lors de
          l'exploration libre, alimentant les cycles d'hypothèses de calibration.
        </p>

        {anomaliesList.length === 0 ? (
          <p className="text-xs text-ink/50 italic py-4 text-center">
            Aucune anomalie positive détectée pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {anomaliesList.map((a: any) => (
              <div
                key={a.id}
                className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-2 hover:border-emerald-400 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-xs text-ink truncate">{a.childName}</span>
                  {a.childAge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-ink/70">
                      {a.childAge} ans
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {DISCOVERY_DOMAIN_LABELS[a.domain as DiscoveryDomain] || a.domain}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">
                    ⚡ Initiative {a.initiativeScore}/10
                  </span>
                </div>
                <p className="text-xs font-bold text-ink line-clamp-1">« {a.title} »</p>
                {a.anomalyHypothesis && (
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-950 leading-snug">
                    <span className="font-bold block text-[10px] text-emerald-800 uppercase">
                      Hypothèse de calibration :
                    </span>
                    {a.anomalyHypothesis}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dernières explorations */}
      <Card className="rounded-3xl border-ink/10 shadow-sm bg-white p-6 space-y-4">
        <h3 className="text-base font-black text-ink flex items-center gap-2">
          <Clock className="size-4 text-ink/60" />
          <span>Dernières Découvertes Enregistrées</span>
        </h3>
        {stats?.recentTraces && stats.recentTraces.length > 0 ? (
          <div className="divide-y divide-ink/5">
            {stats.recentTraces.map((t: any) => {
              const child = t.child_profiles;
              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-ink">{child?.name || "Enfant"}</span>
                      <span className="font-bold text-ink/80 truncate">— « {t.title} »</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-ink/70">
                        {DISCOVERY_SOURCE_LABELS[t.source_type as DiscoverySourceType]?.label ||
                          t.source_type}
                      </span>
                      {t.ai_behavioral_analysis?.potential_anomaly && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                          ⚡ Anomalie
                        </span>
                      )}
                      {t.mentor_reviewed_at && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 flex items-center gap-0.5">
                          <CheckCircle2 className="size-2.5" /> Mentor
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink/50 block">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")} •{" "}
                      {DISCOVERY_DOMAIN_LABELS[t.domain as DiscoveryDomain] || t.domain}
                    </span>
                  </div>
                  <span className="shrink-0 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    {t.outcome_status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-ink/50 italic py-4 text-center">Aucune découverte récente.</p>
        )}
      </Card>
    </div>
  );
}

import React from "react";
import {
  Brain,
  Cpu,
  Coins,
  TrendingUp,
  Layers,
  Zap,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { NayaTelemetryResponse } from "@/lib/naya-telemetry";

interface AdminNayaTabProps {
  telemetry: NayaTelemetryResponse;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function AdminNayaTab({
  telemetry,
  isRefreshing = false,
  onRefresh,
}: AdminNayaTabProps) {
  const {
    totalApiCalls,
    totalTokens,
    tokenUsage,
    totalCostUsd,
    totalCostXof,
    conversionRatePct,
    featureBreakdown,
    modelBreakdown,
    funnel,
    projection,
  } = telemetry;

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-gradient-to-r from-sky/10 via-white to-purple-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-sky/20 text-sky flex items-center justify-center shadow-inner">
            <Brain className="size-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky/10 px-2.5 py-0.5 text-[10px] font-extrabold text-sky uppercase tracking-wider">
                Module IA Naya • Suivi & Coûts
              </span>
              {isRefreshing && (
                <span className="flex items-center gap-1 text-xs text-brand font-bold animate-pulse">
                  <RefreshCw className="size-3 animate-spin" /> Actualisation…
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-black text-ink mt-0.5">
              Telemetry & Diagnostics de Consommation
            </h2>
            <p className="text-xs text-ink/60 font-medium">
              Suivi en temps réel du volume de requêtes, de la répartition des tokens et des coûts estimatifs (Haiku vs Sonnet).
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="press-white rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-extrabold text-ink flex items-center gap-2 shadow-sm hover:shadow-md transition-all self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-brand" : "text-ink/60"}`} />
            <span>Actualiser la télémétrie</span>
          </button>
        )}
      </div>

      {/* 📊 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: API Volume */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Volume d'Appels API</span>
            <Zap className="size-4 text-sky" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-sky">
              {totalApiCalls.toLocaleString("fr-FR")}
            </span>
            <span className="text-xs font-bold text-ink/50">appels</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium flex items-center gap-1">
            <span className="size-2 rounded-full bg-sky inline-block" />
            <strong className="text-ink">{featureBreakdown.length}</strong> modules actifs
          </p>
        </div>

        {/* Card 2: Token Usage */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Consommation Tokens</span>
            <Cpu className="size-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-purple-600">
              {totalTokens.toLocaleString("fr-FR")}
            </span>
            <span className="text-xs font-bold text-ink/50">tokens</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Entrée : <strong className="text-ink">{(tokenUsage.haikuInputTokens + tokenUsage.sonnetInputTokens).toLocaleString("fr-FR")}</strong> | Sortie : <strong className="text-ink">{(tokenUsage.haikuOutputTokens + tokenUsage.sonnetOutputTokens).toLocaleString("fr-FR")}</strong>
          </p>
        </div>

        {/* Card 3: Estimated Cost (USD & XOF) */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Coût Estimé</span>
            <Coins className="size-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-amber-600">
              ${totalCostUsd.toFixed(4)}
            </span>
            <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {totalCostXof.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Taux de conversion : <strong className="text-ink">1 USD ≈ 600 XOF</strong>
          </p>
        </div>

        {/* Card 4: Challenge Conversion Rate % */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Taux de Conversion Défis</span>
            <TrendingUp className="size-4 text-leaf" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-leaf">
              {conversionRatePct}%
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Défis complétés (<strong className="text-ink">{funnel.completed}</strong>) / Générés (<strong className="text-ink">{funnel.generated}</strong>)
          </p>
        </div>
      </div>

      {/* 🧩 Breakdown Grid: Features & Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature Breakdown Panel */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky/10 text-sky">
                <Layers className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-extrabold text-ink">
                  Répartition par Fonctionnalité
                </h3>
                <p className="text-xs text-ink/60 font-medium">
                  Volume et coûts ventilés par cas d'usage IA Naya.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-ink/10 font-extrabold uppercase tracking-wider text-ink/60 pb-2">
                  <th className="py-2.5 pr-3">Fonctionnalité</th>
                  <th className="py-2.5 pr-3">Modèle</th>
                  <th className="py-2.5 pr-3 text-center">Appels</th>
                  <th className="py-2.5 pr-3 text-right">Tokens Estimés</th>
                  <th className="py-2.5 text-right">Coût (USD / XOF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {featureBreakdown.map((item) => (
                  <tr key={item.feature} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 pr-3 font-bold text-ink flex items-center gap-2">
                      <span className="size-2 rounded-full bg-brand inline-block" />
                      {item.feature}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          item.modelUsed.includes("Sonnet")
                            ? "bg-purple-100 text-purple-700"
                            : "bg-sky/10 text-sky"
                        }`}
                      >
                        {item.modelUsed}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center font-bold text-ink">
                      {item.callsCount.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium text-ink/70">
                      {item.estimatedTokens.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-3 text-right">
                      <div className="font-bold text-ink">${item.costUsd.toFixed(4)}</div>
                      <div className="text-[10px] font-semibold text-ink/50">{item.costXof.toLocaleString("fr-FR")} FCFA</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Breakdown Panel (Haiku vs Sonnet) */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600">
              <Cpu className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Distribution par Modèle (Haiku vs Sonnet)
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Part relative du volume et de la facture globale.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {modelBreakdown.map((model) => (
              <div
                key={model.model}
                className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-3 rounded-full ${
                        model.model.includes("Sonnet") ? "bg-purple-600" : "bg-sky"
                      }`}
                    />
                    <span className="font-display font-extrabold text-sm text-ink">
                      {model.model}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink/60">
                      {model.sharePercentage}% du volume
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-ink shadow-sm border border-ink/5">
                      ${model.costUsd.toFixed(4)} ({model.costXof.toLocaleString("fr-FR")} FCFA)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-ink/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      model.model.includes("Sonnet") ? "bg-purple-600" : "bg-sky"
                    }`}
                    style={{ width: `${Math.max(5, model.sharePercentage)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Entrée</div>
                    <div className="font-extrabold text-ink">{model.inputTokens.toLocaleString("fr-FR")}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Sortie</div>
                    <div className="font-extrabold text-ink">{model.outputTokens.toLocaleString("fr-FR")}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Total Tokens</div>
                    <div className="font-black text-ink">{model.totalTokens.toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🚀 Conversion Funnel & Monthly Projection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funnel Card (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-leaf/10 text-leaf">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Entonnoir d'Engagement & Conversion des Défis
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Parcours des défis depuis la génération IA jusqu'à la validation parent/enfant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Step 1: Générés */}
            <div className="rounded-2xl border border-sky/20 bg-sky/5 p-5 text-center relative space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky">1. Défis Générés</div>
              <div className="font-display text-3xl font-black text-ink">{funnel.generated}</div>
              <p className="text-xs font-medium text-ink/60">Générés par Naya IA</p>
            </div>

            {/* Step 2: Démarrés */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center relative space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">2. Défis Démarrés</div>
              <div className="font-display text-3xl font-black text-ink">{funnel.started}</div>
              <p className="text-xs font-medium text-ink/60">
                {funnel.generated > 0 ? Math.round((funnel.started / funnel.generated) * 100) : 0}% de mise en action
              </p>
            </div>

            {/* Step 3: Complétés */}
            <div className="rounded-2xl border border-leaf/20 bg-leaf/5 p-5 text-center relative space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-leaf">3. Défis Complétés</div>
              <div className="font-display text-3xl font-black text-leaf">{funnel.completed}</div>
              <p className="text-xs font-medium text-ink/60">
                Taux final : <strong className="text-leaf">{funnel.conversionRatePct}%</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Projection Card (1 col) */}
        <div className="rounded-3xl border border-ink/10 bg-gradient-to-br from-brand/5 via-white to-purple-500/10 p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-brand" />
              <span className="text-xs font-extrabold text-brand uppercase tracking-wider">
                Run-rate & Simulation
              </span>
            </div>
            <h3 className="font-display text-xl font-black text-ink">
              Projection Mensuelle
            </h3>
            <p className="text-xs text-ink/60 font-medium mt-1">
              Estimation du volume d'appels et du coût mensuel récurrent basé sur la cadence actuelle.
            </p>
          </div>

          <div className="space-y-3 bg-white/80 p-4 rounded-2xl border border-ink/10 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink/70">Appels / mois estimés</span>
              <span className="font-black text-ink text-sm">{projection.projectedCallsMonthly.toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink/70">Coût estimé (USD)</span>
              <span className="font-black text-purple-600 text-sm">${projection.projectedCostUsdMonthly.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-ink/5 pt-2">
              <span className="font-bold text-ink">Coût estimé (XOF)</span>
              <span className="font-black text-emerald-600 text-base">
                {projection.projectedCostXofMonthly.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>

          <div className="text-[11px] text-ink/50 italic text-center">
            * Basé sur les tarifs publics Anthropic API Haiku 3.5 & Sonnet 3.5 (1 USD = 600 XOF).
          </div>
        </div>
      </div>
    </div>
  );
}

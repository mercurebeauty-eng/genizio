import React from "react";
import { toast } from "sonner";
import {
  Brain,
  Cpu,
  Coins,
  TrendingUp,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Route as RouteIcon,
  Image as ImageIcon,
  MessageSquare,
  Target,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  X,
} from "lucide-react";
import type { NayaTelemetryResponse } from "@/lib/naya-telemetry";
import { isDeepSeekPeakHour } from "@/lib/naya-telemetry";
import type { AiProviderStatus, ProgressionHealthResponse } from "@/lib/admin-os.functions";
import {
  LOUP_DECISION_LABELS,
  OUTCOME_KIND_LABELS,
  OUTCOME_REASON_LABELS,
  ruleKeyOf,
  type ConstitutionSuggestionsResponse,
  type LoupDecision,
  type OutcomeSignal,
  type RecurringRule,
  type RuleDecision,
} from "@/lib/naya-constitution.functions";

interface AdminNayaTabProps {
  telemetry: NayaTelemetryResponse;
  aiProviderStatus?: AiProviderStatus | null;
  progressionHealth?: ProgressionHealthResponse | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  /** « Le Loup qui apprend » (Décision #56) : suggestions, journal, état. */
  constitution?: ConstitutionSuggestionsResponse | null;
  /** Clés `kind|domaine|règle` en cours de décision (spinner par carte). */
  decidingRuleKeys?: string[];
  onDecideSuggestion?: (
    ruleKey: string,
    decision: "valide" | "a_revoir" | "rejete"
  ) => Promise<void>;
}

// Couleur par modèle — 3 postes depuis le passage à DeepSeek (2026-07-21) :
// sky = deepseek-v4-flash (texte courant), amber = deepseek-v4-pro (raisonnement
// NAYA, mode réflexion activé), purple = Claude Sonnet 5 (vision uniquement, seul
// cas encore Anthropic). Les appellations affichent les noms de modèles API réels.
function modelDotClass(modelLabel: string): string {
  if (modelLabel.includes("Sonnet")) return "bg-purple-600";
  if (modelLabel.includes("V4 Pro")) return "bg-amber-500";
  return "bg-sky-500";
}
function modelBadgeClass(modelLabel: string): string {
  if (modelLabel.includes("Sonnet")) return "bg-purple-100 text-purple-700";
  if (modelLabel.includes("V4 Pro")) return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

export function AdminNayaTab({
  telemetry,
  aiProviderStatus,
  progressionHealth,
  isRefreshing = false,
  onRefresh,
  constitution,
  decidingRuleKeys = [],
  onDecideSuggestion,
}: AdminNayaTabProps) {
  const {
    totalApiCalls,
    totalTokens,
    tokenUsage,
    totalCostUsd,
    totalCostXof,
    peakCeilingCostUsd,
    peakCeilingCostXof,
    conversionRatePct,
    featureBreakdown,
    modelBreakdown,
    funnel,
    projection,
  } = telemetry;

  const peakHourNow = isDeepSeekPeakHour(new Date());

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-gradient-to-r from-sky/10 via-white to-purple-500/10 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-sky/20 text-sky-600 flex items-center justify-center shadow-inner">
            <Brain className="size-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky/10 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-600 uppercase tracking-wider">
                Module IA Naya • Suivi & Coûts
              </span>
              {isRefreshing && (
                <span className="flex items-center gap-1 text-xs text-brand font-bold animate-pulse">
                  <RefreshCw className="size-3 animate-spin" /> Actualisation…
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-black text-ink mt-0.5">
              Télémétrie & Diagnostics de Consommation
            </h2>
            <p className="text-xs text-ink/60 font-medium">
              Suivi en temps réel du volume de requêtes, de la répartition des tokens et des coûts
              estimatifs (DeepSeek vs Sonnet vision).
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="press-white rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-extrabold text-ink flex items-center gap-2 shadow-sm hover:shadow-md transition-all self-start md:self-auto cursor-pointer"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin text-brand" : "text-ink/60"}`}
            />
            <span>Actualiser la télémétrie</span>
          </button>
        )}
      </div>

      {/* 🔀 Configuration IA active — routage par tâche + statut des clés API.
          Ajouté au passage à DeepSeek (2026-07-21) pour que l'admin voie d'un
          coup d'œil qui fait quoi et si les clés sont bien configurées sur cet
          environnement, sans avoir à ouvrir .env/Vercel. */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand/10 text-brand">
            <RouteIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink">
              Configuration IA active
            </h3>
            <p className="text-xs text-ink/60 font-medium">
              Routage par type de tâche — provisoire en attendant une clé Gemini 3.6.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="size-4 text-sky-600" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                Texte général
              </span>
            </div>
            <p className="text-sm font-black text-ink">DeepSeek V4 Flash</p>
            <p className="text-[11px] text-ink/60 mt-0.5">Défis, synthèses, recommandations</p>
            <p className="text-[10px] font-bold text-sky-600 mt-1">
              deepseek-v4-flash · réflexion désactivée
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Brain className="size-4 text-amber-600" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                Raisonnement
              </span>
            </div>
            <p className="text-sm font-black text-ink">DeepSeek V4 Pro</p>
            <p className="text-[11px] text-ink/60 mt-0.5">Diagnostic bayésien NAYA (hypothèses)</p>
            <p className="text-[10px] font-bold text-amber-600 mt-1">
              deepseek-v4-pro · réflexion activée (effort élevé)
            </p>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ImageIcon className="size-4 text-purple-600" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                Vision (photos)
              </span>
            </div>
            <p className="text-sm font-black text-ink">Claude Sonnet 5</p>
            <p className="text-[11px] text-ink/60 mt-0.5">Seul cas encore sur Anthropic</p>
          </div>
        </div>

        {aiProviderStatus && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink/5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
              Clés API sur cet environnement :
            </span>
            {[
              { label: "DeepSeek", ok: aiProviderStatus.deepseekConfigured },
              { label: "Anthropic (vision)", ok: aiProviderStatus.anthropicConfigured },
              { label: "Gemini (réserve)", ok: aiProviderStatus.geminiConfigured },
            ].map(({ label, ok }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 🎯 Santé de la Progression — ajoutée le 2026-07-22 pour valider le calibrage
          du moteur de progression (computeProgressionTargets) : les deltas +2/+0/+1
          selon la cause diagnostiquée restent une estimation tant qu'on ne voit pas
          si les défis complétés le sont dans un délai sain, ou si un domaine reste
          bloqué (stale) plus qu'un autre. */}
      {progressionHealth && progressionHealth.domains.length > 0 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-leaf/10 text-leaf">
              <Target className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Santé de la Progression par Domaine
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Valide le calibrage du moteur de progression (zone proximale d'apprentissage) : un
                défi complété vite est un bon signal, un domaine avec beaucoup de défis bloqués
                (14j+ sans avancer) mérite un regard.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-ink/10 font-extrabold uppercase tracking-wider text-ink/60 pb-2">
                  <th className="py-2.5 pr-3">Domaine</th>
                  <th className="py-2.5 pr-3 text-center">Complétés</th>
                  <th className="py-2.5 pr-3 text-center">Délai moyen</th>
                  <th className="py-2.5 text-center">Bloqués (14j+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {progressionHealth.domains.map((d) => (
                  <tr key={d.domain} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 pr-3 font-bold text-ink capitalize">{d.domainLabel}</td>
                    <td className="py-3 pr-3 text-center font-bold text-ink">{d.completedCount}</td>
                    <td className="py-3 pr-3 text-center font-medium text-ink/70">
                      {d.avgDaysToCompletion !== null ? `${d.avgDaysToCompletion} j` : "—"}
                    </td>
                    <td className="py-3 text-center">
                      {d.staleCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                          <AlertTriangle className="size-3" />
                          {d.staleCount}
                        </span>
                      ) : (
                        <span className="text-ink/40">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📊 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: API Volume */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Volume d'Appels API
            </span>
            <Zap className="size-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-sky-600">
              {totalApiCalls.toLocaleString("fr-FR")}
            </span>
            <span className="text-xs font-bold text-ink/50">appels</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium flex items-center gap-1">
            <span className="size-2 rounded-full bg-sky-500 inline-block" />
            <strong className="text-ink">{featureBreakdown.length}</strong> modules actifs
          </p>
        </div>

        {/* Card 2: Token Usage */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Consommation Tokens
            </span>
            <Cpu className="size-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-purple-600">
              {totalTokens.toLocaleString("fr-FR")}
            </span>
            <span className="text-xs font-bold text-ink/50">tokens</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Entrée :{" "}
            <strong className="text-ink">
              {(
                tokenUsage.deepseekChatInputTokens +
                tokenUsage.deepseekReasonerInputTokens +
                tokenUsage.visionSonnetInputTokens
              ).toLocaleString("fr-FR")}
            </strong>{" "}
            | Sortie :{" "}
            <strong className="text-ink">
              {(
                tokenUsage.deepseekChatOutputTokens +
                tokenUsage.deepseekReasonerOutputTokens +
                tokenUsage.visionSonnetOutputTokens
              ).toLocaleString("fr-FR")}
            </strong>
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
          <div className="mt-2 space-y-1 text-[10px] font-semibold text-ink/55">
            <p className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${peakHourNow ? "bg-red-500" : "bg-emerald-500"}`}
              />
              Heure actuelle (UTC) :{" "}
              <strong className={peakHourNow ? "text-red-600" : "text-emerald-700"}>
                {peakHourNow ? "pointe" : "creuse"} (−50 %)
              </strong>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              Plafond (100 % en pointe) :{" "}
              <strong className="text-ink">
                ${peakCeilingCostUsd.toFixed(4)}
                <span className="font-semibold text-ink/50">
                  {" "}
                  ({peakCeilingCostXof.toLocaleString("fr-FR")} FCFA)
                </span>
              </strong>
            </p>
          </div>
        </div>

        {/* Card 4: Challenge Conversion Rate % */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Taux de Conversion Défis
            </span>
            <TrendingUp className="size-4 text-leaf" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-leaf">{conversionRatePct}%</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Défis complétés (<strong className="text-ink">{funnel.completed}</strong>) / Générés (
            <strong className="text-ink">{funnel.generated}</strong>)
          </p>
        </div>
      </div>

      {/* 🐺 Le Loup de Naya — vérification sémantique (chantier 2-4). Taux de
          conformité des générations, recadrage et top violations récurrentes ;
          ces agrégats alimentent le chantier 3 (apprentissage par règles apprises). */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink">Le Loup de Naya — Vérification sémantique</h3>
            <p className="text-xs text-ink/60 font-medium">
              Conformité des générations IA (audits <code className="bg-surface px-1 rounded">generation_audits</code>), recadrage en mode
              enforce, top violations récurrentes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-leaf/20 bg-leaf/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-leaf">Conformes</div>
            <div className="font-display text-2xl font-black text-leaf mt-1">
              {telemetry.wolf.conformityRatePct}%
            </div>
            <div className="text-[11px] text-ink/60 font-medium">des {telemetry.wolf.totalAudits} audits</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Mineures</div>
            <div className="font-display text-2xl font-black text-amber-600 mt-1">{telemetry.wolf.minorRatePct}%</div>
            <div className="text-[11px] text-ink/60 font-medium">écarts mineurs détectés</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">Majeures</div>
            <div className="font-display text-2xl font-black text-red-600 mt-1">{telemetry.wolf.majorRatePct}%</div>
            <div className="text-[11px] text-ink/60 font-medium">manquements majeurs</div>
          </div>
          <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">Coût du Loup</div>
            <div className="font-display text-2xl font-black text-sky-600 mt-1">${telemetry.wolf.loupCostUsd.toFixed(4)}</div>
            <div className="text-[11px] text-ink/60 font-medium">{telemetry.wolf.loupCostXof.toLocaleString("fr-FR")} FCFA (sémantique)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
              Surveillance & Recadrage
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-3 rounded-xl border border-ink/5">
                <div className="text-[10px] text-ink/50 font-bold uppercase">Vérif. sémantique</div>
                <div className="font-extrabold text-ink">
                  {telemetry.wolf.semanticChecked} <span className="font-medium text-ink/50">({telemetry.wolf.semanticCheckedRatePct}%)</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-ink/5">
                <div className="text-[10px] text-ink/50 font-bold uppercase">Recadrages (enforce)</div>
                <div className="font-extrabold text-ink">
                  {telemetry.wolf.regenerated} <span className="font-medium text-ink/50">({telemetry.wolf.recadrageRatePct}%)</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-ink/5">
                <div className="text-[10px] text-ink/50 font-bold uppercase">Violations / audit</div>
                <div className="font-extrabold text-ink">{telemetry.wolf.avgViolationsPerAudit}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
              Top violations récurrentes (apprentissage, chantier 3)
            </div>
            {telemetry.wolf.topViolations.length === 0 ? (
              <p className="text-xs text-ink/50 italic">Aucune violation enregistrée pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5">
                {telemetry.wolf.topViolations.slice(0, 5).map((v) => (
                  <li key={v.rule} className="flex items-center justify-between text-xs gap-3">
                    <code className="bg-white px-1.5 py-0.5 rounded border border-ink/5 text-ink font-mono truncate">
                      {v.rule}
                    </code>
                    <span className="font-black text-ink whitespace-nowrap">×{v.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 🐺 Le Loup qui apprend — validation hybride (Décision #56). Suggestions
          de règles apprises (auto-acquittées par seuil de confiance) + décisions
          humaines (Intégrer / À revoir / Rejeter) + journal des décisions. Tout
          se tranche ici, dans l'admin — aucun doc externe à lire. */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-leaf/10 text-leaf">
              <Brain className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Le Loup qui apprend — Validation des règles apprises
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Règles récurrentes (audits <code className="bg-surface px-1 rounded">generation_audits</code>) auto-acquittées par
                seuil, puis décisions humaines — la promotion dans la constitution reste volontaire.
              </p>
            </div>
          </div>
          {constitution?.learnedRulesBlock ? (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(constitution.learnedRulesBlock)
                  .then(
                    () => toast.success("Bloc LEARNED_RULES copié — à coller dans la constitution (promotion finale volontaire)."),
                    () => toast.error("Impossible de copier le bloc LEARNED_RULES.")
                  );
              }}
              className="press-sky rounded-2xl border border-ink/10 bg-sky/10 px-4 py-2 text-xs font-extrabold text-ink flex items-center gap-2"
            >
              <Copy className="size-3.5" />
              <span>Copier le bloc LEARNED_RULES</span>
            </button>
          ) : null}
        </div>

        {/* État du Loup — mode, échantillonnage, seuils (lus en live côté serveur) */}
        {constitution ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Mode</div>
              <div className={`font-extrabold ${constitution.wolfState.enforce ? "text-red-600" : "text-sky-600"}`}>
                {constitution.wolfState.enforce ? "ENFORCE (recadre)" : "OBSERVATION (shadow)"}
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Échantillonnage sémantique</div>
              <div className="font-extrabold text-ink">{constitution.wolfState.semanticRatePct}%</div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Vérif. activée</div>
              <div className={`font-extrabold ${constitution.wolfState.enabled ? "text-leaf" : "text-red-600"}`}>
                {constitution.wolfState.enabled ? "Oui" : "NON (kill-switch)"}
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Seuils suggestions</div>
              <div className="font-extrabold text-ink">
                ≥{constitution.wolfState.suggestThresholds.minCount} occ. · ≥{constitution.wolfState.suggestThresholds.minChildren} enf.
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Seuils auto-acquittement</div>
              <div className="font-extrabold text-ink">
                ≥{constitution.wolfState.autoAckThresholds.minCount} occ. · ≥{constitution.wolfState.autoAckThresholds.minChildren} enf.
              </div>
            </div>
          </div>
        ) : null}

        {/* Suggestions en attente */}
        <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
            En attente — {constitution ? `${constitution.suggestions.length} règle(s) proposée(s)` : "…"}
          </div>
          {!constitution ? (
            <p className="text-xs text-ink/50 italic">Chargement des suggestions…</p>
          ) : constitution.suggestions.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucune règle en attente — le Loup observe et n'a rien à soumettre pour l'instant.
            </p>
          ) : (
            <ul className="space-y-3">
              {constitution.suggestions.map((s) => (
                <SuggestionRow
                  key={ruleKeyOf(s.kind, s.domain, s.rule)}
                  suggestion={s}
                  busy={decidingRuleKeys.includes(ruleKeyOf(s.kind, s.domain, s.rule))}
                  onDecide={onDecideSuggestion}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Journal des décisions (auto + humaines) */}
        <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
            Journal des décisions — {constitution ? `${constitution.journal.length} règle(s) décidée(s)` : "…"}
          </div>
          {!constitution ? (
            <p className="text-xs text-ink/50 italic">Chargement du journal…</p>
          ) : constitution.journal.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucune décision enregistrée — le Loup n'a encore rien auto-acquitté ni validé.
            </p>
          ) : (
            <ul className="space-y-2">
              {constitution.journal.slice(0, 12).map((j) => (
                <JournalRow key={j.ruleKey} decision={j} />
              ))}
            </ul>
          )}
        </div>

        {/* 📉 Signaux d'abandon (Décision #58) — défis supprimés : le Loup
            apprend « ce type de défi n'est pas mené à terme ». Signal faible
            par conception : il informe Naya sans jamais condamner un domaine. */}
        <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
            Signaux d'abandon — {constitution ? `${constitution.outcomeSignals.length} signal(aux)` : "…"}
          </div>
          {!constitution ? (
            <p className="text-xs text-ink/50 italic">Chargement des signaux…</p>
          ) : constitution.outcomeSignals.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucun défi supprimé pour l'instant — les abandons alimenteront Naya ici.
            </p>
          ) : (
            <ul className="space-y-2">
              {constitution.outcomeSignals.slice(0, 12).map((s) => (
                <OutcomeSignalRow key={`${s.reasonKey}|${s.kind}|${s.domain}`} signal={s} />
              ))}
            </ul>
          )}
          <p className="text-[10px] text-ink/40 italic">
            Signal faible à décroissance : il informe Naya sans jamais condamner un domaine.
          </p>
        </div>
      </div>

      {/* 🧩 Breakdown Grid: Features & Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature Breakdown Panel */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky/10 text-sky-600">
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
                        className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${modelBadgeClass(item.modelUsed)}`}
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
                      <div className="text-[10px] font-semibold text-ink/50">
                        {item.costXof.toLocaleString("fr-FR")} FCFA
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Breakdown Panel (DeepSeek V4 Flash / V4 Pro vs Sonnet vision) */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600">
              <Cpu className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Distribution par Modèle
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
                    <span className={`size-3 rounded-full ${modelDotClass(model.model)}`} />
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
                    className={`h-full transition-all duration-500 ${modelDotClass(model.model)}`}
                    style={{ width: `${Math.max(5, model.sharePercentage)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Entrée</div>
                    <div className="font-extrabold text-ink">
                      {model.inputTokens.toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Sortie</div>
                    <div className="font-extrabold text-ink">
                      {model.outputTokens.toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-ink/5">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">Total Tokens</div>
                    <div className="font-black text-ink">
                      {model.totalTokens.toLocaleString("fr-FR")}
                    </div>
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
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                1. Défis Générés
              </div>
              <div className="font-display text-3xl font-black text-ink">{funnel.generated}</div>
              <p className="text-xs font-medium text-ink/60">Générés par Naya IA</p>
            </div>

            {/* Step 2: Démarrés */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center relative space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                2. Défis Démarrés
              </div>
              <div className="font-display text-3xl font-black text-ink">{funnel.started}</div>
              <p className="text-xs font-medium text-ink/60">
                {funnel.generated > 0 ? Math.round((funnel.started / funnel.generated) * 100) : 0}%
                de mise en action
              </p>
            </div>

            {/* Step 3: Complétés */}
            <div className="rounded-2xl border border-leaf/20 bg-leaf/5 p-5 text-center relative space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-leaf">
                3. Défis Complétés
              </div>
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
              <TrendingUp className="size-5 text-brand" />
              <span className="text-xs font-extrabold text-brand uppercase tracking-wider">
                Run-rate & Simulation
              </span>
            </div>
            <h3 className="font-display text-xl font-black text-ink">Projection Mensuelle</h3>
            <p className="text-xs text-ink/60 font-medium mt-1">
              Estimation du volume d'appels et du coût mensuel récurrent basé sur la cadence
              actuelle.
            </p>
          </div>

          <div className="space-y-3 bg-white/80 p-4 rounded-2xl border border-ink/10 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink/70">Appels / mois estimés</span>
              <span className="font-black text-ink text-sm">
                {projection.projectedCallsMonthly.toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink/70">Coût estimé (USD)</span>
              <span className="font-black text-purple-600 text-sm">
                ${projection.projectedCostUsdMonthly.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-ink/5 pt-2">
              <span className="font-bold text-ink">Coût estimé (XOF)</span>
              <span className="font-black text-emerald-600 text-base">
                {projection.projectedCostXofMonthly.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>

          <div className="text-[11px] text-ink/50 italic text-center">
            * Barème DeepSeek creux/plein effectif le 2026-08-16 16:00 UTC (pointe 01:00-04:00 et
            06:00-10:00 UTC). Estimation sur taux pondérés 70 % creux / 30 % pointe + Claude Sonnet
            5 (vision), 1 USD = 600 XOF. Le mode réflexion (activé sur v4-pro) génère des tokens de
            raisonnement non modélisés ici — le coût réel peut donc dépasser l'estimation (le plafond
            100 % pointe est affiché sur la carte « Coût Estimé »).
          </div>
        </div>
      </div>
    </div>
  );
}

// ── « Le Loup qui apprend » (Décision #56) — sous-composants du panneau ──────

function decisionBadgeClass(decision: LoupDecision): string {
  switch (decision) {
    case "valide":
      return "bg-leaf/10 text-leaf";
    case "a_revoir":
      return "bg-amber-500/10 text-amber-600";
    case "rejete":
      return "bg-red-500/10 text-red-600";
    case "auto":
      return "bg-sky/10 text-sky-600";
  }
}

function formatDecisionDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Une règle apprise proposée, avec les 3 décisions humaines possibles. */
function SuggestionRow({
  suggestion,
  busy,
  onDecide,
}: {
  suggestion: RecurringRule;
  busy: boolean;
  onDecide?: AdminNayaTabProps["onDecideSuggestion"];
}) {
  const constat = suggestion.sampleDetails[0];
  const correctif = suggestion.sampleSuggestions[0];
  return (
    <li className="bg-white rounded-xl border border-ink/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="bg-surface px-1.5 py-0.5 rounded border border-ink/5 text-ink font-mono text-[11px] block truncate">
            {suggestion.rule}
          </code>
          <div className="text-[10px] text-ink/50 font-semibold mt-1">
            {suggestion.kind}
            {suggestion.domain !== "general" ? ` · ${suggestion.domain}` : ""} — ×{suggestion.count} occ. ·{" "}
            {suggestion.childCount} enfant(s)
          </div>
        </div>
        {suggestion.severity === "majeur" ? (
          <span className="shrink-0 text-[10px] font-extrabold uppercase text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
            majeur
          </span>
        ) : null}
      </div>
      {constat ? <p className="text-[11px] text-ink/70 font-medium">Constat : {constat}</p> : null}
      {correctif ? <p className="text-[11px] text-ink/60">Correctif proposé : {correctif}</p> : null}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDecide?.(ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule), "valide")}
          className="press-leaf rounded-lg bg-leaf px-3 py-1.5 text-[11px] font-extrabold text-white flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
          Intégrer
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDecide?.(ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule), "a_revoir")}
          className="press-white rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-[11px] font-extrabold text-amber-600 flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Eye className="size-3" />}
          À revoir
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDecide?.(ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule), "rejete")}
          className="press-white rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[11px] font-extrabold text-red-600 flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
          Rejeter
        </button>
      </div>
    </li>
  );
}

/** Une ligne du journal des décisions (auto-acquittées + décisions humaines). */
function JournalRow({ decision }: { decision: RuleDecision }) {
  return (
    <li className="flex items-center justify-between gap-3 bg-white rounded-lg border border-ink/5 px-3 py-2">
      <div className="min-w-0 flex items-center gap-2">
        <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${decisionBadgeClass(decision.decision)}`}>
          {LOUP_DECISION_LABELS[decision.decision]}
        </span>
        <div className="min-w-0">
          <code className="text-ink font-mono text-[11px] block truncate">{decision.rule}</code>
          <div className="text-[10px] text-ink/50 font-medium">
            {decision.kind}
            {decision.domain !== "general" ? ` · ${decision.domain}` : ""} — ×{decision.count} occ. ·{" "}
            {decision.childCount} enfant(s)
            {decision.note ? ` — « ${decision.note} »` : ""}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right text-[10px] text-ink/50 font-medium">
        <div>{formatDecisionDate(decision.decidedAt)}</div>
        <div className="truncate max-w-[140px]">{decision.decidedBy}</div>
      </div>
    </li>
  );
}

/** Un signal d'abandon agrégé (Décision #58) : raison, type, domaine, comptes. */
function OutcomeSignalRow({ signal }: { signal: OutcomeSignal }) {
  const kindClass =
    signal.kind === "deleted_completed"
      ? "bg-leaf/10 text-leaf"
      : "bg-amber-500/10 text-amber-600";
  return (
    <li className="flex items-center justify-between gap-3 bg-white rounded-lg border border-ink/5 px-3 py-2">
      <div className="min-w-0 flex items-center gap-2">
        <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${kindClass}`}>
          {OUTCOME_KIND_LABELS[signal.kind]}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-ink truncate">
            {OUTCOME_REASON_LABELS[signal.reasonKey] ?? signal.reasonKey}
            {signal.domain !== "general" ? ` · ${signal.domain}` : ""}
          </div>
          <div className="text-[10px] text-ink/50 font-medium">
            ×{signal.count} suppr. · {signal.childCount} enfant(s) · Ø {signal.avgPendingDays} j d'attente
          </div>
        </div>
      </div>
    </li>
  );
}

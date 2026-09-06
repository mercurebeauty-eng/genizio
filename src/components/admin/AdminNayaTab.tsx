import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
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
  MapPin,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Sliders,
} from "lucide-react";
import type { NayaTelemetryResponse } from "@/lib/naya-telemetry";
import { isDeepSeekPeakHour } from "@/lib/naya-telemetry";
import type {
  AiProviderStatus,
  ProgressionHealthResponse,
  NayaModelRoutingSettings,
  ChallengeModelId,
} from "@/lib/admin-os.functions";
import {
  CHALLENGE_MODEL_OPTIONS,
  getChallengeModelOptions,
  refreshAiModelPricingAdmin,
} from "@/lib/admin-os.functions";
import {
  decideLoupSuggestionsAdmin,
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
import {
  deleteCountryMaterialAdmin,
  getCountryMaterialsAdmin,
  upsertCountryMaterialAdmin,
  type CountryMaterialRow,
} from "@/lib/country-materials.functions";
import {
  getSubstitutionVerifyAdmin,
  setSubstitutionVerifyAdmin,
} from "@/lib/substitution.functions";

export interface AdminNayaTabProps {
  telemetry: NayaTelemetryResponse;
  aiProviderStatus?: AiProviderStatus | null;
  progressionHealth?: ProgressionHealthResponse | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  /** « Le Loup qui apprend » (Décision #56) : suggestions, journal, état. */
  constitution?: ConstitutionSuggestionsResponse | null;
  /** Clés `kind|domaine|règle` en cours de décision (spinner par carte). */
  decidingRuleKeys?: string[];
  onDataChanged?: () => void | Promise<void>;
  nayaRoutingSettings?: NayaModelRoutingSettings | null;
  onUpdateNayaRouting?: (newSettings: {
    challengeModel: ChallengeModelId;
    fallbackEnabled?: boolean;
  }) => Promise<void>;
}

// Couleur par modèle — support DeepSeek, GLM, Qwen et Claude Sonnet (vision).
// Les appellations affichent les noms de modèles API réels.
function modelDotClass(modelLabel: string): string {
  if (modelLabel.includes("Sonnet")) return "bg-purple-600";
  if (modelLabel.includes("V4 Pro")) return "bg-amber-500";
  if (modelLabel.includes("GLM")) return "bg-emerald-600";
  if (modelLabel.includes("Qwen")) return "bg-indigo-600";
  return "bg-sky-500";
}
function modelBadgeClass(modelLabel: string): string {
  if (modelLabel.includes("Sonnet")) return "bg-purple-100 text-purple-700";
  if (modelLabel.includes("V4 Pro")) return "bg-amber-100 text-amber-700";
  if (modelLabel.includes("GLM")) return "bg-emerald-100 text-emerald-700";
  if (modelLabel.includes("Qwen")) return "bg-indigo-100 text-indigo-700";
  return "bg-sky-100 text-sky-700";
}

export function AdminNayaTab({
  telemetry,
  aiProviderStatus,
  progressionHealth,
  isRefreshing = false,
  onRefresh,
  constitution,
  onDataChanged,
  nayaRoutingSettings,
  onUpdateNayaRouting,
}: AdminNayaTabProps) {
  const [localConstitution, setLocalConstitution] =
    useState<ConstitutionSuggestionsResponse | null>(constitution || null);
  useEffect(() => {
    setLocalConstitution(constitution || null);
  }, [constitution]);
  const [decidingKeys, setDecidingKeys] = useState<string[]>([]);

  const [isUpdatingRouting, setIsUpdatingRouting] = useState(false);
  const [isRefreshingPricing, setIsRefreshingPricing] = useState(false);
  const refreshPricingFn = useServerFn(refreshAiModelPricingAdmin);

  const modelOptions = getChallengeModelOptions(telemetry?.livePricing);

  const handleRefreshOpenRouterPricing = async () => {
    if (isRefreshingPricing) return;
    try {
      setIsRefreshingPricing(true);
      const res = await refreshPricingFn();
      toast.success(
        res.isLive
          ? "Tarifs OpenRouter synchronisés en direct depuis l'API officielle !"
          : "Tarifs mis à jour (mode de repli sécurisé).",
      );
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Erreur actualisation tarifs OpenRouter:", err);
      toast.error(err?.message || "Erreur lors de l'actualisation des tarifs OpenRouter.");
    } finally {
      setIsRefreshingPricing(false);
    }
  };

  const currentChallengeModel: ChallengeModelId =
    nayaRoutingSettings?.challengeModel || "deepseek-v4-flash";
  const fallbackEnabled: boolean =
    nayaRoutingSettings?.fallbackEnabled !== false;

  const handleSelectModel = async (modelId: ChallengeModelId) => {
    if (modelId === currentChallengeModel || isUpdatingRouting || !onUpdateNayaRouting) return;
    try {
      setIsUpdatingRouting(true);
      await onUpdateNayaRouting({
        challengeModel: modelId,
        fallbackEnabled,
      });
    } catch {
      // error handled in caller toast
    } finally {
      setIsUpdatingRouting(false);
    }
  };

  const handleToggleFallback = async () => {
    if (isUpdatingRouting || !onUpdateNayaRouting) return;
    try {
      setIsUpdatingRouting(true);
      await onUpdateNayaRouting({
        challengeModel: currentChallengeModel,
        fallbackEnabled: !fallbackEnabled,
      });
    } catch {
      // error handled in caller toast
    } finally {
      setIsUpdatingRouting(false);
    }
  };

  const decideLoupFn = useServerFn(decideLoupSuggestionsAdmin);

  const handleDecideSuggestion = async (
    ruleKey: string,
    decision: "valide" | "a_revoir" | "rejete",
  ) => {
    if (decidingKeys.includes(ruleKey)) return;
    setDecidingKeys((prev) => [...prev, ruleKey]);

    const previousConstitution = localConstitution;
    if (localConstitution) {
      const suggestionIndex = localConstitution.suggestions.findIndex(
        (s) => ruleKeyOf(s.kind, s.domain, s.rule) === ruleKey,
      );
      if (suggestionIndex > -1) {
        const suggestion = localConstitution.suggestions[suggestionIndex];
        const newSuggestions = [...localConstitution.suggestions];
        newSuggestions.splice(suggestionIndex, 1);

        const newJournalEntry = {
          ruleKey,
          kind: suggestion.kind,
          domain: suggestion.domain,
          rule: suggestion.rule,
          decision,
          decidedAt: new Date().toISOString(),
          decidedBy: "Admin",
          note: "Décision admin",
          count: suggestion.count,
          childCount: suggestion.childCount,
        };

        setLocalConstitution({
          ...localConstitution,
          suggestions: newSuggestions,
          journal: [newJournalEntry, ...localConstitution.journal],
        });
      }
    }

    try {
      const res = await decideLoupFn({ data: { decisions: [{ ruleKey, decision }] } });
      toast.success(
        res.decided > 0
          ? "Décision enregistrée — la règle sort des suggestions et passe au journal."
          : "Aucun audit en attente ne correspond à cette règle.",
      );
      const ch = supabase.channel("admin-os-global-sync");
      await ch.send({
        type: "broadcast",
        event: "loup_decision_updated",
        payload: { ruleKey, decision, timestamp: Date.now() },
      });
      await onDataChanged?.();
    } catch (err: any) {
      setLocalConstitution(previousConstitution);
      console.error("Erreur lors de la décision du Loup:", err);
      toast.error(err?.message || "Erreur lors de l'enregistrement de la décision.");
    } finally {
      setDecidingKeys((prev) => prev.filter((k) => k !== ruleKey));
    }
  };

  if (!telemetry) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-sm">
        <Loader2 className="size-8 animate-spin text-brand mx-auto mb-3" />
        <p className="font-display text-base font-bold text-ink">Chargement de la télémétrie IA Naya...</p>
        <p className="text-xs text-ink/50 mt-1">Récupération des métriques d'inférence et des tarifs OpenRouter.</p>
      </div>
    );
  }

  const {
    totalApiCalls = 0,
    totalTokens = 0,
    tokenUsage = {
      deepseekChatInputTokens: 0,
      deepseekChatOutputTokens: 0,
      deepseekReasonerInputTokens: 0,
      deepseekReasonerOutputTokens: 0,
      visionSonnetInputTokens: 0,
      visionSonnetOutputTokens: 0,
      glmFlashInputTokens: 0,
      glmFlashOutputTokens: 0,
      qwenFlashInputTokens: 0,
      qwenFlashOutputTokens: 0,
    },
    totalCostUsd = 0,
    totalCostXof = 0,
    peakCeilingCostUsd = 0,
    peakCeilingCostXof = 0,
    conversionRatePct = 0,
    featureBreakdown = [],
    modelBreakdown = [],
    funnel = { generated: 0, started: 0, completed: 0, conversionRatePct: 0 },
    projection = { projectedCallsMonthly: 0, projectedCostUsdMonthly: 0, projectedCostXofMonthly: 0 },
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
              estimatifs multi-modèles (DeepSeek, GLM 5.3 Flash, Qwen 3.8 Flash et Sonnet vision).
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

      {/* 🔀 Configuration IA active — routage par tâche + statut des clés API + switch à chaud des défis. */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand/10 text-brand">
              <RouteIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Configuration IA active & Routage des Modèles
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Basculez dynamiquement le moteur des défis (DeepSeek, GLM ou Qwen), gérez la redondance et suivez la différenciation des deux tâches de GLM (élèves vs enseignants).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-ink/5 border border-ink/10 px-3 py-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-ink/70">
                Moteur actif : <strong className="text-ink font-bold">{modelOptions.find(m => m.id === currentChallengeModel)?.label || currentChallengeModel}</strong>
              </span>
            </div>

            {telemetry?.livePricing && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-xs text-emerald-800">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="font-semibold">
                  Tarifs OpenRouter :{" "}
                  <strong className="font-extrabold text-emerald-950">
                    {telemetry.livePricing.source === "openrouter_api"
                      ? "API Live"
                      : telemetry.livePricing.source === "cached"
                      ? "Cache 15m"
                      : "Repli standard"}
                  </strong>
                </span>
                {telemetry.livePricing.fetchedAt && (
                  <span className="text-[10px] text-emerald-700/80 font-medium">
                    ({new Date(telemetry.livePricing.fetchedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleRefreshOpenRouterPricing()}
                  disabled={isRefreshingPricing}
                  title="Forcer la synchronisation avec l'API publique OpenRouter"
                  className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${isRefreshingPricing ? "animate-spin" : ""}`} />
                  {isRefreshingPricing ? "Sync..." : "Rafraîchir"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🎛️ Sélecteur de modèle pour les défis Naya */}
        <div className="rounded-2xl border border-brand/20 bg-brand/[0.03] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-brand" />
                <h4 className="text-sm font-extrabold text-ink">
                  Moteur Actif pour la Génération des Défis
                </h4>
                <span className="rounded-full bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Switch à chaud
                </span>
                {telemetry?.livePricing && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    Tarifs Live
                  </span>
                )}
              </div>
              <p className="text-xs text-ink/60 mt-0.5">
                Sélectionnez le modèle d'inférence utilisé pour générer les défis personnalisés des enfants.
              </p>
            </div>
            {nayaRoutingSettings?.updatedAt && (
              <span className="text-[11px] text-ink/50 font-medium">
                Mis à jour le {new Date(nayaRoutingSettings.updatedAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                {nayaRoutingSettings.updatedBy ? ` par ${nayaRoutingSettings.updatedBy}` : ""}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {modelOptions.map((opt) => {
              const isSelected = opt.id === currentChallengeModel;
              const isConfigured =
                opt.id === "deepseek-v4-flash"
                  ? aiProviderStatus?.deepseekConfigured !== false
                  : opt.id === "glm-5.3-flash"
                  ? aiProviderStatus?.glmConfigured !== false
                  : aiProviderStatus?.qwenConfigured !== false;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void handleSelectModel(opt.id)}
                  disabled={isUpdatingRouting}
                  className={`text-left rounded-2xl p-4 transition-all duration-200 border relative flex flex-col justify-between ${
                    isSelected
                      ? "border-brand bg-white shadow-md ring-2 ring-brand/20"
                      : "border-ink/10 bg-white/70 hover:border-ink/20 hover:bg-white hover:shadow-sm"
                  } ${isUpdatingRouting ? "opacity-75 cursor-wait" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          opt.id === "qwen3.8-flash"
                            ? "bg-indigo-100 text-indigo-700"
                            : opt.id === "glm-5.3-flash"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {opt.provider}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-brand bg-brand/10 rounded-full px-2 py-0.5">
                          <Check className="size-3 stroke-[3]" />
                          Actif
                        </span>
                      )}
                    </div>

                    <p className="font-extrabold text-sm text-ink">{opt.label}</p>
                    <p className="text-[11px] text-ink/60 mt-1 leading-snug">{opt.description}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-ink/5 flex items-center justify-between text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-bold text-ink/80">
                        ${opt.inputPricePerM} / ${opt.outputPricePerM}{" "}
                        <span className="text-[9px] font-medium text-ink/40">1M tok</span>
                      </span>
                      {telemetry?.livePricing && (
                        <span className="text-[9px] font-semibold text-emerald-700">
                          Tarif live OpenRouter
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[10px] ${
                        isConfigured ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isConfigured ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {isConfigured ? "Prêt" : "Clé partagée"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Redondance & Résilience */}
          <div className="rounded-xl border border-ink/10 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  fallbackEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-ink">
                    Redondance & Résilience (Fallback transparent)
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                      fallbackEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {fallbackEnabled ? "Actif (Recommandé)" : "Désactivé"}
                  </span>
                </div>
                <p className="text-[11px] text-ink/60 mt-0.5">
                  {fallbackEnabled
                    ? "Si le modèle sélectionné subit un timeout (>45s) ou une erreur 5xx, Naya bascule automatiquement et silencieusement sur DeepSeek pour ne jamais bloquer l'enfant."
                    : "Attention : en cas de panne de l'API sélectionnée, la génération de défi retournera une erreur sans basculer."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleToggleFallback()}
              disabled={isUpdatingRouting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                fallbackEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-ink/5 text-ink/70 border-ink/10 hover:bg-ink/10"
              } ${isUpdatingRouting ? "opacity-50 cursor-wait" : ""}`}
            >
              {fallbackEnabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
              {fallbackEnabled ? "Désactiver" : "Activer secours"}
            </button>
          </div>
        </div>

        {/* Vue d'ensemble du routage des tâches — différenciation explicite de GLM (Défis vs Copilote Prof) et intégration de Qwen */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <p className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Matrice de spécialisation des moteurs & tâches IA
            </p>
            <span className="text-[11px] text-ink/50 font-medium">
              5 moteurs opérationnels · Différenciation des 2 tâches de GLM (élèves vs profs)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Carte 1 : Tâche Défis Naya (Moteur Actif) */}
            <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-sky-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                      Tâche 1 · Défis Naya
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                    Actif
                  </span>
                </div>
                <p className="text-sm font-black text-ink">
                  {modelOptions.find((m) => m.id === currentChallengeModel)?.label ||
                    "DeepSeek V4 Flash"}
                </p>
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">
                  Défis personnalisés enfants, missions ZPA, paliers d'autonomie et fiches de mission.
                </p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-sky-100 flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-sky-700">
                  ${(modelOptions.find((m) => m.id === currentChallengeModel)?.inputPricePerM ?? 0.0808)} / ${(modelOptions.find((m) => m.id === currentChallengeModel)?.outputPricePerM ?? 0.1616)}
                </span>
                <span className="font-semibold text-ink/50">
                  {modelOptions.find((m) => m.id === currentChallengeModel)?.provider || "DeepSeek"}
                </span>
              </div>
            </div>

            {/* Carte 2 : GLM 5.3 Flash — Tâche 2 Copilote Enseignants (Dédié didactique) */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-emerald-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Tâche 2 · Copilote Prof
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Dédié Enseignants
                  </span>
                </div>
                <p className="text-sm font-black text-ink">GLM 5.3 Flash (GMICLoud)</p>
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">
                  Déconstruction didactique, fiches de préparation de cours multimodales, différentiation ZPA.
                </p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-emerald-100 flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-emerald-700">
                  ${telemetry?.livePricing?.glmFlash?.inputPerM ?? 0.075} / ${telemetry?.livePricing?.glmFlash?.outputPerM ?? 0.25}
                </span>
                <span className="font-semibold text-emerald-800">OpenRouter (1M)</span>
              </div>
            </div>

            {/* Carte 3 : Qwen 3.8 Flash — Tâche 1 Défis Concision & Vitesse */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-indigo-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                      Tâche 1 · Moteur Qwen
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Défis Naya
                  </span>
                </div>
                <p className="text-sm font-black text-ink">Qwen 3.8 Flash (Alibaba)</p>
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">
                  Raisonnement logique, concision chirurgicale, respect JSON strict et ultra-vélocité.
                </p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-indigo-100 flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-indigo-700">
                  ${telemetry?.livePricing?.qwenFlash?.inputPerM ?? 0.0481} / ${telemetry?.livePricing?.qwenFlash?.outputPerM ?? 0.193}
                </span>
                <span className="font-semibold text-indigo-800">OpenRouter (1M)</span>
              </div>
            </div>

            {/* Carte 4 : DeepSeek V4 Pro — Raisonnement Diagnostique */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Brain className="size-4 text-amber-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                      Raisonnement Pro
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Diagnostic
                  </span>
                </div>
                <p className="text-sm font-black text-ink">DeepSeek V4 Pro</p>
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">
                  Diagnostic bayésien NAYA, confirmation d'hypothèses et rééquilibrage des talents Gardner.
                </p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-amber-100 flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-amber-700">
                  ${telemetry?.livePricing?.deepseekReasoner?.inputPerM ?? 0.6876} / ${telemetry?.livePricing?.deepseekReasoner?.outputPerM ?? 1.3753}
                </span>
                <span className="font-semibold text-amber-800">OpenRouter (1M)</span>
              </div>
            </div>

            {/* Carte 5 : Claude Sonnet 5 — Vision Multimodale */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-purple-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                      Vision Photos
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Anthropic
                  </span>
                </div>
                <p className="text-sm font-black text-ink">Claude Sonnet 5</p>
                <p className="text-[11px] text-ink/60 mt-1 leading-snug">
                  Validation visuelle des photos de défis physiques et carnets de bord 100% hors écran.
                </p>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-purple-100 flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-purple-700">
                  ${telemetry?.livePricing?.visionSonnet?.inputPerM ?? 2.0} / ${telemetry?.livePricing?.visionSonnet?.outputPerM ?? 10.0}
                </span>
                <span className="font-semibold text-purple-800">OpenRouter (1M)</span>
              </div>
            </div>
          </div>
        </div>

        {aiProviderStatus && (
          <div className="space-y-2 pt-3 border-t border-ink/5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                Clés API & Fournisseurs configurés :
              </span>
              {[
                { label: "DeepSeek (Défis & Raisonnement)", ok: aiProviderStatus.deepseekConfigured },
                { label: "GLM 5.3 Flash (Copilote Prof & Défis)", ok: aiProviderStatus.glmConfigured },
                { label: "Qwen 3.8 Flash (Défis Naya)", ok: aiProviderStatus.qwenConfigured },
                { label: "Claude Sonnet (Vision photos)", ok: aiProviderStatus.anthropicConfigured },
                { label: "Gemini (Réserve multimodale)", ok: aiProviderStatus.geminiConfigured },
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
            <p className="text-[11px] text-ink/50 italic">
              💡 <strong>Passerelle partagée :</strong> La clé GLM (GMICLoud / api.b.ai) alimente à la fois <strong>GLM 5.3 Flash</strong> (Copilote Enseignants & option Défis) et <strong>Qwen 3.8 Flash</strong> (option Défis Naya) sans configuration supplémentaire.
            </p>
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
            <table className="w-full min-w-[480px] text-left border-collapse text-xs">
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
                tokenUsage.visionSonnetInputTokens +
                tokenUsage.glmFlashInputTokens +
                tokenUsage.qwenFlashInputTokens
              ).toLocaleString("fr-FR")}
            </strong>{" "}
            | Sortie :{" "}
            <strong className="text-ink">
              {(
                tokenUsage.deepseekChatOutputTokens +
                tokenUsage.deepseekReasonerOutputTokens +
                tokenUsage.visionSonnetOutputTokens +
                tokenUsage.glmFlashOutputTokens +
                tokenUsage.qwenFlashOutputTokens
              ).toLocaleString("fr-FR")}
            </strong>
          </p>
          <div className="mt-2.5 pt-2 border-t border-ink/5 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-ink/60">
            <span className="text-sky-700">DeepSeek: {(tokenUsage.deepseekChatInputTokens + tokenUsage.deepseekChatOutputTokens + tokenUsage.deepseekReasonerInputTokens + tokenUsage.deepseekReasonerOutputTokens).toLocaleString("fr-FR")}</span>
            <span>•</span>
            <span className="text-emerald-700">GLM (Prof & Défis): {(tokenUsage.glmFlashInputTokens + tokenUsage.glmFlashOutputTokens).toLocaleString("fr-FR")}</span>
            <span>•</span>
            <span className="text-indigo-700">Qwen (Défis): {(tokenUsage.qwenFlashInputTokens + tokenUsage.qwenFlashOutputTokens).toLocaleString("fr-FR")}</span>
            <span>•</span>
            <span className="text-purple-700">Sonnet: {(tokenUsage.visionSonnetInputTokens + tokenUsage.visionSonnetOutputTokens).toLocaleString("fr-FR")}</span>
          </div>
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
            Moteurs : DeepSeek, GLM, Qwen & Sonnet (1 USD ≈ 600 XOF)
          </p>
          {telemetry?.livePricing && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200/70">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Calculé d'après les tarifs réels OpenRouter ({telemetry.livePricing.source === "openrouter_api" ? "Direct API" : telemetry.livePricing.source === "cached" ? "Cache 15m" : "Repli standard"})
            </div>
          )}
          <div className="mt-2 space-y-1 text-[10px] font-semibold text-ink/55">
            <p className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${peakHourNow ? "bg-red-500" : "bg-emerald-500"}`}
              />
              Heure DeepSeek (UTC) :{" "}
              <strong className={peakHourNow ? "text-red-600" : "text-emerald-700"}>
                {peakHourNow ? "pointe" : "creuse"} (−50 %)
              </strong>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              Plafond cumulé (DeepSeek pointe + GLM + Qwen + Sonnet) :{" "}
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
            <h3 className="font-display text-lg font-extrabold text-ink">
              Le Loup de Naya — Vérification sémantique
            </h3>
            <p className="text-xs text-ink/60 font-medium">
              Conformité des générations IA (audits{" "}
              <code className="bg-surface px-1 rounded">generation_audits</code>), recadrage en mode
              enforce, top violations récurrentes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-leaf/20 bg-leaf/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-leaf">
              Conformes
            </div>
            <div className="font-display text-2xl font-black text-leaf mt-1">
              {telemetry.wolf.conformityRatePct}%
            </div>
            <div className="text-[11px] text-ink/60 font-medium">
              des {telemetry.wolf.totalAudits} audits
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
              Mineures
            </div>
            <div className="font-display text-2xl font-black text-amber-600 mt-1">
              {telemetry.wolf.minorRatePct}%
            </div>
            <div className="text-[11px] text-ink/60 font-medium">écarts mineurs détectés</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">
              Majeures
            </div>
            <div className="font-display text-2xl font-black text-red-600 mt-1">
              {telemetry.wolf.majorRatePct}%
            </div>
            <div className="text-[11px] text-ink/60 font-medium">manquements majeurs</div>
          </div>
          <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
              Coût du Loup
            </div>
            <div className="font-display text-2xl font-black text-sky-600 mt-1">
              ${telemetry.wolf.loupCostUsd.toFixed(4)}
            </div>
            <div className="text-[11px] text-ink/60 font-medium">
              {telemetry.wolf.loupCostXof.toLocaleString("fr-FR")} FCFA (sémantique)
            </div>
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
                  {telemetry.wolf.semanticChecked}{" "}
                  <span className="font-medium text-ink/50">
                    ({telemetry.wolf.semanticCheckedRatePct}%)
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-ink/5">
                <div className="text-[10px] text-ink/50 font-bold uppercase">
                  Recadrages (enforce)
                </div>
                <div className="font-extrabold text-ink">
                  {telemetry.wolf.regenerated}{" "}
                  <span className="font-medium text-ink/50">
                    ({telemetry.wolf.recadrageRatePct}%)
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-ink/5">
                <div className="text-[10px] text-ink/50 font-bold uppercase">
                  Violations / audit
                </div>
                <div className="font-extrabold text-ink">
                  {telemetry.wolf.avgViolationsPerAudit}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
              Top violations récurrentes (apprentissage, chantier 3)
            </div>
            {telemetry.wolf.topViolations.length === 0 ? (
              <p className="text-xs text-ink/50 italic">
                Aucune violation enregistrée pour l'instant.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {telemetry.wolf.topViolations.slice(0, 5).map((v) => (
                  <li key={v.rule} className="flex items-center justify-between text-xs gap-3">
                    <code className="bg-white px-1.5 py-0.5 rounded border border-ink/5 text-ink font-mono truncate min-w-0 flex-1">
                      {v.rule}
                    </code>
                    <span className="font-bold text-ink shrink-0">{v.count}</span>
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
                Règles récurrentes (audits{" "}
                <code className="bg-surface px-1 rounded">generation_audits</code>) auto-acquittées
                par seuil, puis décisions humaines — la promotion dans la constitution reste
                volontaire.
              </p>
            </div>
          </div>
          {constitution?.learnedRulesBlock ? (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(constitution.learnedRulesBlock).then(
                  () =>
                    toast.success(
                      "Bloc LEARNED_RULES copié — à coller dans la constitution (promotion finale volontaire).",
                    ),
                  () => toast.error("Impossible de copier le bloc LEARNED_RULES."),
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
        {localConstitution ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Mode</div>
              <div
                className={`font-extrabold ${localConstitution.wolfState.enforce ? "text-red-600" : "text-sky-600"}`}
              >
                {localConstitution.wolfState.enforce ? "ENFORCE (recadre)" : "OBSERVATION (shadow)"}
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">
                Échantillonnage sémantique
              </div>
              <div className="font-extrabold text-ink">
                {localConstitution.wolfState.semanticRatePct}%
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Vérif. activée</div>
              <div
                className={`font-extrabold ${localConstitution.wolfState.enabled ? "text-leaf" : "text-red-600"}`}
              >
                {localConstitution.wolfState.enabled ? "Oui" : "NON (kill-switch)"}
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">Seuils suggestions</div>
              <div className="font-extrabold text-ink">
                ≥{localConstitution.wolfState.suggestThresholds.minCount} occ. · ≥
                {localConstitution.wolfState.suggestThresholds.minChildren} enf.
              </div>
            </div>
            <div className="bg-surface/30 p-3 rounded-xl border border-ink/5">
              <div className="text-[10px] text-ink/50 font-bold uppercase">
                Seuils auto-acquittement
              </div>
              <div className="font-extrabold text-ink">
                ≥{localConstitution.wolfState.autoAckThresholds.minCount} occ. · ≥
                {localConstitution.wolfState.autoAckThresholds.minChildren} enf.
              </div>
            </div>
          </div>
        ) : null}

        {/* Suggestions en attente */}
        <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
            En attente —{" "}
            {localConstitution
              ? `${localConstitution.suggestions.length} règle(s) proposée(s)`
              : "…"}
          </div>
          {!localConstitution ? (
            <p className="text-xs text-ink/50 italic">Chargement des suggestions…</p>
          ) : localConstitution.suggestions.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucune règle en attente — le Loup observe et n'a rien à soumettre pour l'instant.
            </p>
          ) : (
            <ul className="space-y-3">
              {localConstitution.suggestions.map((s) => (
                <SuggestionRow
                  key={ruleKeyOf(s.kind, s.domain, s.rule)}
                  suggestion={s}
                  busy={decidingKeys.includes(ruleKeyOf(s.kind, s.domain, s.rule))}
                  onDecide={handleDecideSuggestion}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Journal des décisions (auto + humaines) */}
        <div className="rounded-2xl border border-ink/10 bg-surface/30 p-4 space-y-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
            Journal des décisions —{" "}
            {localConstitution ? `${localConstitution.journal.length} règle(s) décidée(s)` : "…"}
          </div>
          {!localConstitution ? (
            <p className="text-xs text-ink/50 italic">Chargement du journal…</p>
          ) : localConstitution.journal.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucune décision enregistrée — le Loup n'a encore rien auto-acquitté ni validé.
            </p>
          ) : (
            <ul className="space-y-2">
              {localConstitution.journal.slice(0, 12).map((j) => (
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
            Signaux d'abandon —{" "}
            {localConstitution ? `${localConstitution.outcomeSignals.length} signal(aux)` : "…"}
          </div>
          {!localConstitution ? (
            <p className="text-xs text-ink/50 italic">Chargement des signaux…</p>
          ) : localConstitution.outcomeSignals.length === 0 ? (
            <p className="text-xs text-ink/50 italic">
              Aucun défi supprimé pour l'instant — les abandons alimenteront Naya ici.
            </p>
          ) : (
            <ul className="space-y-2">
              {localConstitution.outcomeSignals.slice(0, 12).map((s) => (
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
            <table className="w-full min-w-[560px] text-left border-collapse text-xs">
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
                    <td className="py-3 pr-3 font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-brand inline-block" />
                        <span>{item.feature}</span>
                      </div>
                      <span className="text-[10px] text-ink/50 font-medium block pl-4 mt-0.5">
                        {item.feature === "Défis"
                          ? `Tâche 1 : Défis personnalisés apprenants (Moteur actif : ${modelOptions.find((m) => m.id === currentChallengeModel)?.label || "DeepSeek"})`
                          : item.feature === "Copilote Professeur"
                          ? "Tâche 2 : Déconstruction didactique, fiches de cours & ZPA (GLM dédié)"
                          : item.feature === "Hypothèses"
                          ? "Diagnostic bayésien & dominantes de talents Gardner (DeepSeek Pro)"
                          : "Synthèse périodique & conseils d'accompagnement parents"}
                      </span>
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

        {/* Model Breakdown Panel (DeepSeek, GLM, Qwen, Sonnet) */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600">
              <Cpu className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Distribution par Modèle & Spécialisation
              </h3>
              <p className="text-xs text-ink/60 font-medium">
                Part relative du volume et de la facture globale par moteur IA et cas d'usage.
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
                    <span className="text-[10px] text-ink/50 font-semibold">
                      {model.model.includes("GLM")
                        ? `($${telemetry?.livePricing?.glmFlash?.inputPerM ?? 0.075}/$${telemetry?.livePricing?.glmFlash?.outputPerM ?? 0.25} 1M)`
                        : model.model.includes("Qwen")
                        ? `($${telemetry?.livePricing?.qwenFlash?.inputPerM ?? 0.0481}/$${telemetry?.livePricing?.qwenFlash?.outputPerM ?? 0.193} 1M)`
                        : model.model.includes("V4 Pro")
                        ? `($${telemetry?.livePricing?.deepseekReasoner?.inputPerM ?? 0.6876}/$${telemetry?.livePricing?.deepseekReasoner?.outputPerM ?? 1.3753} 1M)`
                        : model.model.includes("Sonnet")
                        ? `($${telemetry?.livePricing?.visionSonnet?.inputPerM ?? 2.0}/$${telemetry?.livePricing?.visionSonnet?.outputPerM ?? 10.0} 1M)`
                        : `($${telemetry?.livePricing?.deepseekChat?.inputPerM ?? 0.0808}/$${telemetry?.livePricing?.deepseekChat?.outputPerM ?? 0.1616} 1M)`}
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

                {/* Explication contextuelle du rôle et des tâches du modèle */}
                {model.model.includes("GLM") ? (
                  <div className="space-y-1 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/60 text-[11px]">
                    <p className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-emerald-600 shrink-0" />
                      Double tâche : Copilote Enseignants & Option Défis Naya
                    </p>
                    <p className="text-emerald-800 leading-snug">
                      • <strong>Tâche 2 (Copilote Enseignants)</strong> : Déconstruction didactique instantanée, fiches de cours multimodales et différentiation ZPA (usage dédié en classe).
                    </p>
                    <p className="text-emerald-800 leading-snug">
                      • <strong>Tâche 1 (Défis Naya)</strong> : Moteur réactif alternatif sélectionnable d'un clic dans le switcher Admin OS.
                    </p>
                  </div>
                ) : model.model.includes("Qwen") ? (
                  <div className="bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200/60 text-[11px]">
                    <p className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-indigo-600 shrink-0" />
                      Tâche 1 · Défis Naya : Moteur Concision & Vélocité (Alibaba)
                    </p>
                    <p className="text-indigo-800 leading-snug mt-0.5">
                      Inférence ultra-rapide, raisonnement mathématique rigoureux, respect JSON strict et tarif plancher OpenRouter (${telemetry?.livePricing?.qwenFlash?.inputPerM ?? 0.0481}/M in · ${telemetry?.livePricing?.qwenFlash?.outputPerM ?? 0.193}/M out).
                    </p>
                  </div>
                ) : model.model.includes("V4 Pro") ? (
                  <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 text-[11px]">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <Brain className="size-3.5 text-amber-600 shrink-0" />
                      Tâche Diagnostic Bayésien : Raisonnement & cycles d'hypothèses
                    </p>
                    <p className="text-amber-800 leading-snug mt-0.5">
                      Réflexion profonde avec effort élevé pour la confirmation des dominantes de talents Gardner et l'anamnèse.
                    </p>
                  </div>
                ) : model.model.includes("Sonnet") ? (
                  <div className="bg-purple-50/80 p-2.5 rounded-xl border border-purple-200/60 text-[11px]">
                    <p className="font-extrabold text-purple-900 flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-purple-600 shrink-0" />
                      Tâche Vision Multimodale : Audit photo des défis physiques
                    </p>
                    <p className="text-purple-800 leading-snug mt-0.5">
                      Validation d'authenticité et d'effort des réalisations manuelles et carnets de bord 100% hors écran.
                    </p>
                  </div>
                ) : (
                  <div className="bg-sky-50/80 p-2.5 rounded-xl border border-sky-200/60 text-[11px]">
                    <p className="font-extrabold text-sky-900 flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-sky-600 shrink-0" />
                      Tâche Défis Naya & Recommandations : Moteur économique historique
                    </p>
                    <p className="text-sky-800 leading-snug mt-0.5">
                      Moteur par défaut pour la génération des défis quotidiens, synthèses d'activité et conseils d'accompagnement parents.
                    </p>
                  </div>
                )}

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
            * Projection multi-modèles calculée en temps réel d'après la grille tarifaire OpenRouter : DeepSeek V4 Flash (${telemetry?.livePricing?.deepseekChat?.inputPerM ?? 0.0808}/$${telemetry?.livePricing?.deepseekChat?.outputPerM ?? 0.1616}), GLM 5.3 Flash (${telemetry?.livePricing?.glmFlash?.inputPerM ?? 0.075}/$${telemetry?.livePricing?.glmFlash?.outputPerM ?? 0.25}), Qwen 3.8 Flash (${telemetry?.livePricing?.qwenFlash?.inputPerM ?? 0.0481}/$${telemetry?.livePricing?.qwenFlash?.outputPerM ?? 0.193}) et Claude Sonnet 5 (vision photos). Taux 1 USD = 600 XOF. Le mode réflexion (activé sur v4-pro) génère des tokens de raisonnement non modélisés ici.
          </div>
        </div>
      </div>

      {/* Contextualisation locale — matériaux par pays (table country_materials) :
          la source éditable des instructions « matériaux du pays » injectées dans
          chaque prompt de génération Naya (contextualization.ts n'est que le repli). */}
      <CountryMaterialsSection />

      {/* Pilotage de la vérification back-office des manques matériels (missions de
          substitution) — réglage en base, effectif immédiatement sans redéploiement. */}
      <SubstitutionVerifySection />
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
  onDecide?: (ruleKey: string, decision: "valide" | "a_revoir" | "rejete") => void;
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
            {suggestion.domain !== "general" ? ` · ${suggestion.domain}` : ""} — ×{suggestion.count}{" "}
            occ. · {suggestion.childCount} enfant(s)
          </div>
        </div>
        {suggestion.severity === "majeur" ? (
          <span className="shrink-0 text-[10px] font-extrabold uppercase text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
            majeur
          </span>
        ) : null}
      </div>
      {constat ? <p className="text-[11px] text-ink/70 font-medium">Constat : {constat}</p> : null}
      {correctif ? (
        <p className="text-[11px] text-ink/60">Correctif proposé : {correctif}</p>
      ) : null}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onDecide?.(
              ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule),
              "valide",
            )
          }
          className="press-leaf rounded-lg bg-leaf px-3 py-1.5 text-[11px] font-extrabold text-white flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
          Intégrer
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onDecide?.(
              ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule),
              "a_revoir",
            )
          }
          className="press-white rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-[11px] font-extrabold text-amber-600 flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Eye className="size-3" />}À revoir
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onDecide?.(
              ruleKeyOf(suggestion.kind, suggestion.domain, suggestion.rule),
              "rejete",
            )
          }
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
        <span
          className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${decisionBadgeClass(decision.decision)}`}
        >
          {LOUP_DECISION_LABELS[decision.decision]}
        </span>
        <div className="min-w-0">
          <code className="text-ink font-mono text-[11px] block truncate">{decision.rule}</code>
          <div className="text-[10px] text-ink/50 font-medium">
            {decision.kind}
            {decision.domain !== "general" ? ` · ${decision.domain}` : ""} — ×{decision.count} occ.
            · {decision.childCount} enfant(s)
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
    signal.kind === "deleted_completed" ? "bg-leaf/10 text-leaf" : "bg-amber-500/10 text-amber-600";
  return (
    <li className="flex items-center justify-between gap-3 bg-white rounded-lg border border-ink/5 px-3 py-2">
      <div className="min-w-0 flex items-center gap-2">
        <span
          className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${kindClass}`}
        >
          {OUTCOME_KIND_LABELS[signal.kind]}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-ink truncate">
            {OUTCOME_REASON_LABELS[signal.reasonKey] ?? signal.reasonKey}
            {signal.domain !== "general" ? ` · ${signal.domain}` : ""}
          </div>
          <div className="text-[10px] text-ink/50 font-medium">
            ×{signal.count} suppr. · {signal.childCount} enfant(s) · Ø {signal.avgPendingDays} j
            d'attente
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Contextualisation locale — matériaux par pays (table country_materials) ──
//
// La source de vérité des « matériaux du pays » injectés dans les prompts de
// génération (contextualization.ts n'est que le repli de résilience). Édition en
// chips : libellé du pays (la clé normalisée en est dérivée côté serveur), ajout/
// retrait de matériaux, sauvegarde par ligne, suppression en deux clics.

interface CountryRowDraft {
  label: string;
  materials: string[];
  input: string;
}

function countryChipCommit(list: string[], raw: string): string[] {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value || list.includes(value)) return list;
  return [...list, value];
}

function CountryMaterialsSection() {
  const getFn = useServerFn(getCountryMaterialsAdmin);
  const upsertFn = useServerFn(upsertCountryMaterialAdmin);
  const deleteFn = useServerFn(deleteCountryMaterialAdmin);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CountryMaterialRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CountryRowDraft>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newMaterials, setNewMaterials] = useState<string[]>([]);
  const [newInput, setNewInput] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await getFn();
      setRows(res.rows);
      setLoadError(null);
      setDrafts(
        Object.fromEntries(
          res.rows.map((r) => [
            r.countryKey,
            { label: r.countryLabel, materials: [...r.materials], input: "" },
          ]),
        ),
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, [getFn]);

  useEffect(() => {
    // Chargement paresseux : un aller-retour seulement quand la section est ouverte.
    if (open && rows === null && loadError === null) void load();
  }, [open, rows, loadError, load]);

  const patchDraft = (key: string, patch: Partial<CountryRowDraft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const saveRow = async (key: string) => {
    const draft = drafts[key];
    if (!draft || busyKey) return;
    setBusyKey(key);
    try {
      await upsertFn({
        data: {
          countryLabel: draft.label,
          materials: draft.materials,
          originalKey: key,
        },
      });
      toast.success("Matériaux enregistrés — appliqués dès la prochaine génération.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setBusyKey(null);
    }
  };

  const removeRow = async (key: string) => {
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    setBusyKey(key);
    try {
      await deleteFn({ data: { countryKey: key } });
      toast.success("Pays retiré — les matériaux de repli s'appliquent désormais.");
      setConfirmDeleteKey(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la suppression.");
    } finally {
      setBusyKey(null);
    }
  };

  const [bulkImportKey, setBulkImportKey] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");

  const parseBulkTerms = (raw: string): string[] => {
    return raw
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^[\s*•\-#\d.)\]>]+/, "")
          .replace(/["`]/g, "")
          .trim(),
      )
      .filter((item) => item.length > 1);
  };

  const applyBulkImport = (targetKey: string) => {
    const terms = parseBulkTerms(bulkText);
    if (terms.length === 0) {
      toast.error("Aucun terme valide trouvé dans le texte.");
      return;
    }

    if (targetKey === "__new__") {
      let next = [...newMaterials];
      for (const t of terms) {
        next = countryChipCommit(next, t);
      }
      setNewMaterials(next);
      toast.success(`${terms.length} terme(s) importé(s) pour le nouveau pays !`);
    } else {
      const draft = drafts[targetKey];
      if (draft) {
        let next = [...draft.materials];
        for (const t of terms) {
          next = countryChipCommit(next, t);
        }
        patchDraft(targetKey, { materials: next });
        toast.success(`${terms.length} terme(s) importé(s) pour ${draft.label} !`);
      }
    }
    setBulkText("");
    setBulkImportKey(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setBulkText(content);
        setBulkImportKey(targetKey);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addCountry = async () => {
    if (savingNew) return;
    if (newLabel.trim().length < 2 || newMaterials.length === 0) {
      toast.error("Renseignez un libellé de pays et au moins un matériau.");
      return;
    }
    setSavingNew(true);
    try {
      await upsertFn({ data: { countryLabel: newLabel, materials: newMaterials } });
      toast.success("Pays ajouté — appliqué dès la prochaine génération.");
      setNewLabel("");
      setNewMaterials([]);
      setNewInput("");
      setBulkText("");
      setBulkImportKey(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'ajout.");
    } finally {
      setSavingNew(false);
    }
  };

  /** Commit d'un chip à la touche Entrée (préserve le focus de l'input). */
  const chipInputKeyDown =
    (
      list: string[],
      input: string,
      setInput: (v: string) => void,
      apply: (next: string[]) => void,
    ) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (input.trim()) {
        apply(countryChipCommit(list, input));
        setInput("");
      }
    };

  return (
    <div className="rounded-3xl border border-ink/10 bg-white shadow-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-6 text-left cursor-pointer"
      >
        <div className="p-2.5 rounded-2xl bg-brand/10 text-brand">
          <MapPin className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-black text-ink">Contextualisation locale</h3>
          <p className="text-xs text-ink/50 font-medium">
            Matériaux locaux par pays, injectés dans chaque prompt de génération de Naya. Les pays
            absents de la table retombent sur les matériaux génériques de repli.
          </p>
        </div>
        <ChevronDown
          className={`size-5 text-ink/40 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 pt-5 border-t border-ink/5 space-y-4">
          {loadError && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="flex-1">Chargement impossible : {loadError}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="press-red underline font-bold cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          )}

          {rows !== null && rows.length === 0 && !loadError && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              Table vide — la migration 20260905140000 (seed des pays) semble ne pas avoir été
              appliquée. Vous pouvez ajouter les pays manuellement ci-dessous.
            </div>
          )}

          {(rows ?? []).map((row) => {
            const draft = drafts[row.countryKey];
            if (!draft) return null;
            const dirty =
              draft.label !== row.countryLabel ||
              draft.materials.join("|") !== row.materials.join("|");
            const busy = busyKey === row.countryKey;
            const isBulkOpen = bulkImportKey === row.countryKey;

            return (
              <div key={row.countryKey} className="rounded-2xl border border-ink/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={draft.label}
                    onChange={(e) => patchDraft(row.countryKey, { label: e.target.value })}
                    className="flex-1 min-w-[180px] rounded-xl border border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                    aria-label={`Libellé du pays ${row.countryKey}`}
                  />
                  <span className="text-[10px] font-mono text-ink/40 bg-ink/5 rounded-lg px-2 py-1">
                    {row.countryKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBulkImportKey(isBulkOpen ? null : row.countryKey)}
                    className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    📥 {isBulkOpen ? "Fermer l'import" : "Importer une liste (.txt/.md)"}
                  </button>
                </div>

                {isBulkOpen && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-indigo-950">
                        Collez votre liste (1 terme par ligne ou puces markdown - / *) :
                      </p>
                      <label className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer underline">
                        <span>Charger fichier (.md/.txt)</span>
                        <input
                          type="file"
                          accept=".txt,.md"
                          onChange={(e) => handleFileUpload(e, row.countryKey)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`- Argile rouge\n- Bois d'ébène\n- Bambou\n- Feuilles de bananier`}
                      className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs text-ink outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkText("");
                          setBulkImportKey(null);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-ink/10 bg-white text-ink/70 text-xs font-semibold cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBulkImport(row.countryKey)}
                        disabled={!bulkText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Importer les termes ({parseBulkTerms(bulkText).length})
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {draft.materials.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[11px] font-bold"
                    >
                      {m}
                      <button
                        type="button"
                        aria-label={`Retirer ${m}`}
                        onClick={() =>
                          patchDraft(row.countryKey, {
                            materials: draft.materials.filter((x) => x !== m),
                          })
                        }
                        className="cursor-pointer text-brand/60 hover:text-brand"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={draft.input}
                    onChange={(e) => patchDraft(row.countryKey, { input: e.target.value })}
                    onKeyDown={chipInputKeyDown(
                      draft.materials,
                      draft.input,
                      (v) => patchDraft(row.countryKey, { input: v }),
                      (next) => patchDraft(row.countryKey, { materials: next }),
                    )}
                    placeholder="Ajouter un matériau…"
                    className="flex-1 min-w-[160px] rounded-full border border-dashed border-ink/20 px-3 py-1 text-[11px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void removeRow(row.countryKey)}
                    className={`press-red rounded-xl border px-3 py-1.5 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer ${
                      confirmDeleteKey === row.countryKey
                        ? "border-red-300 bg-red-500 text-white"
                        : "border-red-100 bg-red-50 text-red-600"
                    }`}
                  >
                    <Trash2 className="size-3.5" />
                    {confirmDeleteKey === row.countryKey ? "Confirmer ?" : "Supprimer"}
                  </button>
                  <button
                    type="button"
                    disabled={!dirty || busy}
                    onClick={() => void saveRow(row.countryKey)}
                    className="press-leaf rounded-xl border border-leaf/20 bg-leaf/10 px-3 py-1.5 text-[11px] font-extrabold text-leaf flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Enregistrer
                  </button>
                </div>
              </div>
            );
          })}

          {rows !== null && (
            <div className="rounded-2xl border border-dashed border-ink/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50">
                  Ajouter un pays
                </p>
                <button
                  type="button"
                  onClick={() => setBulkImportKey(bulkImportKey === "__new__" ? null : "__new__")}
                  className="px-2.5 py-1 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  📥 {bulkImportKey === "__new__" ? "Fermer l'import" : "Importer une liste (.txt/.md)"}
                </button>
              </div>

              {bulkImportKey === "__new__" && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-indigo-950">
                      Collez votre liste de matériaux pour le nouveau pays :
                    </p>
                    <label className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer underline">
                      <span>Charger fichier (.md/.txt)</span>
                      <input
                        type="file"
                        accept=".txt,.md"
                        onChange={(e) => handleFileUpload(e, "__new__")}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`- Matériau 1\n- Matériau 2\n- Matériau 3`}
                    className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs text-ink outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkText("");
                        setBulkImportKey(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-ink/10 bg-white text-ink/70 text-xs font-semibold cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkImport("__new__")}
                      disabled={!bulkText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Importer les termes ({parseBulkTerms(bulkText).length})
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Libellé (ex: Mauritanie)"
                  className="flex-1 min-w-[180px] rounded-xl border border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="button"
                  disabled={savingNew}
                  onClick={() => void addCountry()}
                  className="press-sky rounded-xl border border-sky/20 bg-sky/10 px-4 py-2 text-[11px] font-extrabold text-ink flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {savingNew ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {newMaterials.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[11px] font-bold"
                  >
                    {m}
                    <button
                      type="button"
                      aria-label={`Retirer ${m}`}
                      onClick={() => setNewMaterials(newMaterials.filter((x) => x !== m))}
                      className="cursor-pointer text-brand/60 hover:text-brand"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={chipInputKeyDown(newMaterials, newInput, setNewInput, setNewMaterials)}
                  placeholder="Ajouter un matériau…"
                  className="flex-1 min-w-[160px] rounded-full border border-dashed border-ink/20 px-3 py-1 text-[11px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Vérification des manques matériels — pilotage (app_settings) ────────────────
//
// La vérification shadow (Naya re-vérifie en silence si des substituts réalistes
// existaient quand une mission de substitution échoue) est pilotée ici : switch
// ON/OFF + taux d'échantillonnage. Réglage stocké en base (app_settings) — effectif
// immédiatement, sans redéploiement. Les variables d'environnement restent le repli
// si la ligne de réglage disparaît.

const VERIFY_RATE_CHOICES: Array<{ rate: number; label: string }> = [
  { rate: 1, label: "100 %" },
  { rate: 0.5, label: "50 %" },
  { rate: 0.25, label: "25 %" },
  { rate: 0.1, label: "10 %" },
];

function SubstitutionVerifySection() {
  const getFn = useServerFn(getSubstitutionVerifyAdmin);
  const setFn = useServerFn(setSubstitutionVerifyAdmin);

  const [config, setConfig] = useState<{
    enabled: boolean;
    rate: number;
    updatedAt: string | null;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    getFn()
      .then(setConfig)
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (next: { enabled: boolean; rate: number }) => {
    if (saving) return;
    const previous = config;
    setConfig((c) => (c ? { ...c, ...next } : c));
    setSaving(true);
    try {
      await setFn({ data: next });
      toast.success("Réglage appliqué — effectif immédiatement, sans redéploiement.");
      const fresh = await getFn();
      setConfig(fresh);
    } catch (e) {
      setConfig(previous);
      toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-sky/10 text-sky">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-black text-ink">
            Vérification des manques matériels
          </h3>
          <p className="text-xs text-ink/50 font-medium">
            Quand une mission de substitution n'aboutit pas, Naya re-vérifie en
            secret si des substituts réalistes existaient — pour enrichir sa
            compréhension du terrain. Jamais montré à l'enfant ni au parent.
          </p>
        </div>
        {config && (
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            disabled={saving}
            onClick={() => void save({ enabled: !config.enabled, rate: config.rate })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              config.enabled ? "bg-leaf" : "bg-ink/20"
            }`}
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                config.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </div>

      {loadError && (
        <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          Chargement impossible — les défauts (activé, 100 %) s'appliquent en attendant.
        </div>
      )}

      {config && config.enabled && (
        <div className="mt-4 pt-4 border-t border-ink/5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50 mb-2">
            Fréquence de vérification
          </p>
          <div className="flex flex-wrap gap-2">
            {VERIFY_RATE_CHOICES.map(({ rate, label }) => {
              const selected = Math.abs(config.rate - rate) < 0.001;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={saving}
                  onClick={() => void save({ enabled: true, rate })}
                  className={`rounded-xl border px-4 py-2 text-[12px] font-extrabold transition-all cursor-pointer disabled:opacity-60 ${
                    selected
                      ? "border-sky/30 bg-sky/10 text-sky"
                      : "border-ink/10 bg-white text-ink/60 hover:bg-surface"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink/40 font-medium">
            {config.rate >= 1
              ? "Chaque événement est vérifié."
              : `Environ ${Math.round(config.rate * 100)} % des événements sont vérifiés, tirés au hasard.`}
            {config.updatedAt
              ? ` Dernier changement : ${new Date(config.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}

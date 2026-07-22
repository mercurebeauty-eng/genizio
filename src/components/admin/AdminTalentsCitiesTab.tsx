import React from "react";
import {
  CityStatItem,
  GardnerTotalItem,
  GuildDistributionItem,
  HighPotentialAlert,
  TalentCityStatsResponse,
} from "@/lib/admin-os.functions";
import {
  MapPin,
  Building2,
  Users,
  ShoppingBag,
  Sparkles,
  Zap,
  Award,
  Brain,
  Shield,
  Star,
  TrendingUp,
  RefreshCw,
  Crown,
  CheckCircle2,
} from "lucide-react";

interface AdminTalentsCitiesTabProps {
  data: TalentCityStatsResponse;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function AdminTalentsCitiesTab({
  data,
  isRefreshing = false,
  onRefresh,
}: AdminTalentsCitiesTabProps) {
  const { cityStats, gardnerTotals, guildDistribution, highPotentialAlerts, summary } = data;

  return (
    <div className="space-y-8">
      {/* Header Bar & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-extrabold text-leaf uppercase tracking-wider">
              Admin OS • Territoires & Talents
            </span>
          </div>
          <h2 className="font-display text-2xl font-black text-ink mt-1">
            Cartographie des Guildes & Intelligence par Ville
          </h2>
          <p className="text-sm font-medium text-ink/60 mt-0.5">
            Analyse comparative de l'empreinte géographique, répartition des intelligences Gardner et détection des hauts potentiels.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="press-white inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-4 py-2.5 text-xs font-extrabold text-ink transition-all hover:bg-white disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`size-4 text-brand ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Actualisation…" : "Actualiser"}</span>
          </button>
        )}
      </div>

      {/* 📊 Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Total Enfants</span>
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.totalChildren}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Profils d'enfants enregistrés</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Villes Actives</span>
            <div className="size-10 rounded-2xl bg-leaf/10 text-leaf flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.totalCities}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Territoires africains identifiés</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Hauts Potentiels</span>
            <div className="size-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.highPotentialCount}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Alertes talent (Score ≥ 70)</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">Commandes Boutique</span>
            <div className="size-10 rounded-2xl bg-sky/10 text-sky-600 flex items-center justify-center">
              <ShoppingBag className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.totalOrders}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Kits physiques commandés</p>
          </div>
        </div>
      </div>

      {/* 🗺️ Section 1: Geographic Distribution */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-brand" />
              <h3 className="font-display text-xl font-black text-ink">
                Répartition Géographique par Ville
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Densité de la communauté Génizio et taux de commandes boutique par ville.
            </p>
          </div>
          <span className="text-xs font-extrabold text-brand bg-brand/10 px-3 py-1 rounded-full">
            {cityStats.length} zone(s)
          </span>
        </div>

        {/* City Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cityStats.slice(0, 6).map((item) => (
            <div
              key={item.city}
              className="rounded-2xl border border-ink/10 bg-surface/40 p-4 space-y-3 transition-all hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-display font-extrabold text-base text-ink flex items-center gap-1.5">
                    <span>{item.city}</span>
                  </h4>
                  <span className="text-xs font-medium text-ink/60">
                    {item.childrenCount} enfant{item.childrenCount > 1 ? "s" : ""} ({item.percentage}%)
                  </span>
                </div>
                <span className="text-xs font-bold rounded-full bg-white border border-ink/10 px-2.5 py-1 text-ink/70">
                  {item.ordersCount} cmd{item.ordersCount > 1 ? "s" : ""}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-ink/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Full City Distribution Table */}
        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-ink/70 font-extrabold text-xs uppercase tracking-wider border-b border-ink/10">
              <tr>
                <th className="px-5 py-3.5">Ville</th>
                <th className="px-5 py-3.5 text-center">Enfants Inscrits</th>
                <th className="px-5 py-3.5 text-center">Part du Total</th>
                <th className="px-5 py-3.5 text-center">Commandes Kits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white font-medium">
              {cityStats.map((item) => (
                <tr key={item.city} className="hover:bg-surface/30 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-ink flex items-center gap-2">
                    <MapPin className="size-4 text-ink/40" />
                    <span>{item.city}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-ink">{item.childrenCount}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-block rounded-full bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-extrabold">
                      {item.percentage}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-ink/80">{item.ordersCount}</td>
                </tr>
              ))}
              {cityStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink/60 italic">
                    Aucune donnée géographique enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🏰 Section 2: Guildes & 9 Intelligences Gardner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Les 6 Guildes d'Excellence */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="size-5 text-leaf" />
              <h3 className="font-display text-xl font-black text-ink">
                Les 6 Guildes d'Excellence
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60">
              Répartition des enfants selon leur guilde dominée par leurs talents actifs.
            </p>
          </div>

          <div className="space-y-3 my-4">
            {guildDistribution.map((guild) => (
              <div
                key={guild.key}
                className="rounded-2xl border border-ink/10 bg-surface/30 p-3.5 flex items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{guild.emoji}</span>
                  <div>
                    <h4 className="font-display font-extrabold text-sm text-ink">{guild.name}</h4>
                    <span className="text-[11px] font-medium text-ink/60">
                      {guild.count} enfant{guild.count > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 min-w-32">
                  <div className="flex-1 bg-ink/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-leaf h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, guild.percentage)}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-ink min-w-8 text-right">
                    {guild.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-leaf/5 border border-leaf/20 p-3.5 text-xs text-leaf/90 font-medium">
            💡 <strong>Règle des Guildes :</strong> L'algorithme attribue la guilde à partir du score cumulé des talents dominants (ex. Bâtisseurs = Spatiale + Artisanale).
          </div>
        </div>

        {/* 🧠 Les 9 Intelligences Howard Gardner */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="size-5 text-purple-600" />
              <h3 className="font-display text-xl font-black text-ink">
                Howard Gardner — 9 Intelligences
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60">
              Cumul et moyenne des scores d'intelligences révélés par les défis relevés.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
            {gardnerTotals.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-ink/10 bg-surface/30 p-3.5 flex flex-col justify-between space-y-2 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-sm text-ink">{item.label}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700">
                    Moy. {item.avgScore}
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-xs text-ink/60">Total cumulé : </span>
                    <span className="font-extrabold text-ink text-sm">{item.totalScore} pts</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink/50">
                    {item.count} signal{item.count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-3.5 text-xs text-purple-800 font-medium">
            🎯 <strong>Modèle Gardner :</strong> Évaluation holistique couvrant de la logique et du langage jusqu'à l'empathie sociale et l'intelligence spatiale.
          </div>
        </div>
      </div>

      {/* ⚡ Section 3: High-Potential Profiles Panel */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-amber-500" />
              <h3 className="font-display text-xl font-black text-ink">
                Détection Automatique — Profils à Haut Potentiel
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Identification en temps réel des profils ayant atteint un score d'excellence (Score ≥ 70/100).
            </p>
          </div>
          <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            {highPotentialAlerts.length} alerte{highPotentialAlerts.length > 1 ? "s" : ""}
          </span>
        </div>

        {highPotentialAlerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-8 text-center space-y-2">
            <Star className="size-8 text-ink/30 mx-auto" />
            <p className="font-display font-extrabold text-base text-ink">
              Aucune alerte haut potentiel active
            </p>
            <p className="text-xs text-ink/60 max-w-sm mx-auto">
              Les profils d'enfants apparaîtront automatiquement ici dès qu'ils auront cumulé un score de 70+ dans l'une des intelligences Gardner.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highPotentialAlerts.map((alert) => (
              <div
                key={alert.childId}
                className="rounded-2xl border border-ink/10 bg-surface/40 p-5 space-y-3 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-display font-black text-lg">
                      {alert.childName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                        <span>{alert.childName}</span>
                        <span className="text-xs font-medium text-ink/60">({alert.age} ans)</span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-ink/40" />
                          {alert.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${alert.badgeColor}`}>
                    {alert.score} / 100
                  </span>
                </div>

                <div className="rounded-xl bg-white border border-ink/10 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand">
                    <Crown className="size-3.5" />
                    <span>Domaine : {alert.dominantTalent}</span>
                  </div>
                  <p className="text-xs font-medium text-ink/70 leading-relaxed">
                    {alert.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

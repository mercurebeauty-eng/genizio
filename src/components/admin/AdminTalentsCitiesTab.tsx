import React, { useState, useMemo } from "react";
import {
  CityStatItem,
  GardnerTotalItem,
  GuildDistributionItem,
  HighPotentialAlert,
  EliteTalentProfile,
  TerritoryGuildMatrixItem,
  HybridLicorneProfile,
  TalentCityStatsResponse,
} from "@/lib/admin-os.functions";
import { GUILDS } from "@/lib/guilds";
import {
  MapPin,
  Building2,
  Users,
  ShoppingBag,
  Zap,
  Award,
  Brain,
  Shield,
  Star,
  TrendingUp,
  RefreshCw,
  Crown,
  Flame,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Sparkles,
  Compass,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

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
  const {
    cityStats = [],
    gardnerTotals = [],
    guildDistribution = [],
    highPotentialAlerts = [],
    eliteRanking = [],
    territoryGuildMatrix = [],
    hybridLicornes = [],
    summary = {
      totalChildren: 0,
      totalCities: 0,
      highPotentialCount: 0,
      totalOrders: 0,
      eliteCount: 0,
      unicornsCount: 0,
    },
  } = data;

  // États pour le filtre du Palmarès d'Excellence
  const [selectedGuild, setSelectedGuild] = useState<string>("toutes");
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<string>("tous");
  const [selectedCity, setSelectedCity] = useState<string>("toutes");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Villes uniques pour le dropdown
  const uniqueCitiesList = useMemo(() => {
    const set = new Set<string>();
    cityStats.forEach((c) => {
      if (c.city && c.city !== "Ville non renseignée") set.add(c.city);
    });
    return Array.from(set).sort();
  }, [cityStats]);

  // Filtrage dynamique du Palmarès
  const filteredEliteProfiles = useMemo(() => {
    return eliteRanking.filter((p) => {
      // Filtre Guilde
      if (selectedGuild !== "toutes" && p.guildKey !== selectedGuild) return false;

      // Filtre Ville
      if (selectedCity !== "toutes" && p.city !== selectedCity) return false;

      // Filtre Tranche d'Âge
      if (selectedAgeBracket === "5-7" && (p.age < 5 || p.age > 7)) return false;
      if (selectedAgeBracket === "8-11" && (p.age < 8 || p.age > 11)) return false;
      if (selectedAgeBracket === "12-15" && (p.age < 12 || p.age > 15)) return false;
      if (selectedAgeBracket === "16+" && p.age < 16) return false;

      // Filtre Recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.childName.toLowerCase().includes(q);
        const matchCity = p.city.toLowerCase().includes(q);
        const matchTalent = p.dominantTalentLabel.toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchTalent) return false;
      }

      return true;
    });
  }, [eliteRanking, selectedGuild, selectedAgeBracket, selectedCity, searchQuery]);

  // Exportation de la cohorte filtrée en CSV
  const handleExportCSV = () => {
    if (filteredEliteProfiles.length === 0) {
      toast.error("Aucun profil à exporter avec les filtres actuels.");
      return;
    }

    const headers = [
      "Rang",
      "Nom",
      "Âge",
      "Ville",
      "Pays",
      "Guilde",
      "Talent Dominant",
      "Score Talent",
      "Initiatives Découverte",
      "Roles Naturels",
      "Score Composite",
      "Tier Excellence",
    ];

    const rows = filteredEliteProfiles.map((p, idx) => [
      idx + 1,
      `"${p.childName.replace(/"/g, '""')}"`,
      p.age,
      `"${p.city.replace(/"/g, '""')}"`,
      `"${(p.country || "").replace(/"/g, '""')}"`,
      `"${p.guildName}"`,
      `"${p.dominantTalentLabel}"`,
      p.maxTalentScore,
      p.discoveryCount,
      `"${p.naturalRoles.join(", ")}"`,
      p.compositeScore,
      `"${p.tierBadge}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `genizio_palmares_talents_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${filteredEliteProfiles.length} profils exportés en CSV avec succès !`);
  };

  return (
    <div className="space-y-8">
      {/* 👑 Header Bar & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand uppercase tracking-wider">
              Admin OS • Talent Intelligence Command Center
            </span>
          </div>
          <h2 className="font-display text-2xl font-black text-ink mt-1">
            Centre de Contrôle des Viviers de Talents d'Élite
          </h2>
          <p className="text-sm font-medium text-ink/60 mt-0.5">
            Cartographie des 6 Guildes, palmarès d'excellence pour remises de prix et détection des
            profils hybrides rares.
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
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Total Enfants
            </span>
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">
              {summary.totalChildren}
            </div>
            <p className="text-xs font-medium text-ink/50 mt-1">Profils enregistrés</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Villes Couvertes
            </span>
            <div className="size-10 rounded-2xl bg-leaf/10 text-leaf flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.totalCities}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Pôles territoriaux actifs</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Vivier d'Élite
            </span>
            <div className="size-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Crown className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">
              {summary.eliteCount || eliteRanking.length}
            </div>
            <p className="text-xs font-medium text-ink/50 mt-1">Lauréats Remise de Prix</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Profils Licornes
            </span>
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">
              {summary.unicornsCount || hybridLicornes.length}
            </div>
            <p className="text-xs font-medium text-ink/50 mt-1">Hybrides double-excellence</p>
          </div>
        </div>
      </div>

      {/* 🏆 Section 1: Palmarès d'Excellence & Remise de Prix */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="size-6 text-brand" />
              <h3 className="font-display text-xl font-black text-ink">
                Palmarès d'Excellence & Remise de Prix Génizio
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Classement composite d'élite (Talents Gardner + Initiatives Découverte + Plasticité en
              Équipe + XP).
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand text-white px-4 py-2.5 text-xs font-extrabold shadow-sm transition-all hover:bg-brand/90 cursor-pointer self-start md:self-auto"
          >
            <Download className="size-4" />
            <span>Exporter la Cohorte ({filteredEliteProfiles.length} profils CSV)</span>
          </button>
        </div>

        {/* 🔍 Barre de Filtres Interactifs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface/50 p-4 rounded-2xl border border-ink/10">
          {/* Recherche texte */}
          <div className="relative">
            <Search className="size-4 absolute left-3 top-3 text-ink/40" />
            <input
              type="text"
              placeholder="Rechercher prénom, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* Filtre Guilde */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-ink/40 shrink-0" />
            <select
              value={selectedGuild}
              onChange={(e) => setSelectedGuild(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="toutes">Toutes les Guildes</option>
              {Object.values(GUILDS).map((g) => (
                <option key={g.key} value={g.key}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Tranche d'Âge */}
          <div>
            <select
              value={selectedAgeBracket}
              onChange={(e) => setSelectedAgeBracket(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="tous">Toutes les tranches d'âge</option>
              <option value="5-7">5 - 7 ans (Éveil)</option>
              <option value="8-11">8 - 11 ans (Exploration)</option>
              <option value="12-15">12 - 15 ans (Maîtrise)</option>
              <option value="16+">16 ans et + (Jeunes Adultes)</option>
            </select>
          </div>

          {/* Filtre Ville */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="toutes">Toutes les Villes</option>
              {uniqueCitiesList.map((c) => (
                <option key={c} value={c}>
                  📍 {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 🏆 Tableau du Palmarès d'Élite */}
        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-surface text-ink/70 font-extrabold text-xs uppercase tracking-wider border-b border-ink/10">
              <tr>
                <th className="px-4 py-3.5 text-center">Rang</th>
                <th className="px-5 py-3.5">Enfant & Territoire</th>
                <th className="px-5 py-3.5">Guilde d'Excellence</th>
                <th className="px-5 py-3.5">Talent Dominant</th>
                <th className="px-4 py-3.5 text-center">Initiatives</th>
                <th className="px-5 py-3.5 text-center">Score Composite</th>
                <th className="px-5 py-3.5 text-center">Distinction / Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white font-medium">
              {filteredEliteProfiles.map((profile, idx) => (
                <tr key={profile.childId} className="hover:bg-surface/30 transition-colors">
                  <td className="px-4 py-3.5 text-center font-display font-black text-ink">
                    {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-display font-black text-sm">
                        {profile.childName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-display font-extrabold text-sm text-ink">
                          {profile.childName} <span className="text-xs text-ink/50">({profile.age} ans)</span>
                        </div>
                        <div className="text-xs text-ink/60 flex items-center gap-1">
                          <MapPin className="size-3 text-ink/40" />
                          {profile.city} {profile.country ? `• ${profile.country}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ink/10 bg-surface text-xs font-bold text-ink">
                      <span>{profile.guildEmoji}</span>
                      <span>{profile.guildName}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-bold text-ink">{profile.dominantTalentLabel}</div>
                    <div className="text-[11px] text-ink/50">Score : {profile.maxTalentScore}/100</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky/10 text-sky-700 text-xs font-extrabold">
                      {profile.discoveryCount} trace{profile.discoveryCount > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-display font-black text-base text-ink">
                    {profile.compositeScore} <span className="text-xs font-normal text-ink/40">/100</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs border ${profile.tierColor}`}>
                      {profile.tierBadge}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEliteProfiles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink/60 italic">
                    Aucun profil d'élite ne correspond aux filtres de recherche sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🗺️ Section 2: Matrice Croisée Territoires × Guildes */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-brand" />
              <h3 className="font-display text-xl font-black text-ink">
                Matrice Territoires × Guildes (Pôles de Spécialités Urbaines)
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Cartographie des vocations dominantes par ville pour planifier les événements et FabLabs physiques.
            </p>
          </div>
          <span className="text-xs font-extrabold text-brand bg-brand/10 px-3 py-1 rounded-full">
            {territoryGuildMatrix.length} territoire(s)
          </span>
        </div>

        {/* Grille des Villes avec Spécialités */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {territoryGuildMatrix.map((item) => (
            <div
              key={item.city}
              className="rounded-2xl border border-ink/10 bg-surface/30 p-5 space-y-3 transition-all hover:bg-white hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h4 className="font-display font-extrabold text-base text-ink flex items-center gap-1.5">
                    <span>{item.city}</span>
                  </h4>
                  <span className="text-xs font-medium text-ink/60">
                    {item.totalChildren} enfant{item.totalChildren > 1 ? "s" : ""} recensé(s)
                  </span>
                </div>
                <div className="flex items-center shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-brand/10 text-brand border border-brand/20 whitespace-nowrap">
                    <span>Spécialité :</span>
                    <span>{item.dominantGuildEmoji}</span>
                    <span>{item.dominantGuildName}</span>
                  </span>
                </div>
              </div>

              {/* Répartition des 6 guildes dans cette ville */}
              <div className="space-y-1.5 pt-2 border-t border-ink/10">
                {Object.entries(item.guildBreakdown).map(([gKey, count]) => {
                  const gInfo = GUILDS[gKey as keyof typeof GUILDS];
                  if (!gInfo) return null;
                  const pct = item.totalChildren > 0 ? Math.round((count / item.totalChildren) * 100) : 0;
                  return (
                    <div key={gKey} className="flex items-center justify-between text-xs">
                      <span className="text-ink/70 font-medium flex items-center gap-1">
                        <span>{gInfo.emoji}</span>
                        <span>{gInfo.name}</span>
                      </span>
                      <span className="font-bold text-ink">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🦄 Section 3: Radar des Profils Rares & Hybrides ("Les Licornes") */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-600" />
              <h3 className="font-display text-xl font-black text-ink">
                Radar des Profils Rares & Hybrides ("Les Licornes Génizio")
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Détection automatique des combinaisons atypiques (ex: STEM analytique + Empathie sociale ou Créatif + Business).
            </p>
          </div>
          <span className="text-xs font-extrabold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
            {hybridLicornes.length} profil(s) hybride(s)
          </span>
        </div>

        {hybridLicornes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 p-8 text-center space-y-2">
            <Star className="size-8 text-ink/30 mx-auto" />
            <p className="font-display font-extrabold text-base text-ink">
              Aucun profil hybride détecté pour le moment
            </p>
            <p className="text-xs text-ink/60 max-w-sm mx-auto">
              Les profils hybrides apparaîtront automatiquement dès que les enfants cumuleront des scores d'excellence dans deux domaines complémentaires.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hybridLicornes.map((unicorn) => (
              <div
                key={unicorn.childId}
                className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5 space-y-3 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-display font-black text-lg">
                      {unicorn.childName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                        <span>{unicorn.childName}</span>
                        <span className="text-xs font-medium text-ink/60">({unicorn.age} ans)</span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-ink/40" />
                          {unicorn.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                    {unicorn.hybridTitle}
                  </span>
                </div>

                <div className="rounded-xl bg-white border border-purple-100 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-700">
                    <Crown className="size-3.5" />
                    <span>Pôles croisés : {unicorn.primaryTalents.join(" × ")}</span>
                  </div>
                  <p className="text-xs font-medium text-ink/70 leading-relaxed">
                    {unicorn.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🏰 Section 4: Distribution des 6 Guildes & 9 Intelligences Gardner */}
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
              Répartition globale des enfants selon leur guilde dominante.
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
            💡 <strong>Algorithme des Guildes :</strong> L'affectation est calculée sur la moyenne
            des talents de chaque guilde.
          </div>
        </div>

        {/* 🧠 Howard Gardner — 9 Intelligences */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="size-5 text-purple-600" />
              <h3 className="font-display text-xl font-black text-ink">
                Howard Gardner — 9 Intelligences
              </h3>
            </div>
            <p className="text-xs font-medium text-ink/60">
              Cumul et moyenne des scores d'intelligences révélés par les défis.
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
            🎯 <strong>Modèle Gardner :</strong> Évaluation holistique couvrant de la logique et du
            langage jusqu'à l'empathie sociale et l'intelligence spatiale.
          </div>
        </div>
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { getChildGuild, GUILDS, NO_GUILD_YET, GuildInfo } from "@/lib/guilds";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import {
  calculateNayaTelemetry,
  calculateNayaWolfTelemetry,
  NayaTelemetryResponse,
  WolfAuditSample,
} from "@/lib/naya-telemetry";
import { ACADEMIC_DOMAINS, ACADEMIC_DOMAIN_LABELS } from "@/lib/challenges.functions";

export type AgeBracketKey = "3-6 ans" | "7-10 ans" | "11-13 ans" | "14+ ans";

export interface AgeDistributionItem {
  bracket: AgeBracketKey;
  count: number;
  percentage: number;
}

export interface ExecutiveKPIs {
  activeChildren7d: number;
  activeChildren30d: number;
  totalParents: number;
  totalChildren: number;
  totalChallenges: number;
  completedChallenges: number;
  retentionRatePct: number;
  ageDistribution: AgeDistributionItem[];
}

export interface ChildBIRC {
  id: string;
  name: string;
  age: number;
  pdfUnlocked: boolean;
}

export interface ParentBIRC {
  id: string;
  email: string;
  phone: string | null;
  createdAt: string;
  childCount: number;
  childNames: string;
  children: ChildBIRC[];
  challengeCount: number;
  completedCount: number;
  // Quota + unifié (2026-08-14) : quota TOTAL de profils accordé au compte (0 = auto).
  quotaOverride: number;
  whatsappUrl: string | null;
}

export interface ExecutiveDataResponse {
  kpis: ExecutiveKPIs;
  parents: ParentBIRC[];
}

export interface CityStatItem {
  city: string;
  childrenCount: number;
  ordersCount: number;
  percentage: number;
}

export interface KitOrderItem {
  id?: string;
  name: string;
  price_xof: number;
}

export interface KitOrder {
  id: string;
  user_id: string;
  child_id: string;
  challenge_id: string | null;
  total_price_xof: number;
  items: KitOrderItem[];
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | string;
  delivery_notes: string | null;
  created_at: string;
  updated_at?: string;
  child_profiles?: { name: string; age?: number; city?: string } | null;
  challenges?: { title: string } | null;
  /** Référence Paystack si la commande a été payée en ligne (sinon null — WhatsApp). */
  payment_reference?: string | null;
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string | null;
  price_xof: number;
  stock_quantity?: number | null;
  image_url?: string | null;
  material_tags?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialSuggestionItem {
  id: string;
  tag: string;
  material_name?: string | null;
  domain?: string | null;
  status: string;
  seen_count: number;
  product_id?: string | null;
  sample_challenge_title?: string | null;
  first_seen_at?: string;
  last_seen_at?: string;
  created_at?: string;
}

export interface TeenPassportProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  pdfUnlocked: boolean;
  user_id: string;
  parentEmail?: string;
  parentPhone?: string | null;
  whatsappUrl?: string | null;
  created_at?: string;
}

export interface CommercePassportsDataResponse {
  orders: KitOrder[];
  products: ProductItem[];
  materialSuggestions: MaterialSuggestionItem[];
  teenProfiles: TeenPassportProfile[];
  summary: {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    passportsUnlockedCount: number;
  };
}

/**
 * Filters orders by status:
 * - "all" / "Tous" returns all orders.
 * - Accepts French or English status strings ("pending" / "En attente", etc.).
 */
export function filterOrdersByStatus<T extends { status?: string | null }>(
  orders: T[] | null | undefined,
  status: string,
): T[] {
  if (!Array.isArray(orders)) return [];
  if (!status || status === "all" || status === "Tous" || status.toLowerCase() === "tous") {
    return orders;
  }

  const statusMap: Record<string, string> = {
    "en attente": "pending",
    confirmé: "confirmed",
    confirme: "confirmed",
    expédié: "shipped",
    expedie: "shipped",
    livré: "delivered",
    livre: "delivered",
    annulé: "cancelled",
    annule: "cancelled",
  };

  const normalizedInput = status.trim().toLowerCase();
  const targetStatus = statusMap[normalizedInput] || normalizedInput;

  return orders.filter((order) => {
    if (!order || !order.status) return false;
    return order.status.trim().toLowerCase() === targetStatus;
  });
}

/**
 * Filters child profiles to return only teen profiles (age >= 14).
 */
export function filterTeenPassportProfiles<T extends { age?: number | null }>(
  children: T[] | null | undefined,
): T[] {
  if (!Array.isArray(children)) return [];
  return children.filter((child) => {
    if (
      !child ||
      child.age === null ||
      child.age === undefined ||
      typeof child.age !== "number" ||
      Number.isNaN(child.age)
    ) {
      return false;
    }
    return child.age >= 14;
  });
}

/**
 * Formats a raw number amount into West African CFA Franc string format (e.g. 50 000 FCFA).
 */
export { formatXOF } from "./format";

/**
 * Calculates next passport toggle state.
 */
export function togglePassportState(currentUnlocked: boolean, explicitTarget?: boolean): boolean {
  if (typeof explicitTarget === "boolean") {
    return explicitTarget;
  }
  return !currentUnlocked;
}

export interface GardnerTotalItem {
  key: string;
  label: string;
  totalScore: number;
  avgScore: number;
  count: number;
}

export interface GuildDistributionItem {
  key: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  count: number;
  percentage: number;
}

export interface HighPotentialAlert {
  childId: string;
  childName: string;
  age: number;
  city: string;
  dominantTalent: string;
  score: number;
  badgeColor: string;
  rationale: string;
}

export interface EliteTalentProfile {
  childId: string;
  childName: string;
  age: number;
  city: string;
  country: string | null;
  guildKey: string;
  guildName: string;
  guildEmoji: string;
  dominantTalentKey: string;
  dominantTalentLabel: string;
  maxTalentScore: number;
  discoveryCount: number;
  naturalRoles: string[];
  plasticityScore: number;
  xp: number;
  compositeScore: number;
  tierBadge: "Top 1% Élite" | "Top 5% Excellence" | "Top 10% Distinction";
  tierColor: string;
}

export interface TerritoryGuildMatrixItem {
  city: string;
  totalChildren: number;
  dominantGuildKey: string;
  dominantGuildName: string;
  dominantGuildEmoji: string;
  guildBreakdown: Record<string, number>;
}

export interface HybridLicorneProfile {
  childId: string;
  childName: string;
  age: number;
  city: string;
  hybridTitle: string;
  primaryTalents: string[];
  roles: string[];
  rationale: string;
}

export interface TalentCityStatsResponse {
  cityStats: CityStatItem[];
  gardnerTotals: GardnerTotalItem[];
  guildDistribution: GuildDistributionItem[];
  highPotentialAlerts: HighPotentialAlert[];
  eliteRanking: EliteTalentProfile[];
  territoryGuildMatrix: TerritoryGuildMatrixItem[];
  hybridLicornes: HybridLicorneProfile[];
  summary: {
    totalChildren: number;
    totalCities: number;
    highPotentialCount: number;
    totalOrders: number;
    eliteCount: number;
    unicornsCount: number;
  };
}

/**
 * Converts a date string or null/undefined to epoch milliseconds.
 * Returns 0 if input is falsy or produces an invalid Date (NaN).
 */
export function toMs(d?: string | null): number {
  if (!d || typeof d !== "string") return 0;
  const ms = new Date(d).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Calculates distribution of children across age brackets:
 * - "3-6 ans" (age <= 6)
 * - "7-10 ans" (age >= 7 && age <= 10)
 * - "11-13 ans" (age >= 11 && age <= 13)
 * - "14+ ans" (age >= 14)
 */
export function calculateAgeDistribution(children: Array<{ age: number }>): AgeDistributionItem[] {
  const counts: Record<AgeBracketKey, number> = {
    "3-6 ans": 0,
    "7-10 ans": 0,
    "11-13 ans": 0,
    "14+ ans": 0,
  };

  const safeChildren = Array.isArray(children) ? children : [];

  for (const child of safeChildren) {
    if (
      !child ||
      child.age === null ||
      child.age === undefined ||
      typeof child.age !== "number" ||
      Number.isNaN(child.age) ||
      child.age < 0
    ) {
      continue;
    }

    const age = Math.floor(child.age);
    if (age <= 6) {
      counts["3-6 ans"]++;
    } else if (age <= 10) {
      counts["7-10 ans"]++;
    } else if (age <= 13) {
      counts["11-13 ans"]++;
    } else {
      counts["14+ ans"]++;
    }
  }

  const total = safeChildren.length;
  const brackets: AgeBracketKey[] = ["3-6 ans", "7-10 ans", "11-13 ans", "14+ ans"];

  return brackets.map((bracket) => {
    const count = counts[bracket];
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { bracket, count, percentage };
  });
}

/**
 * Calculates count of active children within N days from reference date.
 * A child is active if any of last_activity_date, updated_at, created_at
 * or any associated challenge timestamp falls within referenceDate - N days.
 */
export function calculateActiveChildren(
  children: Array<{
    id: string;
    last_activity_date?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }>,
  days: number,
  referenceDate: Date = new Date(),
  challenges: Array<{
    child_id: string;
    created_at?: string | null;
    updated_at?: string | null;
    completed_at?: string | null;
  }> = [],
): number {
  const safeChildren = Array.isArray(children) ? children : [];
  const safeChallenges = Array.isArray(challenges) ? challenges : [];

  const refMs = Number.isNaN(referenceDate?.getTime()) ? Date.now() : referenceDate.getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;
  const cutoffTime = refMs - windowMs;

  // Build max timestamp per child from challenges
  const maxChallengeTimeByChild = new Map<string, number>();
  for (const c of safeChallenges) {
    if (!c || !c.child_id) continue;
    const times = [toMs(c.completed_at), toMs(c.updated_at), toMs(c.created_at)];
    const maxTime = Math.max(...times, 0);
    if (maxTime > 0) {
      const existing = maxChallengeTimeByChild.get(c.child_id) ?? 0;
      if (maxTime > existing) {
        maxChallengeTimeByChild.set(c.child_id, maxTime);
      }
    }
  }

  let activeCount = 0;

  for (const child of safeChildren) {
    if (!child) continue;
    const timestamps = [
      toMs(child.last_activity_date),
      toMs(child.updated_at),
      toMs(child.created_at),
      maxChallengeTimeByChild.get(child.id) ?? 0,
    ];

    const latestActivity = Math.max(...timestamps, 0);
    if (latestActivity > 0 && latestActivity >= cutoffTime) {
      activeCount++;
    }
  }

  return activeCount;
}

/**
 * Calculates retention rate percentage.
 * Retention rate = (Active children in 30 days / Total children) * 100.
 */
export function calculateRetentionRate(active30dCount: number, totalChildren: number): number {
  if (typeof totalChildren !== "number" || Number.isNaN(totalChildren) || totalChildren <= 0) {
    return 0;
  }
  if (typeof active30dCount !== "number" || Number.isNaN(active30dCount)) {
    return 0;
  }
  return Math.round((active30dCount / totalChildren) * 100);
}

/**
 * Formats a raw phone string into a valid WhatsApp URL (https://wa.me/<digits>).
 */
export function formatWhatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;
  const cleanDigits = phone.replace(/[^0-9]/g, "");
  if (!cleanDigits) return null;
  return `https://wa.me/${cleanDigits}`;
}

/**
 * Aggregates children & order counts by city.
 * Null, undefined, or empty city strings are grouped under "Ville non renseignée".
 */
export function calculateCityStats(
  children: Array<{ id?: string; city?: string | null }>,
  orders: Array<{ child_id?: string | null }> = [],
): CityStatItem[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalChildren = safeChildren.length;

  const childCityMap = new Map<string, string>();
  const childrenCountByCity = new Map<string, number>();
  const ordersCountByCity = new Map<string, number>();

  for (const child of safeChildren) {
    if (!child) continue;
    const rawCity = child.city ? child.city.trim() : "";
    const cityName = rawCity || "Ville non renseignée";

    if (child.id) {
      childCityMap.set(child.id, cityName);
    }
    childrenCountByCity.set(cityName, (childrenCountByCity.get(cityName) ?? 0) + 1);
  }

  for (const order of safeOrders) {
    if (!order) continue;
    const childId = order.child_id;
    const cityName = (childId && childCityMap.get(childId)) || "Ville non renseignée";
    ordersCountByCity.set(cityName, (ordersCountByCity.get(cityName) ?? 0) + 1);
  }

  const allCities = new Set<string>([
    ...Array.from(childrenCountByCity.keys()),
    ...Array.from(ordersCountByCity.keys()),
  ]);

  if (allCities.size === 0) {
    return [];
  }

  const result: CityStatItem[] = Array.from(allCities).map((city) => {
    const childrenCount = childrenCountByCity.get(city) ?? 0;
    const ordersCount = ordersCountByCity.get(city) ?? 0;
    const percentage = totalChildren > 0 ? Math.round((childrenCount / totalChildren) * 100) : 0;
    return {
      city,
      childrenCount,
      ordersCount,
      percentage,
    };
  });

  result.sort((a, b) => {
    if (b.childrenCount !== a.childrenCount) {
      return b.childrenCount - a.childrenCount;
    }
    if (a.city === "Ville non renseignée") return 1;
    if (b.city === "Ville non renseignée") return -1;
    return a.city.localeCompare(b.city);
  });

  return result;
}

/**
 * Aggregates scores across the 9 Howard Gardner intelligences.
 */
export function calculateGardnerTotals(
  children: Array<{ talents?: Record<string, any> | null }>,
): GardnerTotalItem[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const totalChildren = safeChildren.length;

  const totalsByKey: Record<string, { totalScore: number; count: number }> = {};

  for (const key of Object.keys(TALENT_KEY_LABELS)) {
    totalsByKey[key] = { totalScore: 0, count: 0 };
  }

  for (const child of safeChildren) {
    if (!child || !child.talents) continue;
    const rawTalents = child.talents as Record<string, number>;
    for (const [key, val] of Object.entries(rawTalents)) {
      if (typeof val === "number" && !Number.isNaN(val) && val > 0) {
        if (!totalsByKey[key]) {
          totalsByKey[key] = { totalScore: 0, count: 0 };
        }
        totalsByKey[key].totalScore += val;
        totalsByKey[key].count += 1;
      }
    }
  }

  const result: GardnerTotalItem[] = Object.keys(TALENT_KEY_LABELS).map((key) => {
    const label = TALENT_KEY_LABELS[key] || key;
    const entry = totalsByKey[key] || { totalScore: 0, count: 0 };
    const avgScore =
      totalChildren > 0 ? Math.round((entry.totalScore / totalChildren) * 10) / 10 : 0;
    return {
      key,
      label,
      totalScore: entry.totalScore,
      avgScore,
      count: entry.count,
    };
  });

  result.sort((a, b) => b.totalScore - a.totalScore);
  return result;
}

/**
 * Aggregates children across the 6 Guildes using `getChildGuild(child.talents)`
 * ("Les Bâtisseurs", "Les Inventeurs", "Les Explorateurs", "Les Créateurs", "Les Stratèges", "Les Protecteurs du Vivant", "Guilde à découvrir").
 */
export function calculateGuildDistribution(
  children: Array<{ talents?: Record<string, any> | null }>,
): GuildDistributionItem[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const totalChildren = safeChildren.length;

  const countsByKey: Record<string, number> = {
    batisseurs: 0,
    inventeurs: 0,
    explorateurs: 0,
    createurs: 0,
    strateges: 0,
    protecteurs: 0,
    aucune: 0,
  };

  for (const child of safeChildren) {
    const guildInfo = getChildGuild(child?.talents as Record<string, number> | null);
    const key = guildInfo.key;
    countsByKey[key] = (countsByKey[key] ?? 0) + 1;
  }

  const allGuildInfos: GuildInfo[] = [...Object.values(GUILDS), NO_GUILD_YET];

  const result: GuildDistributionItem[] = allGuildInfos.map((guild) => {
    const count = countsByKey[guild.key] ?? 0;
    const percentage = totalChildren > 0 ? Math.round((count / totalChildren) * 100) : 0;
    return {
      key: guild.key,
      name: guild.name,
      emoji: guild.emoji,
      color: guild.color,
      bgColor: guild.bgColor,
      count,
      percentage,
    };
  });

  result.sort((a, b) => b.count - a.count);
  return result;
}

/**
 * Automatically identifies high-potential talent profiles (scores >= 70 or top-tier scores)
 * and creates alert objects `{ childId, childName, age, city, dominantTalent, score, badgeColor, rationale }`.
 */
export function detectHighPotentialProfiles(
  children: Array<{
    id: string;
    name: string;
    age: number;
    city?: string | null;
    talents?: Record<string, any> | null;
  }>,
): HighPotentialAlert[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const alerts: HighPotentialAlert[] = [];

  for (const child of safeChildren) {
    if (!child || !child.talents) continue;

    let maxScore = 0;
    let dominantKey: string | null = null;
    const rawTalents = child.talents as Record<string, number>;

    for (const [key, val] of Object.entries(rawTalents)) {
      if (typeof val === "number" && !Number.isNaN(val) && val >= 70) {
        if (val > maxScore) {
          maxScore = val;
          dominantKey = key;
        }
      }
    }

    if (dominantKey && maxScore >= 70) {
      const dominantTalentLabel = TALENT_KEY_LABELS[dominantKey] || dominantKey;
      const city = child.city?.trim() || "Ville non renseignée";

      let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
      if (maxScore >= 90) {
        badgeColor = "bg-purple-100 text-purple-800 border-purple-300";
      } else if (maxScore >= 80) {
        badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
      }

      const rationale = `Profil à haut potentiel identifié : score de ${maxScore}/100 en ${dominantTalentLabel} (${child.name}, ${child.age} ans, ${city}).`;

      alerts.push({
        childId: child.id,
        childName: child.name,
        age: child.age,
        city,
        dominantTalent: dominantTalentLabel,
        score: maxScore,
        badgeColor,
        rationale,
      });
    }
  }

  alerts.sort((a, b) => b.score - a.score);
  return alerts;
}

export function calculateEliteRanking(
  children: Array<{
    id: string;
    name: string;
    age: number;
    city?: string | null;
    country?: string | null;
    talents?: Record<string, any> | null;
    xp?: number | null;
  }>,
  discoveryTraces: Array<{
    id: string;
    child_id: string;
    source_type?: string;
    strategy_used?: string;
  }>,
): EliteTalentProfile[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const safeTraces = Array.isArray(discoveryTraces) ? discoveryTraces : [];

  const tracesByChild = new Map<string, typeof safeTraces>();
  for (const t of safeTraces) {
    if (!t.child_id) continue;
    if (!tracesByChild.has(t.child_id)) tracesByChild.set(t.child_id, []);
    tracesByChild.get(t.child_id)!.push(t);
  }

  const profiles: EliteTalentProfile[] = [];

  for (const child of safeChildren) {
    if (!child || !child.talents) continue;
    const rawTalents = (child.talents as Record<string, number>) || {};

    let maxScore = 0;
    let dominantKey = "logico_mathematique";
    for (const [k, v] of Object.entries(rawTalents)) {
      if (typeof v === "number" && v > maxScore) {
        maxScore = v;
        dominantKey = k;
      }
    }

    const guild = getChildGuild(rawTalents);
    const childTraces = tracesByChild.get(child.id) || [];
    const discoveryCount = childTraces.length;

    const rolesSet = new Set<string>();
    for (const t of childTraces) {
      if (t.strategy_used && t.source_type === "projet_collectif") {
        const match = t.strategy_used.match(/Rôle(\(s\))?:\s*([^|]+)/i);
        if (match && match[2]) {
          match[2].split(",").forEach((r) => rolesSet.add(r.trim()));
        }
      }
    }
    const naturalRoles = Array.from(rolesSet);
    const plasticityScore = Math.min(1, naturalRoles.length / 4);

    const xp = child.xp || 0;
    const compositeScore = Math.min(
      100,
      Math.round(
        maxScore * 0.45 +
          Math.min(10, discoveryCount * 2) * 3 +
          plasticityScore * 100 * 0.15 +
          Math.min(100, xp / 10) * 0.1,
      ),
    );

    if (compositeScore >= 45 || maxScore >= 60) {
      let tierBadge: "Top 1% Élite" | "Top 5% Excellence" | "Top 10% Distinction" =
        "Top 10% Distinction";
      let tierColor = "bg-amber-100 text-amber-900 border-amber-300";

      if (compositeScore >= 80) {
        tierBadge = "Top 1% Élite";
        tierColor = "bg-purple-100 text-purple-900 border-purple-300 font-black";
      } else if (compositeScore >= 68) {
        tierBadge = "Top 5% Excellence";
        tierColor = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
      }

      profiles.push({
        childId: child.id,
        childName: child.name,
        age: child.age,
        city: child.city?.trim() || "Ville non renseignée",
        country: child.country || null,
        guildKey: guild.key,
        guildName: guild.name,
        guildEmoji: guild.emoji,
        dominantTalentKey: dominantKey,
        dominantTalentLabel: TALENT_KEY_LABELS[dominantKey] || dominantKey,
        maxTalentScore: maxScore,
        discoveryCount,
        naturalRoles,
        plasticityScore,
        xp,
        compositeScore,
        tierBadge,
        tierColor,
      });
    }
  }

  profiles.sort((a, b) => b.compositeScore - a.compositeScore);
  return profiles.slice(0, 50);
}

export function calculateTerritoryGuildMatrix(
  children: Array<{ city?: string | null; talents?: Record<string, any> | null }>,
): TerritoryGuildMatrixItem[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const cityGroups = new Map<string, Array<Record<string, number>>>();

  for (const c of safeChildren) {
    const city = c.city?.trim() || "Ville non renseignée";
    if (!cityGroups.has(city)) cityGroups.set(city, []);
    if (c.talents) cityGroups.get(city)!.push(c.talents as Record<string, number>);
  }

  const matrix: TerritoryGuildMatrixItem[] = [];

  for (const [city, talentsList] of cityGroups.entries()) {
    const totalChildren = talentsList.length;
    const guildBreakdown: Record<string, number> = {
      batisseurs: 0,
      inventeurs: 0,
      explorateurs: 0,
      createurs: 0,
      strateges: 0,
      protecteurs: 0,
    };

    for (const t of talentsList) {
      const g = getChildGuild(t);
      if (g.key !== "aucune") {
        guildBreakdown[g.key] = (guildBreakdown[g.key] || 0) + 1;
      }
    }

    let dominantGuildKey = "batisseurs";
    let maxCount = -1;
    for (const [k, count] of Object.entries(guildBreakdown)) {
      if (count > maxCount) {
        maxCount = count;
        dominantGuildKey = k;
      }
    }

    const dominantGuildInfo = GUILDS[dominantGuildKey as keyof typeof GUILDS] || GUILDS.batisseurs;

    matrix.push({
      city,
      totalChildren,
      dominantGuildKey,
      dominantGuildName: dominantGuildInfo.name,
      dominantGuildEmoji: dominantGuildInfo.emoji,
      guildBreakdown,
    });
  }

  matrix.sort((a, b) => b.totalChildren - a.totalChildren);
  return matrix;
}

export function calculateHybridLicornes(
  children: Array<{
    id: string;
    name: string;
    age: number;
    city?: string | null;
    talents?: Record<string, any> | null;
  }>,
  discoveryTraces: Array<{ child_id: string; strategy_used?: string }>,
): HybridLicorneProfile[] {
  const safeChildren = Array.isArray(children) ? children : [];
  const unicorns: HybridLicorneProfile[] = [];

  for (const child of safeChildren) {
    if (!child || !child.talents) continue;
    const t = child.talents as Record<string, number>;

    const stemScore = Math.max(t.logico_mathematique || 0, t.spatial || 0);
    const socialScore = Math.max(t.sociale || 0, t.emotionnelle || 0);
    const creativeScore = Math.max(t.creative || 0, t.linguistique || 0);
    const businessScore = t.entrepreneuriale || 0;
    const natureScore = Math.max(t.corporelle || 0, t.artisanale || 0);

    let hybridTitle: string | null = null;
    let primaryTalents: string[] = [];
    let rationale = "";

    if (stemScore >= 60 && socialScore >= 60) {
      hybridTitle = "🦄 Licorne STEM & Empathie";
      primaryTalents = ["🧠 Logique / 📐 Spatiale", "🤝 Sociale / 🪞 Émotionnelle"];
      rationale = `${child.name} allie une grande rigueur analytique/spatiale (${stemScore}/100) et une intelligence interpersonnelle naturelle (${socialScore}/100).`;
    } else if (creativeScore >= 60 && businessScore >= 60) {
      hybridTitle = "🦄 Licorne Créative & Stratège";
      primaryTalents = ["🎨 Création / 🗣️ Narration", "💡 Entrepreneuriat"];
      rationale = `${child.name} maîtrise l'expression créative (${creativeScore}/100) et le sens des affaires/leadership (${businessScore}/100).`;
    } else if (natureScore >= 60 && (businessScore >= 60 || socialScore >= 60)) {
      hybridTitle = "🦄 Licorne Éco-Leader";
      primaryTalents = ["🌿 Vivant / 🪵 Artisanat", "💡 Vision & Impact"];
      rationale = `${child.name} associe la passion du terrain/vivant (${natureScore}/100) à une capacité d'entraînement collectif (${Math.max(businessScore, socialScore)}/100).`;
    }

    if (hybridTitle) {
      unicorns.push({
        childId: child.id,
        childName: child.name,
        age: child.age,
        city: child.city?.trim() || "Ville non renseignée",
        hybridTitle,
        primaryTalents,
        roles: [],
        rationale,
      });
    }
  }

  return unicorns.slice(0, 20);
}

const ExecutivePageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export interface PaginatedExecutiveResponse {
  kpis: ExecutiveKPIs;
  parents: ParentBIRC[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getExecutiveKPIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ExecutivePageInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<PaginatedExecutiveResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // KPIs en une seule passe SQL (compute_executive_kpis, migration Vague 4) — fini
    // les tables child_profiles + challenges chargées ENTIÈRES en mémoire à chaque
    // ouverture de l'onglet Exécutif.
    const { data: kpiRaw, error: kpiErr } = await supabaseAdmin.rpc("compute_executive_kpis");
    if (kpiErr) throw new Error(kpiErr.message);
    const k = (kpiRaw ?? {}) as {
      totalChildren: number;
      totalChallenges: number;
      completedChallenges: number;
      activeChildren7d: number;
      activeChildren30d: number;
      ageBrackets: Array<{ bracket: AgeBracketKey; count: number }>;
    };

    // Annuaire paginé via parent_profiles (email/téléphone/nom + created_at du compte,
    // migration Vague 4) — fini le scan complet de l'annuaire auth (listAllUsers).
    const [{ count: totalParents }, { data: contacts, error: contactsErr }] = await Promise.all([
      supabaseAdmin.from("parent_profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin
        .from("parent_profiles")
        .select("user_id, email, phone, display_name, created_at")
        .order("created_at", { ascending: false })
        .range((data.page - 1) * data.pageSize, data.page * data.pageSize - 1),
    ]);
    if (contactsErr) throw new Error(contactsErr.message);

    const total = totalParents ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const pageContacts = contacts ?? [];
    const parentIds = pageContacts.map((c) => c.user_id);

    // Pour la page uniquement : quota_override (app_metadata) via auth admin ciblé.
    const userMeta = new Map<string, { createdAt: string | null; quotaOverride: number }>();
    await Promise.all(
      parentIds.map(async (id: string) => {
        const { data: u } = await (supabaseAdmin as any).auth.admin
          .getUserById(id)
          .catch(() => ({ data: null }));
        userMeta.set(id, {
          createdAt: (u?.user?.created_at as string | null) ?? null,
          quotaOverride: ((u?.user?.app_metadata as any)?.quota_override as number) ?? 0,
        });
      }),
    );

    // Enfants et défis des parents de la page (borné par la page × cap 50 enfants).
    const childrenByUser = new Map<string, ChildBIRC[]>(parentIds.map((id) => [id, []]));
    const countsByUser = new Map<string, { total: number; completed: number }>();
    if (parentIds.length > 0) {
      const { data: children } = await supabaseAdmin
        .from("child_profiles")
        .select("id, name, age, user_id, pdf_unlocked")
        .in("user_id", parentIds);
      for (const c of children ?? []) {
        childrenByUser.get(c.user_id)?.push({
          id: c.id,
          name: c.name,
          age: c.age ?? 0,
          pdfUnlocked: c.pdf_unlocked === true,
        });
      }
      const { data: challenges } = await supabaseAdmin
        .from("challenges")
        .select("user_id, status")
        .in("user_id", parentIds)
        .is("deleted_at", null);
      for (const ch of challenges ?? []) {
        const cur = countsByUser.get(ch.user_id) ?? { total: 0, completed: 0 };
        cur.total += 1;
        if (ch.status === "completed") cur.completed += 1;
        countsByUser.set(ch.user_id, cur);
      }
    }

    const parents: ParentBIRC[] = pageContacts.map((c) => {
      const meta = userMeta.get(c.user_id);
      const userChildren = childrenByUser.get(c.user_id) ?? [];
      const counts = countsByUser.get(c.user_id) ?? { total: 0, completed: 0 };
      return {
        id: c.user_id,
        email: c.email,
        phone: c.phone,
        whatsappUrl: formatWhatsAppUrl(c.phone),
        createdAt: meta?.createdAt ?? c.created_at ?? new Date().toISOString(),
        childCount: userChildren.length,
        childNames: userChildren.map((ch) => `${ch.name} (${ch.age} ans)`).join(", "),
        children: userChildren,
        challengeCount: counts.total,
        completedCount: counts.completed,
        quotaOverride: meta?.quotaOverride ?? 0,
      };
    });

    // Tranches d'âge : comptages bruts du SQL, pourcentage sur le TOTAL des enfants —
    // même règle que calculateAgeDistribution (miroir documenté dans la migration).
    const bracketCounts = new Map<AgeBracketKey, number>(
      (k.ageBrackets ?? []).map((b) => [b.bracket, b.count]),
    );
    const bracketKeys: AgeBracketKey[] = ["3-6 ans", "7-10 ans", "11-13 ans", "14+ ans"];
    const ageDistribution: AgeDistributionItem[] = bracketKeys.map((bracket) => {
      const count = bracketCounts.get(bracket) ?? 0;
      return {
        bracket,
        count,
        percentage:
          (k.totalChildren ?? 0) > 0 ? Math.round((count / (k.totalChildren ?? 0)) * 100) : 0,
      };
    });

    return {
      kpis: {
        activeChildren7d: k.activeChildren7d ?? 0,
        activeChildren30d: k.activeChildren30d ?? 0,
        totalParents: total,
        totalChildren: k.totalChildren ?? 0,
        totalChallenges: k.totalChallenges ?? 0,
        completedChallenges: k.completedChallenges ?? 0,
        retentionRatePct: calculateRetentionRate(k.activeChildren30d ?? 0, k.totalChildren ?? 0),
        ageDistribution,
      },
      parents,
      total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages,
    };
  });

export const getTalentCityStatsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<TalentCityStatsResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [childrenRes, ordersRes, discoveryRes] = await Promise.all([
      supabaseAdmin
        .from("child_profiles")
        .select("id, name, age, city, country, talents, xp, user_id, created_at"),
      supabaseAdmin.from("orders").select("child_id"),
      supabaseAdmin
        .from("discovery_traces")
        .select("id, child_id, source_type, strategy_used, ai_behavioral_analysis"),
    ]);

    if (childrenRes.error) throw new Error(childrenRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const children = (childrenRes.data ?? []).map((c) => ({
      ...c,
      talents: (c.talents as Record<string, number> | null) ?? null,
    }));
    const orders = ordersRes.data ?? [];
    const discoveryTraces = (discoveryRes.data ?? []) as any[];

    const cityStats = calculateCityStats(children, orders);
    const gardnerTotals = calculateGardnerTotals(children);
    const guildDistribution = calculateGuildDistribution(children);
    const highPotentialAlerts = detectHighPotentialProfiles(children);
    const eliteRanking = calculateEliteRanking(children, discoveryTraces);
    const territoryGuildMatrix = calculateTerritoryGuildMatrix(children);
    const hybridLicornes = calculateHybridLicornes(children, discoveryTraces);

    const uniqueCitiesCount = cityStats.filter((c) => c.city !== "Ville non renseignée").length;

    return {
      cityStats,
      gardnerTotals,
      guildDistribution,
      highPotentialAlerts,
      eliteRanking,
      territoryGuildMatrix,
      hybridLicornes,
      summary: {
        totalChildren: children.length,
        totalCities: uniqueCitiesCount,
        highPotentialCount: highPotentialAlerts.length,
        totalOrders: orders.length,
        eliteCount: eliteRanking.length,
        unicornsCount: hybridLicornes.length,
      },
    };
  });

export interface AiProviderStatus {
  deepseekConfigured: boolean;
  anthropicConfigured: boolean;
  geminiConfigured: boolean;
  glmConfigured: boolean;
  qwenConfigured: boolean;
}

// Simple check de présence des clés API (jamais leur valeur) — pour que l'admin
// voie immédiatement si DEEPSEEK_API_KEY, GLM_API_KEY, QWEN_API_KEY, etc. sont bien réglées sur
// cet environnement, sans avoir à ouvrir .env/Vercel.
export const getAiProviderStatusAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AiProviderStatus> => {
    const glmOk = !!(
      process.env.GLM_API_KEY ||
      process.env.ZHIPU_API_KEY ||
      process.env.ZHIPUAI_API_KEY ||
      process.env.BIGMODEL_API_KEY ||
      process.env.BAI_API_KEY
    );
    const qwenOk = !!(
      process.env.QWEN_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      glmOk // api.b.ai partage la clé pour Qwen et GLM
    );

    return {
      deepseekConfigured: !!process.env.DEEPSEEK_API_KEY,
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      glmConfigured: glmOk,
      qwenConfigured: qwenOk,
    };
  });

export type ChallengeModelId = "deepseek-v4-flash" | "glm-5.3-flash" | "qwen3.8-flash";

export interface ChallengeModelOption {
  id: ChallengeModelId;
  label: string;
  provider: string;
  description: string;
  inputPricePerM: number;
  outputPricePerM: number;
  color: string;
}

export const CHALLENGE_MODEL_OPTIONS: ChallengeModelOption[] = [
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "DeepSeek (OpenRouter)",
    description: "Modèle historique économique et rapide",
    inputPricePerM: 0.0808,
    outputPricePerM: 0.1616,
    color: "sky",
  },
  {
    id: "glm-5.3-flash",
    label: "GLM 5.3 Flash",
    provider: "Zhipu AI (OpenRouter / api.b.ai)",
    description: "Haute réactivité & multimodalité",
    inputPricePerM: 0.06,
    outputPricePerM: 0.4,
    color: "emerald",
  },
  {
    id: "qwen3.8-flash",
    label: "Qwen 3.8 Flash",
    provider: "Alibaba Qwen (OpenRouter / api.b.ai)",
    description: "Précision de raisonnement & vitesse d'exécution",
    inputPricePerM: 0.0481,
    outputPricePerM: 0.193,
    color: "purple",
  },
];

/**
 * Retourne la liste des options de modèle enrichie des tarifs en direct OpenRouter si disponibles.
 */
export function getChallengeModelOptions(
  livePricing?: import("./openrouter-pricing.types").LiveOpenRouterPricing | null,
): ChallengeModelOption[] {
  return [
    {
      id: "deepseek-v4-flash",
      label: "DeepSeek V4 Flash",
      provider: "DeepSeek (OpenRouter)",
      description: "Modèle historique économique et rapide",
      inputPricePerM: livePricing?.deepseekChat?.inputPerM ?? 0.0808,
      outputPricePerM: livePricing?.deepseekChat?.outputPerM ?? 0.1616,
      color: "sky",
    },
    {
      id: "glm-5.3-flash",
      label: "GLM 5.3 Flash",
      provider: "Zhipu AI (OpenRouter / api.b.ai)",
      description: "Haute réactivité & multimodalité",
      inputPricePerM: livePricing?.glmFlash?.inputPerM ?? 0.06,
      outputPricePerM: livePricing?.glmFlash?.outputPerM ?? 0.4,
      color: "emerald",
    },
    {
      id: "qwen3.8-flash",
      label: "Qwen 3.8 Flash",
      provider: "Alibaba Qwen (OpenRouter / api.b.ai)",
      description: "Précision de raisonnement & vitesse d'exécution",
      inputPricePerM: livePricing?.qwenFlash?.inputPerM ?? 0.0481,
      outputPricePerM: livePricing?.qwenFlash?.outputPerM ?? 0.193,
      color: "purple",
    },
  ];
}

export interface NayaModelRoutingSettings {
  challengeModel: ChallengeModelId;
  fallbackEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const getNayaModelRoutingAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<NayaModelRoutingSettings> => {
    const { getNayaModelRoutingSettings } = await import("./naya-routing.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return getNayaModelRoutingSettings(supabaseAdmin);
  });

export const updateNayaModelRoutingAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: unknown) =>
    z
      .object({
        challengeModel: z.enum(["deepseek-v4-flash", "glm-5.3-flash", "qwen3.8-flash"]),
        fallbackEnabled: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<NayaModelRoutingSettings> => {
    const { updateNayaModelRoutingSettings } = await import("./naya-routing.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updatedBy =
      (context as any).claims?.email || (context as any).user?.email || "admin";
    return updateNayaModelRoutingSettings(supabaseAdmin, data, updatedBy);
  });

export interface ProgressionDomainHealth {
  domain: string;
  domainLabel: string;
  completedCount: number;
  avgDaysToCompletion: number | null;
  staleCount: number;
}

export interface ProgressionHealthResponse {
  domains: ProgressionDomainHealth[];
}

// Ajoutée le 2026-07-22 pour valider le calibrage du moteur de progression
// (computeProgressionTargets dans challenges.functions.ts, deltas +2/+0/+1 selon
// la cause diagnostiquée) : sans ça, ces deltas restent une estimation jamais
// confrontée à la réalité — "est-ce que les défis vraiment complétés le sont dans
// un délai sain, ou est-ce qu'un domaine reste bloqué (stale) plus qu'un autre ?".
// staleCount réutilise le même seuil (14 jours) que STALE_DOMAIN_CUTOFF et le
// détecteur d'abandon des défis discriminants (processAbandonedDiscriminantChallenges),
// mais couvre ici TOUS les défis académiques, pas seulement les discriminants — un
// signal de reporting, pas un déclencheur du moteur bayésien.
export const getProgressionHealthAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ProgressionHealthResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Agrégat SQL (compute_progression_health, migration Vague 4 batch 4) — fini le
    // chargement de TOUS les défis académiques en mémoire à chaque visite.
    // (supabaseAdmin as any) : RPC ajouté après la dernière régénération des types —
    // sera typé à la prochaine `supabase gen types`.
    const { data: raw, error } = await (supabaseAdmin as any).rpc("compute_progression_health");
    if (error) throw new Error(error.message);
    const r = (raw ?? {}) as {
      completed: Array<{
        domain: string;
        completedCount: number;
        avgDaysToCompletion: number | null;
      }>;
      stale: Array<{ domain: string; staleCount: number }>;
    };

    const completedByDomain = new Map((r.completed ?? []).map((d) => [d.domain, d] as const));
    const staleByDomain = new Map((r.stale ?? []).map((d) => [d.domain, d.staleCount] as const));

    const domains: ProgressionDomainHealth[] = ACADEMIC_DOMAINS.map((domain) => {
      const stats = completedByDomain.get(domain);
      return {
        domain,
        domainLabel: ACADEMIC_DOMAIN_LABELS[domain] ?? domain,
        completedCount: stats?.completedCount ?? 0,
        avgDaysToCompletion: stats?.avgDaysToCompletion ?? null,
        staleCount: staleByDomain.get(domain) ?? 0,
      };
    }).filter((d) => d.completedCount > 0 || d.staleCount > 0);

    return { domains };
  });

export const getNayaTelemetryAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<NayaTelemetryResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Comptages SQL exacts (Vague 4) — plus de chargement des tables challenges /
    // hypothesis_cycles / child_profiles en entier pour en compter les lignes.
    const [genRes, startedRes, completedRes, photoRes, hypoRes, recoRes, auditsRes] =
      await Promise.all([
        supabaseAdmin
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAdmin
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .in("status", ["in_progress", "completed"])
          .is("deleted_at", null),
        supabaseAdmin
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .is("deleted_at", null),
        supabaseAdmin
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .eq("proof_mode", "photo")
          .is("deleted_at", null),
        supabaseAdmin.from("hypothesis_cycles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("child_profiles")
          .select("id", { count: "exact", head: true })
          .not("ai_synthesis", "is", null)
          .neq("ai_synthesis", ""),
        // « Le Loup » (chantier 4) : audits de génération — conformité, recadrage,
        // coût propre de la vérification sémantique (cf. calculateNayaWolfTelemetry).
        // Seule source encore chargée en entier (journal append-only du Loup) — à
        // passer en agrégat SQL si le volume l'exige (plan multicouche, V4 batch 3).
        supabaseAdmin
          .from("generation_audits")
          .select("kind, verdict, violations, semantic_checked, regenerated"),
        supabaseAdmin
          .from("admin_naya_settings")
          .select("challenge_model")
          .eq("id", "singleton")
          .maybeSingle(),
      ]);

    if (genRes.error) throw new Error(genRes.error.message);
    if (startedRes.error) throw new Error(startedRes.error.message);
    if (completedRes.error) throw new Error(completedRes.error.message);
    if (photoRes.error) throw new Error(photoRes.error.message);
    if (hypoRes.error) throw new Error(hypoRes.error.message);
    if (recoRes.error) throw new Error(recoRes.error.message);
    if (auditsRes.error) throw new Error(auditsRes.error.message);

    const challengesGenerated = genRes.count ?? 0;
    const challengesStarted = startedRes.count ?? 0;
    const challengesCompleted = completedRes.count ?? 0;
    const photoProofCompleted = photoRes.count ?? 0;
    const hypothesesCycles = hypoRes.count ?? 0;
    const recommendationsCount = recoRes.count ?? 0;

    const { getLiveOpenRouterPricing } = await import("@/lib/openrouter-pricing.server");
    const livePricing = await getLiveOpenRouterPricing().catch((err) => {
      console.warn("[admin-os] Impossible de récupérer les tarifs OpenRouter en direct, utilisation du repli:", err);
      return null;
    });

    const activeChallengeModel =
      (nayaSettingsRes?.data?.challenge_model as any) || "deepseek-v4-flash";

    const telemetry = calculateNayaTelemetry(
      {
        challengesGenerated,
        challengesStarted,
        challengesCompleted,
        photoProofCompleted,
        hypothesesCycles,
        recommendationsCount,
        activeChallengeModel,
      },
      livePricing,
    );

    // Remplace l'état vide de calculateNayaTelemetry par les audits réels du Loup.
    telemetry.wolf = calculateNayaWolfTelemetry(
      (auditsRes.data ?? []).map((a) => ({
        kind: a.kind,
        verdict: a.verdict,
        violations: (Array.isArray(a.violations)
          ? a.violations
          : []) as WolfAuditSample["violations"],
        semantic_checked: a.semantic_checked,
        regenerated: a.regenerated,
      })),
    );

    return telemetry;
  });

export const refreshAiModelPricingAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { getLiveOpenRouterPricing } = await import("@/lib/openrouter-pricing.server");
    return await getLiveOpenRouterPricing(true);
  });

const CommercePageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  /** Statut brut des commandes, ou « Tous ». */
  status: z.string().max(20).default("Tous"),
});

export interface PaginatedCommerceResponse extends Omit<CommercePassportsDataResponse, "orders"> {
  orders: KitOrder[];
  /** Comptage par statut sur TOUTE l'historique (pas seulement la page) — badges des onglets. */
  statusCounts: Record<string, number>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getCommercePassportsDataAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => CommercePageInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<PaginatedCommerceResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Commandes paginées (Vague 4) : count exact + range + filtre de statut en SQL.
    const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
    let ordersQuery = supabaseAdmin
      .from("orders")
      .select("*, child_profiles(name, age, city), challenges(title)", { count: "exact" });
    if (data.status !== "Tous") ordersQuery = ordersQuery.eq("status", data.status);

    // Contacts parents via parent_profiles (Vague 1) — fini le scan paginé de
    // l'annuaire auth (listAllUsers).
    const [ordersRes, statusCountsRes, productsRes, suggestionsRes, childrenRes, usersRes] =
      await Promise.all([
        ordersQuery
          .order("created_at", { ascending: false })
          .range((data.page - 1) * data.pageSize, data.page * data.pageSize - 1),
        Promise.all(
          ORDER_STATUSES.map((s) =>
            supabaseAdmin
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("status", s),
          ),
        ),
        supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }),
        supabaseAdmin
          .from("material_suggestions")
          .select("*")
          .eq("status", "new")
          .order("seen_count", { ascending: false }),
        supabaseAdmin
          .from("child_profiles")
          .select("id, name, age, city, user_id, pdf_unlocked, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("parent_profiles").select("user_id, email, phone"),
      ]);

    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (productsRes.error) throw new Error(productsRes.error.message);
    if (suggestionsRes.error) throw new Error(suggestionsRes.error.message);
    if (childrenRes.error) throw new Error(childrenRes.error.message);
    if (usersRes.error) throw new Error(usersRes.error.message);

    const statusCounts: Record<string, number> = {};
    let totalOrders = 0;
    ORDER_STATUSES.forEach((s, i) => {
      statusCounts[s] = statusCountsRes[i]?.count ?? 0;
      totalOrders += statusCounts[s];
    });

    const userMap = new Map<string, { email: string; phone: string | null }>();
    for (const u of usersRes.data ?? []) {
      userMap.set(u.user_id, {
        email: u.email || "",
        phone: u.phone || null,
      });
    }

    const rawChildren = childrenRes.data ?? [];
    const teenChildrenRaw = filterTeenPassportProfiles(rawChildren);

    const teenProfiles: TeenPassportProfile[] = teenChildrenRaw.map((c) => {
      const parent = userMap.get(c.user_id);
      const phone = parent?.phone || null;
      return {
        id: c.id,
        name: c.name,
        age: c.age,
        city: c.city?.trim() || "Ville non renseignée",
        pdfUnlocked: c.pdf_unlocked === true,
        user_id: c.user_id,
        parentEmail: parent?.email || "Email non renseigné",
        parentPhone: phone,
        whatsappUrl: formatWhatsAppUrl(phone),
        created_at: c.created_at,
      };
    });

    const orders: KitOrder[] = (ordersRes.data ?? []).map((o: any) => ({
      id: o.id,
      user_id: o.user_id,
      child_id: o.child_id,
      challenge_id: o.challenge_id || null,
      total_price_xof: o.total_price_xof || 0,
      items: Array.isArray(o.items) ? o.items : [],
      status: o.status || "pending",
      delivery_notes: o.delivery_notes || null,
      created_at: o.created_at,
      updated_at: o.updated_at,
      child_profiles: o.child_profiles || null,
      challenges: o.challenges || null,
      payment_reference: o.payment_reference || null,
    }));

    const products: ProductItem[] = productsRes.data ?? [];
    const materialSuggestions: MaterialSuggestionItem[] = suggestionsRes.data ?? [];
    const passportsUnlockedCount = teenProfiles.filter((p) => p.pdfUnlocked).length;

    const total = ordersRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const page = Math.min(data.page, totalPages);

    return {
      orders,
      products,
      materialSuggestions,
      teenProfiles,
      summary: {
        totalOrders,
        pendingOrders: statusCounts.pending ?? 0,
        deliveredOrders: statusCounts.delivered ?? 0,
        passportsUnlockedCount,
      },
      statusCounts,
      total,
      page,
      pageSize: data.pageSize,
      totalPages,
    };
  });

// ── Pouvoir administratif exceptionnel sur les profils (2026-08-12, analyse
// « Évolution de Génizio » §4) ──────────────────────────────────────────────────
// La règle commerciale (quotas, accès) ne prime jamais sur le pouvoir admin : un
// profil peut être désactivé/activé manuellement (is_active), un verrou B2B
// (access_locked_at) peut être levé, la pression temporelle surmodulée — et le
// quota_override par compte (quota TOTAL accordé, 0 = auto) est l'outil du
// « quota + » (updateProfileQuotaAdmin, products.functions.ts).

const ChildProfileSearchInput = z.object({ query: z.string().max(60).default("") });

// Recherche d'enfants pour l'onglet Admin « Profils » (nom, email du parent).
// Borné à 200 lignes — un outil de gestion, pas un export.
export const searchChildProfilesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ChildProfileSearchInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clean = data.query.trim().replace(/[%_]/g, "");
    const q = clean.toLowerCase();

    // Tous les comptes une fois (review 2026-08-12, P2) : l'ancien listUsers page 1/200
    // laissait l'email vide au-delà des 200 premiers comptes — listAllUsers itère tout.
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const emailById = new Map<string, string>();
    const emailMatchIds = new Set<string>();
    for (const u of users) {
      emailById.set(u.id, u.email ?? "");
      if (q && (u.email ?? "").toLowerCase().includes(q)) emailMatchIds.add(u.id);
    }

    // Recherche par NOM et/ou par EMAIL du parent (le commentaire le promettait déjà,
    // seul le nom était cherché — review 2026-08-12, P2).
    const SELECT =
      "id, user_id, name, age, city, country, is_active, access_locked_at, time_pressure, pdf_unlocked, created_at";
    const base = () =>
      supabaseAdmin
        .from("child_profiles")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(200);
    let children: any[] = [];
    if (clean) {
      const [byName, byEmail] = await Promise.all([
        base().ilike("name", `%${clean}%`),
        emailMatchIds.size > 0
          ? base().in("user_id", [...emailMatchIds])
          : Promise.resolve({ data: null }),
      ]);
      children = [...(byName.data ?? []), ...(byEmail?.data ?? [])];
    } else {
      children = (await base()).data ?? [];
    }
    // Déduplication (un enfant peut matcher par nom ET par email) + borne.
    const unique = [...new Map(children.map((c: any) => [c.id, c])).values()].slice(0, 200);

    return unique.map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      name: c.name,
      age: c.age,
      city: c.city,
      country: c.country,
      is_active: c.is_active,
      access_locked_at: c.access_locked_at,
      time_pressure: c.time_pressure,
      pdf_unlocked: c.pdf_unlocked === true,
      created_at: c.created_at,
      parentEmail: emailById.get(c.user_id) ?? "",
    }));
  });

const SetChildActiveInput = z.object({ childId: z.string().uuid(), isActive: z.boolean() });

export const setChildProfileActiveAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SetChildActiveInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("child_profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.childId);
    if (error) throw new Error(error.message);
    return { ok: true, childId: data.childId, isActive: data.isActive };
  });

const UnlockChildInput = z.object({ childId: z.string().uuid() });

// Déverrouille un profil verrouillé par le B2B (retrait d'éducateur de campagne) —
// seul chemin programmatique d'écriture sur access_locked_at côté admin.
export const unlockChildAccessAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UnlockChildInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("child_profiles")
      .update({ access_locked_at: null })
      .eq("id", data.childId);
    if (error) throw new Error(error.message);
    return { ok: true, childId: data.childId };
  });

const SetTimePressureInput = z.object({
  childId: z.string().uuid(),
  timePressure: z.enum(["standard", "gentle", "none"]),
});

export const setChildTimePressureAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SetTimePressureInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("child_profiles")
      .update({ time_pressure: data.timePressure })
      .eq("id", data.childId);
    if (error) throw new Error(error.message);
    return { ok: true, childId: data.childId, timePressure: data.timePressure };
  });

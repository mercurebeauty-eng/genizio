import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { getChildGuild, GUILDS, NO_GUILD_YET, GuildInfo } from "@/lib/guilds";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { calculateNayaTelemetry, NayaTelemetryResponse } from "@/lib/naya-telemetry";

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
  extraSlots: number;
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
  status: string
): T[] {
  if (!Array.isArray(orders)) return [];
  if (!status || status === "all" || status === "Tous" || status.toLowerCase() === "tous") {
    return orders;
  }

  const statusMap: Record<string, string> = {
    "en attente": "pending",
    "confirmé": "confirmed",
    "confirme": "confirmed",
    "expédié": "shipped",
    "expedie": "shipped",
    "livré": "delivered",
    "livre": "delivered",
    "annulé": "cancelled",
    "annule": "cancelled",
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
  children: T[] | null | undefined
): T[] {
  if (!Array.isArray(children)) return [];
  return children.filter((child) => {
    if (!child || child.age === null || child.age === undefined || typeof child.age !== "number" || Number.isNaN(child.age)) {
      return false;
    }
    return child.age >= 14;
  });
}

/**
 * Formats a raw number amount into West African CFA Franc string format (e.g. 50 000 FCFA).
 */
export function formatXOF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || typeof amount !== "number" || Number.isNaN(amount)) {
    return "0 FCFA";
  }
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return `${formatted} FCFA`;
}

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

export interface TalentCityStatsResponse {
  cityStats: CityStatItem[];
  gardnerTotals: GardnerTotalItem[];
  guildDistribution: GuildDistributionItem[];
  highPotentialAlerts: HighPotentialAlert[];
  summary: {
    totalChildren: number;
    totalCities: number;
    highPotentialCount: number;
    totalOrders: number;
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
  }> = []
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
    const times = [
      toMs(c.completed_at),
      toMs(c.updated_at),
      toMs(c.created_at),
    ];
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
  orders: Array<{ child_id?: string | null }> = []
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
  children: Array<{ talents?: Record<string, any> | null }>
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
    const avgScore = totalChildren > 0 ? Math.round((entry.totalScore / totalChildren) * 10) / 10 : 0;
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
  children: Array<{ talents?: Record<string, any> | null }>
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
  }>
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

export const getExecutiveKPIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ExecutiveDataResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch users from Supabase Auth admin
    const users = await listAllUsers(supabaseAdmin);

    // 2. Fetch children profiles
    const { data: children, error: childrenErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age, user_id, last_activity_date, updated_at, created_at, pdf_unlocked");
    if (childrenErr) throw new Error(childrenErr.message);

    // 3. Fetch challenges
    const { data: challenges, error: challengesErr } = await supabaseAdmin
      .from("challenges")
      .select("id, status, child_id, user_id, created_at, updated_at, completed_at");
    if (challengesErr) throw new Error(challengesErr.message);

    const safeChildren = children ?? [];
    const safeChallenges = challenges ?? [];
    const now = new Date();

    const totalParents = users.length;
    const totalChildren = safeChildren.length;
    const totalChallenges = safeChallenges.length;
    const completedChallenges = safeChallenges.filter((c) => c.status === "completed").length;

    const activeChildren7d = calculateActiveChildren(safeChildren, 7, now, safeChallenges);
    const activeChildren30d = calculateActiveChildren(safeChildren, 30, now, safeChallenges);
    const retentionRatePct = calculateRetentionRate(activeChildren30d, totalChildren);
    const ageDistribution = calculateAgeDistribution(safeChildren);

    const parents: ParentBIRC[] = users.map((user) => {
      const userChildren = safeChildren.filter((c) => c.user_id === user.id);
      const userChallenges = safeChallenges.filter((c) => c.user_id === user.id);
      const userCompleted = userChallenges.filter((c) => c.status === "completed");
      const phone = user.user_metadata?.phone || null;

      return {
        id: user.id,
        email: user.email || "",
        phone,
        whatsappUrl: formatWhatsAppUrl(phone),
        createdAt: user.created_at,
        childCount: userChildren.length,
        childNames: userChildren.map((c) => `${c.name} (${c.age} ans)`).join(", "),
        children: userChildren.map((c) => ({
          id: c.id,
          name: c.name,
          age: c.age,
          pdfUnlocked: c.pdf_unlocked === true,
        })),
        challengeCount: userChallenges.length,
        completedCount: userCompleted.length,
        extraSlots: (user.app_metadata?.extra_profile_slots as number) ?? 0,
      };
    });

    parents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      kpis: {
        activeChildren7d,
        activeChildren30d,
        totalParents,
        totalChildren,
        totalChallenges,
        completedChallenges,
        retentionRatePct,
        ageDistribution,
      },
      parents,
    };
  });

export const getTalentCityStatsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<TalentCityStatsResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [childrenRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from("child_profiles")
        .select("id, name, age, city, talents, user_id, created_at"),
      supabaseAdmin.from("orders").select("id, child_id, total_price_xof, status, created_at"),
    ]);

    if (childrenRes.error) throw new Error(childrenRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const children = (childrenRes.data ?? []).map((c) => ({
      ...c,
      talents: (c.talents as Record<string, number> | null) ?? null,
    }));
    const orders = ordersRes.data ?? [];

    const cityStats = calculateCityStats(children, orders);
    const gardnerTotals = calculateGardnerTotals(children);
    const guildDistribution = calculateGuildDistribution(children);
    const highPotentialAlerts = detectHighPotentialProfiles(children);

    const uniqueCitiesCount = cityStats.filter((c) => c.city !== "Ville non renseignée").length;

    return {
      cityStats,
      gardnerTotals,
      guildDistribution,
      highPotentialAlerts,
      summary: {
        totalChildren: children.length,
        totalCities: uniqueCitiesCount,
        highPotentialCount: highPotentialAlerts.length,
        totalOrders: orders.length,
      },
    };
  });

export const getNayaTelemetryAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<NayaTelemetryResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [challengesRes, hypothesisRes, childrenRes] = await Promise.all([
      supabaseAdmin
        .from("challenges")
        .select("id, status, proof_mode"),
      supabaseAdmin
        .from("hypothesis_cycles")
        .select("id, status"),
      supabaseAdmin
        .from("child_profiles")
        .select("id, ai_synthesis"),
    ]);

    if (challengesRes.error) throw new Error(challengesRes.error.message);
    if (hypothesisRes.error) throw new Error(hypothesisRes.error.message);
    if (childrenRes.error) throw new Error(childrenRes.error.message);

    const challenges = challengesRes.data ?? [];
    const hypothesisCycles = hypothesisRes.data ?? [];
    const children = childrenRes.data ?? [];

    const challengesGenerated = challenges.length;
    const challengesStarted = challenges.filter(
      (c) => c.status === "in_progress" || c.status === "completed"
    ).length;
    const challengesCompleted = challenges.filter((c) => c.status === "completed").length;
    const photoProofCompleted = challenges.filter(
      (c) => c.status === "completed" && c.proof_mode === "photo"
    ).length;

    const hypothesesCycles = hypothesisCycles.length;
    const recommendationsCount = children.filter((c) => Boolean(c.ai_synthesis)).length;

    return calculateNayaTelemetry({
      challengesGenerated,
      challengesStarted,
      challengesCompleted,
      photoProofCompleted,
      hypothesesCycles,
      recommendationsCount,
    });
  });

export const getCommercePassportsDataAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<CommercePassportsDataResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, productsRes, suggestionsRes, childrenRes, users] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("*, child_profiles(name, age, city), challenges(title)")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("material_suggestions")
        .select("*")
        .eq("status", "new")
        .order("seen_count", { ascending: false }),
      supabaseAdmin
        .from("child_profiles")
        .select("id, name, age, city, user_id, pdf_unlocked, created_at")
        .order("created_at", { ascending: false }),
      listAllUsers(supabaseAdmin),
    ]);

    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (productsRes.error) throw new Error(productsRes.error.message);
    if (suggestionsRes.error) throw new Error(suggestionsRes.error.message);
    if (childrenRes.error) throw new Error(childrenRes.error.message);

    const userMap = new Map<string, { email: string; phone: string | null }>();
    for (const u of users) {
      userMap.set(u.id, {
        email: u.email || "",
        phone: u.user_metadata?.phone || null,
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
    }));

    const products: ProductItem[] = productsRes.data ?? [];
    const materialSuggestions: MaterialSuggestionItem[] = suggestionsRes.data ?? [];

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
    const passportsUnlockedCount = teenProfiles.filter((p) => p.pdfUnlocked).length;

    return {
      orders,
      products,
      materialSuggestions,
      teenProfiles,
      summary: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        passportsUnlockedCount,
      },
    };
  });



import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildGuild } from "@/lib/guilds";
import { AppTabBar } from "@/components/AppTabBar";
import { AppHeader } from "@/components/AppHeader";
import { GenizioLoader } from "@/components/GenizioLoader";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Trophy,
  Zap,
  Target,
  MapPin,
  ChevronRight,
  Star,
  Clock,
} from "lucide-react";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";

export const Route = createFileRoute("/profiles/$profileId/parcours")({
  component: ParcoursPage,
});

type Child = {
  id: string;
  name: string;
  age: number;
  talents: Record<string, number> | null;
  city?: string | null;
  country?: string | null;
  xp: number | null;
};

type Challenge = {
  id: string;
  title: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  proof_image_url: string | null;
  ai_observations: string | null;
  created_at: string;
};

/** Même formule que profiles.index.tsx (500 XP par niveau) — l'XP réel vit sur
 * child_profiles.xp, incrémenté par awardCompletionXP à la validation d'un
 * défi. Ne pas la recalculer localement à partir du nombre de défis complétés :
 * ça part vite en désaccord avec le reste de l'app (et avec ce que Naya a
 * réellement crédité, notamment sur les profils de test peuplés directement
 * en base, hors du flux normal de complétion). */
function getLevelInfo(totalXP: number) {
  const level = Math.floor(totalXP / 500) + 1;
  const pct = Math.min(100, (totalXP % 500) / 500 * 100);
  const nextXP = 500 - (totalXP % 500);
  return { level, pct, nextXP };
}

/** Couleur par domaine (pour les pastilles de timeline) */
const DOMAIN_COLORS: Record<string, string> = {
  Mathématiques: "bg-blue-100 text-blue-700 border-blue-200",
  Sciences: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Arts: "bg-purple-100 text-purple-700 border-purple-200",
  Langues: "bg-amber-100 text-amber-700 border-amber-200",
  Sport: "bg-red-100 text-red-700 border-red-200",
  "Émotions et relations sociales": "bg-pink-100 text-pink-700 border-pink-200",
  Artisanat: "bg-orange-100 text-orange-700 border-orange-200",
  Agriculture: "bg-green-100 text-green-700 border-green-200",
  Entrepreneuriat: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

function getDomainStyle(domain: string) {
  return DOMAIN_COLORS[domain] ?? "bg-ink/5 text-ink/60 border-ink/10";
}

/** Regroupe les défis complétés par mois (YYYY-MM) */
function groupByMonth(challenges: Challenge[]) {
  const groups = new Map<string, Challenge[]>();
  for (const c of challenges) {
    const date = new Date(c.completed_at ?? c.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function ParcoursPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    Promise.all([
      supabase
        .from("child_profiles")
        .select("id, name, age, talents, city, country, xp")
        .eq("id", profileId)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select("id, title, domain, status, completed_at, proof_image_url, ai_observations, created_at")
        .eq("child_id", profileId)
        .order("completed_at", { ascending: false, nullsFirst: false }),
    ]).then(([childRes, challengesRes]) => {
      setChild((childRes.data as Child) ?? null);
      setChallenges((challengesRes.data as Challenge[]) ?? []);
      setFetching(false);
    });
  }, [session, profileId]);

  if (loading || fetching) {
    return (
      <div className="min-h-dvh bg-surface text-ink">
        <AppHeader />
        <div className="flex h-[70vh] items-center justify-center">
          <GenizioLoader label="Chargement du parcours…" />
        </div>
        <AppTabBar profileId={profileId} />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-dvh bg-surface text-ink">
        <AppHeader />
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-bold text-ink/60">Profil introuvable.</p>
          <Link to="/profiles" className="text-sm font-bold text-brand underline">
            Retour aux profils
          </Link>
        </div>
        <AppTabBar profileId={profileId} />
      </div>
    );
  }

  const guild = getChildGuild(child.talents);
  const completed = challenges.filter((c) => c.status === "completed");
  const inProgress = challenges.filter((c) => c.status === "in_progress");
  const totalXP = child.xp || 0;
  const { level, pct, nextXP } = getLevelInfo(totalXP);

  // Domaines les plus explorés
  const domainCounts: Record<string, number> = {};
  for (const c of completed) {
    domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const monthGroups = groupByMonth(completed);

  return (
    <div className="min-h-dvh bg-surface pb-28 text-ink">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {/* Back + title */}
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/profiles"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm"
          >
            <ArrowLeft className="size-4 text-ink/60" />
          </Link>
          <div>
            <h1 className="font-display font-extrabold text-xl text-ink leading-tight">
              Ton Parcours
            </h1>
            <p className="text-xs text-ink/50 font-medium">{child.name} · {child.age} ans</p>
          </div>
        </div>

        {/* Hero — Guilde + XP */}
        <div
          className="mb-5 rounded-[1.5rem] p-5 border border-border shadow-sm overflow-hidden relative"
          style={{ background: `var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #f5f5f5)10` }}
        >
          {/* bg blob */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full opacity-15 blur-2xl"
            style={{ background: guild.key === "aucune" ? "#7C3AED" : `var(--guild-${guild.key})` }}
          />
          <div className="relative flex items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-[1.1rem] border-2 border-white/50 shadow-md text-3xl"
              style={{ background: `color-mix(in srgb, white 85%, var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #7C3AED) 15%)` }}
            >
              {guild.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-extrabold text-base text-ink">{guild.name}</span>
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{ background: `color-mix(in srgb, white 80%, var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #7C3AED) 20%)`, color: `var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #7C3AED)`, borderColor: `color-mix(in srgb, transparent 70%, var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #7C3AED) 30%)` }}
                >
                  Niveau {level}
                </span>
              </div>
              <p className="text-[11px] text-ink/55 font-medium mt-0.5 leading-relaxed">{guild.tagline}</p>

              {/* XP bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-ink/60 flex items-center gap-1">
                    <Zap className="size-3" /> {totalXP} XP
                  </span>
                  <span className="text-[10px] text-ink/40 font-medium">
                    {nextXP > 0 ? `encore ${nextXP} XP` : "Niveau max !"}
                  </span>
                </div>
                <div className="h-[7px] bg-ink/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, var(--brand), oklch(0.6 0.15 45))`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "Complétés", value: completed.length, color: "text-amber-500" },
            { icon: Target, label: "En cours", value: inProgress.length, color: "text-brand" },
            { icon: Star, label: "Domaines", value: Object.keys(domainCounts).length, color: "text-purple-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-[1.2rem] border border-border bg-card p-4 text-center shadow-sm">
              <Icon className={`size-5 mx-auto mb-1 ${color}`} />
              <div className="font-display font-extrabold text-xl text-ink">{value}</div>
              <div className="text-[10px] font-bold text-ink/50 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Radar des talents */}
        {child.talents && Object.keys(child.talents).length > 0 && (
          <div className="mb-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display font-bold text-[13px] uppercase tracking-wider text-ink/50 mb-4 flex items-center gap-2">
              <Sparkles className="size-3.5" /> Carte des talents
            </h2>
            <TalentRadarChart talents={child.talents} name={child.name} age={child.age} className="h-56 w-full" />
          </div>
        )}

        {/* Top domaines */}
        {topDomains.length > 0 && (
          <div className="mb-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display font-bold text-[13px] uppercase tracking-wider text-ink/50 mb-4 flex items-center gap-2">
              <MapPin className="size-3.5" /> Terrains de jeu favoris
            </h2>
            <div className="space-y-2.5">
              {topDomains.map(([domain, count], i) => (
                <div key={domain} className="flex items-center gap-3">
                  <span className="font-display font-black text-lg text-ink/20 w-5 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getDomainStyle(domain)}`}
                      >
                        {domain}
                      </span>
                      <span className="text-xs font-bold text-ink/50">{count} défi{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-[5px] bg-ink/6 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand/60 transition-all"
                        style={{ width: `${Math.round((count / (topDomains[0][1] || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA : défi en cours */}
        {inProgress.length > 0 && (
          <Link
            to="/profiles/$profileId/challenges"
            params={{ profileId: child.id }}
            className="mb-5 flex items-center gap-3 rounded-[1.5rem] border-2 border-brand/30 bg-brand/5 p-4 shadow-sm group"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Target className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-ink">
                {inProgress.length} défi{inProgress.length > 1 ? "s" : ""} en cours
              </div>
              <div className="text-xs text-ink/50">{inProgress[0].title}</div>
            </div>
            <ChevronRight className="size-4 text-brand shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Timeline des défis complétés */}
        <h2 className="font-display font-bold text-[13px] uppercase tracking-wider text-ink/50 mb-4 flex items-center gap-2">
          <Clock className="size-3.5" /> Historique des défis
        </h2>

        {completed.length === 0 ? (
          <div className="rounded-[1.5rem] border-2 border-dashed border-ink/10 bg-white/50 p-10 text-center">
            <CheckCircle2 className="size-8 mx-auto mb-3 text-ink/20" />
            <p className="font-bold text-ink/40 text-sm">Aucun défi complété pour l'instant.</p>
            <Link
              to="/profiles/$profileId/challenges"
              params={{ profileId: child.id }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <Sparkles className="size-3.5" /> Lancer un défi
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {monthGroups.map(([monthKey, items]) => (
              <div key={monthKey}>
                {/* Month label */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-ink/40">
                    {formatMonthLabel(monthKey)}
                  </span>
                  <div className="flex-1 h-px bg-ink/8" />
                  <span className="text-[10px] font-bold text-ink/30">
                    {items.length} défi{items.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2.5 pl-2 border-l-2 border-ink/6">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="relative ml-3 rounded-[1.1rem] border border-border bg-card p-4 shadow-sm"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[1.25rem] top-4 size-2.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />

                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-ink leading-snug">{c.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDomainStyle(c.domain)}`}
                            >
                              {c.domain}
                            </span>
                            {c.completed_at && (
                              <span className="text-[10px] text-ink/40 font-medium">
                                {new Date(c.completed_at).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            )}
                            {c.proof_image_url && (
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                📸 Photo
                              </span>
                            )}
                          </div>
                          {c.ai_observations && (
                            <p className="mt-2 text-[11px] text-ink/55 leading-relaxed italic line-clamp-2">
                              "{c.ai_observations}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-8 flex gap-3">
          <Link
            to="/profiles/$profileId/challenges"
            params={{ profileId: child.id }}
            className="flex-1 flex items-center justify-center gap-2 rounded-[1.2rem] bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-md"
          >
            <Sparkles className="size-4" /> Nouveau défi
          </Link>
          <Link
            to="/profiles/$profileId/portfolio"
            params={{ profileId: child.id }}
            className="flex items-center justify-center gap-2 rounded-[1.2rem] border border-border bg-card px-4 py-3.5 text-sm font-bold text-ink shadow-sm"
          >
            Portfolio
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </main>

      <AppTabBar profileId={profileId} />
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getGuildCommunity, setGuildParticipation } from "@/lib/guilds.functions";
import { getChildGuild } from "@/lib/guilds";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { AppTabBar } from "@/components/AppTabBar";
import { AppHeader } from "@/components/AppHeader";
import { GenizioLoader } from "@/components/GenizioLoader";
import { Users, Heart, Share2 } from "lucide-react";

export const Route = createFileRoute("/profiles/$profileId/guild")({
  component: GuildPage,
});

type Child = { id: string; name: string; age: number; talents: Record<string, number> | null };

function GuildPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [fetching, setFetching] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [community, setCommunity] = useState<Awaited<ReturnType<typeof getGuildCommunity>> | null>(
    null,
  );
  const [togglingParticipation, setTogglingParticipation] = useState(false);

  const fetchCommunity = useServerFn(getGuildCommunity);
  const toggleParticipation = useServerFn(setGuildParticipation);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    setFetching(true);
    Promise.all([
      supabase
        .from("child_profiles")
        .select("id, name, age, talents")
        .eq("id", profileId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("child_id", profileId)
        .eq("status", "completed"),
    ]).then(([childRes, countRes]) => {
      setChild((childRes.data as Child) ?? null);
      setCompletedCount(countRes.count ?? 0);
      setFetching(false);
    });
  }, [userId, profileId]);

  useEffect(() => {
    if (!userId || !child) return;
    fetchCommunity({ data: { childId: child.id } })
      .then(setCommunity)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, child?.id]);

  const handleToggle = async (optIn: boolean) => {
    if (!child) return;
    setTogglingParticipation(true);
    try {
      await toggleParticipation({ data: { childId: child.id, optIn } });
      const fresh = await fetchCommunity({ data: { childId: child.id } });
      setCommunity(fresh);
    } finally {
      setTogglingParticipation(false);
    }
  };

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface text-ink">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/profiles" className="underline text-sm opacity-80 hover:opacity-100">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const guild = getChildGuild(child.talents);

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 md:flex ">
        <AppTabBar profileId={profileId} />
        <div className="min-w-0 flex-1 space-y-6 animate-in fade-in duration-500">
          <div className={`rounded-3xl border border-ink/10 p-6 shadow-xl ${guild.bgColor}`}>
            <div className="flex items-center gap-4">
              <div className="text-5xl">{guild.emoji}</div>
              <div>
                <p
                  className={`text-xs font-extrabold uppercase tracking-widest opacity-70 ${guild.color}`}
                >
                  Ta guilde
                </p>
                <h1 className={`font-display text-2xl font-black ${guild.color}`}>{guild.name}</h1>
              </div>
            </div>
            <p className={`mt-3 text-sm font-medium opacity-90 ${guild.color}`}>
              {guild.description}
            </p>
            {/* Guilde provisoire (refonte 2026-08-09) : aucun défi complété → la guilde
                vient des intérêts déclarés à la création (seed). Hypothèse assumée, jamais
                présentée comme un verdict — elle s'affine avec les validations réelles. */}
            {completedCount === 0 && guild.key !== "aucune" && (
              <p className={`mt-2 text-xs italic opacity-80 ${guild.color}`}>
                Cette guilde est basée sur les intérêts déclarés — elle s'affinera au fil des
                défis réalisés.
              </p>
            )}
            {guild.talentKeys.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-extrabold opacity-75 ${guild.color}`}>
                  Talents associés :
                </span>
                {guild.talentKeys.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full bg-white/90 border border-ink/10 px-3 py-1 text-xs font-black shadow-xs text-ink"
                  >
                    {TALENT_KEY_LABELS[key] ?? key}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!community?.isOptedIn ? (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-dark">
                  <Users className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">
                    Rejoindre la communauté de guilde
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                    Aujourd'hui, seule votre famille voit les progrès de {child.name}. En activant
                    le partage, le prénom et l'âge de {child.name} deviennent visibles aux autres
                    familles de la guilde {guild.name}, et {child.name} voit aussi les leurs. Rien
                    d'autre n'est partagé (ni ville, ni centres d'intérêt, ni notes). Vous pouvez
                    désactiver à tout moment.
                  </p>
                  <button
                    onClick={() => handleToggle(true)}
                    disabled={togglingParticipation}
                    className="press-brand mt-4 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {togglingParticipation ? "..." : "Activer le partage"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl border border-ink/10 bg-white p-4 text-center shadow-sm">
                  <div className="font-display text-2xl font-black text-brand">
                    {community.memberCount}
                  </div>
                  <div className="text-xs font-semibold text-ink/60">
                    Membres actifs de la guilde
                  </div>
                </div>
                <div className="flex-1 rounded-2xl border border-ink/10 bg-white p-4 text-center shadow-sm">
                  <div className="font-display text-2xl font-black text-leaf-dark">
                    {community.completedThisMonth}
                  </div>
                  <div className="text-xs font-semibold text-ink/60">
                    Défis complétés ce mois-ci
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border border-ink/10 p-4 shadow-sm ${guild.bgColor}`}>
                <p className={`mb-1 font-display text-sm font-bold ${guild.color}`}>
                  Défi collectif du mois
                </p>
                <p className={`mb-3 text-xs font-medium opacity-80 ${guild.color}`}>
                  Ensemble, {guild.name.toLowerCase()} visent {community.monthlyTarget} défis
                  complétés ce mois-ci.
                </p>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/60">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.round((community.completedThisMonth / community.monthlyTarget) * 100))}%`,
                    }}
                  />
                </div>
                <p className={`mt-2 text-xs font-bold ${guild.color}`}>
                  {community.completedThisMonth} / {community.monthlyTarget} défis
                </p>
              </div>

              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink/40">
                  À célébrer
                </p>
                {community.recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center text-sm text-ink/60 shadow-sm">
                    Aucune activité récente dans cette guilde pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {community.recentActivity.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3.5 shadow-sm"
                      >
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-50 font-display font-bold text-sky-dark">
                          {a.childName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-ink">
                            {a.childName}, {a.childAge} ans
                          </div>
                          <div className="truncate text-xs text-ink/60">{a.title}</div>
                        </div>
                        <Heart className="size-4 shrink-0 text-brand/40" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleToggle(false)}
                disabled={togglingParticipation}
                className="press-white w-full rounded-2xl border border-ink/10 bg-white py-3 text-xs font-bold text-ink/60 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="size-3.5" />
                  Désactiver le partage de guilde
                </span>
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

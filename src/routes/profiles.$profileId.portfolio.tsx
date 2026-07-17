import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildAISynthesis } from "@/lib/challenges.functions";
import { getChildGuild } from "@/lib/guilds";
import { AppTabBar } from "@/components/AppTabBar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { NayaAvatar } from "@/components/NayaAvatar";
import { Award, Calendar, ImageIcon, Loader2 } from "lucide-react";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { AppHeader } from "@/components/AppHeader";
import { MarkdownContent } from "@/components/ui/markdown-content";

export const Route = createFileRoute("/profiles/$profileId/portfolio")({
  component: PortfolioPage,
});

type Child = {
  id: string;
  name: string;
  age: number;
  talents: Record<string, number>;
};

type Challenge = {
  id: string;
  title: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  proof_image_url: string | null;
};

function PortfolioPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);
  const [synthesis, setSynthesis] = useState("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);

  const fetchSynthesis = useServerFn(getChildAISynthesis);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    Promise.all([
      supabase.from("child_profiles").select("id, name, age, talents").eq("id", profileId).eq("user_id", session!.user.id).maybeSingle(),
      supabase
        .from("challenges")
        .select("id, title, domain, status, completed_at, proof_image_url")
        .eq("child_id", profileId)
        .order("completed_at", { ascending: false }),
    ]).then(([c, ch]) => {
      setChild((c.data as Child) ?? null);
      setChallenges((ch.data ?? []) as Challenge[]);
      setFetching(false);
    });
  }, [session, profileId]);

  useEffect(() => {
    if (!session) return;
    setFetchingSynthesis(true);
    fetchSynthesis({ data: { childId: profileId } })
      .then((resp) => setSynthesis(resp || ""))
      .catch(() => setSynthesis(""))
      .finally(() => setFetchingSynthesis(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/50">
        Chargement…
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/profiles" className="underline text-sm opacity-80 hover:opacity-100">Retour</Link>
        </div>
      </div>
    );
  }

  const completed = challenges.filter((c) => c.status === "completed");
  const artifacts = completed.filter((c) => c.proof_image_url);

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink md:pb-6">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex md:gap-8">
        <AppTabBar profileId={profileId} />

        <div className="min-w-0 flex-1 space-y-6">
          {/* Bannière Guilde */}
          {(() => {
            const guild = getChildGuild(child.talents);
            return (
              <div className={`rounded-3xl border-[3px] border-ink p-5 shadow-brutal flex items-center gap-4 ${guild.bgColor}`}>
                <div className="text-5xl">{guild.emoji}</div>
                <div>
                  <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${guild.color} opacity-70`}>
                    Guilde de {child.name}
                  </p>
                  <h2 className={`font-display text-2xl font-black leading-tight ${guild.color}`}>{guild.name}</h2>
                  <p className={`text-sm font-medium italic mt-1 ${guild.color} opacity-80`}>« {guild.description} »</p>
                </div>
              </div>
            );
          })()}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                <Award className="size-5 text-brand" />
                Carte des Talents
              </h3>
              <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" />
              <p className="text-center text-[11px] font-medium text-ink/40">
                Cette carte s'affine et se développe à mesure que {child.name} réalise ses défis.
              </p>
            </div>

            <div className="rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-brutal">
              <div className="mb-4 flex items-center gap-3">
                <NayaAvatar size="sm" />
                <h3 className="font-display text-lg font-bold text-ink">Portrait de {child.name}</h3>
              </div>
              {fetchingSynthesis ? (
                <div className="flex items-center gap-2 py-8 text-sm text-ink/60 font-bold">
                  <Loader2 className="size-4 animate-spin" />
                  Naya prépare le portrait...
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-ink font-medium">
                  <MarkdownContent content={synthesis} />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Calendar className="size-5 text-brand" />
                Timeline de progression
              </h3>
              {child && <InviteMentorDialog childId={child.id} childName={child.name} />}
            </div>
            {completed.length === 0 ? (
              <p className="text-sm text-ink/50">Aucun défi complété pour l'instant.</p>
            ) : (
              <ul className="space-y-3">
                {completed.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{c.title}</p>
                      <p className="text-xs text-ink/50">{c.domain}</p>
                    </div>
                    <span className="text-xs font-semibold text-ink/40">
                      {c.completed_at ? new Date(c.completed_at).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <ImageIcon className="size-5 text-brand" />
              Galerie d'artefacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-sm text-ink/50">Aucune photo pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {artifacts.map((c) => (
                  <div key={c.id} className="aspect-square overflow-hidden rounded-2xl border-[3px] border-ink bg-surface">
                    <img src={c.proof_image_url!} alt={c.title} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

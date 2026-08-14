import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { MentorGrantsTable } from "@/components/mentors/MentorGrantsTable";
import { Users } from "lucide-react";
import { AppTabBar } from "@/components/AppTabBar";

import { AppHeader } from "@/components/AppHeader";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/profiles/$profileId/mentors")({
  component: MentorsPage,
});

function MentorsPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [childName, setChildName] = useState("");
  const [fetchingChild, setFetchingChild] = useState(true);
  const [childFound, setChildFound] = useState(false);

  // Stable reference: user ID doesn't change across token refreshes,
  // whereas the `session` object gets a new identity on every refresh,
  // which was causing the fetch effect below to re-fire in a loop.
  const userId = session?.user?.id;

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!userId) return;
    setFetchingChild(true);
    supabase
      .from("child_profiles")
      .select("name")
      .eq("id", profileId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setChildFound(!!data);
        if (data) setChildName(data.name);
        setFetchingChild(false);
      });
  }, [userId, profileId]);

  if (loading || !session || fetchingChild) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!childFound) {
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

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 md:flex ">
        <AppTabBar profileId={profileId} />
        <div className="min-w-0 flex-1 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col  md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-balance text-3xl font-extrabold text-ink flex items-center gap-3">
                <Users className="size-8 text-brand" />
                Accès Mentors
              </h1>
              <p className="mt-2 text-ink/60">
                Gérer les personnes qui ont accès aux progrès de {childName}.
              </p>
            </div>
            <InviteMentorDialog childId={profileId} childName={childName} />
          </div>

          <MentorGrantsTable childId={profileId} />
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { MentorGrantsTable } from "@/components/mentors/MentorGrantsTable";
import { Users } from "lucide-react";
import { AppTabBar } from "@/components/AppTabBar";

export const Route = createFileRoute("/profiles/$profileId/mentors")({
  component: MentorsPage,
});

function MentorsPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("child_profiles")
      .select("name")
      .eq("id", profileId)
      .single()
      .then(({ data }) => {
        if (data) setChildName(data.name);
      });
  }, [session, profileId]);

  if (loading || !session) return null;

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink md:flex md:justify-center md:gap-8 md:pb-6 md:pt-8">
      <div className="w-full max-w-4xl px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 md:mt-0">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink flex items-center gap-3">
              <Users className="size-8 text-brand" />
              Accès Mentors
            </h1>
            <p className="mt-2 text-ink/60">
              Gérez les personnes qui ont accès aux progrès de {childName}.
            </p>
          </div>
          <InviteMentorDialog childId={profileId} childName={childName} />
        </div>

        <MentorGrantsTable childId={profileId} />
      </div>
      <AppTabBar profileId={profileId} />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTabBar } from "@/components/AppTabBar";

export const Route = createFileRoute("/profiles/$profileId/mentors")({
  component: MentorsStub,
});

function MentorsStub() {
  const { profileId } = Route.useParams();
  return (
    <div className="min-h-screen bg-surface pb-24 text-ink md:flex md:justify-center md:gap-8 md:pb-6 md:pt-8">
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-24 text-center md:mx-0">
        <p className="text-sm font-semibold text-ink/50">Le partage avec un mentor arrive bientôt.</p>
        <Link
          to="/profiles/$profileId/challenges"
          params={{ profileId }}
          className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
        >
          Retour aux défis
        </Link>
      </div>
      <AppTabBar profileId={profileId} />
    </div>
  );
}

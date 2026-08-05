import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSharedChildView } from "@/lib/mentors.functions";
import { useEffect, useState } from "react";
import { ShieldAlert, Award, Brain, Image as ImageIcon, Phone } from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { MarkdownContent } from "@/components/ui/markdown-content";

export const Route = createFileRoute("/s/$token")({
  component: SharedChildView,
});

function SharedChildView() {
  const { token } = Route.useParams();
  const getSharedView = useServerFn(getSharedChildView);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getSharedView({ data: { token } });
        setData(result);
      } catch (err) {
        setError("Lien invalide ou expiré");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, getSharedView]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-ink/10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-ink/10 bg-red-50 text-red-500 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="font-display text-balance text-2xl font-extrabold text-ink mb-2">
            Accès restreint
          </h1>
          <p className="text-ink/60 leading-relaxed">
            Ce lien est invalide ou a expiré. Veuillez demander un nouveau lien d'accès.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <header className="bg-surface border-b-[3px] border-ink sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div
                className="size-10 rounded-full flex items-center justify-center font-extrabold text-white border border-ink/10"
                style={{ backgroundColor: data.childColor }}
              >
                {data.childName.charAt(0)}
              </div>
              <div className="size-10 rounded-full flex items-center justify-center bg-brand/10 text-brand font-extrabold border border-ink/10">
                {data.mentorName.charAt(0)}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/60 uppercase tracking-widest">
                Partage privé •{" "}
                {data.scopeDomains && data.scopeDomains.length > 0
                  ? `Domaines : ${data.scopeDomains.join(", ")}`
                  : "Tous les domaines"}
              </p>
              <h1 className="font-bold text-ink">
                {data.childName} & {data.mentorName}
              </h1>
            </div>
          </div>
          <div className="rounded-full border border-ink/10 bg-leaf px-3 py-1 text-[10px] font-bold text-white flex items-center gap-1.5 hidden sm:flex">
            <div className="size-1.5 rounded-full bg-white"></div>
            Accès Sécurisé
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {data.parentPhone && (
          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <Phone className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40">
                Contacter le parent de {data.childName}
              </p>
              <a
                href={`tel:${data.parentPhone}`}
                className="text-sm font-bold text-ink hover:text-brand"
              >
                {data.parentPhone}
              </a>
            </div>
          </div>
        )}

        {data.talents && (
          <div className="rounded-3xl border border-ink/10 bg-white p-6 md:p-8 shadow-xl">
            <h3 className="font-display text-balance text-xl font-bold flex items-center gap-2 mb-6">
              <Award className="size-6 text-brand" />
              Carte des Talents de {data.childName}
            </h3>
            <div className="max-w-lg mx-auto">
              <TalentRadarChart
                talents={data.talents}
                name={data.childName}
                className="h-72 w-full"
                age={data.childAge}
              />
            </div>
          </div>
        )}

        {data.timeline && data.timeline.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-display text-balance text-xl font-bold px-2">
              Journal d'apprentissage
            </h3>

            <div className="space-y-4">
              {data.timeline.map((c: any) => (
                <div key={c.id} className="rounded-3xl bg-white p-6 border border-ink/10 shadow-xl">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-ink/10 bg-brand px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                      {c.domain}
                    </span>
                    <span className="text-xs font-semibold text-ink/60">
                      Terminé le {new Date(c.completed_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-display text-balance text-lg font-extrabold text-ink mb-2">
                    {c.title}
                  </h4>
                  <div className="text-sm text-ink/70 leading-relaxed mb-6">
                    <MarkdownContent content={c.description} />
                  </div>

                  {c.proof_image_url && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-ink/10 bg-surface">
                      <img
                        src={c.proof_image_url}
                        alt="Preuve"
                        className="w-full max-h-64 object-contain"
                      />
                    </div>
                  )}

                  {c.ai_observations && (
                    <div className="rounded-2xl border border-ink/10 bg-leaf/10 p-4 mb-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                        <Brain className="size-4" />
                        Analyse
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed italic">
                        "<MarkdownContent content={c.ai_observations} inline />"
                      </p>
                    </div>
                  )}

                  {c.notes !== undefined && c.notes && (
                    <div className="rounded-2xl border border-ink/10 bg-sky/20 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-sky-800 flex items-center gap-1.5">
                        Notes Privées
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed">{c.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!data.timeline || data.timeline.length === 0) && !data.talents && (
          <div className="text-center py-12">
            <p className="text-ink/60 font-medium">
              Ce profil ne contient aucune donnée visible pour le moment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

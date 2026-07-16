import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSharedChildView } from "@/lib/mentors.functions";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, Award, Brain, Image as ImageIcon } from "lucide-react";
import { TalentRadarChart } from "@/components/TalentRadarChart";

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
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="size-8 animate-spin text-brand/50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-soft border border-ink/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink mb-2">Accès restreint</h1>
          <p className="text-ink/60 leading-relaxed">
            Ce lien est invalide ou a expiré. Veuillez demander un nouveau lien d'accès.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink">
      <header className="bg-white border-b border-ink/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="size-10 rounded-full flex items-center justify-center font-extrabold text-white shadow-sm border-2 border-white" style={{ backgroundColor: data.childColor }}>
                {data.childName.charAt(0)}
              </div>
              <div className="size-10 rounded-full flex items-center justify-center bg-brand/10 text-brand font-extrabold shadow-sm border-2 border-white">
                {data.mentorName.charAt(0)}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 uppercase tracking-widest">
                Partage privé • {data.scopeDomains && data.scopeDomains.length > 0 ? `Domaines : ${data.scopeDomains.join(", ")}` : "Tous les domaines"}
              </p>
              <h1 className="font-bold text-ink">{data.childName} & {data.mentorName}</h1>
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100 flex items-center gap-1.5 hidden sm:flex">
            <div className="size-1.5 rounded-full bg-emerald-500"></div>
            Accès Sécurisé
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {data.talents && (
          <div className="rounded-3xl border border-ink/5 bg-white p-6 md:p-8 shadow-soft">
            <h3 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
              <Award className="size-6 text-brand" />
              Carte des Talents de {data.childName}
            </h3>
            <div className="max-w-lg mx-auto">
              <TalentRadarChart talents={data.talents} name={data.childName} className="h-72 w-full" />
            </div>
          </div>
        )}

        {data.timeline && data.timeline.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-display text-xl font-bold px-2">Journal d'apprentissage</h3>
            
            <div className="space-y-4">
              {data.timeline.map((c: any) => (
                <div key={c.id} className="rounded-3xl bg-white p-6 border border-ink/5 shadow-soft">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand">
                      {c.domain}
                    </span>
                    <span className="text-xs font-semibold text-ink/40">
                      Terminé le {new Date(c.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h4 className="font-display text-lg font-extrabold text-ink mb-2">{c.title}</h4>
                  <p className="text-sm text-ink/70 leading-relaxed mb-6">{c.description}</p>
                  
                  {c.proof_image_url && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-ink/5 bg-surface/50">
                      <img src={c.proof_image_url} alt="Preuve" className="w-full max-h-64 object-contain" />
                    </div>
                  )}

                  {c.ai_observations && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 mb-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                        <Brain className="size-4" />
                        Analyse
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed italic">"{c.ai_observations}"</p>
                    </div>
                  )}

                  {c.notes !== undefined && c.notes && (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
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
            <p className="text-ink/50 font-medium">Ce profil ne contient aucune donnée visible pour le moment.</p>
          </div>
        )}
      </main>
    </div>
  );
}

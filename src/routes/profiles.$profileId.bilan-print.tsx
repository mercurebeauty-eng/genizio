// Mentor Copilote (décision #74) — export PDF du « Bilan du mentor ».
//
// Route d'impression/export : charge l'enfant + le bilan (ownership parent vérifiée
// côté serveur dans getChildBilan), génère le PDF vectoriel via @react-pdf/renderer
// (même pattern que passport-print) et le télécharge. Pas de verrou payant : le bilan
// est un livrable INCLUS du pack (décision #74).

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { getChildBilan } from "@/lib/mentor-reports.functions";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { BilanPdf } from "@/components/bilan/BilanPdf";
import { toast } from "sonner";
import { Download, Loader2, Lock, ChevronLeft } from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/profiles/$profileId/bilan-print")({
  component: BilanPrintPage,
});

function BilanPrintPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();

  const [child, setChild] = useState<{
    id: string;
    name: string;
    age: number;
    user_id: string;
  } | null>(null);
  const [bilan, setBilan] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [denied, setDenied] = useState(false);

  const bilanFn = useServerFn(getChildBilan);

  useEffect(() => {
    if (!session || loading) return;
    (async () => {
      try {
        const { data: kid } = await supabase
          .from("child_profiles")
          .select("id, name, age, user_id")
          .eq("id", profileId)
          .maybeSingle();
        if (!kid || kid.user_id !== session.user.id) {
          setDenied(true);
          return;
        }
        setChild(kid);
        const res = await bilanFn({ data: { childId: profileId } });
        setBilan((res as any)?.report ?? null);
      } catch {
        setDenied(true);
      } finally {
        setFetching(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, profileId]);

  const handleDownloadPdf = async () => {
    if (!child || !bilan) return;
    setDownloading(true);
    try {
      const blob = await pdf(
        <BilanPdf
          data={{
            childName: child.name,
            childAge: child.age,
            periodStart: bilan.period_start,
            periodEnd: bilan.period_end,
            mentorEmail: (bilan as any).mentorEmail ?? "mentor Génizio",
            realisations: bilan.realisations,
            competencesObservees: bilan.competences_observees,
            recommandations: bilan.recommandations,
          }}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bilan-${child.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Bilan de fin téléchargé pour ${child.name}.`);
    } catch (err) {
      console.error("Erreur génération du PDF:", err);
      toast.error("Impossible de générer le PDF. Réessayez dans un instant.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50">
        <GenizioLoader label="Préparation du bilan…" />
      </div>
    );
  }

  if (denied || !child || !bilan) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50 text-ink">
        <div className="text-center p-6 border border-ink/10 bg-white rounded-3xl max-w-sm shadow-sm">
          <Lock className="size-10 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-red-500 mb-2">Bilan introuvable ou accès refusé.</p>
          <p className="text-xs text-ink/60 mb-4">
            Ce document est réservé au compte parent propriétaire, et le bilan doit exister.
          </p>
          <Link
            to="/profiles/$profileId/portfolio"
            params={{ profileId }}
            className="text-xs font-bold text-brand hover:underline"
          >
            Retour au Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const isValidated = bilan.status === "validated";

  return (
    <div className="min-h-dvh bg-stone-50 text-ink">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/profiles/$profileId/portfolio"
          params={{ profileId }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 hover:text-ink mb-6"
        >
          <ChevronLeft className="size-4" /> Retour au Portfolio
        </Link>

        <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h1 className="font-display text-balance text-2xl font-black mb-1">
            Bilan de fin — {child.name}
          </h1>
          <p className="text-sm text-ink/60 mb-6">
            Période du {new Date(bilan.period_start).toLocaleDateString("fr-FR")} au{" "}
            {new Date(bilan.period_end).toLocaleDateString("fr-FR")}
            {isValidated ? " · ✅ Validé par le parent" : " · brouillon"}
          </p>

          {!isValidated ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              Ce bilan n'est pas encore validé par le parent. L'export officiel n'est disponible
              qu'après validation.
            </p>
          ) : (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Télécharger le PDF
            </button>
          )}

          <div className="mt-8 space-y-5">
            {(
              [
                ["Réalisations de la période", bilan.realisations],
                ["Compétences observées", bilan.competences_observees],
                ["Recommandations pour la suite", bilan.recommandations],
              ] as const
            ).map(([label, content]) =>
              content ? (
                <div key={label}>
                  <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">
                    {label}
                  </p>
                  <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">
                    {content}
                  </p>
                </div>
              ) : null,
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

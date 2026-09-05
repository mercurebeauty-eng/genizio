// Bilan d'impact trimestriel pour la direction d'école (Phase 4).
// Version compacte : le tableau de bord école vivant reste dans la route
// educator.tsx — ce composant ajoute le BILAN TRIMESTRIEL imprimable
// (export PDF natif navigateur via @media print) consommant le rapport
// tripartite le plus récent des escouades de l'établissement.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Printer } from "lucide-react";
import { getLatestTripartiteReportAdmin } from "@/lib/tripartite.functions";
import type { TripartiteCohortReport } from "@/lib/tripartite-reporting";

export function EducatorSchoolDashboard({ squadIds }: { squadIds: string[] }) {
  const getReportFn = useServerFn(getLatestTripartiteReportAdmin);
  const [reports, setReports] = useState<Array<{ squadId: string; report: TripartiteCohortReport | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (squadIds.length === 0) {
      setReports([]);
      return;
    }
    setLoading(true);
    Promise.all(
      squadIds.map(async (squadId) => ({
        squadId,
        report: await getReportFn({ data: { squadId } }).catch(() => null),
      })),
    )
      .then(setReports)
      .catch(() => toast.error("Lecture des rapports trimestriels impossible."))
      .finally(() => setLoading(false));
  }, [squadIds, getReportFn]);

  const formatDelta = (v: number, unit: string) =>
    `${v > 0 ? "+" : ""}${v} ${unit}`;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm space-y-4 print:border-0 print:shadow-none">
      <div className="flex items-center justify-between gap-3 print:block">
        <div>
          <p className="text-sm font-black text-ink flex items-center gap-2">
            <ClipboardCheck className="size-4 text-brand" />
            Bilan d'impact trimestriel
          </p>
          <p className="text-[11px] font-semibold text-ink/50">
            Croisement des trois sources indépendantes : notes de l'école, preuves validées du club,
            autonomie des enfants.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 px-3 py-2 text-[11px] font-black text-ink/70 hover:bg-stone-50 print:hidden min-h-[38px]"
        >
          <Printer className="size-3.5" /> Imprimer / PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : reports.length === 0 || reports.every((r) => !r.report) ? (
        <p className="rounded-2xl border border-dashed border-ink/20 bg-stone-50 px-4 py-6 text-center text-xs font-semibold text-ink/50">
          Aucun rapport trimestriel disponible — l'Admin OS génère les rapports à la fin de chaque
          trimestre. Ce bilan sera alimenté automatiquement.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reports
            .filter((r) => r.report)
            .map(({ squadId, report }) => (
              <div key={squadId} className="rounded-2xl border border-ink/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-ink">Escouade · trimestre {report!.period}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      report!.sufficientData ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {report!.sufficientData ? `Impact ${report!.impactIndex}/100` : "Cohorte insuffisante"}
                  </span>
                </div>
                {report!.sufficientData ? (
                  <ul className="space-y-1 text-[11px] font-semibold text-ink/70">
                    <li>
                      Notes de classe :{" "}
                      <strong className="text-ink">{formatDelta(report!.medianAcademicDelta, "pt")}</strong>{" "}
                      (médiane /20)
                    </li>
                    <li>
                      Autonomie :{" "}
                      <strong className="text-ink">{formatDelta(report!.medianAutonomyDelta, "pts")}</strong>{" "}
                      (médiane /100)
                    </li>
                    <li>
                      Artefacts réels validés :{" "}
                      <strong className="text-ink">{report!.artifactValidationRate} %</strong>
                    </li>
                    {report!.alerts.filter((a) => a.kind !== "low_data").map((a, i) => (
                      <li key={i} className="text-amber-700">⚠️ {a.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] font-semibold text-ink/50">
                    {report!.cohortSize} enfant(s) seulement — les indicateurs sont affichés sans
                    conclusion tant que la cohorte fait moins de 5 enfants.
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

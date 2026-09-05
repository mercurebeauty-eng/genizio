import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listChildSafetyReports,
  triggerMentorEmergencySuspension,
  type ChildSafetyReportDetail,
} from "@/lib/safeguarding.functions";
import {
  ShieldAlert,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export interface AdminSafetyReportsProps {
  onDataChanged?: () => void | Promise<void>;
  onPendingCountChange?: (count: number) => void;
  isRefreshing?: boolean;
}

export function AdminSafetyReports({
  onDataChanged,
  onPendingCountChange,
  isRefreshing = false,
}: AdminSafetyReportsProps = {}) {
  const { session } = useSession();
  const [reports, setReports] = useState<ChildSafetyReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [suspendingMentorId, setSuspendingMentorId] = useState<string | null>(null);

  const listReportsFn = useServerFn(listChildSafetyReports);
  const triggerKillSwitchFn = useServerFn(triggerMentorEmergencySuspension);

  const loadReports = async () => {
    setLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listReportsFn({
        data: statusFilter === "all" ? undefined : { status: statusFilter },
        ...opts,
      });
      setReports(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des signalements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleTriggerKillSwitch = async (report: ChildSafetyReportDetail) => {
    const confirmed = await confirmDialog({
      title: "⛔ DÉCLENCHER LE KILL-SWITCH D'URGENCE ?",
      description: `Attention : cette action va IMMÉDIATEMENT suspendre le mentor (${report.accused_mentor_name}), révoquer toutes ses assignations sur tous ses élèves, invalider ses sessions et geler ses paiements.`,
      confirmLabel: "Exécuter le Kill-Switch",
      variant: "danger",
    });

    if (!confirmed) return;

    setSuspendingMentorId(report.accused_mentor_user_id);

    // Optimistic UI Update
    const previousReports = reports;
    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              kill_switch_triggered: true,
              status: "sanctioned",
              investigation_notes: `Kill-switch activé le ${now}. Raison: Signalement...`,
            }
          : r,
      ),
    );

    // Calculate new pending count (decrement open status reports if this one was open)
    if (report.status === "open") {
      const openReportsCount = reports.filter((r) => r.status === "open").length - 1;
      onPendingCountChange?.(Math.max(0, openReportsCount));
    }

    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await triggerKillSwitchFn({
        data: {
          mentorUserId: report.accused_mentor_user_id,
          reportId: report.id,
          reason: `Signalement ${report.category} [${report.severity}] : ${report.description.slice(0, 100)}...`,
        },
        ...opts,
      });
      toast.success("Kill-Switch exécuté : mentor suspendu immédiatement.");

      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const channel = supabase.channel("admin-mentors-tab-sync");
        void channel.send({
          type: "broadcast",
          event: "safeguarding_updated",
          payload: { timestamp: Date.now() },
        });
      } catch (e) {}

      void onDataChanged?.();
    } catch (err) {
      setReports(previousReports);
      if (report.status === "open") {
        const openReportsCount = reports.filter((r) => r.status === "open").length;
        onPendingCountChange?.(openReportsCount);
      }
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'exécution du Kill-Switch.",
      );
    } finally {
      setSuspendingMentorId(null);
    }
  };

  const categoryLabels: Record<string, string> = {
    harassment: "Harcèlement / Gestes ambigus",
    verbal_abuse: "Agressivité / Rabaissement",
    excessive_stress: "Pression anxiogène / Stress",
    unauthorized_contact: "Contact privé hors cadre",
    unpunctuality_fraud: "Retards répétés / Fraude séance",
    other: "Autre signalement",
  };

  return (
    <div className="space-y-6">
      {/* Alerte Kill-Switch */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
        <div className="flex gap-3">
          <ShieldAlert className="size-6 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-rose-950 leading-relaxed space-y-1">
            <p className="font-black text-rose-900 flex items-center gap-2">
              <span>Bouclier de Protection & Signalements d'Urgence</span>
              <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                Tolérance Zéro
              </span>
            </p>
            <p>
              Toute plainte ou comportement suspect signalé par une famille ou un enseignant remonte
              ici. En cas de menace avérée, le bouton <strong>Kill-Switch</strong> suspend le mentor
              dans la seconde et protège tous les mineurs assignés.
            </p>
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink/60">Filtrer par statut :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink outline-none cursor-pointer"
          >
            <option value="all">Tous ({reports.length})</option>
            <option value="open">Ouverts (À traiter)</option>
            <option value="investigating">En cours d'investigation</option>
            <option value="sanctioned">Sanctionnés / Kill-switch</option>
            <option value="dismissed">Classés sans suite</option>
          </select>
        </div>
      </div>

      {/* Liste des signalements */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-sm">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-ink">Aucun signalement en attente.</p>
          <p className="text-xs text-ink/60 mt-1">
            Toutes les séances se déroulent dans un cadre sain et bienveillant.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                report.severity === "critical"
                  ? "border-rose-300 bg-rose-50/40"
                  : report.severity === "high"
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-ink/10 bg-white"
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      report.severity === "critical"
                        ? "bg-rose-600 text-white"
                        : report.severity === "high"
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200 text-ink"
                    }`}
                  >
                    {report.severity.toUpperCase()}
                  </span>
                  <span className="font-bold text-xs text-ink">
                    {categoryLabels[report.category] || report.category}
                  </span>
                  <span className="text-[11px] text-ink/40">·</span>
                  <span className="text-[11px] text-ink/60">
                    Déposé par un <strong>{report.reporter_role}</strong> le{" "}
                    {new Date(report.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                <div className="text-xs text-ink/80 leading-relaxed font-medium bg-white/80 p-3 rounded-2xl border border-ink/5">
                  "{report.description}"
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-ink/60">
                  <span>
                    Élève concerné : <strong className="text-ink">{report.child_name}</strong>
                  </span>
                  <span>
                    Mentor mis en cause :{" "}
                    <strong className="text-rose-900">{report.accused_mentor_name}</strong>
                  </span>
                  {report.kill_switch_triggered && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 flex items-center gap-1">
                      <Ban className="size-3" /> Kill-Switch actif
                    </span>
                  )}
                </div>

                {report.investigation_notes && (
                  <p className="text-[11px] text-ink/60 italic">
                    Note admin : {report.investigation_notes}
                  </p>
                )}
              </div>

              {/* Bouton d'action Kill-Switch */}
              {!report.kill_switch_triggered && (
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={suspendingMentorId === report.accused_mentor_user_id}
                    onClick={() => void handleTriggerKillSwitch(report)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-black shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {suspendingMentorId === report.accused_mentor_user_id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Ban className="size-4" />
                    )}
                    <span>Activer Kill-Switch</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

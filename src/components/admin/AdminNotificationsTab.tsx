import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAppNotificationsAdmin } from "@/lib/notifications.functions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Loader2, RefreshCw, BellRing } from "lucide-react";
import { toast } from "sonner";

// Panneau in-app admin des notifications (2026-08-15, backlog décision #79
// différé) : journal global paginé des app_notifications — bascules de statut
// (automatiques ET manuelles depuis le fix de updateMentorStatusAdmin), séances à
// valider/confirmées/contestées, bilans… Lecture seule : c'est un journal d'audit
// et une garde anti-abus, pas une boîte de gestion.

export type AdminNotificationRow = {
  id: string;
  type: string;
  child_profile_id: string | null;
  child_name: string | null;
  user_id: string;
  recipient_email: string | null;
  recipient_role: "admin" | "parent" | "mentor";
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export type AdminNotificationList = {
  data: AdminNotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Libellé français + émoji d'un type de notification (source unique, testable). */
export function notificationTypeLabel(type: string, payload: Record<string, unknown> = {}): string {
  switch (type) {
    case "mentor_session_to_validate":
      return "📋 Séance à valider";
    case "mentor_session_confirmed":
      return "✅ Séance confirmée";
    case "mentor_session_planned":
      return "🗓️ Séance planifiée";
    case "mentor_session_contested":
      return "⚠️ Séance contestée";
    case "mentor_bilan_submitted":
      return "📄 Bilan soumis";
    case "mentor_bilan_validated":
      return "✅ Bilan validé";
    case "mentor_bilan_rejected":
      return "↩️ Bilan renvoyé";
    case "mentor_status_changed":
      return `🏷️ Statut → ${
        payload.to === "suspended" ? "suspendu" : payload.to === "warning" ? "averti" : "actif"
      }`;
    case "mentor_abandon":
      return "❌ Défi non réussi";
    case "mentor_challenge_completed":
      return "🎉 Défi complété";
    default:
      return `🔔 ${type}`;
  }
}

/** Détail résumé du payload pour le journal (qui → quoi). */
export function notificationPayloadSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "mentor_status_changed": {
      const from = payload.from as string | undefined;
      const to = payload.to as string | undefined;
      return from && to ? `${from} → ${to}` : "";
    }
    case "mentor_session_contested":
      return (payload.reason as string | undefined) ?? "";
    case "mentor_session_to_validate":
    case "mentor_session_confirmed":
    case "mentor_session_planned":
      return payload.occurred_at || payload.planned_at
        ? new Date((payload.occurred_at ?? payload.planned_at) as string).toLocaleDateString(
            "fr-FR",
          )
        : "";
    default:
      return "";
  }
}

const KNOWN_TYPES = [
  "mentor_status_changed",
  "mentor_session_to_validate",
  "mentor_session_confirmed",
  "mentor_session_planned",
  "mentor_session_contested",
  "mentor_bilan_submitted",
  "mentor_bilan_validated",
  "mentor_bilan_rejected",
  "mentor_abandon",
  "mentor_challenge_completed",
];

const ROLE_LABEL: Record<AdminNotificationRow["recipient_role"], string> = {
  admin: "Admin",
  parent: "Parent",
  mentor: "Mentor",
};

const ROLE_CLASS: Record<AdminNotificationRow["recipient_role"], string> = {
  admin: "border-violet-300 bg-violet-50 text-violet-700",
  parent: "border-brand/25 bg-brand/10 text-brand",
  mentor: "border-sky/30 bg-sky-50 text-sky-dark",
};

export function AdminNotificationsTab() {
  const listFn = useServerFn(listAppNotificationsAdmin);
  const [rows, setRows] = useState<AdminNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const load = async (targetPage: number, targetType: string) => {
    setLoading(true);
    try {
      const res = await listFn({
        data: { page: targetPage, pageSize, type: targetType || undefined },
      });
      const data = res as unknown as AdminNotificationList;
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      console.error("AdminNotificationsTab:", err);
      toast.error("Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = (t: string) => {
    setTypeFilter(t);
    void load(1, t);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Notifications</h2>
          <p className="text-sm font-medium text-ink/60">
            Journal global des notifications in-app ({total} au total) — bascules de statut,
            séances, bilans. Lecture seule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/70 shadow-sm outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            aria-label="Filtrer par type"
          >
            <option value="">Tous les types</option>
            {KNOWN_TYPES.map((t) => (
              <option key={t} value={t}>
                {notificationTypeLabel(t)}
              </option>
            ))}
          </select>
          <button
            onClick={() => void load(page, typeFilter)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-xs font-bold text-ink/70 shadow-sm hover:bg-surface transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white p-10 text-sm font-bold text-ink/60">
          <Loader2 className="size-4 animate-spin" />
          Chargement du journal…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-10 text-center text-sm font-semibold text-ink/60">
          Aucune notification{typeFilter ? " de ce type" : ""} pour le moment. Elles
          apparaîtront ici dès qu'un événement sera émis.
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  n.read ? "border-ink/10 bg-white/60" : "border-sky-200 bg-sky-50/50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink">
                      {notificationTypeLabel(n.type, n.payload)}
                      {n.child_name && (
                        <span className="rounded-full border border-ink/10 bg-surface px-2 py-0.5 text-[10px] font-bold text-ink/60">
                          👧 {n.child_name}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-ink/50">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${ROLE_CLASS[n.recipient_role]}`}
                      >
                        <BellRing className="size-3" />
                        {ROLE_LABEL[n.recipient_role]}
                      </span>
                      <span className="truncate max-w-[16rem]">
                        {n.recipient_email ?? "compte inconnu"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                      {!n.read && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600">
                          Non lue
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {notificationPayloadSummary(n.type, n.payload) && (
                  <p className="mt-2 text-xs font-medium text-ink/60">
                    {notificationPayloadSummary(n.type, n.payload)}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={(p) => void load(p, typeFilter)}
            label="notifications"
          />
        </>
      )}
    </div>
  );
}

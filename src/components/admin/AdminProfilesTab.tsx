import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search, Unlock, Power, CalendarClock, X } from "lucide-react";
import {
  searchChildProfilesAdmin,
  setChildProfileActiveAdmin,
  setChildTimePressureAdmin,
  unlockChildAccessAdmin,
} from "@/lib/admin-os.functions";
import { extendChildAccessAdmin } from "@/lib/child-access";
import { TIME_PRESSURE_LABELS, type TimePressure } from "@/lib/time-limit";

// Onglet Admin OS « Profils » (2026-08-12, analyse « Évolution de Génizio » §4) :
// le pouvoir administratif exceptionnel sur les profils enfants — activer/désactiver
// manuellement (is_active), lever un verrou B2B (access_locked_at), surmoduler la
// pression temporelle. La règle commerciale ne prime jamais sur l'admin.
type ChildRow = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  city: string | null;
  country: string | null;
  is_active: boolean;
  access_locked_at: string | null;
  time_pressure: TimePressure;
  created_at: string;
  parentEmail: string;
};

export function AdminProfilesTab() {
  const searchFn = useServerFn(searchChildProfilesAdmin);
  const setActiveFn = useServerFn(setChildProfileActiveAdmin);
  const setTimeFn = useServerFn(setChildTimePressureAdmin);
  const unlockFn = useServerFn(unlockChildAccessAdmin);
  const extendAccessFn = useServerFn(extendChildAccessAdmin);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ChildRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Ajustement manuel d'accès (remplace l'ancienne « inscription à une saison » qui
  // n'accordait plus rien depuis la dégradation des saisons, décision #60) : une vraie
  // période child_access_periods, le mécanisme que getChildAccessStatus résout.
  const [extendChild, setExtendChild] = useState<ChildRow | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendNote, setExtendNote] = useState("");
  const [extending, setExtending] = useState(false);

  const runSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await searchFn({ data: { query: q } });
      setRows((res ?? []) as ChildRow[]);
    } catch (err: any) {
      toast.error(err?.message ?? "Recherche impossible");
    } finally {
      setLoading(false);
    }
  };

  const patch = async (childId: string, fn: () => Promise<{ ok: boolean }>) => {
    setBusyId(childId);
    try {
      await fn();
      toast.success("Profil mis à jour");
      await runSearch(query);
    } catch (err: any) {
      toast.error(err?.message ?? "Mise à jour impossible");
    } finally {
      setBusyId(null);
    }
  };

  const handleExtendAccess = async () => {
    if (!extendChild) return;
    setExtending(true);
    try {
      const res = await extendAccessFn({
        data: { childId: extendChild.id, months: extendMonths, note: extendNote || undefined },
      });
      toast.success(
        `Accès de ${extendChild.name} prolongé de ${extendMonths} mois — nouvelle échéance : ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`
      );
      setExtendChild(null);
      setExtendNote("");
      setExtendMonths(1);
      await runSearch(query);
    } catch (err: any) {
      toast.error(err?.message ?? "Impossible de prolonger l'accès.");
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-black text-ink">Pouvoir Admin — Profils</h2>
        <p className="mt-1 text-sm text-ink/60">
          Activation/désactivation manuelle d'un profil, déverrouillage d'un accès B2B, pression
          temporelle — la règle commerciale ne prime jamais sur l'administrateur. Les slots
          supplémentaires restent réglés dans l'onglet Exécutif.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un enfant par prénom…"
            className="w-full rounded-2xl border border-ink/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Rechercher"}
        </button>
      </form>

      {rows === null && !loading && (
        <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/50">
          Lancez une recherche pour gérer les profils enfants (200 résultats max).
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/50">
          Aucun enfant trouvé.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/10 bg-surface/60 text-[11px] font-black uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-4 py-3">Enfant</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Temps</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.map((c) => (
                <tr key={c.id} className={c.is_active ? "" : "bg-rose-50/40"}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink/50">
                      {c.age} ans{c.city ? ` · ${c.city}` : ""}
                      {c.country ? `, ${c.country}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/70">{c.parentEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-black uppercase " +
                          (c.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700")
                        }
                      >
                        {c.is_active ? "Actif" : "Désactivé"}
                      </span>
                      {c.access_locked_at && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                          Verrou B2B
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.time_pressure}
                      disabled={busyId === c.id}
                      onChange={(e) =>
                        void patch(c.id, () =>
                          setTimeFn({ data: { childId: c.id, timePressure: e.target.value as TimePressure } })
                        )
                      }
                      className="rounded-xl border border-ink/10 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand"
                    >
                      {(Object.keys(TIME_PRESSURE_LABELS) as TimePressure[]).map((tp) => (
                        <option key={tp} value={tp}>
                          {TIME_PRESSURE_LABELS[tp]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() =>
                          void patch(c.id, () =>
                            setActiveFn({ data: { childId: c.id, isActive: !c.is_active } })
                          )
                        }
                        className={
                          "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 " +
                          (c.is_active
                            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
                        }
                        title={c.is_active ? "Désactiver le profil" : "Réactiver le profil"}
                      >
                        {busyId === c.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Power className="size-3" />
                        )}
                        {c.is_active ? "Désactiver" : "Réactiver"}
                      </button>
                      {c.access_locked_at && (
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void patch(c.id, () => unlockFn({ data: { childId: c.id } }))}
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-50"
                        >
                          {busyId === c.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Unlock className="size-3" />
                          )}
                          Déverrouiller
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => {
                          setExtendChild(c);
                          setExtendMonths(1);
                          setExtendNote("");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 transition-all hover:bg-sky-100 disabled:opacity-50"
                        title="Accorder/prolonger l'accès manuellement (période réelle child_access_periods)"
                      >
                        <CalendarClock className="size-3" />
                        Prolonger l'accès
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {extendChild && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => !extending && setExtendChild(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                  Ajustement manuel d'accès
                </p>
                <h3 className="mt-1 font-display text-lg font-black text-ink">
                  Prolonger l'accès de {extendChild.name}
                </h3>
                <p className="mt-1 text-xs text-ink/60">
                  Accorde une vraie période d'accès (child_access_periods) — le même mécanisme
                  que les paiements. L'accès est prolongé, jamais découpé.
                </p>
              </div>
              <button
                type="button"
                disabled={extending}
                onClick={() => setExtendChild(null)}
                className="rounded-xl p-1.5 text-ink/50 hover:bg-ink/5 disabled:opacity-50 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold text-ink/70">Durée</p>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtendMonths(m)}
                      className={
                        "flex-1 rounded-xl border px-2 py-2 text-sm font-bold transition-all cursor-pointer " +
                        (extendMonths === m
                          ? "border-brand bg-brand text-white shadow-sm"
                          : "border-ink/10 bg-surface text-ink/70 hover:border-ink/25")
                      }
                    >
                      {m} mois
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-ink/70">Note (interne, optionnelle)</p>
                <input
                  value={extendNote}
                  onChange={(e) => setExtendNote(e.target.value)}
                  placeholder="ex. paiement reçu par virement — décision admin"
                  maxLength={200}
                  className="w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={extending}
                onClick={() => setExtendChild(null)}
                className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={extending}
                onClick={() => void handleExtendAccess()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90 disabled:opacity-50 cursor-pointer"
              >
                {extending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
                Prolonger {extendMonths} mois
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

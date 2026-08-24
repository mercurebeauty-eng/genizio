import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listTestimonialsAdmin,
  setTestimonialPublishAdmin,
  type AdminTestimonialRow,
} from "@/lib/testimonials.functions";
import { Loader2, Star, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Modération des témoignages parents (chantier « Preuve sociale réelle »,
// 2026-08-15) : l'admin voit tous les témoignages (publiés et dépubliés), peut
// dépublier un retour problématique ou le republier (si consentement présent).
// La landing n'affiche que les published=true — cette modération est donc la
// porte de sortie d'urgence pour un contenu inapproprié.

type AdminTestimonialsTabProps = {
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

export function AdminTestimonialsTab({ isRefreshing, onRefresh }: AdminTestimonialsTabProps) {
  const listFn = useServerFn(listTestimonialsAdmin);
  const setPublishFn = useServerFn(setTestimonialPublishAdmin);
  const [rows, setRows] = useState<AdminTestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setRows(data);
    } catch (err) {
      console.error("AdminTestimonialsTab:", err);
      toast.error("Impossible de charger les témoignages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (row: AdminTestimonialRow) => {
    setBusyId(row.id);
    try {
      const res = await setPublishFn({ data: { id: row.id, published: !row.published } });
      toast.success(
        res.published
          ? "Témoignage publié sur la landing."
          : "Témoignage dépublié — il n'apparaît plus sur la landing.",
      );
      await load();
    } catch (err) {
      console.error("AdminTestimonialsTab toggle:", err);
      toast.error(err instanceof Error ? err.message : "Erreur de mise à jour.");
    } finally {
      setBusyId(null);
    }
  };

  const publishedCount = rows.filter((r) => r.published).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Témoignages parents</h2>
          <p className="text-sm font-medium text-ink/60">
            {rows.length} au total · {publishedCount} publié{publishedCount > 1 ? "s" : ""} sur la
            landing. Dépublier retire immédiatement le témoignage du site.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-xs font-bold text-ink/70 shadow-sm hover:bg-surface transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white p-10 text-sm font-bold text-ink/60">
          <Loader2 className="size-4 animate-spin" />
          Chargement des témoignages…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-10 text-center text-sm font-semibold text-ink/60">
          Aucun témoignage collecté pour le moment. Ils apparaîtront ici dès qu'un parent aura
          partagé son retour dans l'application.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-2xl border p-5 shadow-sm ${
                row.published ? "border-leaf/25 bg-white" : "border-ink/10 bg-white/60 opacity-80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-black text-white shadow-md ${
                      row.senderType === "mentor"
                        ? "bg-gradient-to-br from-sky-500 to-blue-600"
                        : "bg-gradient-to-br from-brand to-amber-500"
                    }`}
                  >
                    {row.author.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink">
                      {row.author}
                      <span className="text-[11px] font-semibold text-ink/50">
                        {row.authorLocation}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          row.senderType === "mentor"
                            ? "border-sky/30 bg-sky-50 text-sky-dark"
                            : "border-brand/25 bg-brand/10 text-brand"
                        }`}
                      >
                        {row.senderType === "mentor" ? "Mentor" : "Parent"}
                      </span>
                      {!row.consentPublish && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600">
                          Pas de consentement
                        </span>
                      )}
                      {!row.published && (
                        <span className="rounded-full border border-ink/10 bg-surface px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink/50">
                          Dépublié
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-0.5 text-amber-500" aria-hidden>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`size-3.5 ${s < row.rating ? "fill-amber-500" : "fill-ink/10"}`}
                        />
                      ))}
                      <span className="ml-1.5 text-[10px] font-bold text-ink/50">
                        {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void handleToggle(row)}
                  disabled={busyId === row.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
                    row.published
                      ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      : "bg-leaf text-white hover:bg-leaf-dark"
                  }`}
                >
                  {busyId === row.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : row.published ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  {row.published ? "Dépublier" : "Publier"}
                </button>
              </div>

              <p className="mt-3 text-xs font-black uppercase tracking-widest text-ink/40">
                {row.headline}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink/80">
                « {row.reviewBody} »
              </p>

              <p className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-ink/50">
                <span>{row.childrenCount} enfant(s) inscrit(s)</span>
                <span aria-hidden>·</span>
                <span>{row.challengesCompleted} défi(s) validé(s)</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

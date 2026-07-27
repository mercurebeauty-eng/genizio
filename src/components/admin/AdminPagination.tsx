import { ChevronLeft, ChevronRight } from "lucide-react";

// Contrôle de pagination partagé par les écrans Admin OS qui listent de gros volumes
// (parrainages, campagnes). Ne s'affiche pas s'il n'y a qu'une seule page — l'écran reste
// identique tant que le volume est petit, la pagination n'apparaît qu'au moment où elle
// devient réellement utile.
export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  label = "élément",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-ink/5">
      <p className="text-xs font-bold text-ink/50">
        {from}–{to} sur {total} {label}{total > 1 ? "s" : ""}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
            className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
            Précédent
          </button>
          <span className="text-xs font-black text-ink tabular-nums px-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Page suivante"
            className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors cursor-pointer"
          >
            Suivant
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
